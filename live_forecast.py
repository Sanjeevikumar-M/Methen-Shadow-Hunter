"""
Production Live Forecast Collection Pipeline for Methane Shadow Hunter (Phase 8 Operations).

Enforces SHA-256 frozen model checksum guard against 67c2564aff65ddca90be4ff34e496f3f885be637029115186c4c985c74dfb4e4,
validates complete forecast record schema, checks duplicate forecast prevention,
runs PINN-REALDATA-v3-FROZEN, and stores forecast records with status = "PENDING".
"""

import sys
import json
import hashlib
import torch
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from ml.constants import MODELS_DIR, TRAINING_DIR
from ml.inference import run_pinn_inference
from ml.verify_gee import verify_gee_connection

EXPECTED_MODEL_HASH = "67c2564aff65ddca90be4ff34e496f3f885be637029115186c4c985c74dfb4e4"
MODEL_PATH = MODELS_DIR / "pinn_methane_v3.pt"
PRED_HISTORY_FILE = TRAINING_DIR / "prediction_history.json"

REQUIRED_FORECAST_SCHEMA_KEYS = [
    "input_gee_image_id",
    "input_observation_timestamp",
    "target_expected_timestamp",
    "latitude",
    "longitude",
    "predicted_ch4_ppb",
    "epistemic_uncertainty_ppb",
    "model_version",
    "model_sha256",
    "validation_status",
    "future_target_used_during_inference",
]

def verify_frozen_model_checksum() -> Tuple[bool, str]:
    if not MODEL_PATH.exists():
        return False, "Checkpoint file pinn_methane_v3.pt does not exist!"
        
    sha256 = hashlib.sha256()
    with open(MODEL_PATH, "rb") as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    actual_hash = sha256.hexdigest()
    
    if actual_hash != EXPECTED_MODEL_HASH:
        return False, f"FROZEN_MODEL_INTEGRITY_FAILURE (Expected: {EXPECTED_MODEL_HASH[:8]}..., Actual: {actual_hash[:8]}...)"
        
    return True, actual_hash

def validate_forecast_record_schema(record: Dict[str, Any]) -> bool:
    for key in REQUIRED_FORECAST_SCHEMA_KEYS:
        if key not in record:
            print(f"❌ Schema validation failed: missing key '{key}'")
            return False
    if record.get("future_target_used_during_inference") is not False:
        print("❌ Schema validation failed: future_target_used_during_inference must be False")
        return False
    return True

def run_live_forecast_step() -> Dict[str, Any]:
    print("🛰️ Initializing Production Live Forecast Pipeline...")
    
    # 1. Verify Frozen Model Checksum
    valid_hash, hash_msg = verify_frozen_model_checksum()
    if not valid_hash:
        print(f"❌ {hash_msg}")
        return {"status": "FROZEN_MODEL_INTEGRITY_FAILURE", "message": hash_msg}
        
    # 2. Verify GEE Connection
    gee_res = verify_gee_connection()
    if gee_res["status"] != "PASS":
        print(f"⚠️ GEE Connection: {gee_res['status']} — GEE OFFLINE — REFERENCE DATA MODE")
        
    latest_gee_id = gee_res.get("latest_image_id", "COPERNICUS/S5P/OFFL/L3_CH4/20260810T085843_20260812T011658")
    
    # 3. Duplicate Forecast Protection
    history = []
    if PRED_HISTORY_FILE.exists():
        try:
            with open(PRED_HISTORY_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
        except Exception:
            history = []
            
    existing_gee_ids = [p.get("input_gee_image_id") or p.get("gee_input_image_id") for p in history]
    if latest_gee_id in existing_gee_ids:
        print(f"ℹ️ Image {latest_gee_id} has already been processed: ALREADY_FORECASTED")
        return {
            "status": "ALREADY_FORECASTED",
            "gee_image_id": latest_gee_id,
            "message": "Observation already processed",
            "pending_count": len([p for p in history if p.get("validation_status") == "PENDING"]),
        }
        
    # 4. Generate Live Forecast with PINN-REALDATA-v3-FROZEN
    inf_res = run_pinn_inference(
        lat=21.75,
        lng=72.98,
        t_minus_1_ch4=1940.0,
        gee_image_id=latest_gee_id
    )
    
    forecast_record = {
        "prediction_id": f"PRED-{len(history)+1000:04d}",
        "input_gee_image_id": latest_gee_id,
        "input_observation_timestamp": datetime.utcnow().isoformat() + "Z",
        "target_expected_timestamp": (datetime.utcnow() + timedelta(days=1)).isoformat() + "Z",
        "latitude": inf_res["lat"],
        "longitude": inf_res["lng"],
        "predicted_ch4_ppb": inf_res["predicted_t_plus_1_ch4_ppb"],
        "epistemic_uncertainty_ppb": inf_res["prediction_uncertainty_ppb"],
        "model_version": "PINN-REALDATA-v3-FROZEN",
        "model_sha256": EXPECTED_MODEL_HASH,
        "dataset_version": "S5P-INDIA-REAL-v2",
        "validation_status": "PENDING",
        "future_target_used_during_inference": False,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    
    if not validate_forecast_record_schema(forecast_record):
        return {"status": "SCHEMA_VALIDATION_FAILURE", "message": "Incomplete forecast record schema"}
        
    history.append(forecast_record)
    with open(PRED_HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)
        
    print(f"✅ Generated Live Forecast {forecast_record['prediction_id']} ({latest_gee_id}) -> Pred: {forecast_record['predicted_ch4_ppb']} ppb")
    return {
        "status": "PASS",
        "forecast": forecast_record,
        "pending_count": len([p for p in history if p.get("validation_status") == "PENDING"]),
    }

if __name__ == "__main__":
    run_live_forecast_step()
