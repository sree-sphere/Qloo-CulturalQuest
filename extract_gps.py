from PIL import Image
import piexif
import os
import sys
import json

def get_decimal_from_dms(dms, ref):
    """Convert EXIF DMS format to decimal degrees"""
    degrees = dms[0][0] / dms[0][1]
    minutes = dms[1][0] / dms[1][1]
    seconds = dms[2][0] / dms[2][1]
    decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
    if ref in ['S', 'W']:
        decimal = -decimal
    return decimal

def extract_gps_from_image(image_path):
    """Extract GPS coordinates from image EXIF data"""
    if not os.path.exists(image_path):
        return {"error": f"Image not found: {image_path}"}

    try:
        img = Image.open(image_path)
        exif_data = img.info.get("exif")
        
        if not exif_data:
            return {"error": "No EXIF data found"}

        exif_dict = piexif.load(exif_data)
        gps_info = exif_dict.get("GPS")

        if not gps_info:
            return {"error": "No GPS metadata found"}

        # Extract GPS coordinates
        gps_latitude = gps_info.get(piexif.GPSIFD.GPSLatitude)
        gps_latitude_ref = gps_info.get(piexif.GPSIFD.GPSLatitudeRef)
        gps_longitude = gps_info.get(piexif.GPSIFD.GPSLongitude)
        gps_longitude_ref = gps_info.get(piexif.GPSIFD.GPSLongitudeRef)

        if not all([gps_latitude, gps_latitude_ref, gps_longitude, gps_longitude_ref]):
            return {"error": "Incomplete GPS EXIF data"}

        # Decode reference if it's bytes
        if isinstance(gps_latitude_ref, bytes):
            gps_latitude_ref = gps_latitude_ref.decode()
        if isinstance(gps_longitude_ref, bytes):
            gps_longitude_ref = gps_longitude_ref.decode()

        lat = get_decimal_from_dms(gps_latitude, gps_latitude_ref)
        lon = get_decimal_from_dms(gps_longitude, gps_longitude_ref)

        return {
            "latitude": lat,
            "longitude": lon,
            "success": True
        }
        
    except Exception as e:
        return {"error": f"Error processing image: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) != 2:
        result = {"error": "Usage: python extract_gps.py <image_path>"}
    else:
        img_path = sys.argv[1]
        result = extract_gps_from_image(img_path)
    
    # Always output valid JSON
    print(json.dumps(result))