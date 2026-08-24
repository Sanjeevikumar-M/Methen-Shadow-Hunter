from django.core.management.base import BaseCommand
import os
import torch
from plume_api.gaussian_plume import _train_dispersion_net, MODEL_PATH

class Command(BaseCommand):
    help = 'Trains the Gaussian Dispersion Neural Network and saves it to disk.'

    def add_arguments(self, parser):
        parser.add_argument('--epochs', type=int, default=300)

    def handle(self, *args, **options):
        epochs = options['epochs']
        self.stdout.write(self.style.WARNING(f"Training Gaussian Dispersion Neural Network for {epochs} epochs..."))
        
        model = _train_dispersion_net(epochs=epochs)
        
        torch.save({
            "state_dict": model.state_dict(),
            "y_mean": model.y_mean,
            "y_std": model.y_std,
        }, MODEL_PATH)
        
        self.stdout.write(self.style.SUCCESS(f"Dispersion neural network saved to {MODEL_PATH}"))
