# CabLite - Offline-Triggered Ride Dispatch System

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

A modern ride-sharing application with offline-first design, SMS integration, and real-time driver matching. CabLite enables passengers to request rides via SMS and allows drivers to accept and complete rides with full offline support.

## 🎯 Key Features

- **📱 SMS-Based Requests**: Passengers request rides via SMS without needing an app
- **🚗 Real-Time Driver Matching**: PostGIS spatial queries for intelligent driver selection
- **🔒 Atomic Ride Locking**: Prevents duplicate ride assignments with transaction-level consistency
- **📍 Live Location Tracking**: Real-time GPS updates from drivers
- **⚡ Event-Driven Architecture**: Decoupled services via event bus
- **🔐 JWT Authentication**: Secure API endpoints
- **💾 Redis Caching**: Fast location queries and rate limiting
- **📊 Comprehensive Logging**: Full audit trail of all operations
- **📱 Native Mobile App**: Cross-platform iOS/Android with React Native
- **🌐 Offline Support**: Works seamlessly with poor connectivity

## 📁 Project Structure

```
CabLite/
├── app/                          # React Native frontend (Expo)
│   ├── _layout.tsx              # Navigation stack configuration
│   ├── index.tsx                # Splash/entry screen
│   ├── welcome.tsx              # Welcome screen
│   ├── role-selection.tsx       # Driver/Passenger role selection
│   ├── passenger-home.tsx       # Passenger dashboard
│   ├── driver-home.tsx          # Driver dashboard
│   ├── driver-active-ride.tsx   # Active ride details
│   ├── status.tsx               # Status/info screen
│   └── settings.tsx             # App settings
├── backend/                      # Node.js/Express backend
│   ├── src/
│   │   ├── index.ts             # Entry point
│   │   ├── controllers/         # Request handlers
│   │   ├── services/            # Business logic
│   │   ├── routes/              # API endpoints
│   │   ├── db/                  # Database & Redis clients
│   │   ├── jobs/                # Background jobs
│   │   └── utils/               # Utilities (geo, logging, SMS)
│   ├── prisma/
│   │   ├── schema.prisma        # Data model
│   │   └── migrations/          # Database migrations
│   └── tests/                   # Unit tests
├── store/                        # Zustand state management
├── assets/                       # Images, fonts, etc.
├── app.json                     # Expo app configuration
├── package.json                 # Frontend dependencies
├── tailwind.config.js           # TailwindCSS configuration
└── tsconfig.json                # TypeScript configuration
```

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** and npm
- **PostgreSQL 14+** with PostGIS extension
- **Redis 6+**
- **Twilio account** (for SMS)
- **Expo CLI** (for frontend development)

### Frontend Setup

```bash
# Install dependencies
npm install

# Start Expo development server
npm start

# Run on specific platform
npm run android    # Android emulator
npm run ios        # iOS simulator
npm run web        # Web browser
```

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your PostgreSQL, Redis, and Twilio credentials

# Create database and run migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate

# Start development server
npm run dev
```

## 📋 System Architecture

### Frontend (React Native + Expo)
- **UI Framework**: NativeWind (TailwindCSS for React Native)
- **Navigation**: Expo Router
- **State Management**: Zustand
- **Location**: Expo Location API
- **SMS**: Expo SMS API

### Backend (Node.js + Express)
- **Database**: PostgreSQL with PostGIS for geospatial queries
- **Caching**: Redis for location data and rate limiting
- **ORM**: Prisma for type-safe database access
- **Architecture Pattern**: Event-driven with service-oriented design
- **SMS Gateway**: Twilio integration
- **Authentication**: JWT tokens

### Data Flow

1. **Passenger Request**: SMS → Twilio → Backend webhook
2. **Ride Matching**: Query nearby drivers using PostGIS
3. **Driver Notification**: Broadcast event to connected drivers
4. **First Accept**: Driver accepts ride (atomic transaction)
5. **Location Updates**: Real-time GPS sync via WebSocket/polling
6. **Ride Completion**: Update ride status, cleanup

## 🧪 Testing

```bash
# Frontend tests
npm test

# Backend tests
cd backend
npm test              # Run tests once
npm run test:watch   # Watch mode
```

## 🔄 Database Management

```bash
cd backend

# Run pending migrations
npm run prisma:migrate

# Open Prisma Studio (visual database editor)
npm run prisma:studio

# Generate Prisma Client
npm run prisma:generate

# View migrations
npm run prisma:migrate status
```

## 🔧 Development

### Environment Variables

**Frontend** (`app-level .env`):
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_TWILIO_ACCOUNT_SID=your_sid
```

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/cablite
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
TWILIO_AUTH_TOKEN=your_token
```

### Code Style & Linting

- TypeScript for type safety
- Prettier for code formatting
- ESLint for code quality

## 📦 Deployment

### Production Build

**Frontend**:
```bash
npm run build
# Use EAS Build for native app deployment
```

**Backend**:
```bash
cd backend
npm run build
npm start
```

### Database Setup (Production)

```bash
# Enable PostGIS extension
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Run migrations
npm run prisma:migrate -- --skip-generate
```

## 🏗️ Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend | React Native | 0.81.5 |
| Frontend Build | Expo | ~54.0.33 |
| Backend | Node.js/Express | 18+ |
| Database | PostgreSQL | 14+ |
| Caching | Redis | 6+ |
| ORM | Prisma | ^5.9.0 |
| State Management | Zustand | - |
| Styling | NativeWind | ^4.2.1 |
| SMS | Twilio | - |

## 📄 Documentation

- [Backend README](backend/README.md) - Backend-specific setup and architecture
- [TESTING_PHASE1_FRONTEND.md](TESTING_PHASE1_FRONTEND.md) - Frontend testing documentation

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/your-feature`)
2. Commit changes (`git commit -m 'Add your feature'`)
3. Push to branch (`git push origin feature/your-feature`)
4. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub or contact the development team.

---

**Last Updated**: April 2026  
**Maintainer**: Development Team
