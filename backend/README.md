# CabLite Backend

Backend system for CabLite - Offline-triggered ride dispatch with SMS integration.

## Features

- 📱 SMS-based ride requests via Twilio
- 🚗 Driver matching with PostGIS spatial queries
- 🔒 Atomic ride locking (prevents duplicate assignments)
- ⚡ Redis caching for location & rate limiting
- 🎯 Event-driven architecture
- 🔐 JWT authentication
- 📊 Comprehensive logging

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ with PostGIS extension
- Redis 6+
- Twilio account

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Set Up Database

```bash
# Create PostgreSQL database
createdb cablite

# Enable PostGIS
psql cablite -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Run migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate
```

### 4. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Webhooks
- `POST /webhook/sms` - Twilio incoming SMS

### Driver APIs (Requires JWT)
- `POST /driver/accept` - Accept ride offer
- `POST /driver/location` - Update location
- `POST /driver/status` - Set online/offline

### Ride APIs
- `GET /ride/:id` - Get ride details

## Project Structure

```
backend/
├── src/
│   ├── controllers/     # Route handlers
│   ├── services/        # Business logic
│   ├── middleware/      # Auth, validation
│   ├── utils/           # Helpers
│   ├── db/              # Prisma & Redis clients
│   └── index.ts         # Entry point
├── prisma/
│   └── schema.prisma    # Database schema
├── tests/               # Test files
└── logs/                # Log files
```

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Open Prisma Studio (DB GUI)
npm run prisma:studio
```

## Environment Variables

See `.env.example` for all required variables.

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run specific test file
npm test -- stateMachine.test.ts
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure production database URL
3. Set strong `JWT_SECRET`
4. Enable Twilio signature verification
5. Set up Redis with persistence
6. Configure proper logging

## License

MIT
