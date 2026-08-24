"""
5-Model Benchmark, Sanity Tests & Scientific Ablations for Methane Shadow Hunter.

Includes:
1. MLP 1F Sanity Test (t-1 CH4 -> t+1 CH4) -> simple_mlp_1f_results.json
2. MLP 9F Sanity Test (9 Features without Gaussian Plume) -> simple_mlp_9f_results.json
3. Random Forest Feature Importances -> feature_importances.json
4. 5-Model Leaderboard: Persistence, Historical Mean, Random Forest, Standard NN, MethanePINN
5. Physics-Loss Ablation & Gaussian Feature Ablation -> ablation_results.json
"""

import sys
import json
# pyrefly: ignore [missing-import]
import torch
# pyrefly: ignore [missing-import]
import numpy as np
from pathlib import Path
# pyrefly: ignore [missing-import]
from sklearn.ensemble import RandomForestRegressor
# pyrefly: ignore [missing-import]
import torch.nn as nn
# pyrefly: ignore [missing-import]
import torch.optim as optim

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from ml.constants import MODELS_DIR, FEATURE_NAMES, INPUT_DIM
from ml.dataset import generate_indian_methane_dataset, MethaneTemporalDataset
from ml.model import MethanePINN
from ml.scalers import TargetScaler, FeatureScaler

BASELINE_RESULTS_PATH = MODELS_DIR / "baseline_results.json"
ABLATION_RESULTS_PATH = MODELS_DIR / "ablation_results.json"
MLP_1F_PATH = MODELS_DIR / "simple_mlp_1f_results.json"
MLP_9F_PATH = MODELS_DIR / "simple_mlp_9f_results.json"
IMPORTANCES_PATH = MODELS_DIR / "feature_importances.json"

def calculate_metrics(target: np.ndarray, pred: np.ndarray) -> dict:
    assert len(target) == len(pred), f"Length mismatch: {len(target)} != {len(pred)}"
    mae = float(round(np.mean(np.abs(pred - target)), 2))
    rmse = float(round(np.sqrt(np.mean((pred - target) ** 2)), 2))
    mape = float(round(np.mean(np.abs((pred - target) / target)) * 100, 2))
    
    ss_res = np.sum((target - pred) ** 2)
    ss_tot = np.sum((target - np.mean(target)) ** 2)
    r2 = float(round(1.0 - (ss_res / (ss_tot + 1e-8)), 4))
    
    return {"MAE": mae, "RMSE": rmse, "R2": r2, "MAPE": mape}

