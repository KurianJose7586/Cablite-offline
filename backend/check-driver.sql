-- Check if driver exists
SELECT id, "userId", status, "currentLat", "currentLng", "activeRideId" 
FROM "Driver" 
WHERE id = '65d6459d-2aee-459a-afd5-7b542b3c0d75';

-- List all drivers
SELECT id, "userId", status, "currentLat", "currentLng", "activeRideId" 
FROM "Driver";
