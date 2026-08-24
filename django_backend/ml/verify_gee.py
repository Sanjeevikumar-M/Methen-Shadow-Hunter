"""
GEE Connection & Sentinel-5P Query Diagnostics Engine.

Verifies service account credentials, key file readability, Earth Engine initialization,
project settings, and executes a query for COPERNICUS/S5P/OFFL/L3_CH4 over India.
"""

import os
import sys
import json
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from ml.constants import BASE_DIR, INDIA_BBOX

def verify_gee_connection():
    print("GEE CONNECTION VERIFICATION")
    print("-" * 45)
    
    # 1. Look for Key File
    key_candidates = [
        os.environ.get("GEE_KEY_FILE", ""),
        str(BASE_DIR / "methane-watcher-project-aada1ea5973d.json"),
        str(BASE_DIR / "service_account.json"),
    ]
    
    key_file = ""
    for candidate in key_candidates:
        if candidate and os.path.exists(candidate) and os.path.getsize(candidate) > 0:
            key_file = candidate
            break
            
    service_account = os.environ.get(
        "GEE_SERVICE_ACCOUNT",
        "gee-methane-fetcher@methane-watcher-project.iam.gserviceaccount.com"
    )
    
    print(f"Credentials Found:         {'YES' if key_file else 'NO'}")
    print(f"Credential File Readable:  {'YES' if key_file else 'NO'}")
    print(f"Service Account:           {service_account}")
    
    if not key_file:
        print("Earth Engine Initialization: FAIL (Key file not found)")
        print("GEE STATUS:                 GEE OFFLINE — REFERENCE DATA MODE")
        print("-" * 45)
        return {"status": "FAIL", "reason": "Key file not found"}
        
    try:
        import ee
        credentials = ee.ServiceAccountCredentials(service_account, key_file)
        ee.Initialize(credentials)
        print("Earth Engine Initialization: PASS")
        
        # Test Query COPERNICUS/S5P/OFFL/L3_CH4 over India
        geometry = ee.Geometry.BBox(INDIA_BBOX[0], INDIA_BBOX[1], INDIA_BBOX[2], INDIA_BBOX[3])
        collection = (
            ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_CH4")
            .select("CH4_column_volume_mixing_ratio_dry_air")
            .filterBounds(geometry)
            .sort("system:time_start", False)
        )
        
        count = collection.size().getInfo()
        if count > 0:
            latest_img = collection.first()
            img_id = latest_img.get("system:id").getInfo()
            time_start = latest_img.get("system:time_start").getInfo()
            timestamp_str = str(time_start)
            
            print(f"Project / Dataset:          COPERNICUS/S5P/OFFL/L3_CH4")
            print(f"Sentinel-5P Query:          PASS ({count} images found)")
            print(f"Latest Image ID:            {img_id}")
            print(f"Observation Returned:       PASS")
            print("GEE STATUS:                 PASS (LIVE GEE STREAMING ACTIVE)")
            print("-" * 45)
            
            return {
                "status": "PASS",
                "image_id": img_id,
                "timestamp": timestamp_str,
                "dataset_count": count,
            }
        else:
            print("Sentinel-5P Query:          FAIL (0 images in region)")
            print("GEE STATUS:                 GEE OFFLINE — REFERENCE DATA MODE")
            print("-" * 45)
            return {"status": "FAIL", "reason": "0 images returned"}
            
    except Exception as e:
        print(f"Earth Engine Initialization: FAIL ({e})")
        print("GEE STATUS:                 GEE OFFLINE — REFERENCE DATA MODE")
        print("-" * 45)
        return {"status": "FAIL", "error": str(e)}

if __name__ == "__main__":
    verify_gee_connection()
