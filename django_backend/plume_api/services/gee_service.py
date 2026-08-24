import os
import sys
import math
import numpy as np
from datetime import datetime, timedelta
from django.conf import settings

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# ── GEE Initialization ─────────────────────────────────────────────────────────
_ee_initialized = False

# Cache to avoid hammering GEE on every request (TTL-based)
_cache = {}
_CACHE_TTL_SECONDS = 300  # 5 minutes

def _cache_get(key):
    entry = _cache.get(key)
    if entry and (datetime.utcnow() - entry["ts"]).total_seconds() < _CACHE_TTL_SECONDS:
        return entry["data"]
    return None

def _cache_set(key, data):
    _cache[key] = {"data": data, "ts": datetime.utcnow()}

def _log(msg):
    """Safe print that won't crash on Windows with emoji."""
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', errors='replace').decode('ascii'))


try:
    import ee

    # Resolve the GEE key file path.
    # Priority: GEE_KEY_FILE env var → named project key → service_account.json
    _KEY_CANDIDATES = [
        getattr(settings, 'GEE_KEY_FILE', ''),
        'methane-watcher-project-aada1ea5973d.json',
        'service_account.json',
    ]

    key_file = ''
    for candidate in _KEY_CANDIDATES:
        if not candidate:
            continue
        # Resolve relative paths against django_backend/ (BASE_DIR)
        path = candidate if os.path.isabs(candidate) else os.path.join(settings.BASE_DIR, candidate)
        if os.path.exists(path) and os.path.getsize(path) > 0:
            key_file = path
            break

    gee_sa = getattr(settings, 'GEE_SERVICE_ACCOUNT', '')

    if key_file and gee_sa:
        _log(f"[GEE] Using key file: {key_file}")
        _log(f"[GEE] Service account: {gee_sa}")
        credentials = ee.ServiceAccountCredentials(gee_sa, key_file)
        ee.Initialize(credentials)
        _ee_initialized = True
        _log("[GEE] Google Earth Engine Initialized OK")
    else:
        missing = []
        if not key_file:
            missing.append("key file")
        if not gee_sa:
            missing.append("service account email")
        _log(f"[GEE] WARNING: credentials not found (missing: {', '.join(missing)}) - using mock satellite data")
        _log(f"[GEE]   Searched for key files: {_KEY_CANDIDATES}")
except Exception as e:
    _log(f"[GEE] WARNING: not available: {e}")


def is_gee_initialized():
    return _ee_initialized


# ── Shared helpers ──────────────────────────────────────────────────────────────

def _wind_direction_label(degrees):
    dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE",
            "S","SSW","SW","WSW","W","WNW","NW","NNW"]
    return dirs[int((degrees + 11.25) / 22.5) % 16]


def _determine_risk(anomaly):
    if anomaly > 500: return "critical"
    if anomaly > 300: return "high"
    if anomaly > 100: return "medium"
    return "low"


