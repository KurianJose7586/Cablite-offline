# Phase 4 Testing Guide: Redis & Rate Limiting

## Prerequisites

1. **Start Redis locally:**
   ```powershell
   redis-server
   ```

2. **Verify Redis is running:**
   ```powershell
   redis-cli ping
   # Expected: PONG
   ```

3. **Server should be running** (already started with `npm run dev`)

---

## Test 1: Smart Suppression (< 50m)

Test that updates within 50 meters are suppressed.

### Create a ride and accept it:

```powershell
# 1. Create ride
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' -Method POST -Body 'MessageSid=SM999&From=%2B919876543210&Body=RIDEREQ|R999999|12.9716|77.5946|Test Location' -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing

# 2. Accept ride (use your driver ID)
$driverId = "d0ec79e4-26a4-4996-8e43-279a0ada4425"
$body = @{rideId='R999999';driverId=$driverId} | ConvertTo-Json
Invoke-WebRequest -Uri 'http://localhost:3000/driver/accept' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
```

### Test suppression:

```powershell
# Update 1: Same location (0m distance)
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' -Method POST -Body 'MessageSid=SM1001&From=%2B919876543210&Body=UPDATE|R999999|12.9716|77.5946' -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing

# Expected SMS: "Location updated..." (first update allowed)

# Update 2: Very close location (~11m distance)
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' -Method POST -Body 'MessageSid=SM1002&From=%2B919876543210&Body=UPDATE|R999999|12.9717|77.5946' -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing

# Expected SMS: "Location unchanged (11m). Update ignored."
```

**Check server logs** for:
```
Update suppressed - location unchanged {"distance":11,"threshold":50}
```

---

## Test 2: Rate Limiting (Max 5 Updates)

Test that more than 5 updates are blocked.

```powershell
# Send 6 updates rapidly with different locations (> 50m apart)
for ($i=1; $i -le 6; $i++) {
    $lat = 12.9716 + ($i * 0.001)  # Each ~111m apart
    $sid = "SM200$i"
    Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' -Method POST -Body "MessageSid=$sid&From=%2B919876543210&Body=UPDATE|R999999|$lat|77.5946" -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing
    Start-Sleep -Milliseconds 500
}
```

**Expected:**
- Updates 1-5: Success with "Updates remaining: X"
- Update 6: "Too many updates. Try again in 2 minute(s)."

**Check Redis:**
```powershell
redis-cli GET "ratelimit:passenger:{PASSENGER_ID}:count"
# Expected: 5

redis-cli TTL "ratelimit:passenger:{PASSENGER_ID}:count"
# Expected: ~120 seconds (or less if time passed)
```

---

## Test 3: Cooldown Period

Wait for cooldown to expire and verify counter resets.

```powershell
# Check TTL
redis-cli TTL "ratelimit:passenger:{PASSENGER_ID}:count"

# Wait for TTL to expire (or manually delete)
redis-cli DEL "ratelimit:passenger:{PASSENGER_ID}:count"
redis-cli DEL "ratelimit:passenger:{PASSENGER_ID}:location"

# Try update again
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' -Method POST -Body 'MessageSid=SM3001&From=%2B919876543210&Body=UPDATE|R999999|12.9800|77.5946' -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing

# Expected: Success (counter reset)
```

---

## Test 4: Distance-Based ETA

Test that ETA is calculated correctly based on driver location.

### Update driver location:

```powershell
$driverId = "d0ec79e4-26a4-4996-8e43-279a0ada4425"
$body = @{driverId=$driverId;lat=12.9800;lng=77.5946} | ConvertTo-Json
Invoke-WebRequest -Uri 'http://localhost:3000/driver/location' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
```

### Send passenger update:

```powershell
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' -Method POST -Body 'MessageSid=SM4001&From=%2B919876543210&Body=UPDATE|R999999|12.9716|77.5946' -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing
```

**Expected SMS:**
```
Driver is 0.9km away. ETA: 2 min(s). Updates remaining: 4
```

**Calculation:**
- Distance: ~934m
- ETA: 934m / 500m/min ≈ 2 minutes

---

## Test 5: Redis Health Check

Verify Redis health monitoring works.

```powershell
# Check health endpoint (if implemented)
Invoke-WebRequest -Uri 'http://localhost:3000/health' -UseBasicParsing
```

**Expected:**
```json
{
  "status": "ok",
  "database": true,
  "redis": true
}
```

---

## Test 6: Graceful Degradation

Test that system works even if Redis is down.

```powershell
# Stop Redis
redis-cli SHUTDOWN

# Try to send update
Invoke-WebRequest -Uri 'http://localhost:3000/webhook/sms' -Method POST -Body 'MessageSid=SM5001&From=%2B919876543210&Body=UPDATE|R999999|12.9716|77.5946' -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing

# Expected: Update should still work (graceful degradation)
# Check logs for: "Rate limit check failed, allowing update"

# Restart Redis
redis-server
```

---

## Verification Checklist

✅ Smart suppression blocks updates < 50m  
✅ Rate limiting blocks after 5 updates  
✅ Cooldown period resets counter after 2 minutes  
✅ ETA calculated correctly based on distance  
✅ Redis health check returns correct status  
✅ System degrades gracefully when Redis is unavailable  
✅ Server logs show appropriate debug messages  
✅ SMS responses are user-friendly

---

## Troubleshooting

**Redis connection errors:**
- Check if Redis is running: `redis-cli ping`
- Check REDIS_URL in `.env`
- Check server logs for connection errors

**Rate limiting not working:**
- Verify Redis is running
- Check passenger ID in Redis keys
- Use `redis-cli KEYS "ratelimit:*"` to see all keys

**Suppression not working:**
- Check distance calculation in logs
- Verify SUPPRESSION_THRESHOLD_METERS in `.env`
- Check that lat/lng are being passed correctly

---

## Redis Commands for Debugging

```powershell
# List all rate limit keys
redis-cli KEYS "ratelimit:*"

# Get update count for passenger
redis-cli GET "ratelimit:passenger:{PASSENGER_ID}:count"

# Get last location
redis-cli HGETALL "ratelimit:passenger:{PASSENGER_ID}:location"

# Check TTL
redis-cli TTL "ratelimit:passenger:{PASSENGER_ID}:count"

# Reset rate limit for passenger
redis-cli DEL "ratelimit:passenger:{PASSENGER_ID}:count"
redis-cli DEL "ratelimit:passenger:{PASSENGER_ID}:location"

# Clear all rate limit data
redis-cli FLUSHDB
```
