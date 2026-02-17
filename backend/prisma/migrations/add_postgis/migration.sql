-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column to Driver table for spatial queries
-- This uses PostGIS geography type for accurate distance calculations
ALTER TABLE "Driver" 
ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

-- Create spatial index for fast geo-queries
CREATE INDEX IF NOT EXISTS idx_driver_location ON "Driver" USING GIST (location);

-- Function to update location from lat/lng
CREATE OR REPLACE FUNCTION update_driver_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."currentLat" IS NOT NULL AND NEW."currentLng" IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW."currentLng", NEW."currentLat"), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update geography column when lat/lng changes
DROP TRIGGER IF EXISTS trigger_update_driver_location ON "Driver";
CREATE TRIGGER trigger_update_driver_location
  BEFORE INSERT OR UPDATE ON "Driver"
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_location();

-- Add geography column to Ride table for pickup location
ALTER TABLE "Ride"
ADD COLUMN IF NOT EXISTS pickupLocation geography(POINT, 4326);

-- Create spatial index for rides
CREATE INDEX IF NOT EXISTS idx_ride_pickup_location ON "Ride" USING GIST ("pickupLocation");

-- Function to update ride pickup location
CREATE OR REPLACE FUNCTION update_ride_pickup_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."pickupLat" IS NOT NULL AND NEW."pickupLng" IS NOT NULL THEN
    NEW."pickupLocation" = ST_SetSRID(ST_MakePoint(NEW."pickupLng", NEW."pickupLat"), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ride pickup location
DROP TRIGGER IF EXISTS trigger_update_ride_pickup_location ON "Ride";
CREATE TRIGGER trigger_update_ride_pickup_location
  BEFORE INSERT OR UPDATE ON "Ride"
  FOR EACH ROW
  EXECUTE FUNCTION update_ride_pickup_location();
