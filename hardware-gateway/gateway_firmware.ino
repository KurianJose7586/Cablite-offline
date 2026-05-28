/*
 * CabLite Hardware Gateway v2.0
 * ESP32 + SIM800L + WebSockets
 * 
 * Dependencies (Install via Arduino Library Manager):
 * 1. WebSockets by Markus Sattler
 * 2. Socket.io-client by Links2004 (or similar)
 * 
 * Hardware Pins:
 * SIM800L TX -> ESP32 GPIO 16 (RX2)
 * SIM800L RX -> ESP32 GPIO 17 (TX2)
 * SIM800L VCC -> Buck Converter 4.1V
 * SIM800L GND -> Buck Converter GND + ESP32 GND
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h> // For parsing outgoing SMS commands

// --- CONFIGURATION ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* backendHost = "YOUR_BACKEND_IP"; // e.g., "192.168.1.10"
const int backendPort = 3000;
const char* backendWebhookUrl = "http://YOUR_BACKEND_IP:3000/webhook/sms";
const char* gatewayToken = "HARDWARE_GW_001";
// ---------------------

HardwareSerial sim800(2);
WebSocketsClient webSocket;
String buffer = "";

void setup() {
  Serial.begin(115200);
  sim800.begin(9600, SERIAL_8N1, 16, 17);

  Serial.println("\n--- CabLite Hardware Gateway v2.0 ---");

  // 1. Connect WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected: " + WiFi.localIP().toString());

  // 2. Initialize SIM800L
  setupSIM800L();

  // 3. Setup WebSocket (Socket.io)
  // Socket.io path is /socket.io/?EIO=4&transport=websocket
  webSocket.begin(backendHost, backendPort, "/socket.io/?EIO=4&transport=websocket");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  
  Serial.println("Gateway Ready. Monitoring SIM800L & WebSocket...");
}

void loop() {
  webSocket.loop();
  
  // Read from SIM800L (Incoming SMS)
  while (sim800.available()) {
    char c = sim800.read();
    buffer += c;
    
    if (buffer.indexOf("+CMT:") != -1 && buffer.endsWith("\n")) {
       delay(200);
       while(sim800.available()) buffer += (char)sim800.read();
       processIncomingSMS(buffer);
       buffer = "";
    }
  }
  
  // Forward Serial Monitor to SIM800L for debugging
  while (Serial.available()) {
    sim800.write(Serial.read());
  }
}

void setupSIM800L() {
  Serial.println("Initializing SIM800L...");
  sim800.println("AT"); 
  delay(500);
  sim800.println("AT+CMGF=1"); // Text mode
  delay(500);
  sim800.println("AT+CNMI=2,2,0,0,0"); // Direct SMS output
  delay(500);
  Serial.println("SIM800L Initialized.");
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected!");
      break;
    case WStype_CONNECTED:
      Serial.println("[WS] Connected to backend");
      // Register as Hardware Gateway
      webSocket.sendTXT("42[\"register_hardware_gateway\",{\"token\":\"" + String(gatewayToken) + "\"}]");
      break;
    case WStype_TEXT:
      Serial.printf("[WS] Message: %s\n", payload);
      handleWSMessage((char*)payload);
      break;
  }
}

void handleWSMessage(char* payload) {
  String msg = String(payload);
  
  // Socket.io message format: 42["event", {data}]
  if (msg.startsWith("42")) {
    String jsonStr = msg.substring(2);
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, jsonStr);

    if (!error) {
      String event = doc[0];
      if (event == "send_sms") {
        String to = doc[1]["to"];
        String message = doc[1]["message"];
        sendPhysicalSMS(to, message);
      }
    }
  }
}

void sendPhysicalSMS(String to, String message) {
  Serial.println("\n--- SENDING PHYSICAL SMS ---");
  Serial.println("To: " + to);
  Serial.println("Msg: " + message);

  sim800.print("AT+CMGS=\"");
  sim800.print(to);
  sim800.println("\"");
  delay(500);
  sim800.print(message);
  delay(100);
  sim800.write(26); // CTRL+Z to send
  Serial.println("SMS Command Sent to SIM800L");
}

void processIncomingSMS(String raw) {
  int firstQuote = raw.indexOf("\"");
  int secondQuote = raw.indexOf("\"", firstQuote + 1);
  String fromNumber = raw.substring(firstQuote + 1, secondQuote);
  
  int lastNewline = raw.lastIndexOf("\n");
  int secondToLastNewline = raw.lastIndexOf("\n", lastNewline - 1);
  String body = raw.substring(secondToLastNewline + 1);
  body.trim();

  Serial.println("\n--- INCOMING SMS ---");
  Serial.println("From: " + fromNumber);
  Serial.println("Body: " + body);

  forwardToBackend(fromNumber, body);
}

void forwardToBackend(String from, String body) {
  HTTPClient http;
  http.begin(backendWebhookUrl);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  
  String postData = "From=" + from + "&Body=" + body + "&MessageSid=HW_" + String(millis());
  int httpCode = http.POST(postData);
  
  if (httpCode > 0) {
    Serial.println("[HTTP] Forwarded, code: " + String(httpCode));
  } else {
    Serial.println("[HTTP] Failed to forward SMS");
  }
  http.end();
}
