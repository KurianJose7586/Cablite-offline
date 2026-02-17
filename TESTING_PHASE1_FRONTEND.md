# Phase 1 Testing Guide: SMS Integration

## Prerequisites

Before testing on your phone, ensure:

1. **Twilio Account Setup:**
   - Twilio account created
   - Twilio phone number purchased
   - Webhook configured: `POST https://your-backend-url/webhook/sms`

2. **Backend Running:**
   - Backend server running on port 3000
   - Database connected
   - Twilio credentials in `.env`

3. **Phone Setup:**
   - Expo Go app installed
   - SMS capability enabled
   - Phone can send SMS

---

## Step 1: Configure Backend Number

**On Your Phone (Expo Go):**

1. Open the CabLite app
2. Complete onboarding (select Passenger or Driver)
3. Go to Settings
4. Enter your Twilio phone number:
   ```
   Example: +12345678900
   ```
5. Enter your name
6. Tap "Save Settings"

**Expected:** Settings saved successfully

---

## Step 2: Test Passenger Ride Request

**On Your Phone:**

1. Go to Passenger Home
2. Wait for location to load
3. Tap "Request Ride via SMS"

**SMS Sent:**
```
RIDEREQ|R123456|12.9716|77.5946|Koramangala
```

**Check Backend Logs:**
```
Incoming SMS {"from":"+919876543210","body":"RIDEREQ|R123456|12.9716|77.5946|Koramangala"}
Ride created {"rideId":"R123456","passengerId":"..."}
State transition: REQUESTED -> BROADCASTING
Found nearby drivers {"count":0}
```

**Check Database (Prisma Studio):**
- New ride with ID `R123456`
- State: `BROADCASTING`
- Pickup coordinates: 12.9716, 77.5946
- Destination: "Koramangala"

**Expected SMS Response (if Twilio configured):**
```
Ride R123456 requested. Searching for nearby drivers...
```

---

## Step 3: Verify SMS Format

**Check that SMS matches backend parser:**

✅ Format: `RIDEREQ|RIDEID|LAT|LNG|DESTINATION`  
✅ Ride ID starts with 'R'  
✅ Latitude and longitude are numbers  
✅ Destination is included  
✅ Pipe delimiters used (not spaces or commas)

**Common Issues:**

❌ Old format: `REQ 123456 12.97,77.59` → Won't parse  
❌ Missing destination → Parser error  
❌ Wrong delimiters → Parser error

---

## Step 4: Test with Real Driver (Manual)

**Setup:**
1. Have a second phone or use your own phone
2. Send SMS to Twilio number manually

**Driver Acceptance (Manual SMS):**
```
Send to Twilio number: ACCEPT|R123456
```

**Backend Processing:**
- Receives SMS via webhook
- Finds ride R123456
- Updates state to ACCEPTED
- Sends confirmation to passenger

**Passenger App:**
- Status screen should show "Ride Accepted" (if polling implemented)
- Or passenger receives SMS notification

---

## Step 5: Test Location Update

**Passenger sends UPDATE:**
```
Send to Twilio number: UPDATE|R123456|12.9720|77.5950
```

**Backend Processing:**
- Rate limiting check
- Distance calculation
- ETA computation
- SMS response with distance/ETA

**Expected SMS Response:**
```
Driver is 0.5km away. ETA: 1 min(s). Updates remaining: 4
```

---

## Step 6: Test Cancellation

**Passenger sends CANCEL:**
```
Send to Twilio number: CANCEL|R123456
```

**Backend Processing:**
- State transition to CANCELLED
- Driver notified
- Passenger confirmed

**Expected SMS Response:**
```
Ride R123456 has been cancelled.
```

---

## Troubleshooting

### SMS Not Sending from App

**Check:**
- Phone has SMS capability
- Backend number configured in settings
- SMS permissions granted to Expo Go

**Test:**
```typescript
const isAvailable = await SMS.isAvailableAsync();
console.log('SMS Available:', isAvailable);
```

### Backend Not Receiving SMS

**Check:**
- Twilio webhook configured correctly
- Backend URL accessible (use ngrok for testing)
- Twilio credentials in `.env`

**Test:**
```bash
# Check webhook endpoint
curl -X POST http://localhost:3000/webhook/sms \
  -d "MessageSid=TEST123&From=+1234567890&Body=RIDEREQ|TEST|12.97|77.59|Test"
```

### SMS Format Errors

**Check backend logs for:**
```
SMS parsing failed {"error":"..."}
```

**Common errors:**
- Missing pipe delimiters
- Invalid ride ID format
- Missing required fields

### No SMS Response

**Check:**
- Twilio credentials configured
- `TWILIO_ACCOUNT_SID` in `.env`
- `TWILIO_AUTH_TOKEN` in `.env`
- `TWILIO_PHONE_NUMBER` in `.env`

**Note:** In development, SMS sending might fail if Twilio not configured. Check logs for:
```
SMS sent {"to":"+1234567890","message":"..."}
```

---

## Success Criteria

✅ **SMS Format:** Matches backend parser  
✅ **Ride Creation:** Ride appears in database  
✅ **State Machine:** Transitions work correctly  
✅ **Idempotency:** Duplicate SMS ignored  
✅ **Error Handling:** Invalid SMS gets error response  
✅ **Location Data:** Coordinates saved correctly  
✅ **Destination:** Address included in ride

---

## Next Steps

After Phase 1 is working:

**Phase 2:** Add driver acceptance via app (HTTP)  
**Phase 3:** Add ride status polling (HTTP)  
**Phase 4:** Add location updates via app (HTTP)  
**Phase 5:** Real-time ETA display

**Remember:** SMS always works, HTTP is optional enhancement!

---

## Testing Checklist

### Basic Flow
- [ ] Configure backend number in settings
- [ ] Request ride from passenger app
- [ ] SMS sent with correct format
- [ ] Ride created in database
- [ ] Backend logs show correct parsing

### SMS Commands
- [ ] RIDEREQ creates ride
- [ ] UPDATE updates location
- [ ] CANCEL cancels ride
- [ ] Invalid format gets error

### Error Handling
- [ ] Missing backend number → error alert
- [ ] No location → error alert
- [ ] SMS unavailable → error alert
- [ ] Duplicate SMS → ignored

### Database Verification
- [ ] Ride ID matches SMS
- [ ] Coordinates correct
- [ ] Destination saved
- [ ] State transitions work
- [ ] Timestamps set correctly
