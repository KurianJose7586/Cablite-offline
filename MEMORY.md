x# CabLite: Project Memory Index

## 📌 Project Overview & Vision
CabLite is an **offline-first ride-hailing platform** designed for environments with zero or spotty internet connectivity. It uses **SMS as the primary data transport layer** and **local GPS/SQLite for discovery**, positioning it as a "painkiller" utility for disaster recovery, emerging markets, and network-congested events.

### The "Painkiller" Strategy
- **Reliability over Visuals:** When Uber/Lyft fail due to "No Connection," CabLite must work.
- **Protocol:** High-level intent is captured in the app -> compressed into SMS packets -> processed by a backend gateway.
- **Degradation:** The app gracefully degrades from Address -> Coordinates -> Compass as signal strength drops.

---

## 🛠️ Architecture & Design Choices

### 1. Offline Discovery Layer (Vector Sector Sharding)
- **Problem:** Finding destinations without internet or 2GB map downloads.
- **Solution:** Tiered SQLite shards using FTS5 (Full-Text Search).
- **Tiers:**
  - **Vital (Permanent):** High-impact POIs (Airports, Hospitals, Stations). ~200KB-1MB per city.
  - **Regional (Sticky):** Local landmarks, office parks. ~4MB-8MB per city.
  - **Extended (On-Demand):** Full street-level data.
- **Technical Choice:** Each city shard is an independent `.db` connection to avoid brittle `ATTACH DATABASE` native bugs in Expo/React Native.

### 2. Communication Layer (Semantic SMS Handshake)
- **Current Flow (Transitioning):** `App -> SMS -> [Twilio / Hardware Gateway] -> Backend -> Socket.io -> Driver`.
- **Hardware Shift:** Moving from Twilio to a self-hosted **ESP32 + SIM800L Gateway** to reduce costs and increase decentralization.
- **Search Fallback:** If local SQLite fails, a `SRCH|Query` SMS is sent to the backend to leverage Google/OSM search and reply via SMS.
- **Update Logic:** Passengers have a rate-limited "Update" button to request driver location via SMS during active rides.

### 3. Navigation & Mapping
- **Visualization vs. Discovery:** Decoupled. Search works offline via SQLite; Map visualization (React Native Maps) is secondary.
- **Compass-Vector UI:** For zero-data scenarios, the app uses a compass pointer toward destination coordinates rather than loading map tiles.

---

## 🚀 Implemented Features (Phase 1)
- [x] **Crash-Resistant Routing:** Bypassed MapView on Android for Passenger Home to prevent crashes without API keys.
- [x] **Vital Tier Search:** SQLite FTS5 implementation with mock Delhi data.
- [x] **Deep Search Fallback:** UI and logic for SMS-based destination lookup.
- [x] **Robust Location Fetching:** 15s timeout with last-known-position fallback.
- [x] **Driver Syncing:** 30s background GPS polling for online drivers.
- [x] **Architecture:** Reverted to Stable Architecture (disabled New Arch) for release stability.

---

## 📅 Future Roadmap

### Short-Term (The "Gaps")
- **Backend Search Pipeline:** Automated script to extract OSM data into `.db` shards.
- **SMS Parsing Engine:** Backend logic to handle `SRCH|` and reply with coordinates.
- **Dead Reckoning UI:** Moving the driver icon based on last known velocity/direction between SMS updates.

### Long-Term
- **Mesh-CDN:** Drivers carrying shard updates to passengers via Bluetooth LE.
- **Plus-Code Integration:** Using 4-7 character codes for ultra-precise, zero-data destination entry.
- **IVR Integration:** Allowing ride booking via automated phone call for feature-phone users.

---

## 📝 Design Principles
1. **Low Data Density:** Every byte sent via SMS costs time and money. Use delimiters like `|` and `*`.
2. **First-Run Utility:** The app must be useful immediately after download, even if the user never opens it again until an emergency.
3. **No Spinning Wheel:** Never show an infinite loading spinner for network-dependent tasks; use clear "Working via SMS" or "Offline" states.
