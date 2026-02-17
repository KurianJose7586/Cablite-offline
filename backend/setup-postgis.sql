-- Quick PostGIS Setup for CabLite
-- Copy and paste this entire block into psql

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column to Driver table
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);
CREATE INDEX IF NOT EXISTS idx_driver_location ON "Driver" USING GIST (location);

-- Add geography column to Ride table
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "pickupLocation" geography(POINT, 4326);
CREATE INDEX IF NOT EXISTS idx_ride_pickup_location ON "Ride" USING GIST ("pickupLocation");

-- Create trigger function for Driver
CREATE OR REPLACE FUNCTION update_driver_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."currentLat" IS NOT NULL AND NEW."currentLng" IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW."currentLng", NEW."currentLat"), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for Driver
DROP TRIGGER IF EXISTS trigger_update_driver_location ON "Driver";
CREATE TRIGGER trigger_update_driver_location
  BEFORE INSERT OR UPDATE ON "Driver"
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_location();

-- Create trigger function for Ride
CREATE OR REPLACE FUNCTION update_ride_pickup_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."pickupLat" IS NOT NULL AND NEW."pickupLng" IS NOT NULL THEN
    NEW."pickupLocation" = ST_SetSRID(ST_MakePoint(NEW."pickupLng", NEW."pickupLat"), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for Ride
DROP TRIGGER IF EXISTS trigger_update_ride_pickup_location ON "Ride";
CREATE TRIGGER trigger_update_ride_pickup_location
  BEFORE INSERT OR UPDATE ON "Ride"
  FOR EACH ROW
  EXECUTE FUNCTION update_ride_pickup_location();

-- Verify PostGIS is working
SELECT PostGIS_Version();
