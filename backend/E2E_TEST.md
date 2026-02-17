# CabLite Backend - End-to-End Test Script

This script tests the complete flow from ride request to location updates.

## Prerequisites

✅ Backend server running (`npm run dev`)  
✅ PostgreSQL database running  
✅ Prisma Studio running (optional, for verification)  
⚠️ Redis NOT required (graceful degradation)

---

## Test Flow Overview

1. **Passenger requests ride** via SMS
2. **System finds nearby driver** (PostGIS spatial query)
3. **Driver accepts ride** (atomic locking)
4. **Passenger updates location** (distance/ETA calculation)
5. **Verify all data** in database

---

## Step 1: Create Ride Request

**Passenger sends SMS:**

```powershell
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' `
  -Method POST `
  -Body 'MessageSid=SM_E2E_001&From=%2B919876543210&Body=RIDEREQ|E2E_RIDE_001|12.9716|77.5946|Koramangala' `
  -ContentType 'application/x-www-form-urlencoded' `
  -UseBasicParsing
```

**Expected Response:**
- Status: 200 OK
- Body: `<Response></Response>`

**Check Server Logs:**
```
Incoming SMS {"from":"+919876543210","body":"RIDEREQ|E2E_RIDE_001|12.9716|77.5946|Koramangala"}
Ride created {"rideId":"E2E_RIDE_001","passengerId":"...","pickup":{"lat":12.9716,"lng":77.5946}}
State transition: REQUESTED -> BROADCASTING
Event: RIDE_REQUESTED
Found nearby drivers {"count":1}
Broadcasting ride to drivers {"rideId":"E2E_RIDE_001","driverCount":1}
```

**Verify in Database:**
```powershell
$env:PGPASSWORD='db123'; psql -U postgres -d cablite -c "SELECT id, state, \"pickupLat\", \"pickupLng\", \"destinationText\" FROM \"Ride\" WHERE id = 'E2E_RIDE_001';"
```

**Expected:**
```
id            | state        | pickupLat | pickupLng | destinationText
E2E_RIDE_001  | BROADCASTING | 12.9716   | 77.5946   | Koramangala
```

---

## Step 2: Driver Accepts Ride

**Get driver ID from database:**

```powershell
$env:PGPASSWORD='db123'; psql -U postgres -d cablite -c "SELECT id, status FROM \"Driver\" WHERE status = 'ONLINE' LIMIT 1;"
```

**Accept the ride:**

```powershell
# Replace with your actual driver ID
$driverId = "d0ec79e4-26a4-4996-8e43-279a0ada4425"

$body = @{
    rideId = 'E2E_RIDE_001'
    driverId = $driverId
} | ConvertTo-Json

Invoke-WebRequest -Uri 'http://localhost:3000/driver/accept' `
  -Method POST `
  -Body $body `
  -ContentType 'application/json' `
  -UseBasicParsing
```

**Expected Response:**
```json
{
  "success": true,
  "ride": {
    "id": "E2E_RIDE_001",
    "state": "ACCEPTED",
    "pickup": {"lat": 12.9716, "lng": 77.5946},
    "destination": "Koramangala",
    "passenger": {"phone": "+919876543210"}
  }
}
```

**Check Server Logs:**
```
BEGIN
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE
SELECT ... FROM "Ride" WHERE id = $1 FOR UPDATE
UPDATE "Ride" SET "driverId" = ..., "state" = 'ACCEPTED'
UPDATE "Driver" SET "activeRideId" = ...
COMMIT
Event: RIDE_ACCEPTED
Ride accepted {"rideId":"E2E_RIDE_001","driverId":"..."}
```

**Verify in Database:**
```powershell
$env:PGPASSWORD='db123'; psql -U postgres -d cablite -c "SELECT id, state, \"driverId\", \"acceptedAt\" FROM \"Ride\" WHERE id = 'E2E_RIDE_001';"
```

**Expected:**
```
id            | state    | driverId  | acceptedAt
E2E_RIDE_001  | ACCEPTED | <UUID>    | <timestamp>
```

---

## Step 3: Update Driver Location

