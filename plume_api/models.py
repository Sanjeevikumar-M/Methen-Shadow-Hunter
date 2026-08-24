# pyrefly: ignore [missing-import]
from django.db import models

class Facility(models.Model):
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=50)
    lat = models.FloatField()
    lng = models.FloatField()

    def __str__(self):
        return f"{self.name} ({self.type})"

class MockHotspot(models.Model):
    hotspot_id = models.CharField(max_length=50, unique=True)
    lat = models.FloatField()
    lng = models.FloatField()
    concentration = models.FloatField()
    anomaly_delta = models.FloatField()
    emission_rate = models.FloatField()
    plume_area = models.FloatField()
    wind_speed = models.FloatField()
    wind_direction = models.FloatField()
    wind_direction_label = models.CharField(max_length=10)
    nearest_facility = models.CharField(max_length=255)
    region = models.CharField(max_length=100)
    risk_level = models.CharField(max_length=20)
    confidence_score = models.FloatField()
    detected_at = models.DateTimeField()
    source = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    plume_length = models.FloatField()
    plume_width = models.FloatField()

    def __str__(self):
        return self.hotspot_id

class SatelliteObservation(models.Model):
    observation_id = models.CharField(max_length=100, unique=True)
    gee_image_id = models.CharField(max_length=255)
    satellite = models.CharField(max_length=50, default="Sentinel-5P TROPOMI")
    dataset_name = models.CharField(max_length=100, default="COPERNICUS/S5P/OFFL/L3_CH4")
    region = models.CharField(max_length=100, default="India")
    mean_background_ppb = models.FloatField(default=1850.0)
    hotspots_detected = models.IntegerField(default=0)
    file_path = models.CharField(max_length=255, blank=True, null=True)
    acquisition_time = models.DateTimeField()
    processed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.observation_id} ({self.acquisition_time})"

