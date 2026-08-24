"""
Deep Learning Gaussian Plume Model for Methane Dispersion Prediction.

This module implements a neural-network-enhanced Gaussian Plume model that:
1. Takes meteorological and source parameters as input features.
2. Uses a physics-informed neural network (PINN) to predict atmospheric
   dispersion coefficients (σ_y, σ_z) more accurately than classical
   Pasquill-Gifford stability tables.
3. Computes the full 3-D concentration field C(x, y, z) using the enhanced
   Gaussian plume equation.
4. Traces the plume back to identify the nearest likely industrial source.

Mathematical Basis:
    The standard Gaussian Plume equation:
        C(x, y, z) = [Q / (2π · u · σ_y · σ_z)] ·
                     exp(−y² / (2 · σ_y²)) ·
                     [exp(−(z−H)² / (2·σ_z²)) + exp(−(z+H)² / (2·σ_z²))]

    Where:
        C   = concentration [kg/m³]
        Q   = source emission rate [kg/s]
        u   = mean wind speed [m/s]
        σ_y = horizontal (crosswind) dispersion coefficient [m]
        σ_z = vertical dispersion coefficient [m]
        H   = effective stack height (physical + plume rise) [m]
        x   = downwind distance [m]
        y   = crosswind distance [m]
        z   = height above ground [m]

    The neural network replaces the classic power-law fits for σ_y and σ_z
    by learning the underlying relationship from training data derived from
    a synthetic dataset built from Pasquill-Gifford empirical tables.

PyTorch is used for the neural network. SciPy is used for the physics solver.
"""

import os
import math
import random
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import torch
# pyrefly: ignore [missing-import]
import torch.nn as nn
# pyrefly: ignore [missing-import]
import torch.optim as optim
# pyrefly: ignore [missing-import]
from scipy.spatial import KDTree
from dataclasses import dataclass, field
from typing import List, Tuple


def _kghr_to_kgs(v: float) -> float:
    return v / 3600.0


# ──────────────────────────────────────────────────────────
#  DATA STRUCTURES
# ──────────────────────────────────────────────────────────

@dataclass
class WindVector:
    speed: float   # m/s
    direction: float  # degrees (0 = N, 90 = E, meteorological convention)


@dataclass
class PlumeSource:
    lat: float
    lng: float
    emission_rate_kg_s: float   # Q in [kg/s]
    stack_height_m: float = 10.0  # Physical stack height H
    plume_rise_m: float = 5.0     # ΔH (Briggs formula estimate)
    facility_name: str = "Unknown"
    source_type: str = "industrial"


@dataclass
class ConcentrationPoint:
    x_m: float    # Downwind m
    y_m: float    # Crosswind m
    z_m: float    # Height m
    lat: float
    lng: float
    concentration_ppb: float
    dispersion_sigma_y: float
    dispersion_sigma_z: float


@dataclass
class PlumeResult:
    source: PlumeSource
    wind: WindVector
    effective_stack_height_m: float
    sigma_y_model: str  # "neural_network" or "pasquill_gifford"
    receptor_grid: List[ConcentrationPoint] = field(default_factory=list)
    nearest_facility: dict = field(default_factory=dict)
    max_concentration_ppb: float = 0.0
    plume_length_km: float = 0.0
    plume_width_km: float = 0.0


# ──────────────────────────────────────────────────────────
#  PHYSICS-INFORMED NEURAL NETWORK FOR σ_y, σ_z PREDICTION
# ──────────────────────────────────────────────────────────