**Move driver closer to pickup:**

```powershell
$driverId = "d0ec79e4-26a4-4996-8e43-279a0ada4425"

$body = @{
    driverId = $driverId
    lat = 12.9750  # ~378m north of pickup
    lng = 77.5946
} | ConvertTo-Json

Invoke-WebRequest -Uri 'http://localhost:3000/driver/location' `
  -Method POST `
  -Body $body `
  -ContentType 'application/json' `
  -UseBasicParsing
```

**Expected Response:**
```json
{
  "success": true,
  "location": {"lat": 12.9750, "lng": 77.5946}
}
```

**Check Server Logs:**
```
Driver location updated {"driverId":"...","lat":12.9750,"lng":77.5946}
Event: DRIVER_MOVED
```

---

## Step 4: Passenger Updates Location

**Passenger sends UPDATE request:**

```powershell
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' `
  -Method POST `
  -Body 'MessageSid=SM_E2E_002&From=%2B919876543210&Body=UPDATE|E2E_RIDE_001|12.9716|77.5946' `
  -ContentType 'application/x-www-form-urlencoded' `
  -UseBasicParsing
```

**Expected Response:**
- Status: 200 OK

**Expected SMS to Passenger:**
```
Driver is 0.4km away. ETA: 1 min(s). Updates remaining: 4
```

**Check Server Logs:**
```
Incoming SMS {"body":"UPDATE|E2E_RIDE_001|12.9716|77.5946"}
Rate limit check failed, allowing update  # (Redis not installed)
Update request processed {"rideId":"E2E_RIDE_001","newLocation":{"lat":12.9716,"lng":77.5946},"remainingUpdates":4}
```

**Calculation Verification:**
- Distance: ~378m (12.9716 to 12.9750)
- Distance in km: 0.4km
- ETA: 378m / 500m/min ≈ 1 minute

---

## Step 5: Test Multiple Updates (Without Redis)

**Send 3 more updates with different locations:**

```powershell
# Update 2: Move slightly
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' `
  -Method POST `
  -Body 'MessageSid=SM_E2E_003&From=%2B919876543210&Body=UPDATE|E2E_RIDE_001|12.9720|77.5946' `
  -ContentType 'application/x-www-form-urlencoded' `
  -UseBasicParsing

Start-Sleep -Seconds 1

# Update 3: Move more
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' `
  -Method POST `
  -Body 'MessageSid=SM_E2E_004&From=%2B919876543210&Body=UPDATE|E2E_RIDE_001|12.9725|77.5946' `
  -ContentType 'application/x-www-form-urlencoded' `
  -UseBasicParsing

Start-Sleep -Seconds 1

# Update 4: Move closer to driver
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' `
  -Method POST `
  -Body 'MessageSid=SM_E2E_005&From=%2B919876543210&Body=UPDATE|E2E_RIDE_001|12.9730|77.5946' `
  -ContentType 'application/x-www-form-urlencoded' `
  -UseBasicParsing
```

**Expected:**
- All updates succeed (Redis not enforcing rate limit)
- Each SMS shows updated distance/ETA
- Distance decreases as passenger moves toward driver

---

## Step 6: Test Ride Cancellation

**Passenger cancels ride:**

```powershell
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' `
  -Method POST `
  -Body 'MessageSid=SM_E2E_006&From=%2B919876543210&Body=CANCEL|E2E_RIDE_001' `
  -ContentType 'application/x-www-form-urlencoded' `
  -UseBasicParsing
```

**Expected Response:**
- Status: 200 OK

**Expected SMS:**
```
Ride E2E_RIDE_001 has been cancelled.
```

**Check Server Logs:**
```
State transition: ACCEPTED -> CANCELLED
Ride cancelled {"rideId":"E2E_RIDE_001"}
```

**Verify in Database:**
```powershell
$env:PGPASSWORD='db123'; psql -U postgres -d cablite -c "SELECT id, state, \"completedAt\" FROM \"Ride\" WHERE id = 'E2E_RIDE_001';"
```

