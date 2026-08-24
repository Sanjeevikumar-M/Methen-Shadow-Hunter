from django.core.management.base import BaseCommand
from ml.train import train_model

class Command(BaseCommand):
    help = "Trains the MethanePINN Physics-Informed Neural Network model."

    def add_arguments(self, parser):
        parser.add_argument("--epochs", type=int, default=150)

    def handle(self, *args, **options):
        epochs = options["epochs"]
        self.stdout.write(self.style.WARNING(f"Training MethanePINN for {epochs} epochs..."))
        meta = train_model(epochs=epochs)
        self.stdout.write(self.style.SUCCESS(f"✅ MethanePINN trained successfully! R²: {meta['metrics']['r2_score']}, RMSE: {meta['metrics']['rmse_ppb']} ppb"))
