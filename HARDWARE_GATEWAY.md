# CabLite Hardware Gateway (ESP32 + SIM800L)

This document outlines the hardware requirements and architecture for replacing Twilio with a self-hosted SMS gateway.

## 🛒 Shopping List

| Item | Description | Approx. Cost |
| :--- | :--- | :--- |
| **ESP32 Dev Board** | ESP32-WROOM-32 (30 or 38 pin) | $5 / ₹450 |
| **SIM800L Module** | Red board version with Spring Antenna | $6 / ₹550 |
| **LM2596 Buck Converter** | Adjustable DC-DC step-down module | $2 / ₹150 |
| **12V 2A DC Adapter** | Standard wall power supply | $5 / ₹400 |
| **DC Barrel Jack** | Female adapter for easy wiring | $1 / ₹50 |
| **MB102 Breadboard** | 830-point solderless prototyping board | $3 / ₹250 |
| **Jumper Wires** | Mix of Male-to-Male (M-M) and Male-to-Female (M-F) | $4 / ₹300 |
| **1000uF Capacitor** | Electrolytic (16V or higher) - Vital for stability | $0.50 / ₹20 |

---

## 🏗️ Architecture

The ESP32 acts as a bridge between the GSM network and your Node.js backend.

1. **Incoming SMS:** SIM800L receives an SMS -> sends text to ESP32 via Serial.
2. **Backend Bridge:** ESP32 connects to Wi-Fi -> sends a POST request to your backend (`/webhook/sms`).
3. **Logic:** Backend processes the request (e.g., Search, Ride Request) -> returns a JSON response.
4. **Outgoing SMS:** ESP32 receives the response -> commands SIM800L to send the reply SMS to the user.

---

## 🔌 Wiring Guide (Preliminary)

**CRITICAL: Do not power the SIM800L directly from the ESP32.**

1. **Power Input:** 12V Adapter -> DC Barrel Jack.
2. **Voltage Step-Down:** DC Barrel Jack -> LM2596 Input.
3. **SIM800L Power:** LM2596 Output (Adjusted to **4.1V**) -> SIM800L VCC & GND.
4. **Common Ground:** Connect the GND of the LM2596 Output to the GND of the ESP32.
5. **Data Connection:**
   * ESP32 TX (GPIO 17) -> SIM800L RX
   * ESP32 RX (GPIO 16) -> SIM800L TX
6. **Stability:** Place the **1000uF Capacitor** across the SIM800L VCC and GND pins (check polarity!).

---

## 🚀 Phase 2: Setup
Once you have the parts:
1. Adjust the Buck Converter to 4.1V using a multimeter before connecting the SIM800L.
2. Flash the ESP32 Gateway firmware (C++).
3. Update your `.env` to point to the ESP32's local IP or keep using ngrok.
