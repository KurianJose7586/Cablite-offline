# Quick Testing Guide for Phase 3

## Step 1: Run PostGIS Migration

Open a **new PowerShell terminal** and run:

```powershell
cd "c:\Users\Kurian Jose\Desktop\kurian stuff\CabliteTest\backend"

# Connect to PostgreSQL and run migration
psql -U postgres -d cablite
```

Then in the PostgreSQL prompt, paste this:

```sql
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

\q
```

---

## Step 2: Create Test Driver (Using Prisma Studio)

Prisma Studio is already running! Go to: http://localhost:5555

### Create User:
1. Click **User** table → **Add record**
2. Fill in:
   - phone: `+919999999999`
   - role: `DRIVER`
   - name: `Test Driver`
3. Click **Save** and copy the generated `id`

### Create Driver Profile:
1. Click **Driver** table → **Add record**
2. Fill in:
   - userId: (paste the user ID from above)
   - status: `ONLINE`
   - currentLat: `12.9716`
   - currentLng: `77.5946`
3. Click **Save** and copy the generated `id`

---

## Step 3: Test Driver Location Update

Open PowerShell and run (replace `DRIVER_ID` with your driver ID):

```powershell
$driverId = "65d6459d-2aee-459a-afd5-7b542b3c0d75"

$body = @{
    driverId = $driverId
    lat = 12.9716
    lng = 77.5946
} | ConvertTo-Json

Invoke-WebRequest -Uri 'http://localhost:3000/driver/location' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
```

**Expected**: `{"success":true}`

---

## Step 4: Create a Ride Request (SMS Webhook)

```powershell
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' -Method POST -Body 'MessageSid=SM777&From=%2B919876543210&Body=RIDEREQ|R777777|12.9716|77.5946|MG Road' -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing
```

**Check the server logs** (in the terminal running `npm run dev`):
- You should see: `Found nearby drivers`
- You should see: `Broadcasting ride to drivers`
- Driver count should be 1 or more

---

## Step 5: Test Driver Accept (Atomic Locking)

```powershell
$driverId = "YOUR_DRIVER_ID_HERE"

$body = @{
    rideId = "R777777"
    driverId = $driverId
} | ConvertTo-Json

Invoke-WebRequest -Uri 'http://localhost:3000/driver/accept' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
```

**Expected Response**:
```json
{
  "success": true,
  "ride": {
    "id": "R777777",
    "state": "ACCEPTED",
    "pickup": {"lat": 12.9716, "lng": 77.5946},
    "destination": "MG Road",
    "passenger": {"phone": "+919876543210", "name": null}
  }
}
```

---

## Step 6: Verify in Prisma Studio

Refresh Prisma Studio and check:

**Ride Table**:
- State should be `ACCEPTED`
- driverId should be set
- acceptedAt should have a timestamp

**Driver Table**:
- activeRideId should be `R777777`

---

## Step 7: Test Atomic Locking (Try to Accept Again)

Try to accept the same ride with another driver (or same driver):

```powershell
$body = @{
    rideId = "R777777"
    driverId = $driverId
} | ConvertTo-Json

Invoke-WebRequest -Uri 'http://localhost:3000/driver/accept' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
```

**Expected Error**:
```json
{
  "success": false,
  "error": "Ride is not available (current state: ACCEPTED)"
}
```

This proves the atomic locking works! ✅

---

## What to Look For in Server Logs

After creating a ride, you should see:
```
[info]: Event: RIDE_REQUESTED {"rideId":"R777777",...}
[info]: Handling RIDE_REQUESTED event for broadcast
[info]: Found nearby drivers {"pickup":{"lat":12.9716,"lng":77.5946},"radiusKm":3,"count":1}
[info]: Broadcasting ride to drivers {"rideId":"R777777","driverCount":1,...}
```

After accepting:
```
[info]: Ride accepted {"rideId":"R777777","driverId":"...","passengerId":"..."}
[info]: Event: RIDE_ACCEPTED {"rideId":"R777777",...}
```

---

## Troubleshooting

**"No drivers available"**: 
- Make sure driver status is `ONLINE`
- Make sure driver has no `activeRideId`
- Check driver location is set

**PostGIS errors**:
- Run `SELECT PostGIS_Version();` in psql to verify PostGIS is installed
- If not installed, run `CREATE EXTENSION postgis;`

**"Ride not found"**:
- Check the rideId matches exactly
- Verify ride exists in Prisma Studio

# Replace with your actual driver ID from Prisma Studio
$driverId = "65d6459d-2aee-459a-afd5-7b542b3c0d75"

$body = @{
    rideId = "R888888"
    driverId = $driverId
} | ConvertTo-Json

Invoke-WebRequest -Uri 'http://localhost:3000/driver/accept' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing