# CabLite Backend - Critical Production Improvements

## 🔒 Security & Authentication

### JWT Authentication for Drivers
**File**: `backend/src/middleware/auth.ts`

```typescript
import jwt from 'jsonwebtoken';

export async function authenticateDriver(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { driverId, userId, role }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

**Apply to all driver endpoints**:
```typescript
router.post('/driver/accept', authenticateDriver, acceptRideHandler);
router.post('/driver/location', authenticateDriver, updateLocationHandler);
router.post('/driver/status', authenticateDriver, updateStatusHandler);
```

### Twilio Signature Verification
**File**: `backend/src/middleware/twilioAuth.ts`

```typescript
import twilio from 'twilio';

export function verifyTwilioSignature(req, res, next) {
  const signature = req.headers['x-twilio-signature'];
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  
  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    req.body
  );
  
  if (!isValid) {
    return res.status(403).json({ error: 'Invalid Twilio signature' });
  }
  
  next();
}
```

**Apply to webhook**:
```typescript
router.post('/webhook/sms', verifyTwilioSignature, handleIncomingSMS);
```

---

## 🎯 Event-Driven Architecture

### Event Bus
**File**: `backend/src/services/eventBus.ts`

```typescript
import { EventEmitter } from 'events';

class RideEventBus extends EventEmitter {
  // Typed event emitters
  emitRideRequested(data: { rideId: string; passengerId: string }) {
    this.emit('RIDE_REQUESTED', data);
  }
  
  emitRideAccepted(data: { rideId: string; driverId: string }) {
    this.emit('RIDE_ACCEPTED', data);
  }
  
  emitDriverMoved(data: { driverId: string; lat: number; lng: number; rideId?: string }) {
    this.emit('DRIVER_MOVED', data);
  }
  
  emitRideExpired(data: { rideId: string }) {
    this.emit('RIDE_EXPIRED', data);
  }
}

export const eventBus = new RideEventBus();

// Listeners
eventBus.on('RIDE_REQUESTED', async (data) => {
  await broadcastService.notifyNearbyDrivers(data.rideId);
});

eventBus.on('RIDE_ACCEPTED', async (data) => {
  await smsService.notifyPassenger(data.rideId, 'Driver assigned!');
  await broadcastService.notifyOtherDrivers(data.rideId, 'Ride taken');
});

eventBus.on('RIDE_EXPIRED', async (data) => {
  await smsService.notifyPassenger(data.rideId, 'No drivers available');
});
```

---

## 🛡️ Idempotency Protection

### SMS Deduplication
**File**: `backend/src/controllers/smsController.ts`

```typescript
async function handleIncomingSMS(req, res) {
  const { MessageSid, From, Body } = req.body;
  
  // Check if we've already processed this message
  const existing = await prisma.ride.findUnique({
    where: { twilioMessageSid: MessageSid }
  });
  
  if (existing) {
    // Already processed, return success without duplicating
    return res.status(200).send('<Response></Response>');
  }
  
  // Parse and process...
  const { type, rideId, ...data } = parseSMS(Body);
  
  if (type === 'RIDEREQ') {
    await prisma.ride.create({
      data: {
        id: rideId,
        twilioMessageSid: MessageSid, // Store for deduplication
        passengerId: From,
        // ... other fields
      }
    });
  }
  
  res.status(200).send('<Response></Response>');
}
```

---

## ⚡ Dead Driver Handling

### Background Worker
**File**: `backend/src/workers/deadDriverWorker.ts`

```typescript
import { eventBus } from '../services/eventBus';

export async function checkDeadDrivers() {
  const threshold = new Date(Date.now() - 60000); // 60 seconds ago
  
  const staleRides = await prisma.ride.findMany({
    where: {
      state: { in: ['ACCEPTED', 'EN_ROUTE'] },
      driver: {
        lastLocationUpdate: { lt: threshold }
      }
    },
    include: { driver: true }
  });
  
  for (const ride of staleRides) {
    console.warn(`Driver ${ride.driverId} is unresponsive for ride ${ride.id}`);
    
    // Option 1: Cancel and rebroadcast
    await prisma.ride.update({
      where: { id: ride.id },
      data: {
        state: 'BROADCASTING',
        driverId: null,
        broadcastExpiresAt: new Date(Date.now() + 60000)
      }
    });
    
    await prisma.driver.update({
      where: { id: ride.driverId },
      data: { activeRideId: null, status: 'OFFLINE' }
    });
    
    eventBus.emitRideRequested({ rideId: ride.id, passengerId: ride.passengerId });
    
    // Option 2: Cancel with system message
    // await stateMachine.transition(ride.id, 'CANCELLED');
    // await smsService.send(ride.passenger.phone, 'Ride cancelled due to driver unavailability');
  }
}

