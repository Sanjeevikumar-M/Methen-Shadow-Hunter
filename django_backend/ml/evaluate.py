"""
Diagnostic & Evaluation Engine for MethanePINN (Phase 6 Audit & Root-Cause Tracer).

Runs zero-code-change evaluation on existing PINN-REALDATA-v2 checkpoint,
traces sample-by-sample target scaling vs model outputs to locate bias root cause,
and exports current_pinn_audit.json & sample_trace_report.json.
"""

import sys
import json
import torch
import numpy as np
from pathlib import Path
from typing import Dict, Any

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from ml.constants import MODELS_DIR, TRAINING_DIR, FEATURE_NAMES, INPUT_DIM
from ml.dataset import generate_indian_methane_dataset, MethaneTemporalDataset
from ml.model import MethanePINN

MODEL_PATH = MODELS_DIR / "pinn_methane_v2.pt"
AUDIT_PATH = MODELS_DIR / "current_pinn_audit.json"
TRACE_PATH = MODELS_DIR / "sample_trace_report.json"

def audit_current_pinn() -> Dict[str, Any]:
    print("🔍 Executing Phase 6 Zero-Code-Change Audit on Current PINN Checkpoint...")
    
    data_dict = generate_indian_methane_dataset(target_real_count=600)
    test_ds = MethaneTemporalDataset(data_dict["test_samples"])
    
    X_test = test_ds.X
    y_test = test_ds.y[:, 0].numpy()
    
    checkpoint = torch.load(MODEL_PATH, map_location="cpu")
    model = MethanePINN(input_dim=INPUT_DIM)
    model.load_state_dict(checkpoint["model_state"])
    model.set_normalization(checkpoint["feature_mean"], checkpoint["feature_std"])
    model.eval()
    
    target_mean = checkpoint.get("target_mean", float(np.mean(y_test)))
    target_std = checkpoint.get("target_std", float(np.std(y_test)))
    
    with torch.no_grad():
        raw_outputs = model(X_test)[:, 0].numpy()
        
    # Check if raw outputs are unscaled or scaled
    restored_preds = raw_outputs * target_std + target_mean if np.mean(raw_outputs) < 100.0 else raw_outputs
    
    mae = float(round(np.mean(np.abs(restored_preds - y_test)), 2))
    rmse = float(round(np.sqrt(np.mean((restored_preds - y_test) ** 2)), 2))
    mape = float(round(np.mean(np.abs((restored_preds - y_test) / y_test)) * 100, 2))
    
    ss_res = np.sum((y_test - restored_preds) ** 2)
    ss_tot = np.sum((y_test - np.mean(y_test)) ** 2)
    r2 = float(round(1.0 - (ss_res / (ss_tot + 1e-8)), 4))
    
    sample_traces = []
    for i in range(min(10, len(y_test))):
        s = data_dict["test_samples"][i]
        actual_val = float(y_test[i])
        scaled_target = float((actual_val - target_mean) / (target_std + 1e-8))
        raw_out = float(raw_outputs[i])
        restored = float(restored_preds[i])
        
        sample_traces.append({
            "sample_id": s["sample_id"],
            "actual_target_ppb": actual_val,
            "scaled_target": round(scaled_target, 4),
            "raw_model_output": round(raw_out, 4),
            "restored_prediction_ppb": round(restored, 1),
            "error_ppb": round(abs(actual_val - restored), 1)
        })
        
    audit_report = {
        "model_version": checkpoint.get("version", "PINN-REALDATA-v2"),
        "dataset_version": checkpoint.get("dataset_version", "S5P-INDIA-REAL-v2"),
        "test_sample_count": len(y_test),
        "target_distribution": {
            "mean": float(round(np.mean(y_test), 1)),
            "std": float(round(np.std(y_test), 1)),
            "min": float(round(np.min(y_test), 1)),
            "max": float(round(np.max(y_test), 1)),
        },
        "prediction_distribution": {
            "mean": float(round(np.mean(restored_preds), 1)),
            "std": float(round(np.std(restored_preds), 1)),
            "min": float(round(np.min(restored_preds), 1)),
            "max": float(round(np.max(restored_preds), 1)),
        },
        "systematic_bias_ppb": float(round(np.mean(restored_preds) - np.mean(y_test), 1)),
        "metrics": {
            "RMSE": rmse,
            "MAE": mae,
            "R2": r2,
            "MAPE": mape,
        },
        "checkpoint_scalers": {
            "target_mean": round(target_mean, 1),
            "target_std": round(target_std, 1),
        },
        "sample_traces": sample_traces[:5]
    }
    
    with open(AUDIT_PATH, "w", encoding="utf-8") as f:
        json.dump(audit_report, f, indent=2)
        
    with open(TRACE_PATH, "w", encoding="utf-8") as f:
        json.dump(sample_traces, f, indent=2)
        
    print(f"✅ Exported zero-code-change PINN audit to: {AUDIT_PATH}")
    print(f"📊 Target Mean: {audit_report['target_distribution']['mean']} ppb | Pred Mean: {audit_report['prediction_distribution']['mean']} ppb | Bias: {audit_report['systematic_bias_ppb']} ppb")
    
    return audit_report

if __name__ == "__main__":
    audit_current_pinn()
