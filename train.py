"""
Training Engine for MethanePINN (PINN-REALDATA-v3) with TargetScaler Integration & Regional Error Audit.

Fits TargetScaler & FeatureScaler ONLY on real training split (S5P-INDIA-REAL-v2),
trains PyTorch MethanePINN in normalized target space, evaluates in physical CH4 ppb space,
audits residual distributions and regional error across Indian facility clusters,
and exports pinn_methane_v3.pt, residual_analysis.json, & regional_error_report.json.
"""

import os
import sys
import json
import time
import numpy as np
import torch
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from torch.utils.data import DataLoader
from pathlib import Path
from typing import Dict, Any

from ml.constants import (
    FEATURE_NAMES, INPUT_DIM, MODELS_DIR, TRAINING_DIR,
    LOW_ERROR_THRESHOLD, MEDIUM_ERROR_THRESHOLD
)
from ml.dataset import generate_indian_methane_dataset, MethaneTemporalDataset
from ml.model import MethanePINN
from ml.scalers import TargetScaler, FeatureScaler
from ml.physics_loss import PhysicsInformedLoss
from ml.gaussian_plume import validate_gaussian_plume_units
from ml.baselines import run_baseline_benchmark

MODEL_PATH = MODELS_DIR / "pinn_methane_v3.pt"
METADATA_PATH = MODELS_DIR / "training_metadata.json"
PRED_DIST_PATH = TRAINING_DIR / "prediction_distribution.json"
ABLATION_PATH = MODELS_DIR / "ablation_results.json"
RESIDUAL_PATH = MODELS_DIR / "residual_analysis.json"
REGIONAL_PATH = MODELS_DIR / "regional_error_report.json"