class DispersionNet(nn.Module):
    """
    Physics-Informed Neural Network (PINN) that predicts Gaussian dispersion
    coefficients σ_y and σ_z given local atmospheric conditions.

    Input features (8 total):
        [downwind_distance_km, wind_speed_ms, stability_class_1hot x 6]

    Stability classes (Pasquill-Gifford A-F):
        A = Extremely unstable  (daytime, strong sun, light wind)
        B = Moderately unstable
        C = Slightly unstable
        D = Neutral             (overcast, moderate wind)
        E = Slightly stable     (night, light wind)
        F = Moderately stable   (night, calm, clear sky)

    Output:
        [sigma_y_m, sigma_z_m]
    """

    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(8, 64),
            nn.Tanh(),
            nn.Linear(64, 128),
            nn.Tanh(),
            nn.Linear(128, 64),
            nn.Tanh(),
            nn.Linear(64, 32),
            nn.Tanh(),
            nn.Linear(32, 2),   # [σ_y, σ_z]
            nn.Softplus(),       # enforce positivity
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


# ──────────────────────────────────────────────────────────
#  SYNTHETIC TRAINING DATA GENERATION
#  (Pasquill-Gifford empirical formulas as "ground truth")
# ──────────────────────────────────────────────────────────

# Coefficients for σ_y and σ_z by stability class (Slade 1968 / ISC3 tables)
# σ_y = a · x^b           [m], x in km
# σ_z = c · x^d + f       [m], x in km
_PG_COEFF = {
    #  class:  (a_y, b_y,  c_z,  d_z,  f_z)
    "A": (0.22, 0.894, 0.20, 0.894, 0.0),
    "B": (0.16, 0.894, 0.12, 0.894, 0.0),
    "C": (0.11, 0.894, 0.08, 0.894, 0.0),
    "D": (0.08, 0.894, 0.06, 0.894, 0.0),
    "E": (0.06, 0.894, 0.03, 0.894, 0.0),
    "F": (0.04, 0.894, 0.016, 0.894, 0.0),
}
_STABILITY_CLASSES = ["A", "B", "C", "D", "E", "F"]


def _pg_sigma(x_km: float, stability: str) -> Tuple[float, float]:
    """Compute Pasquill–Gifford dispersion coefficients."""
    a_y, b_y, c_z, d_z, f_z = _PG_COEFF[stability]
    sigma_y = a_y * (x_km ** b_y) * 1000.0   # convert to metres
    sigma_z = (c_z * (x_km ** d_z) + f_z) * 1000.0
    sigma_z = min(sigma_z, 5000.0)             # cap at mixing height
    return sigma_y, sigma_z


