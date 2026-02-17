# Phase 5 Testing: Broadcast Expiry Worker

## Test 1: Basic Expiry (60 Second Timeout)

### Objective
Verify that unaccepted rides automatically expire after 60 seconds.

### Steps

```powershell
# Step 1: Create a ride that won't be accepted
Write-Host "`n=== Creating Ride (Will Expire) ===" -ForegroundColor Cyan
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' `
  -Method POST `
  -Body 'MessageSid=SMEXPIRY001&From=%2B919876543210&Body=RIDEREQ|EXPIRY001|12.9716|77.5946|TestExpiry' `
  -ContentType 'application/x-www-form-urlencoded' `
  -UseBasicParsing

Write-Host "✅ Ride EXPIRY001 created" -ForegroundColor Green
Write-Host "⏳ Waiting 61 seconds for expiry..." -ForegroundColor Yellow

# Step 2: Wait for expiry (61 seconds to ensure it's past 60s timeout)
Start-Sleep -Seconds 61

# Step 3: Check ride state
Write-Host "`n=== Checking Ride State ===" -ForegroundColor Cyan
$env:PGPASSWORD='db123'; psql -U postgres -d cablite -c 'SELECT id, state, "completedAt" FROM "Ride" WHERE id = ''EXPIRY001'';'
```

### Expected Results

**After 61 seconds:**
- Ride state: `EXPIRED`
- `completedAt` timestamp is set
- SMS sent to passenger: "Ride EXPIRY001 expired. No drivers available. Please try again later."

**Server Logs:**
```
Found expired ride(s) {"count":1,"rideIds":["EXPIRY001"]}
Ride state transition {"rideId":"EXPIRY001","from":"BROADCASTING","to":"EXPIRED"}
Ride expired {"rideId":"EXPIRY001","passengerId":"..."}
```

---

## Test 2: Accepted Ride Not Expired

### Objective
Verify that accepted rides are NOT expired by the worker.

### Steps

```powershell
# Step 1: Create ride
Write-Host "`n=== Creating Ride (Will Be Accepted) ===" -ForegroundColor Cyan
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' `
  -Method POST `
  -Body 'MessageSid=SMNOEXP001&From=%2B919876543210&Body=RIDEREQ|NOEXPIRY|12.9716|77.5946|Test' `
  -ContentType 'application/x-www-form-urlencoded' `
  -UseBasicParsing

Start-Sleep -Seconds 3

# Step 2: Accept ride
Write-Host "`n=== Accepting Ride ===" -ForegroundColor Cyan
$driverId = "d0ec79e4-26a4-4996-8e43-279a0ada4425"
$body = @{rideId='NOEXPIRY';driverId=$driverId} | ConvertTo-Json
Invoke-WebRequest -Uri 'http://localhost:3000/driver/accept' `
  -Method POST `
  -Body $body `
  -ContentType 'application/json' `
  -UseBasicParsing

Write-Host "✅ Ride accepted" -ForegroundColor Green
Write-Host "⏳ Waiting 61 seconds..." -ForegroundColor Yellow

# Step 3: Wait past expiry time
Start-Sleep -Seconds 61

# Step 4: Verify still ACCEPTED
Write-Host "`n=== Checking Ride State ===" -ForegroundColor Cyan
$env:PGPASSWORD='db123'; psql -U postgres -d cablite -c 'SELECT id, state FROM "Ride" WHERE id = ''NOEXPIRY'';'
```

### Expected Results

**After 61 seconds:**
- Ride state: `ACCEPTED` (NOT EXPIRED)
- Worker skips this ride (only processes BROADCASTING state)

---

## Test 3: Multiple Expired Rides

### Objective
Verify worker can handle multiple expired rides in one iteration.

### Steps

```powershell
# Create 3 rides that will expire
Write-Host "`n=== Creating 3 Rides ===" -ForegroundColor Cyan

Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' -Method POST -Body 'MessageSid=SMMULTI001&From=%2B919876543210&Body=RIDEREQ|MULTI001|12.9716|77.5946|Test1' -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing | Out-Null

Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' -Method POST -Body 'MessageSid=SMMULTI002&From=%2B919876543210&Body=RIDEREQ|MULTI002|12.9716|77.5946|Test2' -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing | Out-Null

Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' -Method POST -Body 'MessageSid=SMMULTI003&From=%2B919876543210&Body=RIDEREQ|MULTI003|12.9716|77.5946|Test3' -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing | Out-Null

