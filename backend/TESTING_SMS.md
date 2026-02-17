# Testing the SMS Webhook

## Using Twilio Console (Recommended for Production)

1. **Set up Twilio Account:**
   - Sign up at https://www.twilio.com
   - Get your Account SID and Auth Token
   - Purchase a phone number

2. **Update `.env`:**
   ```env
   TWILIO_ACCOUNT_SID=your_actual_sid
   TWILIO_AUTH_TOKEN=your_actual_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

3. **Expose Local Server (for testing):**
   ```powershell
   # Install ngrok
   choco install ngrok
   
   # Expose port 3000
   ngrok http 3000
   ```

4. **Configure Twilio Webhook:**
   - Go to Twilio Console → Phone Numbers → Your Number
   - Under "Messaging", set webhook URL to: `https://your-ngrok-url.ngrok.io/webhook/sms`
   - Method: POST

5. **Send Test SMS:**
   - Send SMS to your Twilio number:
   ```
   RIDEREQ|R123456|12.9716|77.5946|MG Road, Bangalore
   ```

---

## Manual Testing (Without Twilio)

### Using cURL

```powershell
# Test RIDEREQ
curl -X POST http://localhost:3000/webhook/sms `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "MessageSid=SM123456&From=+919876543210&Body=RIDEREQ|R123456|12.9716|77.5946|MG Road, Bangalore"

# Test UPDATE
curl -X POST http://localhost:3000/webhook/sms `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "MessageSid=SM123457&From=+919876543210&Body=UPDATE|R123456"

# Test CANCEL
curl -X POST http://localhost:3000/webhook/sms `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "MessageSid=SM123458&From=+919876543210&Body=CANCEL|R123456"
```

### Using PowerShell

```powershell
# Test RIDEREQ
$body = @{
    MessageSid = "SM123456"
    From = "+919876543210"
    Body = "RIDEREQ|R123456|12.9716|77.5946|MG Road, Bangalore"
}

Invoke-WebRequest -Uri "http://localhost:3000/webhook/sms" `
    -Method POST `
    -Body $body `
    -ContentType "application/x-www-form-urlencoded"
```

---

## Expected Responses

### RIDEREQ Success
- SMS sent to passenger: "Ride R123456 requested. Searching for nearby drivers..."
- Ride created in database with state: BROADCASTING
- Logs show ride creation

### UPDATE Request
- SMS sent: "Driver is on the way. ETA: 5 mins. (Location updates coming soon)"
- (Full functionality requires Redis and driver location tracking)

### CANCEL Request
- SMS sent: "Ride R123456 has been cancelled."
- Ride state changed to CANCELLED

### Invalid Format
- SMS sent: "Invalid message format. [error details]"

### Duplicate Message
- Ignored silently (idempotency protection)

---

## Checking Database

```powershell
# Open Prisma Studio
npm run prisma:studio
```

Navigate to:
- **User** table - See created passengers
- **Ride** table - See ride requests with states
- Check `twilioMessageSid` for idempotency

---

## Running Unit Tests

```powershell
npm test
```

This will run the SMS parser tests.

---

## Troubleshooting

**"Twilio credentials not configured":**
- Update `.env` with real Twilio credentials
- Or ignore for local testing (signature verification is skipped in development)

**"Ride not found" on UPDATE/CANCEL:**
- First create a ride with RIDEREQ
- Use the same RideID for UPDATE/CANCEL

**No SMS received:**
- Check Twilio console for delivery status
- Verify phone number format (+country code)
- Check logs for errors