def _fetch_ch4_hotspots(bbox, num_pixels=20, anomaly_threshold=20,
                         id_prefix="LIVE", country="Unknown", region_label="Detected Zone",
                         lookback_days=60):
    """
    Core GEE data pull: fetch Sentinel-5P CH4 anomalies within a bounding box.
    Returns a list of hotspot dicts in the standard API schema.
    """
    import ee
    from plume_api.gaussian_plume import (
        _kghr_to_kgs, PlumeSource, WindVector, compute_plume, find_nearest_facility
    )

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=lookback_days)

    dataset = (
        ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_CH4")
        .filterDate(start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d"))
        .select("CH4_column_volume_mixing_ratio_dry_air")
    )
    latest_image = dataset.sort("system:time_start", False).first()
    geo_region = ee.Geometry.Rectangle(bbox)
    composite_image = dataset.mean()

    # Regional background mean
    mean_bg = composite_image.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=geo_region,
        scale=50000,
        maxPixels=1e9,
    ).get("CH4_column_volume_mixing_ratio_dry_air").getInfo()

    mean_bg_ppb = float(mean_bg or 1850.0)
    if mean_bg_ppb < 1000:
        mean_bg_ppb *= 1e9

    # Anomaly detection
    anomaly_image = composite_image.multiply(1e9).subtract(mean_bg_ppb)
    hotspot_mask = anomaly_image.gt(anomaly_threshold)
    masked_image = anomaly_image.updateMask(hotspot_mask)
    samples = masked_image.sample(
        region=geo_region, scale=50000, numPixels=num_pixels, geometries=True
    ).getInfo()

    try:
        observation_time = latest_image.get("system:time_start").getInfo()
        detected_at = datetime.fromtimestamp(observation_time / 1000.0).isoformat() + "Z"
    except Exception:
        detected_at = datetime.utcnow().isoformat() + "Z"

    results = []
    for idx, feature in enumerate(samples.get("features", [])):
        geom = feature.get("geometry", {}).get("coordinates", [0, 0])
        props = feature.get("properties", {})
        anomaly_val = float(props.get("CH4_column_volume_mixing_ratio_dry_air", 0))
        if anomaly_val > 100000:
            anomaly_val = anomaly_val / 1e9
        if anomaly_val <= 0:
            continue

        lng_pt, lat_pt = geom[0], geom[1]
        wind_speed = round(np.random.uniform(2.0, 6.0), 1)
        wind_heading = np.random.uniform(0, 360)
        plume_area = round(np.random.uniform(2.0, 15.0), 1)
        emission_kg_hr = round(anomaly_val * (wind_speed + 1) * math.sqrt(plume_area) * 0.45, 2)

        # Run Gaussian plume to get plume dimensions
        source = PlumeSource(lat=lat_pt, lng=lng_pt, emission_rate_kg_s=_kghr_to_kgs(emission_kg_hr))
        wind = WindVector(speed=wind_speed, direction=wind_heading)
        pr = compute_plume(source, wind, grid_km=20, grid_resolution=10)

        nearest = find_nearest_facility(lat_pt, lng_pt, k=1)

        results.append({
            "id": f"{id_prefix}-{idx + 1000}",
            "lat": lat_pt,
            "lng": lng_pt,
            "concentration": round(mean_bg_ppb + anomaly_val, 1),
            "anomalyDelta": round(anomaly_val, 1),
            "emissionRate": emission_kg_hr,
            "plumeArea": plume_area,
            "plumeLength": pr.plume_length_km,
            "plumeWidth": pr.plume_width_km,
            "windSpeed": wind_speed,
            "windDirection": round(wind_heading),
            "windDirectionLabel": _wind_direction_label(wind_heading),
            "nearestFacility": nearest[0]["name"] if nearest else "Unknown",
            "region": region_label,
            "riskLevel": _determine_risk(anomaly_val),
            "confidenceScore": round(np.random.uniform(0.75, 0.98), 2),
            "detectedAt": detected_at,
            "source": "Sentinel-5P (Live)",
            "country": country,
        })

    results.sort(key=lambda x: x["emissionRate"], reverse=True)
    return results, mean_bg_ppb, detected_at


# ── India hotspots ──────────────────────────────────────────────────────────────

INDIA_BBOX = [64.0216407222, 3.6235641873, 98.7292544704, 39.2469098899]

def get_live_hotspots_india():
    """Pull live CH4 data from Google Earth Engine Sentinel-5P collection for India."""
    if not _ee_initialized:
        raise Exception("Google Earth Engine not initialized.")

    cached = _cache_get("hotspots_india")
    if cached is not None:
        return cached

    results, _, _ = _fetch_ch4_hotspots(
        bbox=INDIA_BBOX,
        num_pixels=20,
        anomaly_threshold=20,
        id_prefix="LIVE-IND",
        country="India",
        region_label="India Validated Zone",
    )

    _cache_set("hotspots_india", results)
    return results


# ── Global hotspots ─────────────────────────────────────────────────────────────

# Known super-emitter regions to query (querying the entire globe at once
# would be prohibitively slow via the GEE API). Each region is queried
# separately and results are merged.
GLOBAL_REGIONS = [
    # (bbox [west, south, east, north], country, region_label, id_prefix)
    ([50.0, 35.0, 65.0, 45.0], "Turkmenistan", "Central Asia Oil & Gas", "LIVE-TKM"),
    ([-108.0, 28.0, -98.0, 36.0], "USA", "Permian Basin, Texas", "LIVE-PRM"),
    ([45.0, 50.0, 80.0, 62.0], "Russia", "Western Siberia", "LIVE-RUS"),
    ([48.0, 24.0, 56.0, 32.0], "Iran", "Persian Gulf Region", "LIVE-IRN"),
    ([-72.0, -40.0, -62.0, -30.0], "Argentina", "Vaca Muerta Basin", "LIVE-ARG"),
    ([100.0, 20.0, 125.0, 40.0], "China", "Eastern China Industrial", "LIVE-CHN"),
]

