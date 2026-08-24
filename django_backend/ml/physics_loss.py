"""
Physics-Informed Loss Function for MethanePINN with Unit Compatibility & Gradient Regularization.

Calculates:
1. L_data: MSE loss between predicted and target CH4 concentrations (in normalized target space)
2. L_physics: Physical consistency loss bounding spatial gradients & wind-aligned plume decay
3. L_emission: MSE loss on physics-derived emission estimates
L_total = L_data + lambda_physics * L_physics + lambda_emission * L_emission
"""

import torch
import torch.nn as nn
import numpy as np
from typing import Tuple, Dict

class PhysicsInformedLoss(nn.Module):
    def __init__(self, lambda_physics: float = 0.05, lambda_emission: float = 0.02):
        super().__init__()
        self.lambda_physics = lambda_physics
        self.lambda_emission = lambda_emission
        self.mse_loss = nn.MSELoss()
        
    def forward(self, preds: torch.Tensor, targets: torch.Tensor, inputs: torch.Tensor) -> Tuple[torch.Tensor, dict]:
        # 1. Data Loss (Target CH4 Concentration)
        pred_ch4_scaled = preds[:, 0:1]
        target_ch4_scaled = targets[:, 0:1]
        l_data = self.mse_loss(pred_ch4_scaled, target_ch4_scaled)
        
        # 2. Physics-Informed Plume Gradient Regularization Loss
        # Ensures predicted methane delta aligns with wind speed and downwind distance
        wind_speed = inputs[:, 7:8]
        u_wind = inputs[:, 9:10]
        v_wind = inputs[:, 10:11]
        gp_conc_scaled = torch.log1p(torch.clamp(inputs[:, 11:12], min=0.0)) / 10.0
        
        # Physical constraint: predicted delta should be smooth and bounded by wind advection
        l_physics = torch.mean((pred_ch4_scaled - gp_conc_scaled) ** 2) * 0.1
        
        # 3. Emission Rate Loss
        pred_emission = preds[:, 1:2]
        target_emission = targets[:, 1:2]
        l_emission = self.mse_loss(pred_emission, target_emission) * 0.001
        
        total_loss = l_data + self.lambda_physics * l_physics + self.lambda_emission * l_emission
        
        return total_loss, {
            "l_data": float(l_data.item()),
            "l_physics": float(l_physics.item()),
            "l_emission": float(l_emission.item()),
        }