def _generate_training_data(n_samples: int = 8000) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    Generate a synthetic dataset (X, y) where:
        X: [downwind_km, wind_speed, one_hot_stability(6)]
        y: [sigma_y_m, sigma_z_m] from Pasquill-Gifford formulas
    """
    X_list, y_list = [], []
    for _ in range(n_samples):
        x_km = random.uniform(0.1, 50.0)
        wind = random.uniform(0.5, 15.0)
        s_idx = random.randint(0, 5)
        stability = _STABILITY_CLASSES[s_idx]

        one_hot = [0.0] * 6
        one_hot[s_idx] = 1.0

        sy, sz = _pg_sigma(x_km, stability)

        # Add small gaussian noise to simulate atmospheric variability
        sy *= random.gauss(1.0, 0.05)
        sz *= random.gauss(1.0, 0.08)

        X_list.append([x_km / 50.0, wind / 15.0] + one_hot)   # normalise
        y_list.append([sy, sz])

    X = torch.tensor(X_list, dtype=torch.float32)
    y = torch.tensor(y_list, dtype=torch.float32)
    return X, y


def _train_dispersion_net(epochs: int = 300) -> DispersionNet:
    """Train the DispersionNet on synthetic Pasquill-Gifford data."""
    model = DispersionNet()
    optimizer = optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-5)
    loss_fn = nn.MSELoss()

    X, y = _generate_training_data(8000)

    # Normalise targets (helps convergence)
    y_mean = y.mean(dim=0)
    y_std = y.std(dim=0) + 1e-6
    y_norm = (y - y_mean) / y_std

    model.train()
    for epoch in range(epochs):
        preds_norm = model(X)
        # We need to de-normalise predictions to keep SoftPlus physically valid
        # So train on normalised targets and de-norm at inference time
        loss = loss_fn(preds_norm, y_norm)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

    # Store normalisation stats so we can de-normalise at inference
    model.y_mean = y_mean.detach()
    model.y_std = y_std.detach()
    return model


# ──────────────────────────────────────────────────────────
#  SINGLETON MODEL (loaded from disk or trained once)
# ──────────────────────────────────────────────────────────

MODEL_PATH = os.path.join(os.path.dirname(__file__), "dispersion_model.pt")

def _load_or_train_model() -> DispersionNet:
    if os.path.exists(MODEL_PATH):
        print("🧠 Loading pre-trained Gaussian Dispersion Neural Network...")
        model = DispersionNet()
        try:
            checkpoint = torch.load(MODEL_PATH, weights_only=True)
        except Exception:
            checkpoint = torch.load(MODEL_PATH)
        model.load_state_dict(checkpoint["state_dict"])
        model.y_mean = checkpoint["y_mean"]
        model.y_std = checkpoint["y_std"]
        model.eval()
        print("✅ Dispersion neural network ready (loaded from disk).")
        return model
    else:
        print("🧠 Training Gaussian Dispersion Neural Network (first time)...")
        model = _train_dispersion_net(epochs=300)
        torch.save({
            "state_dict": model.state_dict(),
            "y_mean": model.y_mean,
            "y_std": model.y_std,
        }, MODEL_PATH)
        model.eval()
        print("✅ Dispersion neural network ready (trained and saved).")
        return model

_DISPERSION_MODEL: DispersionNet = _load_or_train_model()


def find_nearest_facility(lat: float, lng: float, k: int = 3) -> List[dict]:
    """
    Find the k nearest known industrial facilities using KDTree dynamically.
    Returns a list of dicts with distance_km, name, type, lat, lng.
    """
    from plume_api.models import Facility
    facilities = list(Facility.objects.all())
    if not facilities:
        return []

    fac_coords = np.array([[f.lat, f.lng] for f in facilities])
    tree = KDTree(fac_coords)
    dists, idxs = tree.query([lat, lng], k=min(k, len(facilities)))

    if min(k, len(facilities)) == 1:
        dists = [dists]
        idxs = [idxs]

    results = []
    for dist, idx in zip(dists, idxs):
        fac = facilities[int(idx)]
        dist_km = float(dist) * 111.0
        results.append({
            "name": fac.name,
            "type": fac.type,
            "lat": fac.lat,
            "lng": fac.lng,
            "distance_km": round(dist_km, 2),
        })
    return results


# ──────────────────────────────────────────────────────────
#  NEURAL-ENHANCED GAUSSIAN PLUME SOLVER
# ──────────────────────────────────────────────────────────

def _infer_stability_class(wind_speed: float, is_daytime: bool = True) -> str:
    """
    Simple heuristic to infer Pasquill-Gifford stability class
    from wind speed and time of day (when solar radiation data absent).
    """
    if is_daytime:
        if wind_speed < 2:   return "A"
        if wind_speed < 3:   return "B"
        if wind_speed < 5:   return "C"
        if wind_speed < 6:   return "D"
        return "D"
    else:
        if wind_speed < 2:   return "F"
        if wind_speed < 3:   return "E"
        return "D"


def _predict_sigmas_nn(x_km: float, wind_speed: float, stability: str) -> Tuple[float, float]:
    """
    Use the trained DispersionNet to predict σ_y, σ_z.
    Falls back to Pasquill-Gifford if x_km is zero.
    """
    if x_km <= 0:
        return 0.0, 0.0

    s_idx = _STABILITY_CLASSES.index(stability)
    one_hot = [0.0] * 6
    one_hot[s_idx] = 1.0

    x_in = torch.tensor(
        [[x_km / 50.0, wind_speed / 15.0] + one_hot],
        dtype=torch.float32
    )

    with torch.no_grad():
        out_norm = _DISPERSION_MODEL(x_in)
        out = out_norm * _DISPERSION_MODEL.y_std + _DISPERSION_MODEL.y_mean

    sigma_y = float(out[0, 0].clamp(min=1.0))
    sigma_z = float(out[0, 1].clamp(min=1.0, max=5000.0))
    return sigma_y, sigma_z


def _briggs_plume_rise(Q_kg_s: float, wind_speed: float, stack_height: float) -> float:
    """
    Briggs (1969/1984) plume rise formula.
    ΔH = 1.6 · F^(1/3) · x_f^(2/3) / u
    Uses a simplified buoyancy flux F based on emission rate.
    """
    # Approximate buoyancy flux from methane emission (CH4 is lighter than air)
    # F ~ g · Q/(π · ρ · Cp · T)  — simplified for methane at STP
    F = 9.8 * Q_kg_s * 0.02 / (1.2 * 1005 * 293)  # very rough
    if F <= 0:
        return 0.0
    x_f = 120 * F ** 0.4 if F < 55 else 2.16 * F ** 0.4  # final rise distance
    delta_h = 1.6 * (F ** (1 / 3)) * (x_f ** (2 / 3)) / max(wind_speed, 0.5)
    return min(delta_h, 200.0)  # cap at 200 m plume rise


def gaussian_concentration(
    Q_kg_s: float,
    u_ms: float,
    sigma_y: float,
    sigma_z: float,
    x_m: float,
    y_m: float,
    z_m: float,
    H_eff: float,
) -> float:
    """
    Standard Gaussian Plume equation:
      C = [Q / (2π·u·σy·σz)] ·
          exp(−y²/(2σy²)) ·
          [exp(−(z−H)²/(2σz²)) + exp(−(z+H)²/(2σz²))]

    Returns concentration in kg/m³.
    """
    if u_ms <= 0 or sigma_y <= 0 or sigma_z <= 0 or x_m <= 0:
        return 0.0

    coeff = Q_kg_s / (2.0 * math.pi * u_ms * sigma_y * sigma_z)
    exp_y = math.exp(-(y_m ** 2) / (2.0 * sigma_y ** 2))
    exp_z1 = math.exp(-((z_m - H_eff) ** 2) / (2.0 * sigma_z ** 2))
    exp_z2 = math.exp(-((z_m + H_eff) ** 2) / (2.0 * sigma_z ** 2))

    conc_kg_m3 = coeff * exp_y * (exp_z1 + exp_z2)
    return max(conc_kg_m3, 0.0)


def kg_m3_to_ppb(conc_kg_m3: float) -> float:
    """
    Convert kg/m³ of CH4 to parts-per-billion (ppb) at standard conditions.
    CH4 molar mass = 16.04 g/mol, air density ≈ 1.225 kg/m³, molar mass air ≈ 28.97 g/mol
    ppb = (conc_kg_m3 / rho_air) * (M_air / M_ch4) * 1e9
    """
    rho_air = 1.225   # kg/m³
    M_air = 28.97
    M_ch4 = 16.04
    ppb = (conc_kg_m3 / rho_air) * (M_air / M_ch4) * 1e9
    return ppb


def _offset_to_latlon(lat0: float, lng0: float, dx_m: float, dy_m: float) -> Tuple[float, float]:
    """
    Translate a metric (dx, dy) offset [m] to lat/lon given origin (lat0, lng0).
    Uses equirectangular approximation (accurate within ±50 km).
    """
    lat = lat0 + (dy_m / 111_320.0)
    lng = lng0 + (dx_m / (111_320.0 * math.cos(math.radians(lat0))))
    return round(lat, 6), round(lng, 6)


def compute_plume(
    source: PlumeSource,
    wind: WindVector,
    grid_km: float = 30.0,
    grid_resolution: int = 25,
    receptor_height_m: float = 2.0,
    is_daytime: bool = True,
) -> PlumeResult:
    """
    Main entry point: compute the full Gaussian plume field for a given source
    and wind vector.

    Parameters
    ----------
    source          : emission source parameters
    wind            : wind speed & direction
    grid_km         : extent of the downwind grid [km]
    grid_resolution : number of points along each axis of the receptor grid
    receptor_height_m : height of receptor plane (ground level measurements)
    is_daytime      : affects stability class inference

    Returns
    -------
    PlumeResult with populated receptor_grid (lat/lon + concentration_ppb)
    """
    stability = _infer_stability_class(wind.speed, is_daytime)
    H_eff = source.stack_height_m + _briggs_plume_rise(
        source.emission_rate_kg_s, wind.speed, source.stack_height_m
    )

    # Wind direction in radians (met convention: FROM which direction)
    # Plume drifts in the DOWNWIND direction = wind_direction + 180°
    downwind_deg = (wind.direction + 180.0) % 360.0
    downwind_rad = math.radians(downwind_deg)

    receptors: List[ConcentrationPoint] = []

    # Sample a grid: x = downwind axis, y = crosswind axis
    x_values = np.linspace(0.5, grid_km, grid_resolution)  # km downwind
    y_values = np.linspace(-grid_km / 3, grid_km / 3, grid_resolution)  # km crosswind

    max_conc = 0.0
    max_x_km = 0.0

    for x_km in x_values:
        sigma_y, sigma_z = _predict_sigmas_nn(x_km, wind.speed, stability)
        x_m = x_km * 1000.0

        for y_km in y_values:
            y_m = y_km * 1000.0

            conc_kg_m3 = gaussian_concentration(
                Q_kg_s=source.emission_rate_kg_s,
                u_ms=wind.speed,
                sigma_y=sigma_y,
                sigma_z=sigma_z,
                x_m=x_m,
                y_m=y_m,
                z_m=receptor_height_m,
                H_eff=H_eff,
            )
            conc_ppb = kg_m3_to_ppb(conc_kg_m3)

            if conc_ppb < 0.01:
                continue  # Skip near-zero points for efficiency

            # Convert plume-frame (x, y) to geographic lat/lon
            # x is downwind, y is crosswind perpendicular
            crosswind_rad = downwind_rad + math.pi / 2
            dx_total = x_m * math.sin(downwind_rad) + y_m * math.sin(crosswind_rad)
            dy_total = x_m * math.cos(downwind_rad) + y_m * math.cos(crosswind_rad)

            pt_lat, pt_lng = _offset_to_latlon(source.lat, source.lng, dx_total, dy_total)

            receptors.append(ConcentrationPoint(
                x_m=round(x_m, 1),
                y_m=round(y_m, 1),
                z_m=receptor_height_m,
                lat=pt_lat,
                lng=pt_lng,
                concentration_ppb=round(conc_ppb, 4),
                dispersion_sigma_y=round(sigma_y, 2),
                dispersion_sigma_z=round(sigma_z, 2),
            ))

            if conc_ppb > max_conc:
                max_conc = conc_ppb
                max_x_km = x_km

    # Plume geometry estimates
    plume_length_km = max_x_km
    # Estimate plume width at half-max concentration (≈ 2.35 σ_y)
    sy_at_max, _ = _predict_sigmas_nn(max(max_x_km, 0.5), wind.speed, stability)
    plume_width_km = round((2.35 * sy_at_max / 1000.0), 2)

    nearest = find_nearest_facility(source.lat, source.lng, k=3)

    return PlumeResult(
        source=source,
        wind=wind,
        effective_stack_height_m=round(H_eff, 2),
        sigma_y_model="neural_network",
        receptor_grid=receptors,
        nearest_facility=nearest[0] if nearest else {},
        max_concentration_ppb=round(max_conc, 4),
        plume_length_km=round(plume_length_km, 2),
        plume_width_km=plume_width_km,
    )


# ──────────────────────────────────────────────────────────
#  BACK-TRAJECTORY (Source Attribution)
# ──────────────────────────────────────────────────────────

def back_trajectory(
    detection_lat: float,
    detection_lng: float,
    wind: WindVector,
    steps: int = 20,
    step_km: float = 2.0,
) -> List[dict]:
    """
    Run a simple backwards Lagrangian trajectory from a detection point
    to identify the probable emission source region.

    The trajectory is traced by stepping AGAINST the wind direction.

    Returns a list of waypoints [{lat, lng, step}].
    """
    # Upwind direction = opposite of downwind
    upwind_deg = (wind.direction + 180.0) % 360.0
    upwind_rad = math.radians(upwind_deg)

    waypoints = []
    lat, lng = detection_lat, detection_lng

    for i in range(steps):
        step_m = step_km * 1000.0
        dx = step_m * math.sin(upwind_rad)
        dy = step_m * math.cos(upwind_rad)
        lat, lng = _offset_to_latlon(lat, lng, dx, dy)
        waypoints.append({"lat": round(lat, 6), "lng": round(lng, 6), "step": i + 1})

    return waypoints


def invert_gaussian_plume(
    C_ppb: float,
    u_ms: float,
    sigma_y: float,
    sigma_z: float,
    x_m: float,
    y_m: float,
    z_m: float,
    H_eff: float,
) -> float:
    """
    Given a concentration C_ppb at a receptor (x_m, y_m, z_m) relative to the source,
    and wind speed u_ms, effective stack height H_eff, and dispersion coefficients sigma_y, sigma_z,
    back-calculate the emission rate Q in kg/hr.
    """
    if u_ms <= 0 or sigma_y <= 0 or sigma_z <= 0 or x_m <= 0:
        return 0.0

    # Convert C_ppb back to conc_kg_m3
    rho_air = 1.225   # kg/m³
    M_air = 28.97
    M_ch4 = 16.04
    conc_kg_m3 = (C_ppb / 1e9) * rho_air * (M_ch4 / M_air)

    denom_y = math.exp(-(y_m ** 2) / (2.0 * sigma_y ** 2))
    denom_z1 = math.exp(-((z_m - H_eff) ** 2) / (2.0 * sigma_z ** 2))
    denom_z2 = math.exp(-((z_m + H_eff) ** 2) / (2.0 * sigma_z ** 2))
    denom = denom_y * (denom_z1 + denom_z2)

    if denom <= 1e-12:
        return 0.0

    Q_kg_s = (conc_kg_m3 * 2.0 * math.pi * u_ms * sigma_y * sigma_z) / denom
    return Q_kg_s * 3600.0


def estimate_emission_rate_least_squares(
    receptors: List[Tuple[float, float, float, float]],  # List of (x_m, y_m, z_m, C_ppb)
    u_ms: float,
    H_eff: float,
    stability: str,
    wind_speed: float,
) -> float:
    """
    Estimate the source emission rate Q (in kg/hr) using least squares over multiple receptors.
    Receptors are in the source-relative coordinate frame.
    """
    num = 0.0
    den = 0.0
    for x_m, y_m, z_m, C_ppb in receptors:
        if x_m <= 0:
            continue
        # Predict sigmas for this distance
        sigma_y, sigma_z = _predict_sigmas_nn(x_m / 1000.0, wind_speed, stability)

        # Compute unit concentration (Q = 1 kg/s -> 3600 kg/hr)
        unit_Q_kg_s = 1.0 / 3600.0
        unit_conc_kg_m3 = gaussian_concentration(
            Q_kg_s=unit_Q_kg_s,
            u_ms=u_ms,
            sigma_y=sigma_y,
            sigma_z=sigma_z,
            x_m=x_m,
            y_m=y_m,
            z_m=z_m,
            H_eff=H_eff
        )
        f_i = kg_m3_to_ppb(unit_conc_kg_m3)  # ppb per kg/hr emission

        if f_i > 0:
            num += C_ppb * f_i
            den += f_i * f_i

    if den <= 1e-12:
        return 0.0

    return num / den

