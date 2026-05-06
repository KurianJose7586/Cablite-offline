# CabLite Mobile UI/UX Requirements Document

## 1. Project Overview & Ethos
**CabLite** is a utility-driven, offline-first ride dispatch system. Its core premise is that passengers in low-connectivity areas can request rides via SMS, while drivers use a localized application to accept and complete those rides.

We are building a **Mobile Application (React Native / iOS & Android)** to simulate this entire ecosystem for portfolio and interview purposes. The UI must immediately convey a sense of technical competence, reliability, and stark minimalism.

**The Aesthetic:** "Utilitarian Professionalism." High contrast, clear typography, and zero decorative clutter. The design should feel incredibly fast, native, and lightweight.

---

## 2. Target Platforms & Format
- **Platform:** Mobile Phones (iOS and Android).
- **Format:** A single application that allows the user to toggle between two distinct modes from the home screen:
  1. **Driver Mode:** The map-centric interface used by cab drivers.
  2. **Passenger SMS Simulator:** A faux messaging interface used to demonstrate the offline SMS booking flow.

---

## 3. Core UI Requirements

### 3.1. The Entry Screen
- A stark, minimal landing screen giving the interviewer a clear choice:
  - Button A: "Enter Driver Mode"
  - Button B: "Launch Passenger Simulator"

### 3.2. Driver Mode (The Map Interface)
- **Map Styling:** Dark mode or high-contrast utilitarian map style. The map should not be visually overwhelming.
- **Driver Status Overlay:** A prominent, unambiguous toggle at the top or bottom (Offline / Online / Syncing). 
- **Ride Request Card:** When an SMS request hits the system, a high-priority "Ride Offer" card must slide up. It needs a massive, easily tappable "ACCEPT" button and a clear "DECLINE" button.
- **Navigation Visuals:** Clean route lines on the map from Driver -> Pickup -> Destination.

### 3.3. Passenger SMS Simulator Mode
- **Visual Container:** This screen should explicitly mimic a native mobile messaging app (like iOS iMessage or Android Messages) but styled within the app's minimal theme.
- **Message Bubbles:** Clear distinction between outgoing commands (e.g., `RIDEREQ|R123|12.97|77.59`) and incoming system responses (e.g., `Ride Accepted. Driver 3 mins away.`).
- **Input Area:** A standard chat input field at the bottom.

### 3.4. Offline-First Indicators
The design must heavily communicate its offline-first backend architecture:
- Use stark iconography for network states (e.g., solid green indicator for "Syncing", amber for "Offline Batching").
- UI updates (like tapping accept) should feel instantaneous locally, with sync status indicated subtly, rather than blocking the user with loading spinners.

### 3.5. Typography & Colors
- **Typography:** Highly legible, clean sans-serif (e.g., Inter, San Francisco, Roboto).
- **Color Palette:**
  - **Backgrounds:** Deep greys/blacks or stark whites (high contrast is key).
  - **Primary Accents:** Utilitarian colors—electric blue, bright amber, or neon green for actionable buttons and status indicators.

---

## 4. Specific Interactions to Design

1. **The "Ping" (Driver Mode):** The visual animation and layout when a new ride broadcast hits the driver's phone.
2. **The "Lock" (Driver Mode):** The transition state when a driver taps "Accept" and the backend grants them the atomic lock.
3. **Simulated Typing (Passenger Mode):** How the fake SMS interface handles sending a message and waiting for the automated system reply.

---

## 5. Non-Requirements (What NOT to Design)

To keep the scope tight and focused on the core engineering challenge, the designer should **EXCLUDE** the following:

- **NO Passenger Maps:** The passenger interacts *only* via the SMS Simulator. Do not design an Uber-like map interface for the passenger.
- **NO User Registration/Login:** The interviewer should immediately drop into the mode selection. No onboarding flows.
- **NO Payment UI:** We are not designing fare estimators or credit card inputs.
- **NO "Fluff" Animations:** Avoid bouncy, playful, or "consumer-friendly" animations. Animations should be crisp, native-feeling, and informational.

---

## 6. Deliverables Expected
- A cohesive Figma file tailored for mobile screens (e.g., iPhone 14 / Pixel 7 frames).
- High-fidelity mockups of:
  - The Mode Selection Screen.
  - Driver Mode (Idle map, Incoming Request, Active Route).
  - Passenger SMS Simulator (Empty state, active chat).
- A basic mobile design token sheet (Colors, Typography, tap targets).
