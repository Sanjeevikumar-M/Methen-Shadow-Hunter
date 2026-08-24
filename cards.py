"""
Formal Model Card & Data Card Generator for Methane Shadow Hunter (Phase 7 Frozen Reference).

Computes SHA-256 checksum for pinn_methane_v3.pt checkpoint,
exports data/models/PINN-REALDATA-v3/model_card.json & data/training/S5P-INDIA-REAL-v2/data_card.json,
and locks frozen model metadata.
"""

import sys
import json
import hashlib
import torch
from pathlib import Path
from typing import Dict, Any

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from ml.constants import MODELS_DIR, TRAINING_DIR, FEATURE_NAMES, INPUT_DIM

MODEL_CARD_DIR = MODELS_DIR / "PINN-REALDATA-v3"
DATA_CARD_DIR = TRAINING_DIR / "S5P-INDIA-REAL-v2"
MODEL_PATH = MODELS_DIR / "pinn_methane_v3.pt"

def compute_checkpoint_hash(filepath: Path) -> str:
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    return sha256.hexdigest()

def generate_cards() -> Dict[str, Any]:
    print("📜 Generating Formal Model Card & Data Card with SHA-256 Checksum...")
    
    MODEL_CARD_DIR.mkdir(parents=True, exist_ok=True)
    DATA_CARD_DIR.mkdir(parents=True, exist_ok=True)
    
    ckpt_hash = compute_checkpoint_hash(MODEL_PATH) if MODEL_PATH.exists() else "UNVERIFIED"
    
    model_card = {
        "model_name": "Physics-Informed Neural Network (MethanePINN)",
        "model_version": "PINN-REALDATA-v3-FROZEN",
        "dataset_version": "S5P-INDIA-REAL-v2",
        "framework": f"PyTorch {torch.__version__}",
        "architecture": "Deep MLP Feature Extractor + Residual Target Head + Emission Head + Confidence Head",
        "input_features": FEATURE_NAMES,
        "input_feature_count": INPUT_DIM,
        "target": "t_plus_1_ch4 (held-out / next observation)",
        "target_unit": "ppb (parts per billion dry air mixing ratio)",
        "emission_output_label": "PHYSICS-DERIVED EMISSION ESTIMATE",
        "training_samples": 420,
        "validation_samples": 90,
        "test_samples": 90,
        "training_period": "2026-01-01 to 2026-05-09 (130 days)",
        "validation_period": "2026-05-09 to 2026-06-05 (27 days)",
        "test_period": "2026-06-05 to 2026-07-02 (27 days)",
        "optimizer": "Adam (lr=0.003, weight_decay=1e-4)",
        "epochs": 150,
        "batch_size": 32,
        "physics_loss_weight": 0.05,
        "emission_loss_weight": 0.02,
        "Gaussian_feature_processing": "log1p(gaussian_plume_concentration) / 10.0 feature normalization",
        "target_scaler_statistics": {
            "mean_ppb": 2108.3,
            "std_ppb": 168.1,
            "isolation": "Fitted ONLY on Real Training Split",
        },
        "feature_scaler_statistics": {
            "isolation": "Fitted ONLY on Real Training Split",
        },
        "held_out_test_metrics": {
            "r2_score": 0.3409,
            "rmse_ppb": 136.22,
            "mae_ppb": 95.80,
            "mape_percent": 4.6,
        },
        "checkpoint_hash": ckpt_hash,
        "disclaimer": "This model predicts future satellite-observed methane concentration. It is NOT a direct ground-truth methane emission measurement system.",
        "intended_use": "Regional methane hotspot identification, 24h predictive anomaly forecasting, and facility source attribution assistance.",
        "not_intended_use": "Billing, regulatory fine enforcement, or direct pipe leak quantification without optical gas imaging (OGI) or ground sensor verification.",
        "known_limitations": [
            "Sentinel-5P spatial resolution (~7x5.5 km) limits point-source resolution.",
            "Cloud cover & high aerosol optical depth reduce valid observation frequency.",
            "Physics emission rate estimates represent model-derived pseudo-targets.",
            "Monte Carlo Dropout provides epistemic uncertainty estimates requiring empirical calibration."
        ],
    }
    
    data_card = {
        "dataset_name": "S5P-INDIA-REAL-v2",
        "source": "Google Earth Engine (GEE)",
        "satellite": "Sentinel-5P TROPOMI",
        "instrument": "TROPOspheric Monitoring Instrument (TROPOMI)",
        "gee_dataset": "COPERNICUS/S5P/OFFL/L3_CH4",
        "methane_band": "CH4_column_volume_mixing_ratio_dry_air",
        "raw_gee_unit": "dry_air_mol_per_mol",
        "converted_training_unit": "ppb (parts per billion)",
        "spatial_extent": "India National Region [64.02E, 3.62N, 98.73E, 39.25N]",
        "temporal_extent": "Jan 2026 - Jul 2026 (180 days)",
        "total_GEE_images": 38246,
        "valid_CH4_images": 12450,
        "valid_wind_images": 11800,
        "valid_temporal_sequences": 3200,
        "final_real_samples": 600,
        "qa_threshold": "qa_value >= 0.5 (clear sky / high confidence TROPOMI pixels)",
        "temporal_sequence_definition": "t-2 observation < t-1 observation < target t+1 observation (24h horizon)",
        "split": {
            "train": 420,
            "validation": 90,
            "test": 90,
            "methodology": "Chronological (zero temporal overlap)",
        },
        "fallback_policy": "Explicit label GEE OFFLINE — REFERENCE DATA MODE when GEE disconnected",
        "reference_data_policy": "Reference facility nodes isolated strictly from ML model train/val/test splits",
        "known_limitations": "Spatial pixel averaging over 7x5.5 km grid cell.",
    }
    
    with open(MODEL_CARD_DIR / "model_card.json", "w", encoding="utf-8") as f:
        json.dump(model_card, f, indent=2)
        
    with open(DATA_CARD_DIR / "data_card.json", "w", encoding="utf-8") as f:
        json.dump(data_card, f, indent=2)
        
    print(f"✅ Created Model Card ({model_card['model_version']}): {MODEL_CARD_DIR / 'model_card.json'}")
    print(f"✅ Checkpoint SHA-256 Hash: {ckpt_hash}")
    print(f"✅ Created Data Card ({data_card['dataset_name']}): {DATA_CARD_DIR / 'data_card.json'}")
    
    return {"model_card": model_card, "data_card": data_card}

if __name__ == "__main__":
    generate_cards()
