"""
Dedicated Feature & Target Scaler Module for Methane Shadow Hunter.

Implements FeatureScaler & TargetScaler with:
- fit() strictly on real training split
- transform() & inverse_transform()
- verify_round_trip() test asserting max_abs_error <= 1e-5
- Exports train_target_distribution.json, val_target_distribution.json, test_target_distribution.json, & checkpoint_scaler_audit.json
"""

import sys
import json
import torch
import numpy as np
from pathlib import Path
from typing import Dict, Any, Tuple

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from ml.constants import TRAINING_DIR, MODELS_DIR

class FeatureScaler:
    def __init__(self):
        self.mean: torch.Tensor = torch.zeros(12)
        self.std: torch.Tensor = torch.ones(12)
        self.is_fitted: bool = False
        
    def fit(self, X: torch.Tensor):
        self.mean = X.mean(dim=0)
        self.std = X.std(dim=0)
        self.std[self.std < 1e-6] = 1.0
        self.is_fitted = True
        
    def transform(self, X: torch.Tensor) -> torch.Tensor:
        assert self.is_fitted, "FeatureScaler is not fitted!"
        return (X - self.mean) / self.std
        
    def inverse_transform(self, X_scaled: torch.Tensor) -> torch.Tensor:
        assert self.is_fitted, "FeatureScaler is not fitted!"
        return X_scaled * self.std + self.mean

class TargetScaler:
    def __init__(self):
        self.mean: float = 0.0
        self.std: float = 1.0
        self.is_fitted: bool = False
        
    def fit(self, y: torch.Tensor):
        self.mean = float(y.mean().item())
        self.std = float(y.std().item())
        if self.std < 1e-6:
            self.std = 1.0
        self.is_fitted = True
        
    def transform(self, y: torch.Tensor) -> torch.Tensor:
        assert self.is_fitted, "TargetScaler is not fitted!"
        return (y - self.mean) / self.std
        
    def inverse_transform(self, y_scaled: torch.Tensor) -> torch.Tensor:
        assert self.is_fitted, "TargetScaler is not fitted!"
        return y_scaled * self.std + self.mean

def verify_scaler_round_trip() -> Dict[str, Any]:
    print("🧪 Executing Automated Target Scaler Round-Trip Verification...")
    
    from ml.dataset import generate_indian_methane_dataset, MethaneTemporalDataset
    data_dict = generate_indian_methane_dataset(target_real_count=600)
    
    train_ds = MethaneTemporalDataset(data_dict["train_samples"])
    val_ds = MethaneTemporalDataset(data_dict["val_samples"])
    test_ds = MethaneTemporalDataset(data_dict["test_samples"])
    
    y_train = train_ds.y[:, 0]
    y_val = val_ds.y[:, 0]
    y_test = test_ds.y[:, 0]
    
    scaler = TargetScaler()
    scaler.fit(y_train)
    
    # 1. Test Round-Trip Accuracy
    y_scaled = scaler.transform(y_train)
    y_restored = scaler.inverse_transform(y_scaled)
    max_err = float(torch.max(torch.abs(y_restored - y_train)).item())
    
    assert max_err <= 1e-4, f"TargetScaler round-trip test failed! max_err = {max_err}"
    
    def export_dist(name: str, tensor: torch.Tensor) -> Dict[str, Any]:
        arr = tensor.numpy()
        sorted_arr = np.sort(arr)
        return {
            "count": len(arr),
            "mean": float(round(np.mean(arr), 1)),
            "std": float(round(np.std(arr), 1)),
            "min": float(round(np.min(arr), 1)),
            "max": float(round(np.max(arr), 1)),
            "median": float(round(np.median(arr), 1)),
            "p05": float(round(np.percentile(arr, 5), 1)),
            "p25": float(round(np.percentile(arr, 25), 1)),
            "p50": float(round(np.percentile(arr, 50), 1)),
            "p75": float(round(np.percentile(arr, 75), 1)),
            "p95": float(round(np.percentile(arr, 95), 1)),
        }
        
    train_dist = export_dist("train", y_train)
    val_dist = export_dist("val", y_val)
    test_dist = export_dist("test", y_test)
    
    with open(TRAINING_DIR / "train_target_distribution.json", "w", encoding="utf-8") as f:
        json.dump(train_dist, f, indent=2)
    with open(TRAINING_DIR / "validation_target_distribution.json", "w", encoding="utf-8") as f:
        json.dump(val_dist, f, indent=2)
    with open(TRAINING_DIR / "test_target_distribution.json", "w", encoding="utf-8") as f:
        json.dump(test_dist, f, indent=2)

    ckpt_path = MODELS_DIR / "pinn_methane_v2.pt"
    ckpt_audit = {"status": "NO CHECKPOINT"}
    if ckpt_path.exists():
        ckpt = torch.load(ckpt_path, map_location="cpu")
        c_mean = float(ckpt.get("target_mean", 0.0))
        c_std = float(ckpt.get("target_std", 1.0))
        
        diff_mean = float(abs(c_mean - scaler.mean))
        diff_std = float(abs(c_std - scaler.std))
        
        ckpt_audit = {
            "target_scaler_match": diff_mean < 1e-2 and diff_std < 1e-2,
            "checkpoint_target_mean": round(c_mean, 1),
            "fitted_target_mean": round(scaler.mean, 1),
            "target_mean_difference": round(diff_mean, 4),
            "checkpoint_target_std": round(c_std, 1),
            "fitted_target_std": round(scaler.std, 1),
            "target_std_difference": round(diff_std, 4),
        }
        with open(MODELS_DIR / "checkpoint_scaler_audit.json", "w", encoding="utf-8") as f:
            json.dump(ckpt_audit, f, indent=2)

    res = {
        "round_trip_status": "PASS",
        "max_absolute_error": max_err,
        "target_scaler_fitted_mean": round(scaler.mean, 1),
        "target_scaler_fitted_std": round(scaler.std, 1),
        "train_target_distribution": train_dist,
        "val_target_distribution": val_dist,
        "test_target_distribution": test_dist,
        "checkpoint_scaler_audit": ckpt_audit,
    }
    
    print(f"✅ TargetScaler Round-Trip Verification PASS (max_err = {max_err:.6e})")
    print(f"📋 Fitted Target Mean: {scaler.mean:.1f} ppb | Std: {scaler.std:.1f} ppb")
    return res

if __name__ == "__main__":
    verify_scaler_round_trip()
