"""
PyTorch MethanePINN Model with Log-Scaled Physics Feature Bounding (PINN-REALDATA-v3).

Applies log1p transformation to Feature #12 (gaussian_plume_concentration) before neural feature scaling,
preventing extreme plume magnitude (e.g. 24,800 ppb) from dominating gradient updates.
Includes Monte Carlo Dropout uncertainty estimation.
"""

import torch
import torch.nn as nn
import numpy as np
from typing import Tuple

class MethanePINN(nn.Module):
    def __init__(self, input_dim: int = 12, hidden_dim: int = 64, dropout_rate: float = 0.15):
        super().__init__()
        self.input_dim = input_dim
        
        # Register normalization buffers
        self.register_buffer("feature_mean", torch.zeros(input_dim))
        self.register_buffer("feature_std", torch.ones(input_dim))
        self.register_buffer("is_normalized", torch.tensor(False, dtype=torch.bool))
        
        # Shared feature extractor
        self.shared_layers = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.SiLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(hidden_dim, hidden_dim),
            nn.SiLU(),
            nn.Dropout(dropout_rate),
        )
        
        # Prediction Heads
        self.ch4_head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.SiLU(),
            nn.Linear(32, 1)
        )
        
        self.emission_head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.SiLU(),
            nn.Linear(32, 1)
        )
        
        self.confidence_head = nn.Sequential(
            nn.Linear(hidden_dim, 16),
            nn.SiLU(),
            nn.Linear(16, 1),
            nn.Sigmoid()
        )
        
    def set_normalization(self, mean: torch.Tensor, std: torch.Tensor):
        assert mean.shape[0] == self.input_dim, f"Mean dim {mean.shape[0]} != input_dim {self.input_dim}"
        std_copy = std.clone()
        std_copy[std_copy < 1e-6] = 1.0
        self.feature_mean.copy_(mean)
        self.feature_std.copy_(std_copy)
        self.is_normalized.copy_(torch.tensor(True, dtype=torch.bool))

    def preprocess_input(self, x: torch.Tensor) -> torch.Tensor:
        x_proc = x.clone()
        if self.input_dim >= 12:
            # Apply log1p to Feature #12 (gaussian_plume_concentration) to bound scale
            x_proc[:, 11] = torch.log1p(torch.clamp(x_proc[:, 11], min=0.0))
            
        if self.is_normalized:
            return (x_proc - self.feature_mean) / self.feature_std
        return x_proc

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x_norm = self.preprocess_input(x)
        features = self.shared_layers(x_norm)
        
        # Target concentration prediction: Add t-1 CH4 residual connection for temporal stability
        ch4_residual = x[:, 3:4] if self.input_dim >= 4 else torch.zeros((x.size(0), 1), device=x.device)
        ch4_delta = self.ch4_head(features)
        ch4_pred = ch4_residual + ch4_delta * 45.0
        
        emission_pred = torch.relu(self.emission_head(features))
        confidence_pred = self.confidence_head(features)
        
        return torch.cat([ch4_pred, emission_pred, confidence_pred], dim=1)

    def mc_predict(self, x: torch.Tensor, num_samples: int = 10) -> Tuple[torch.Tensor, torch.Tensor]:
        self.train()  # Enable dropout for Monte Carlo sampling
        samples = []
        with torch.no_grad():
            for _ in range(num_samples):
                out = self.forward(x)
                samples.append(out.unsqueeze(0))
        self.eval()
        
        stacked = torch.cat(samples, dim=0)
        mean_pred = stacked.mean(dim=0)
        std_pred = stacked.std(dim=0)[:, 0]  # Uncertainty in CH4 prediction
        return mean_pred, std_pred
