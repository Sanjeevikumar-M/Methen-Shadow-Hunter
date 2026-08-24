import os
import django
from pathlib import Path
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")
except ImportError:
    pass

from django.core.wsgi import get_wsgi_application
from fastapi import FastAPI, APIRouter, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.wsgi import WSGIMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import math

# Initialize Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "methane_watcher.settings")
django.setup()

# Import Django-based services and models
from plume_api.models import Facility as DjangoFacility, MockHotspot as DjangoMockHotspot
from plume_api.services.gee_service import is_gee_initialized, get_live_hotspots_india, get_live_hotspots_global, get_live_stats
from plume_api.gaussian_plume import (
    PlumeSource,
    WindVector,
    compute_plume,
    back_trajectory,
    find_nearest_facility,
    _infer_stability_class,
    _predict_sigmas_nn,
    _briggs_plume_rise,
    invert_gaussian_plume,
)

# FastAPI app
app = FastAPI(
    title="Methane Watcher API",
    description="FastAPI ASGI backend serving high-performance Methane dispersion neural network models.",
    version="2.1.0"
)

# CORS Middleware (Allow React app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router
router = APIRouter(prefix="/api")

# Pydantic Schemas
class PlumeComputeRequest(BaseModel):
    lat: float
    lng: float
    emission_rate_kg_hr: float
    wind_speed_ms: float
    wind_direction_deg: float
    stack_height_m: float = 10.0
    grid_km: float = 30.0
    grid_resolution: int = 20
    is_daytime: bool = True

class BacktrackRequest(BaseModel):
    lat: float
    lng: float
    wind_speed_ms: float
    wind_direction_deg: float
    steps: int = 20
    step_km: float = 2.0
    measured_concentration_ppb: Optional[float] = None


# Helpers
def _kghr_to_kgs(v: float) -> float:
    return v / 3600.0

def _mock_hotspots(region: str = "global"):
    qs = DjangoMockHotspot.objects.all()
    if region == "india":
        qs = qs.filter(country="India")
    
    results = []
    for h in qs:
        results.append({
            "id": h.hotspot_id,
            "lat": h.lat,
            "lng": h.lng,
            "concentration": h.concentration,
            "anomalyDelta": h.anomaly_delta,
            "emissionRate": h.emission_rate,
            "plumeArea": h.plume_area,
            "windSpeed": h.wind_speed,
            "windDirection": h.wind_direction,
            "windDirectionLabel": h.wind_direction_label,
            "nearestFacility": h.nearest_facility,
            "region": h.region,
            "riskLevel": h.risk_level,
            "confidenceScore": h.confidence_score,
            "detectedAt": h.detected_at.isoformat().replace("+00:00", "Z") if h.detected_at else "", 
            "source": h.source,
            "country": h.country,
            "plumeLength": h.plume_length,
            "plumeWidth": h.plume_width,
        })
    return results


# API Routes
@router.get("/")
def health_check():
    return {
        "status": "online",
        "django": True,
        "fastapi": True,
        "gee_connected": is_gee_initialized(),
        "model": "gaussian_plume_neural_network",
        "version": "2.1.0",
    }

@router.get("/stats/")
def get_stats():
    now_utc = datetime.utcnow()
    live = get_live_stats()
    if live is not None:
        live["modelInfo"] = {
            "name": "Physics-Informed Neural Network (PINN)",
            "type": "Gaussian Plume + Deep Learning σ_y / σ_z",
            "stability_classes": ["A", "B", "C", "D", "E", "F"],
            "framework": "PyTorch",
        }
        return live

    return {
        "status": "mocking",
        "activeHotspots": 18,
        "estimatedEmissions": 5128,
        "satellitesUsed": 4,
        "facilitiesFlagged": 12,
        "latestObservationTime": (now_utc - timedelta(days=2)).isoformat() + "Z",
        "modelInfo": {
            "name": "Physics-Informed Neural Network (PINN)",
            "type": "Gaussian Plume + Deep Learning σ_y / σ_z",
            "stability_classes": ["A", "B", "C", "D", "E", "F"],
            "framework": "PyTorch",
        },
    }

@router.get("/hotspots/india/")
def hotspots_india():
    if is_gee_initialized():
        try:
            return get_live_hotspots_india()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    return _mock_hotspots("india")

@router.get("/hotspots/global/")
def hotspots_global():
    if is_gee_initialized():
        try:
            return get_live_hotspots_global()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    return _mock_hotspots("global")

