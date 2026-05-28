# CabLite Project Summary

CabLite is an **offline-first ride-hailing platform** engineered for mission-critical reliability in environments with zero or intermittent internet connectivity (e.g., disaster recovery, rural areas, or network-congested events).

## 🌟 Core Vision
To provide a "painkiller" utility that ensures transport accessibility when standard data-dependent services (Uber/Lyft) fail.

## 🏗️ System Architecture

### 1. Offline Discovery (Frontend)
- **Local SQLite Shards:** Uses FTS5 (Full-Text Search) for zero-data destination lookup.
- **Tiered Data:** "Vital" landmarks (Hospitals/Stations) are pre-loaded; "Regional" and "Extended" tiers are downloadable.
- **Compass-Vector UI:** A directional pointer interface that guides users to coordinates without requiring map tiles.

### 2. Communication Protocol
- **SMS Handshake:** Primary data transport. High-level intents (Search, Request, Update) are compressed into semantic SMS packets.
- **Hybrid Gateway:** Routes requests via SMS to a backend for heavy lifting (OSM Search, Driver Matching) and returns results via SMS.

### 3. Backend Strategy
- **Tech Stack:** Node.js, PostGIS (Geospatial logic), Redis (Real-time state), and Prisma ORM.
- **Logic:** Handles driver-passenger matching, SMS parsing, and coordinate broadcasting.

## 🔌 The Hardware Update (Self-Hosted Gateway)
A major strategic shift from cloud-based SMS (Twilio) to a **decentralized hardware gateway**.

- **Goal:** Eliminate recurring API costs and provide a truly sovereign communication hub.
- **Hardware:** ESP32 Microcontroller + SIM800L GSM Module.
- **Mechanism:**
    1. **Receiver:** SIM800L captures incoming SMS.
    2. **Relay:** ESP32 bridges the SMS to the Node.js backend via a local Wi-Fi/HTTP webhook.
    3. **Transmitter:** Backend responses are sent back through the ESP32 to the user's phone.
- **Status:** Phase 2 implementation (Hardware assembly and firmware flashing) is underway.

## 🚀 Key Features Implemented
- [x] **Vital Tier Search:** FTS5 local lookup with Delhi mock data.
- [x] **SMS Fallback UI:** Deep search logic for when local DB misses.
- [x] **Driver Tracking:** GPS polling and background sync logic.
- [x] **Crash-Resistant UI:** Optimized MapView fallbacks for low-resource devices.

## 📅 Roadmap
- **Short-Term:** OSM extraction pipeline for global SQLite shards, Dead-reckoning driver UI.
- **Long-Term:** Bluetooth Mesh-CDN for shard sharing, Plus-Code integration, and IVR ride booking.
