Based on the system requirements for CabLite, I have broken down the backend development into a structured, task-by-task roadmap.

Each task includes a Definition of Done (DoD) and a Verification Test to ensure the logic holds before moving to the next step.

Phase 1: Foundation & Data Modeling
Goal: Set up the environment and the database schema to handle rides, drivers, and locations.

Task 1: Project Initialization & Schema Design

Set up a Node.js/TypeScript environment with Express.

Implement the Database Schema (PostgreSQL/Prisma recommended for atomic transactions).

DoD: User, Driver, and Ride tables created with the fields specified in Section 5 of the SRS.

Test: A script that can create a User, promote them to a Driver, and initialize a Ride record without errors.

Task 2: The Ride State Machine

Implement a central logic handler for state transitions (Section 3.3).

DoD: Logic that prevents invalid transitions (e.g., cannot move from CANCELLED to COMPLETED).

Test: Unit test: expect(transition('CANCELLED', 'COMPLETED')).toBe(Error).

Phase 2: SMS Gateway & Inbound Logic
Goal: Handle the "Offline-Triggered" part of the system via Twilio webhooks.

Task 3: Twilio Webhook & SMS Parser (FR-1)

Create POST /webhook/sms.

Implement the regex parser for RIDEREQ|RideID|Lat|Lng|Destination.

DoD: Successfully parse an incoming string and save a REQUESTED ride to the DB.

Test: Use Postman/Curl to mock a Twilio request: Body=RIDEREQ|R123|12.97|77.59|Airport. Verify DB entry.

Task 4: Update & Cancel Logic (FR-2, FR-3)

Implement parsing for UPDATE|RideID and CANCEL|RideID.

DoD: Functionality to change ride state to CANCELLED via SMS.

Test: Mock an SMS "CANCEL" for an existing ride; verify state change and verify that a "CANCEL" from a different phone number fails.

Phase 3: Driver Dispatch & Real-time Logic
Goal: Match drivers to rides and ensure "First-Accept" integrity.

Task 5: Geo-Query & Driver Broadcast (FR-4, FR-5)

Logic to find drivers within 3km.

Integrate Firebase Admin SDK (FCM) or WebSockets to notify drivers.

DoD: When a ride is created, the system logs/sends a notification to the nearest 5 online drivers.

Test: Seed DB with 10 drivers at various distances. Trigger a ride. Verify only the closest 5 receive the "Broadcast".

Task 6: Atomic "First-Accept" Lock (FR-6)

Create POST /driver/accept.

Use a DB Transaction (or Redis SETNX) to ensure only one driver gets the ride.

DoD: If two drivers hit "Accept" at the exact same millisecond, one succeeds and the other receives a "Ride Taken" error.

Test: Integration test: Fire 5 concurrent requests to the accept endpoint for the same RideID. Verify only 1 driver is assigned.

Phase 4: Location & Rate Limiting
Goal: Track drivers and protect the SMS gateway from spam.

Task 7: Driver Location Tracking (FR-8)

Create POST /driver/location.

DoD: High-frequency updates that overwrite the driver's currentLat/Lng.

Test: Update a driver's location 5 times. Verify the DB only reflects the most recent coordinate.

Task 8: Passenger Update Rate Limiter (FR-9, FR-10)

Implement cooldown logic (2 mins) and max-update count (5 per ride).

Implement "Smart Suppression" (don't send SMS if driver moved < 50m).

DoD: System rejects UPDATE SMS if sent 1 minute after the last one.

Test: Mock two UPDATE SMS requests 30 seconds apart. The second must return the "Update limit reached" message.

Phase 5: Reliability & Cleanup
Goal: Handle timeouts and edge cases.

Task 9: Broadcast Expiry Worker (Section 7)

Set up a background job (cron or setTimeout) to check for unaccepted rides after 60 seconds.

DoD: Rides move to EXPIRED state if no driver accepts.

Test: Create a ride. Wait 61 seconds. Verify state is EXPIRED and SMS is triggered to passenger.

Next Steps Recommendation
I suggest we start with Phase 1, Task 1 (Project Setup & Schema).