def train_model(epochs: int = 150, batch_size: int = 32, lr: float = 0.003, lambda_physics: float = 0.05, lambda_emission: float = 0.02) -> Dict[str, Any]:
    print("🚀 Retraining MethanePINN with TargetScaler Integration (PINN-REALDATA-v3)...")
    
    gp_val = validate_gaussian_plume_units()
    baseline_results = run_baseline_benchmark()
    
    data_dict = generate_indian_methane_dataset(target_real_count=600)
    
    train_ds = MethaneTemporalDataset(data_dict["train_samples"])
    val_ds = MethaneTemporalDataset(data_dict["val_samples"])
    test_ds = MethaneTemporalDataset(data_dict["test_samples"])
    
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=False)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False)
    
    model = MethanePINN(input_dim=INPUT_DIM)
    
    # 1. Fit Feature Scaler ONLY on real training split
    train_features = train_ds.X
    feature_scaler = FeatureScaler()
    feature_scaler.fit(train_features)
    model.set_normalization(feature_scaler.mean, feature_scaler.std)
    
    # 2. Fit Target Scaler ONLY on real training split
    train_targets = train_ds.y[:, 0]
    target_scaler = TargetScaler()
    target_scaler.fit(train_targets)
    
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    loss_fn = PhysicsInformedLoss(lambda_physics=lambda_physics, lambda_emission=lambda_emission)
    
    start_time = time.time()
    loss_history = []
    
    for epoch in range(1, epochs + 1):
        model.train()
        train_loss_accum = 0.0
        
        for X_batch, y_batch in train_loader:
            optimizer.zero_grad()
            
            y_target_conc = y_batch[:, 0:1]
            y_scaled_conc = target_scaler.transform(y_target_conc)
            y_batch_scaled = torch.cat([y_scaled_conc, y_batch[:, 1:2]], dim=1)
            
            preds_raw = model(X_batch)
            preds_scaled_conc = target_scaler.transform(preds_raw[:, 0:1])
            preds_scaled_batch = torch.cat([preds_scaled_conc, preds_raw[:, 1:2], preds_raw[:, 2:3]], dim=1)
            
            loss, _ = loss_fn(preds_scaled_batch, y_batch_scaled, X_batch)
            loss.backward()
            optimizer.step()
            train_loss_accum += loss.item() * X_batch.size(0)
            
        train_loss_epoch = train_loss_accum / len(train_ds)
        
        model.eval()
        val_loss_accum = 0.0
        with torch.no_grad():
            for X_batch, y_batch in val_loader:
                preds_raw = model(X_batch)
                preds_scaled_conc = target_scaler.transform(preds_raw[:, 0:1])
                y_target_conc = y_batch[:, 0:1]
                y_scaled_conc = target_scaler.transform(y_target_conc)
                preds_scaled_batch = torch.cat([preds_scaled_conc, preds_raw[:, 1:2], preds_raw[:, 2:3]], dim=1)
                y_batch_scaled = torch.cat([y_scaled_conc, y_batch[:, 1:2]], dim=1)
                
                loss, _ = loss_fn(preds_scaled_batch, y_batch_scaled, X_batch)
                val_loss_accum += loss.item() * X_batch.size(0)
                
        val_loss_epoch = val_loss_accum / len(val_ds)
        
        loss_history.append({"epoch": epoch, "train_loss": round(train_loss_epoch, 4), "val_loss": round(val_loss_epoch, 4)})
        if epoch % 30 == 0 or epoch == epochs:
            print(f"  Epoch [{epoch:03d}/{epochs}] — Train Scaled Loss: {train_loss_epoch:.4f} | Val Scaled Loss: {val_loss_epoch:.4f}")
            
    training_duration = round(time.time() - start_time, 2)
    
    # 3. Evaluate Restored Predictions on Held-Out Test Set
    model.eval()
    test_preds_list = []
    test_targets_list = []
    
    with torch.no_grad():
        for X_batch, y_batch in test_loader:
            preds_raw = model(X_batch)
            test_preds_list.append(preds_raw)
            test_targets_list.append(y_batch)
            
    test_preds = torch.cat(test_preds_list, dim=0)
    test_targets = torch.cat(test_targets_list, dim=0)
    
    pred_conc = test_preds[:, 0].numpy()
    target_conc = test_targets[:, 0].numpy()
    
    mae = float(round(np.mean(np.abs(pred_conc - target_conc)), 2))
    rmse = float(round(np.sqrt(np.mean((pred_conc - target_conc) ** 2)), 2))
    mape = float(round(np.mean(np.abs((pred_conc - target_conc) / target_conc)) * 100, 2))
    
    ss_res = np.sum((target_conc - pred_conc) ** 2)
    ss_tot = np.sum((target_conc - np.mean(target_conc)) ** 2)
    r2_score = float(round(1.0 - (ss_res / (ss_tot + 1e-8)), 4))
    
    # Residual & Regional Analysis
    residuals = target_conc - pred_conc
    residual_stats = {
        "mean_residual_ppb": float(round(np.mean(residuals), 2)),
        "median_residual_ppb": float(round(np.median(residuals), 2)),
        "std_residual_ppb": float(round(np.std(residuals), 2)),
        "min_residual_ppb": float(round(np.min(residuals), 2)),
        "max_residual_ppb": float(round(np.max(residuals), 2)),
    }
    with open(RESIDUAL_PATH, "w", encoding="utf-8") as f:
        json.dump(residual_stats, f, indent=2)

    regional_dict = {}
    for idx, s in enumerate(data_dict["test_samples"]):
        st = s.get("state", "Other")
        if st not in regional_dict:
            regional_dict[st] = {"targets": [], "preds": []}
        regional_dict[st]["targets"].append(target_conc[idx])
        regional_dict[st]["preds"].append(pred_conc[idx])
        
    regional_report = {}
    for st, vals in regional_dict.items():
        t_arr = np.array(vals["targets"])
        p_arr = np.array(vals["preds"])
        r_err = float(round(np.sqrt(np.mean((t_arr - p_arr) ** 2)), 2))
        m_err = float(round(np.mean(np.abs(t_arr - p_arr)), 2))
        regional_report[st] = {"sample_count": len(t_arr), "RMSE": r_err, "MAE": m_err}
        
    with open(REGIONAL_PATH, "w", encoding="utf-8") as f:
        json.dump(regional_report, f, indent=2)

    pinn_result_entry = {
        "model": "MethanePINN",
        "type": "Physics-Informed Deep Learning",
        "features": 12,
        "MAE": mae,
        "RMSE": rmse,
        "R2": r2_score,
        "MAPE": mape
    }
    all_model_comparison = baseline_results + [pinn_result_entry]
    all_model_comparison.sort(key=lambda x: x["RMSE"])
    
    best_model_name = all_model_comparison[0]["model"]

    # Prediction Distribution Audit
    pred_dist = {
        "target_mean": float(round(np.mean(target_conc), 1)),
        "target_std": float(round(np.std(target_conc), 1)),
        "target_min": float(round(np.min(target_conc), 1)),
        "target_max": float(round(np.max(target_conc), 1)),
        "prediction_mean": float(round(np.mean(pred_conc), 1)),
        "prediction_std": float(round(np.std(pred_conc), 1)),
        "prediction_min": float(round(np.min(pred_conc), 1)),
        "prediction_max": float(round(np.max(pred_conc), 1)),
        "systematic_bias_ppb": float(round(np.mean(pred_conc) - np.mean(target_conc), 1)),
    }
    with open(PRED_DIST_PATH, "w", encoding="utf-8") as f:
        json.dump(pred_dist, f, indent=2)

    checkpoint = {
        "model_state": model.state_dict(),
        "feature_mean": feature_scaler.mean,
        "feature_std": feature_scaler.std,
        "target_mean": target_scaler.mean,
        "target_std": target_scaler.std,
        "input_dim": INPUT_DIM,
        "feature_names": FEATURE_NAMES,
        "version": "PINN-REALDATA-v3",
        "dataset_version": "S5P-INDIA-REAL-v2",
        "trained_at": datetime.utcnow().isoformat() + "Z",
    }
    torch.save(checkpoint, MODEL_PATH)
    
    metadata = {
        "model_name": "Physics-Informed Neural Network (MethanePINN)",
        "version": "PINN-REALDATA-v3",
        "dataset_version": "S5P-INDIA-REAL-v2",
        "framework": f"PyTorch {torch.__version__}",
        "region": "India (National Bounding Box)",
        "input_dim": INPUT_DIM,
        "feature_names": FEATURE_NAMES,
        "target_name": "t_plus_1_ch4 (held-out / next observation)",
        "training_samples": len(train_ds),
        "validation_samples": len(val_ds),
        "test_samples": len(test_ds),
        "training_duration_sec": training_duration,
        "scalers": {
            "target_mean": round(target_scaler.mean, 1),
            "target_std": round(target_scaler.std, 1),
            "isolation": "Fitted ONLY on Real Training Split",
        },
        "held_out_test_metrics": {
            "r2_score": r2_score,
            "rmse_ppb": rmse,
            "mae_ppb": mae,
            "mape_percent": mape,
        },
        "baseline_comparison": all_model_comparison,
        "best_performing_model": best_model_name,
        "residual_analysis": residual_stats,
        "regional_error_report": regional_report,
        "last_training_time": datetime.utcnow().isoformat() + "Z",
    }
    
    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"✅ Retrained & Saved MethanePINN ({metadata['version']}): {MODEL_PATH}")
    print(f"📊 Held-Out Test Metrics — R²: {r2_score}, RMSE: {rmse} ppb | Best Model: {best_model_name}")
    print(f"📊 Target Mean: {pred_dist['target_mean']} ppb | Pred Mean: {pred_dist['prediction_mean']} ppb | Bias: {pred_dist['systematic_bias_ppb']} ppb")
    
    return metadata

if __name__ == "__main__":
    train_model(epochs=150)