def run_baseline_benchmark():
    print("🚀 Initializing 5-Model Benchmark & Simple MLP Sanity Tests...")
    
    data_dict = generate_indian_methane_dataset(target_real_count=600)
    
    train_ds = MethaneTemporalDataset(data_dict["train_samples"])
    test_ds = MethaneTemporalDataset(data_dict["test_samples"])
    
    X_train = train_ds.X.numpy()
    y_train_conc = train_ds.y[:, 0].numpy()
    
    X_test = test_ds.X.numpy()
    y_test_conc = test_ds.y[:, 0].numpy()
    
    target_scaler = TargetScaler()
    target_scaler.fit(torch.tensor(y_train_conc))
    
    # 1. Persistence Baseline
    pred_persistence = X_test[:, 3]
    metrics_persistence = calculate_metrics(y_test_conc, pred_persistence)
    
    # 2. Historical Mean Baseline
    mean_val = np.mean(y_train_conc)
    pred_mean = np.full_like(y_test_conc, mean_val)
    metrics_mean = calculate_metrics(y_test_conc, pred_mean)
    
    # 3. Random Forest Regressor (12 Features) & Feature Importances
    rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_model.fit(X_train, y_train_conc)
    pred_rf = rf_model.predict(X_test)
    metrics_rf = calculate_metrics(y_test_conc, pred_rf)
    
    importances = rf_model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    feature_importance_list = []
    for rank, idx in enumerate(sorted_idx, 1):
        feature_importance_list.append({
            "rank": rank,
            "feature_name": FEATURE_NAMES[idx],
            "importance": float(round(importances[idx], 4)),
        })
    with open(IMPORTANCES_PATH, "w", encoding="utf-8") as f:
        json.dump(feature_importance_list, f, indent=2)

    # 4. Simple MLP Sanity Test #1 (1 Feature: t-1 CH4)
    torch.manual_seed(42)
    mlp_1f = nn.Sequential(
        nn.Linear(1, 16),
        nn.ReLU(),
        nn.Linear(16, 1)
    )
    X_train_1f = torch.tensor(X_train[:, 3:4], dtype=torch.float32)
    y_train_scaled = target_scaler.transform(torch.tensor(y_train_conc, dtype=torch.float32)).unsqueeze(1)
    
    mean_1f = X_train_1f.mean()
    std_1f = X_train_1f.std()
    X_train_1f_scaled = (X_train_1f - mean_1f) / std_1f
    
    optimizer_1f = optim.Adam(mlp_1f.parameters(), lr=0.005)
    mse_loss = nn.MSELoss()
    
    mlp_1f.train()
    for _ in range(120):
        optimizer_1f.zero_grad()
        out_scaled = mlp_1f(X_train_1f_scaled)
        loss = mse_loss(out_scaled, y_train_scaled)
        loss.backward()
        optimizer_1f.step()
        
    mlp_1f.eval()
    with torch.no_grad():
        X_test_1f = torch.tensor(X_test[:, 3:4], dtype=torch.float32)
        X_test_1f_scaled = (X_test_1f - mean_1f) / std_1f
        pred_scaled_1f = mlp_1f(X_test_1f_scaled)[:, 0]
        pred_1f = target_scaler.inverse_transform(pred_scaled_1f).numpy()
        
    metrics_mlp_1f = calculate_metrics(y_test_conc, pred_1f)
    with open(MLP_1F_PATH, "w", encoding="utf-8") as f:
        json.dump({"model": "Simple MLP (1 Feature)", **metrics_mlp_1f}, f, indent=2)

    # 5. Simple MLP Sanity Test #2 (9 Features: No Gaussian Feature)
    torch.manual_seed(42)
    X_train_9f = torch.tensor(X_train[:, :9], dtype=torch.float32)
    mean_9f = X_train_9f.mean(dim=0)
    std_9f = X_train_9f.std(dim=0)
    X_train_9f_scaled = (X_train_9f - mean_9f) / std_9f
    
    mlp_9f = nn.Sequential(
        nn.Linear(9, 32),
        nn.ReLU(),
        nn.Linear(32, 16),
        nn.ReLU(),
        nn.Linear(16, 1)
    )
    optimizer_9f = optim.Adam(mlp_9f.parameters(), lr=0.003)
    
    mlp_9f.train()
    for _ in range(120):
        optimizer_9f.zero_grad()
        out_scaled = mlp_9f(X_train_9f_scaled)
        loss = mse_loss(out_scaled, y_train_scaled)
        loss.backward()
        optimizer_9f.step()
        
    mlp_9f.eval()
    with torch.no_grad():
        X_test_9f = torch.tensor(X_test[:, :9], dtype=torch.float32)
        X_test_9f_scaled = (X_test_9f - mean_9f) / std_9f
        pred_scaled_9f = mlp_9f(X_test_9f_scaled)[:, 0]
        pred_9f = target_scaler.inverse_transform(pred_scaled_9f).numpy()
        
    metrics_mlp_9f = calculate_metrics(y_test_conc, pred_9f)
    with open(MLP_9F_PATH, "w", encoding="utf-8") as f:
        json.dump({"model": "Simple MLP (9 Features)", **metrics_mlp_9f}, f, indent=2)

    # 6. Standard Neural Network (12 Features, No Physics Loss, Target Scaling Restored)
    torch.manual_seed(42)
    std_nn_12 = MethanePINN(input_dim=INPUT_DIM)
    std_nn_12.set_normalization(train_ds.X.mean(dim=0), train_ds.X.std(dim=0))
    optimizer = optim.Adam(std_nn_12.parameters(), lr=0.003)
    
    X_train_t = torch.tensor(X_train, dtype=torch.float32)
    
    std_nn_12.train()
    for _ in range(150):
        optimizer.zero_grad()
        preds_raw = std_nn_12(X_train_t)[:, 0:1]
        preds_scaled = (preds_raw - target_scaler.mean) / target_scaler.std
        loss = mse_loss(preds_scaled, y_train_scaled)
        loss.backward()
        optimizer.step()
        
    std_nn_12.eval()
    with torch.no_grad():
        X_test_t = torch.tensor(X_test, dtype=torch.float32)
        pred_std_nn_12 = std_nn_12(X_test_t)[:, 0].numpy()
        
    metrics_std_nn_12 = calculate_metrics(y_test_conc, pred_std_nn_12)

    leaderboard = [
        {"model": "Persistence", "type": "Predictive Baseline", "features": 1, **metrics_persistence},
        {"model": "Historical Mean", "type": "Predictive Baseline", "features": 0, **metrics_mean},
        {"model": "Random Forest", "type": "Predictive Baseline", "features": 12, **metrics_rf},
        {"model": "MLP (1 Feature)", "type": "Sanity Test", "features": 1, **metrics_mlp_1f},
        {"model": "MLP (9 Features)", "type": "Sanity Test", "features": 9, **metrics_mlp_9f},
        {"model": "Standard Neural Net", "type": "Physics Ablation (No Physics Loss)", "features": 12, **metrics_std_nn_12},
    ]
    
    ablation_report = {
        "physics_loss_ablation": {
            "nn_without_physics_loss": metrics_std_nn_12,
            "description": "Standard NN (12 Features) vs MethanePINN (12 Features + Physics Loss)",
        },
        "gaussian_feature_ablation": {
            "nn_without_gaussian_feature_9f": metrics_mlp_9f,
            "nn_with_gaussian_feature_12f": metrics_std_nn_12,
        },
    }
    
    with open(BASELINE_RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump(leaderboard, f, indent=2)
        
    with open(ABLATION_RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump(ablation_report, f, indent=2)
        
    print("📊 PREDICTIVE LEADERBOARD & SANITY TEST RESULTS:")
    for r in leaderboard:
        print(f"  - {r['model']:<20} | R²: {r['R2']:<6} | RMSE: {r['RMSE']:<7} ppb | MAE: {r['MAE']} ppb")
        
    print(f"✅ Sanity test & baseline results saved to: {BASELINE_RESULTS_PATH}")
    return leaderboard

if __name__ == "__main__":
    run_baseline_benchmark()
