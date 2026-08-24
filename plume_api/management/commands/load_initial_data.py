from django.core.management.base import BaseCommand
from plume_api.models import Facility, MockHotspot
from datetime import datetime, timedelta
from django.utils.timezone import make_aware

INDIA_FACILITIES = [
    # Coal Mines
    (23.79, 86.43, "Jharia Coal Fields", "coal_mine"),
    (22.47, 84.10, "Talcher Coal Mines, Odisha", "coal_mine"),
    (20.26, 85.84, "IB Valley Coal Mines", "coal_mine"),
    (21.26, 82.51, "Korba Coal Mines, CG", "coal_mine"),
    # Oil & Gas
    (26.74, 94.20, "Oil India - Assam Fields", "oil_gas"),
    (21.17, 72.83, "ONGC Surat Station", "oil_gas"),
    (16.50, 81.10, "Ravva Offshore Platform", "oil_gas"),
    (22.98, 72.61, "ONGC Ahmedabad", "oil_gas"),
    # Landfills
    (28.53, 77.24, "Bhalswa Landfill, Delhi", "landfill"),
    (19.13, 72.86, "Deonar Dumping Ground, Mumbai", "landfill"),
    (12.90, 77.64, "Mandur Landfill, Bengaluru", "landfill"),
    (22.49, 88.37, "Dhapa Landfill, Kolkata", "landfill"),
    # Fertilizer / Chemical Plants
    (22.30, 70.79, "IFFCO Kandla", "chemical"),
    (28.67, 77.47, "IFFCO Phulpur", "chemical"),
    (17.44, 78.42, "Coromandel International, Hyd", "chemical"),
    # Power Plants
    (23.25, 81.37, "NTPC Singrauli", "power_plant"),
    (24.58, 82.67, "NTPC Rihand", "power_plant"),
    (26.16, 84.51, "Anpara Power Station", "power_plant"),
    # Rice Paddies
    (30.68, 76.85, "Punjab Rice Belt (Ludhiana)", "agriculture"),
    (25.59, 85.14, "Bihar Rice Belt (Patna)", "agriculture"),
    (22.34, 88.55, "West Bengal Rice Belt", "agriculture"),
]

GLOBAL_FACILITIES = [
    (39.76, 54.42, "Galkynysh Gas Field, Turkmenistan", "oil_gas"),
    (32.35, -103.68, "Permian Basin Operations, USA", "oil_gas"),
    (56.13, 75.45, "Samotlor Field, Russia", "oil_gas"),
    (52.85, 55.10, "Gazprom Orenburg Complex", "oil_gas"),
    (-16.50, -68.15, "Vaca Muerta Basin, Argentina", "oil_gas"),
    (35.70, 50.55, "South Pars Gas Field, Iran", "oil_gas"),
    (-21.18, -49.63, "São Paulo Landfill, Brazil", "landfill"),
    (57.80, 109.60, "Siberian Coal Mines", "coal_mine"),
    (25.20, 121.50, "Taipei Landfill, Taiwan", "landfill"),
    (22.90, 30.10, "Nile Delta Agriculture", "agriculture"),
    (30.50, 114.30, "Yangtze Rice Paddies, China", "agriculture"),
    (-3.20, -60.10, "Amazon Wetlands", "wetland"),
]

class Command(BaseCommand):
    help = 'Loads initial facility and hotspot data'

    def handle(self, *args, **options):
        Facility.objects.all().delete()
        MockHotspot.objects.all().delete()

        all_facilities = INDIA_FACILITIES + GLOBAL_FACILITIES
        for f in all_facilities:
            Facility.objects.create(lat=f[0], lng=f[1], name=f[2], type=f[3])
        
        self.stdout.write(self.style.SUCCESS(f"Loaded {len(all_facilities)} facilities."))

        base = make_aware(datetime.utcnow() - timedelta(days=2))
        
        MockHotspot.objects.create(
            hotspot_id="IND-001", lat=23.79, lng=86.43, concentration=1985.4, anomaly_delta=135.4,
            emission_rate=1240.0, plume_area=8.5, wind_speed=3.2, wind_direction=245, wind_direction_label="WSW",
            nearest_facility="Jharia Coal Fields", region="Jharkhand, India", risk_level="critical",
            confidence_score=0.96, detected_at=base, source="Sentinel-5P", country="India", plume_length=12.4, plume_width=3.2
        )
        MockHotspot.objects.create(
            hotspot_id="IND-002", lat=28.53, lng=77.24, concentration=1960.2, anomaly_delta=110.2,
            emission_rate=820.0, plume_area=6.2, wind_speed=4.8, wind_direction=190, wind_direction_label="S",
            nearest_facility="Bhalswa Landfill, Delhi", region="Delhi NCR, India", risk_level="high",
            confidence_score=0.91, detected_at=base, source="Sentinel-5P", country="India", plume_length=9.1, plume_width=2.8
        )
        MockHotspot.objects.create(
            hotspot_id="IND-003", lat=21.17, lng=72.83, concentration=1920.0, anomaly_delta=70.0,
            emission_rate=450.0, plume_area=4.0, wind_speed=5.5, wind_direction=60, wind_direction_label="ENE",
            nearest_facility="ONGC Surat Station", region="Gujarat, India", risk_level="medium",
            confidence_score=0.87, detected_at=base, source="Sentinel-5P", country="India", plume_length=6.5, plume_width=2.1
        )
        MockHotspot.objects.create(
            hotspot_id="GLB-001", lat=38.30, lng=58.40, concentration=2050.5, anomaly_delta=200.5,
            emission_rate=4500.0, plume_area=25.0, wind_speed=4.2, wind_direction=120, wind_direction_label="ESE",
            nearest_facility="Galkynysh Gas Field", region="Turkmenistan", risk_level="critical",
            confidence_score=0.99, detected_at=base, source="Sentinel-5P", country="Turkmenistan", plume_length=28.0, plume_width=7.5
        )
        MockHotspot.objects.create(
            hotspot_id="GLB-002", lat=31.80, lng=-102.30, concentration=1980.2, anomaly_delta=130.2,
            emission_rate=2100.0, plume_area=14.5, wind_speed=5.5, wind_direction=270, wind_direction_label="W",
            nearest_facility="Permian Basin Operations, USA", region="Texas, USA", risk_level="high",
            confidence_score=0.95, detected_at=base, source="Sentinel-5P", country="USA", plume_length=18.5, plume_width=5.0
        )
        self.stdout.write(self.style.SUCCESS("Loaded 5 mock hotspots."))
