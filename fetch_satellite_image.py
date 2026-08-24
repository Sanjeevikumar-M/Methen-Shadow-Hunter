import sys
import os
import urllib.request
from pathlib import Path

# Add backend directory to sys.path
sys.path.append(str(Path(__file__).parent))

# pyrefly: ignore [missing-import]
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "methane_watcher.settings")
django.setup()

# pyrefly: ignore [missing-import]
import ee
from datetime import datetime, timedelta
# pyrefly: ignore [missing-import]
from django.conf import settings

def fetch_image():
    gee_sa = settings.GEE_SERVICE_ACCOUNT
    key_file = os.path.join(settings.BASE_DIR, "methane-watcher-project-aada1ea5973d.json")
    credentials = ee.ServiceAccountCredentials(gee_sa, key_file)
    ee.Initialize(credentials)

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=60)

    dataset = (
        ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_CH4")
        .filterDate(start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d"))
        .select("CH4_column_volume_mixing_ratio_dry_air")
    )
    mean_img = dataset.mean()

    # Bounding box for India
    region = [[68.7, 8.4], [97.25, 8.4], [97.25, 37.6], [68.7, 37.6]]

    viz_params = {
        'min': 0.00000175,
        'max': 0.00000195,
        'palette': ['000000', '0000ff', '800080', '00ffff', '00ff00', 'ffff00', 'ffa500', 'ff0000'],
        'region': region,
        'dimensions': 800,
        'format': 'png'
    }

    url = mean_img.getThumbURL(viz_params)
    print("SATELLITE_IMAGE_URL:", url)

    out_file = Path(__file__).parent.parent / "public" / "sentinel5p_india_methane_heatmap.png"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        data = response.read()
        out_file.write_bytes(data)
        print(f"SUCCESS: Saved {len(data)} bytes to {out_file}")

if __name__ == "__main__":
    fetch_image()
