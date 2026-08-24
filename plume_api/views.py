import os
import json
from pathlib import Path
# pyrefly: ignore [missing-import]
from rest_framework.decorators import api_view
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from django.conf import settings

from ml.inference import run_pinn_inference
from ml.verify_gee import verify_gee_connection
from ml.verify_satellite_storage import verify_satellite_storage
from ml.live_forecast import verify_frozen_model_checksum
from ml.production import monitor_production_health
from ml.constants import MODELS_DIR, TRAINING_DIR

@api_view(['GET'])
def get_model_status(request):
    meta_path = MODELS_DIR / "training_metadata.json"
    data_dict = {}
    if meta_path.exists():
        with open(meta_path, "r", encoding="utf-8") as f:
            data_dict = json.load(f)
            
    prod_status = monitor_production_health()
    data_dict["production_status"] = prod_status
    return Response(data_dict)

@api_view(['GET'])
def get_production_status(request):
    status_report = monitor_production_health()
    return Response(status_report)

@api_view(['GET'])
def get_forecast_history(request):
    history_file = TRAINING_DIR / "prediction_history.json"
    history = []
    if history_file.exists():
        with open(history_file, "r", encoding="utf-8") as f:
            history = json.load(f)
    return Response({"count": len(history), "history": history})

@api_view(['GET'])
def get_forecast_pending(request):
    history_file = TRAINING_DIR / "prediction_history.json"
    pending = []
    if history_file.exists():
        with open(history_file, "r", encoding="utf-8") as f:
            history = json.load(f)
            pending = [p for p in history if p.get("validation_status") == "PENDING"]
    return Response({"count": len(pending), "pending": pending})

@api_view(['GET'])
def get_forecast_validated(request):
    history_file = TRAINING_DIR / "prediction_history.json"
    validated = []
    if history_file.exists():
        with open(history_file, "r", encoding="utf-8") as f:
            history = json.load(f)
            validated = [p for p in history if p.get("validation_status") == "VALIDATED"]
    return Response({"count": len(validated), "validated": validated})

@api_view(['GET'])
def get_forecast_metrics(request):
    metrics_file = TRAINING_DIR / "live_metrics.json"
    metrics = {}
    if metrics_file.exists():
        with open(metrics_file, "r", encoding="utf-8") as f:
            metrics = json.load(f)
    return Response(metrics)

@api_view(['GET'])
def get_forecast_latest(request):
    history_file = TRAINING_DIR / "prediction_history.json"
    latest = None
    if history_file.exists():
        with open(history_file, "r", encoding="utf-8") as f:
            history = json.load(f)
            if history:
                latest = history[-1]
    return Response(latest if latest else {"status": "NO_FORECAST"})

@api_view(['GET'])
def get_forecast_performance(request):
    perf_file = TRAINING_DIR / "live_performance_history.json"
    perf = []
    if perf_file.exists():
        with open(perf_file, "r", encoding="utf-8") as f:
            perf = json.load(f)
    return Response({"count": len(perf), "performance": perf})

@api_view(['GET'])
def get_forecast_uncertainty(request):
    metrics_file = TRAINING_DIR / "live_metrics.json"
    unc = {}
    if metrics_file.exists():
        with open(metrics_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            unc = data.get("uncertainty_calibration", {})
    return Response(unc)

@api_view(['GET'])
def get_forecast_distribution_shift(request):
    gen_file = TRAINING_DIR / "generalization_report.json"
    gen = {}
    if gen_file.exists():
        with open(gen_file, "r", encoding="utf-8") as f:
            gen = json.load(f)
    return Response(gen)

@api_view(['GET'])
def predict_plume(request):
    try:
        lat = float(request.query_params.get('lat', 21.75))
        lng = float(request.query_params.get('lng', 72.98))
        ch4 = float(request.query_params.get('ch4', 1940.0))
        wind_speed = float(request.query_params.get('wind_speed', 3.5))
        wind_dir = float(request.query_params.get('wind_dir', 245.0))
        
        result = run_pinn_inference(
            lat=lat, lng=lng, t_minus_1_ch4=ch4,
            wind_speed=wind_speed, wind_dir=wind_dir
        )
        return Response(result)
    except Exception as e:
        return Response({"error": str(e)}, status=400)