@router.post("/plume/compute/")
def api_compute_plume(req: PlumeComputeRequest):
    source = PlumeSource(
        lat=req.lat,
        lng=req.lng,
        emission_rate_kg_s=_kghr_to_kgs(req.emission_rate_kg_hr),
        stack_height_m=req.stack_height_m,
    )
    wind = WindVector(speed=req.wind_speed_ms, direction=req.wind_direction_deg)
    
    result = compute_plume(
        source=source,
        wind=wind,
        grid_km=req.grid_km,
        grid_resolution=req.grid_resolution,
        is_daytime=req.is_daytime,
    )
    
    grid_json = [
        {
            "lat": p.lat,
            "lng": p.lng,
            "x_m": p.x_m,
            "y_m": p.y_m,
            "concentration_ppb": p.concentration_ppb,
            "sigma_y": p.dispersion_sigma_y,
            "sigma_z": p.dispersion_sigma_z,
        }
        for p in result.receptor_grid
    ]
    
    return {
        "source": {
            "lat": source.lat,
            "lng": source.lng,
            "emission_rate_kg_hr": req.emission_rate_kg_hr,
            "stack_height_m": req.stack_height_m,
        },
        "wind": {
            "speed_ms": wind.speed,
            "direction_deg": wind.direction,
        },
        "effective_stack_height_m": result.effective_stack_height_m,
        "sigma_y_model": result.sigma_y_model,
        "max_concentration_ppb": result.max_concentration_ppb,
        "plume_length_km": result.plume_length_km,
        "plume_width_km": result.plume_width_km,
        "nearest_facility": result.nearest_facility,
        "receptor_grid": grid_json,
        "receptor_count": len(grid_json),
    }

@router.post("/plume/backtrack/")
def api_backtrack_source(req: BacktrackRequest):
    wind = WindVector(speed=req.wind_speed_ms, direction=req.wind_direction_deg)
    trajectory = back_trajectory(req.lat, req.lng, wind, steps=req.steps, step_km=req.step_km)
    
    end = trajectory[-1]
    nearby = find_nearest_facility(end["lat"], end["lng"], k=3)
    
    if req.measured_concentration_ppb is not None and req.measured_concentration_ppb > 0:
        stability = _infer_stability_class(req.wind_speed_ms, is_daytime=True)
        
        for fac in nearby:
            lat_s, lng_s = fac["lat"], fac["lng"]
            lat_r, lng_r = req.lat, req.lng
            
            dx = (lng_r - lng_s) * 111320.0 * math.cos(math.radians(lat_s))
            dy = (lat_r - lat_s) * 111320.0
            
            downwind_deg = (req.wind_direction_deg + 180.0) % 360.0
            downwind_rad = math.radians(downwind_deg)
            
            x_m = dx * math.sin(downwind_rad) + dy * math.cos(downwind_rad)
            y_m = dx * math.cos(downwind_rad) - dy * math.sin(downwind_rad)
            
            if x_m > 0:
                sigma_y, sigma_z = _predict_sigmas_nn(x_m / 1000.0, req.wind_speed_ms, stability)
                approx_Q_kg_s = _kghr_to_kgs(1000.0)
                H_eff = 10.0 + _briggs_plume_rise(approx_Q_kg_s, req.wind_speed_ms, 10.0)
                
                estimated_Q = invert_gaussian_plume(
                    C_ppb=req.measured_concentration_ppb,
                    u_ms=req.wind_speed_ms,
                    sigma_y=sigma_y,
                    sigma_z=sigma_z,
                    x_m=x_m,
                    y_m=y_m,
                    z_m=2.0,
                    H_eff=H_eff
                )
                fac["estimated_emission_rate_kg_hr"] = round(estimated_Q, 2)
            else:
                fac["estimated_emission_rate_kg_hr"] = 0.0
                
    return {
        "detection_point": {"lat": req.lat, "lng": req.lng},
        "wind": {"speed_ms": req.wind_speed_ms, "direction_deg": req.wind_direction_deg},
        "trajectory_waypoints": trajectory,
        "probable_source_region": end,
        "nearest_facilities": nearby,
    }

@router.get("/facilities/")
def api_facilities(
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    k: int = Query(5)
):
    if lat is None or lng is None:
        return [
            {"lat": f.lat, "lng": f.lng, "name": f.name, "type": f.type}
            for f in DjangoFacility.objects.all()
        ]
        
    try:
        results = find_nearest_facility(lat, lng, k=k)
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error finding facilities: {e}")

# Include routers
app.include_router(router)

# Fallback to Django WSGI
django_wsgi = get_wsgi_application()
app.mount("/", WSGIMiddleware(django_wsgi))