// Run every 30 seconds
setInterval(checkDeadDrivers, 30000);
```

---

## 📊 Database Indexes

### Migration File
**File**: `backend/prisma/migrations/xxx_add_indexes.sql`

```sql
-- Driver indexes
CREATE INDEX idx_driver_status ON "Driver"(status);
CREATE INDEX idx_driver_active_ride ON "Driver"("activeRideId");

-- Spatial index for PostGIS
CREATE INDEX idx_driver_location ON "Driver" 
  USING GIST (ST_MakePoint("currentLng", "currentLat")::geography);

-- Ride indexes
CREATE INDEX idx_ride_state ON "Ride"(state);
CREATE INDEX idx_ride_passenger ON "Ride"("passengerId");
CREATE INDEX idx_ride_driver ON "Ride"("driverId");
CREATE INDEX idx_ride_broadcast_expiry ON "Ride"("broadcastExpiresAt") 
  WHERE state = 'BROADCASTING';

-- User indexes
CREATE UNIQUE INDEX idx_user_phone ON "User"(phone);
```

---

## 🧪 Stress Testing

### Concurrent Accept Test
**File**: `backend/tests/stress/concurrentAccept.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';

describe('Atomic Ride Locking', () => {
  it('should handle 100 concurrent accept attempts', async () => {
    // Create a ride
    const ride = await createTestRide();
    
    // Create 100 drivers
    const drivers = await Promise.all(
      Array.from({ length: 100 }, (_, i) => createTestDriver(`driver-${i}`))
    );
    
    // All drivers try to accept simultaneously
    const results = await Promise.allSettled(
      drivers.map(driver => 
        acceptRide(driver.id, ride.id)
      )
    );
    
    // Exactly 1 should succeed
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');
    
    expect(successful.length).toBe(1);
    expect(failed.length).toBe(99);
    
    // Verify DB state
    const updatedRide = await prisma.ride.findUnique({
      where: { id: ride.id }
    });
    
    expect(updatedRide.state).toBe('ACCEPTED');
    expect(updatedRide.driverId).toBeTruthy();
  });
});
```

---

## 📝 Updated Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/cablite
REDIS_URL=redis://localhost:6379

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Security
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=7d

# Server
PORT=3000
NODE_ENV=development

# PostGIS
POSTGIS_ENABLED=true

# Rate Limiting
MAX_UPDATES_PER_RIDE=5
UPDATE_COOLDOWN_SECONDS=120
SMART_SUPPRESSION_METERS=50

# Timeouts
BROADCAST_EXPIRY_SECONDS=60
DEAD_DRIVER_THRESHOLD_SECONDS=60
```

---

## 🎯 Summary of Improvements

| Issue | Original | Fixed |
|-------|----------|-------|
| **Atomic Locking** | `findUnique` (no lock) | `FOR UPDATE` + Serializable |
| **Spatial Queries** | Haversine in app | PostGIS with GIST index |
| **Location Storage** | DB every 10s | Redis + periodic DB sync |
| **Rate Limiting** | DB (race conditions) | Redis atomic operations |
| **Idempotency** | None | Twilio MessageSid tracking |
| **Indexes** | None specified | Comprehensive index strategy |
| **Dead Drivers** | Not handled | Background worker |
| **Security** | Basic | JWT + Twilio signature |
| **Architecture** | Monolithic | Event-driven with bus |
| **Testing** | 5 concurrent | 100 concurrent stress test |

---

## ✅ Production Readiness Checklist

- [x] Row-level locking with `FOR UPDATE`
- [x] PostGIS for spatial queries
- [x] Redis for location caching
- [x] Redis for rate limiting
- [x] Idempotency protection
- [x] Comprehensive indexes
- [x] Event-driven architecture
- [x] JWT authentication
- [x] Twilio signature verification
- [x] Dead driver handling
- [x] Stress testing (100 concurrent)
- [x] Explicit expiry timestamps
- [x] Smart suppression logic

**Status**: Production-grade backend blueprint ✨
