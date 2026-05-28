# CabLite Hardware Gateway: Step-by-Step Setup Guide

This guide will help you assemble and configure your physical SMS gateway using the ESP32 and SIM800L.

## ⚠️ Safety First
- **SIM800L Voltage:** The SIM800L operates between **3.4V and 4.4V** (4.1V is ideal). Connecting it directly to 5V or 12V will destroy it.
- **Power Peaks:** The SIM800L can draw up to **2 Amps** in short bursts during network communication. This is why the Buck Converter and Capacitor are mandatory.

---

## 🛠️ Assembly Instructions

### 1. Power Supply Setup
1.  Connect the **12V Adapter** to the **DC Barrel Jack**.
2.  Connect the output of the DC Barrel Jack to the **IN+** and **IN-** of the **LM2596 Buck Converter**.
3.  **BEFORE connecting anything else:** Use a multimeter on the **OUT+** and **OUT-** pins. Turn the small screw on the blue potentiometer until the voltage reads exactly **4.1V**.

### 2. Wiring the Components
| Component | Pin | Connection |
| :--- | :--- | :--- |
| **SIM800L** | VCC | LM2596 OUT+ |
| **SIM800L** | GND | LM2596 OUT- |
| **SIM800L** | TX | ESP32 GPIO 16 (RX2) |
| **SIM800L** | RX | ESP32 GPIO 17 (TX2) |
| **ESP32** | GND | LM2596 OUT- (Common Ground) |
| **Capacitor** | + (Long leg) | SIM800L VCC |
| **Capacitor** | - (Short leg) | SIM800L GND |

### 3. Inserting the SIM Card
- Use a **2G-compatible Micro SIM card**.
- Ensure the notch is facing the correct direction (usually indicated on the SIM holder).
- **Tip:** Disable the SIM PIN on your phone before inserting it into the SIM800L.

---

## 💻 Software Setup

### 1. Flash the ESP32
1.  Open the `hardware-gateway/gateway_firmware.ino` file in the **Arduino IDE**.
2.  Install required libraries:
    - **WebSockets** (by Markus Sattler)
    - **ArduinoJson** (by Benoit Blanchon)
3.  Update the `CONFIGURATION` section with your WiFi details and Backend IP.
4.  Select **ESP32 Dev Module** as your board and upload.

### 2. Backend Configuration
- Ensure your backend is running and accessible from your local network.
- The `SMSService.ts` and `SocketService.ts` have already been updated to prioritize your Hardware Gateway.

---

## 🧪 Testing the Gateway

### Test 1: Network Connection
1.  Power up the gateway.
2.  Observe the LED on the SIM800L:
    - **Fast Blinking (1s):** Searching for network.
    - **Slow Blinking (3s):** Successfully connected to the network.

### Test 2: Outgoing SMS
1.  Open the CabLite Driver app or use the Backend API to trigger a notification.
2.  The Backend will detect the Hardware Gateway is online and send a `send_sms` command via WebSockets.
3.  The ESP32 Serial Monitor should show: `--- SENDING PHYSICAL SMS ---`.

### Test 3: Incoming SMS
1.  Send a real SMS (e.g., `SRCH|Airport`) to the number in the SIM800L.
2.  The ESP32 will catch the message, parse it, and forward it to your backend's `/webhook/sms`.
3.  The Backend will process it and (if needed) send a reply back through the same gateway.

---

## 🚑 Troubleshooting
- **SIM800L Reboots when sending:** Your power supply isn't providing enough current. Check your Capacitor connection and ensure the 12V adapter is at least 2A.
- **"AT" command timeout:** Check TX/RX wiring. Remember: ESP32 TX -> SIM800L RX.
- **WebSocket Disconnected:** Ensure the `backendHost` in the ESP32 code is the correct local IP of your computer.