**Expected:**
```
id            | state     | completedAt
E2E_RIDE_001  | CANCELLED | <timestamp>
```

---

## Complete Test Script (Copy-Paste)

```powershell
# ========================================
# CabLite E2E Test - Complete Flow
# ========================================

Write-Host "`n=== Step 1: Create Ride ===" -ForegroundColor Cyan
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' -Method POST -Body 'MessageSid=SM_E2E_001&From=%2B919876543210&Body=RIDEREQ|E2E_RIDE_001|12.9716|77.5946|Koramangala' -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing
Start-Sleep -Seconds 2

Write-Host "`n=== Step 2: Get Driver ID ===" -ForegroundColor Cyan
$env:PGPASSWORD='db123'; psql -U postgres -d cablite -c "SELECT id FROM \"Driver\" WHERE status = 'ONLINE' LIMIT 1;"

Write-Host "`n=== Step 3: Accept Ride (REPLACE DRIVER ID) ===" -ForegroundColor Yellow
$driverId = "d0ec79e4-26a4-4996-8e43-279a0ada4425"  # REPLACE THIS
$body = @{rideId='E2E_RIDE_001';driverId=$driverId} | ConvertTo-Json
Invoke-WebRequest -Uri 'http://localhost:3000/driver/accept' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
Start-Sleep -Seconds 2

Write-Host "`n=== Step 4: Update Driver Location ===" -ForegroundColor Cyan
$body = @{driverId=$driverId;lat=12.9750;lng=77.5946} | ConvertTo-Json
Invoke-WebRequest -Uri 'http://localhost:3000/driver/location' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
Start-Sleep -Seconds 2

Write-Host "`n=== Step 5: Passenger Updates Location ===" -ForegroundColor Cyan
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' -Method POST -Body 'MessageSid=SM_E2E_002&From=%2B919876543210&Body=UPDATE|E2E_RIDE_001|12.9716|77.5946' -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing
Start-Sleep -Seconds 2

Write-Host "`n=== Step 6: Multiple Updates ===" -ForegroundColor Cyan
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' -Method POST -Body 'MessageSid=SM_E2E_003&From=%2B919876543210&Body=UPDATE|E2E_RIDE_001|12.9720|77.5946' -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing
Start-Sleep -Seconds 1
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' -Method POST -Body 'MessageSid=SM_E2E_004&From=%2B919876543210&Body=UPDATE|E2E_RIDE_001|12.9725|77.5946' -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing
Start-Sleep -Seconds 1

Write-Host "`n=== Step 7: Cancel Ride ===" -ForegroundColor Cyan
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' -Method POST -Body 'MessageSid=SM_E2E_006&From=%2B919876543210&Body=CANCEL|E2E_RIDE_001' -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing

Write-Host "`n=== Verify Final State ===" -ForegroundColor Cyan
$env:PGPASSWORD='db123'; psql -U postgres -d cablite -c "SELECT id, state, \"driverId\", \"acceptedAt\", \"completedAt\" FROM \"Ride\" WHERE id = 'E2E_RIDE_001';"

Write-Host "`n=== Test Complete! ===" -ForegroundColor Green
```

---

## Success Criteria

✅ Ride created with BROADCASTING state  
✅ PostGIS found nearby driver  
✅ Driver accepted ride atomically  
✅ Ride state changed to ACCEPTED  
✅ Driver location updated successfully  
✅ Passenger updates calculated distance/ETA  
✅ Multiple updates processed (no rate limit without Redis)  
✅ Ride cancelled successfully  
✅ All database records correct  
✅ Server logs show expected events

---

## Troubleshooting

**"Ride not found":**
- Check ride ID spelling
- Verify ride was created successfully

**"Driver not found":**
- Get correct driver ID from database
- Ensure driver status is ONLINE

**"Cannot update location. Ride status: X":**
- Ride must be ACCEPTED or EN_ROUTE
- Check ride state in database

**No distance/ETA in SMS:**
- Driver location might be null
- Check driver's currentLat/currentLng

**Server errors:**
- Check server logs for stack traces
- Verify database connection
- Check Prisma schema matches database
