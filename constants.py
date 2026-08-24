"""
Centralized Single Source of Truth for Methane Shadow Hunter ML Pipeline.

Defines feature names, input dimension contract, geographic bounding box,
model file paths, and error scale thresholds.
"""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
SATELLITE_RAW_DIR = DATA_DIR / "satellite" / "raw"
SATELLITE_PROC_DIR = DATA_DIR / "satellite" / "processed"
SATELLITE_META_DIR = DATA_DIR / "satellite" / "metadata"
TRAINING_DIR = DATA_DIR / "training"
MODELS_DIR = DATA_DIR / "models"
PREDICTIONS_DIR = DATA_DIR / "predictions"

FEATURE_NAMES = [
    "latitude",
    "longitude",
    "t_minus_2_ch4",
    "t_minus_1_ch4",
    "background_ch4",
    "anomaly_ppb",
    "z_score",
    "wind_speed",
    "wind_direction",
    "u_wind",
    "v_wind",
    "gaussian_plume_concentration"
]

INPUT_DIM = 12

# Mandatory Startup Contract Assertion
assert len(FEATURE_NAMES) == INPUT_DIM, f"FEATURE_NAMES count ({len(FEATURE_NAMES)}) does not match INPUT_DIM ({INPUT_DIM})"

INDIA_BBOX = [64.0216407222, 3.6235641873, 98.7292544704, 39.2469098899]

# Configurable Error Scale Thresholds
LOW_ERROR_THRESHOLD = 15.0      # ppb
MEDIUM_ERROR_THRESHOLD = 35.0   # ppb