Write-Host "✅ 3 rides created" -ForegroundColor Green
Write-Host "⏳ Waiting 61 seconds..." -ForegroundColor Yellow

Start-Sleep -Seconds 61

# Check all states
Write-Host "`n=== Checking All Ride States ===" -ForegroundColor Cyan
$env:PGPASSWORD='db123'; psql -U postgres -d cablite -c 'SELECT id, state FROM "Ride" WHERE id IN (''MULTI001'', ''MULTI002'', ''MULTI003'');'
```

### Expected Results

**Server Logs:**
```
Found expired ride(s) {"count":3,"rideIds":["MULTI001","MULTI002","MULTI003"]}
Ride expired {"rideId":"MULTI001",...}
Ride expired {"rideId":"MULTI002",...}
Ride expired {"rideId":"MULTI003",...}
```

**All 3 rides:** state = `EXPIRED`

---

## Test 4: Worker Performance

### Objective
Verify worker runs every 10 seconds without performance issues.

### Steps

1. Monitor server logs for 1 minute
2. Count expiry check iterations

### Expected Results

**In 60 seconds:**
- Worker runs ~6 times (every 10 seconds)
- Each iteration completes quickly (< 50ms)
- No errors or crashes

**Server Logs Pattern:**
```
[Every 10 seconds]
Prisma Query: SELECT ... FROM "Ride" WHERE state = 'BROADCASTING' AND broadcastExpiresAt < NOW()
```

---

## Complete Test Script

```powershell
# ========================================
# Phase 5 Test: Broadcast Expiry Worker
# ========================================

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "   Broadcast Expiry Worker Test" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# Test 1: Basic Expiry
Write-Host "[Test 1] Creating ride that will expire..." -ForegroundColor Cyan
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' -Method POST -Body 'MessageSid=SMEXP_TEST&From=%2B919876543210&Body=RIDEREQ|EXPTEST|12.9716|77.5946|ExpiryTest' -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing | Out-Null
Write-Host "         ✅ Ride EXPTEST created" -ForegroundColor Green

Write-Host "`n         ⏳ Waiting 61 seconds for expiry..." -ForegroundColor Yellow
Write-Host "         (You can monitor server logs in the meantime)" -ForegroundColor Gray

# Countdown
for ($i = 61; $i -gt 0; $i--) {
    Write-Host "`r         Time remaining: $i seconds " -NoNewline -ForegroundColor Yellow
    Start-Sleep -Seconds 1
}

Write-Host "`n`n[Test 1] Checking ride state..." -ForegroundColor Cyan
$env:PGPASSWORD='db123'; psql -U postgres -d cablite -c 'SELECT id, state, "completedAt" FROM "Ride" WHERE id = ''EXPTEST'';'

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "   ✅ Test Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Magenta

Write-Host "Expected: Ride state should be EXPIRED" -ForegroundColor Yellow
Write-Host "Check server logs for expiry worker activity" -ForegroundColor Yellow
```

---

## Success Criteria

✅ Worker starts on server startup  
✅ Runs every 10 seconds  
✅ Finds rides past `broadcastExpiresAt`  
✅ Transitions to EXPIRED state  
✅ Sets `completedAt` timestamp  
✅ Sends SMS to passenger  
✅ Accepted rides not affected  
✅ Handles multiple expired rides  
✅ No performance degradation  
✅ Graceful error handling

---

## Troubleshooting

**Worker not running:**
- Check server logs for "Expiry worker started"
- Verify node-cron installed

**Rides not expiring:**
- Check `broadcastExpiresAt` value in database
- Verify ride is in BROADCASTING state
- Check server logs for worker iterations

**SMS not sent:**
- Expected in development (Twilio not configured)
- Check logs for SMS message content

**Performance issues:**
- Check database query performance
- Monitor Prisma query logs
- Verify no infinite loops