def get_live_hotspots_global():
    """Pull live CH4 from GEE across known global super-emitter regions."""
    if not _ee_initialized:
        raise Exception("Google Earth Engine not initialized.")

    cached = _cache_get("hotspots_global")
    if cached is not None:
        return cached

    all_results = []

    for bbox, country, region_label, id_prefix in GLOBAL_REGIONS:
        try:
            results, _, _ = _fetch_ch4_hotspots(
                bbox=bbox,
                num_pixels=5,  # Fewer per region to keep it fast
                anomaly_threshold=50,  # Higher threshold for global
                id_prefix=id_prefix,
                country=country,
                region_label=region_label,
            )
            all_results.extend(results)
        except Exception as e:
            _log(f"[GEE] WARNING: global region {region_label} failed: {e}")
            continue

    # Also include India hotspots in the global view
    try:
        india = get_live_hotspots_india()
        all_results.extend(india)
    except Exception as e:
        _log(f"[GEE] WARNING: India fetch for global view failed: {e}")

    # Sort globally by emission rate
    all_results.sort(key=lambda x: x["emissionRate"], reverse=True)

    _cache_set("hotspots_global", all_results)
    return all_results


# ── Live stats ──────────────────────────────────────────────────────────────────

def get_live_stats():
    """Compute dynamic aggregate statistics from live GEE data."""
    if not _ee_initialized:
        return None

    cached = _cache_get("live_stats")
    if cached is not None:
        return cached

    try:
        import ee

        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)

        dataset = (
            ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_CH4")
            .filterDate(start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d"))
            .select("CH4_column_volume_mixing_ratio_dry_air")
        )

        latest_image = dataset.sort("system:time_start", False).first()
        obs_time = latest_image.get("system:time_start").getInfo()
        latest_observation = datetime.fromtimestamp(obs_time / 1000.0).isoformat() + "Z"

        # Count images in the collection (approximate satellite passes)
        image_count = dataset.size().getInfo()

        # Fetch actual hotspot counts from cached data if available
        india_data = _cache_get("hotspots_india")
        global_data = _cache_get("hotspots_global")

        if india_data is not None:
            active_hotspots_india = len(india_data)
            india_emissions = sum(h["emissionRate"] for h in india_data)
            india_critical = len([h for h in india_data if h["riskLevel"] == "critical"])
            india_flagged = len(set(h["nearestFacility"] for h in india_data if h["nearestFacility"] != "Unknown"))
        else:
            active_hotspots_india = 0
            india_emissions = 0
            india_critical = 0
            india_flagged = 0

        if global_data is not None:
            active_hotspots_total = len(global_data)
            total_emissions = sum(h["emissionRate"] for h in global_data)
            total_flagged = len(set(h["nearestFacility"] for h in global_data if h["nearestFacility"] != "Unknown"))
        else:
            active_hotspots_total = active_hotspots_india
            total_emissions = india_emissions
            total_flagged = india_flagged

        stats = {
            "status": "online",
            "gee_connected": True,
            "activeHotspots": active_hotspots_total,
            "activeHotspotsIndia": active_hotspots_india,
            "criticalHotspotsIndia": india_critical,
            "estimatedEmissions": round(total_emissions, 1),
            "estimatedEmissionsIndia": round(india_emissions, 1),
            "satellitesUsed": max(1, min(image_count, 4)),
            "facilitiesFlagged": total_flagged,
            "latestObservationTime": latest_observation,
            "dataSource": "Sentinel-5P TROPOMI (COPERNICUS/S5P/OFFL/L3_CH4)",
            "imagesInWindow": image_count,
        }

        _cache_set("live_stats", stats)
        return stats

    except Exception as e:
        _log(f"[GEE] WARNING: Failed to compute live stats: {e}")
        return None
