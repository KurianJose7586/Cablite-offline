/**
 * SMS Message Types
 */
export enum SMSMessageType {
    RIDE_REQUEST = 'RIDEREQ',
    UPDATE_REQUEST = 'UPDATE',
    CANCEL_REQUEST = 'CANCEL',
    SEARCH_REQUEST = 'SRCH',
    UNKNOWN = 'UNKNOWN'
}

/**
 * Parsed SMS message structure
 */
export interface ParsedSMS {
    type: SMSMessageType;
    rideId: string;
    data?: {
        lat?: number;
        lng?: number;
        destination?: string;
        query?: string;
    };
}

/**
 * Parse incoming SMS message
 * Formats:
 * - RIDEREQ|RideID|Lat|Lng|Destination
 * - UPDATE|RideID|Lat|Lng
 * - CANCEL|RideID
 * - SRCH|Query
 */
export function parseSMS(body: string): ParsedSMS {
    const trimmed = body.trim();
    const parts = trimmed.split('|');

    if (parts.length === 0) {
        return { type: SMSMessageType.UNKNOWN, rideId: '' };
    }

    const command = parts[0].toUpperCase();

    switch (command) {
        case 'SRCH':
            if (parts.length < 2) {
                throw new Error('Invalid SRCH format. Expected: SRCH|Query');
            }
            return {
                type: SMSMessageType.SEARCH_REQUEST,
                rideId: '',
                data: {
                    query: parts.slice(1).join('|')
                }
            };

        case 'RIDEREQ':
            if (parts.length < 5) {
                throw new Error('Invalid RIDEREQ format. Expected: RIDEREQ|RideID|Lat|Lng|Destination');
            }

            const lat = parseFloat(parts[2]);
            const lng = parseFloat(parts[3]);

            if (isNaN(lat) || isNaN(lng)) {
                throw new Error('Invalid coordinates');
            }

            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                throw new Error('Coordinates out of valid range');
            }

            return {
                type: SMSMessageType.RIDE_REQUEST,
                rideId: parts[1],
                data: {
                    lat,
                    lng,
                    destination: parts.slice(4).join('|') // Handle destinations with | in them
                }
            };

        case 'UPDATE':
            if (parts.length < 4) {
                throw new Error('Invalid UPDATE format. Expected: UPDATE|RideID|Lat|Lng');
            }
            return {
                type: SMSMessageType.UPDATE_REQUEST,
                rideId: parts[1],
                data: {
                    lat: parseFloat(parts[2]),
                    lng: parseFloat(parts[3])
                }
            };

        case 'CANCEL':
            if (parts.length < 2) {
                throw new Error('Invalid CANCEL format. Expected: CANCEL|RideID');
            }
            return {
                type: SMSMessageType.CANCEL_REQUEST,
                rideId: parts[1]
            };

        default:
            return {
                type: SMSMessageType.UNKNOWN,
                rideId: parts[1] || ''
            };
    }
}

/**
 * Validate ride ID format
 */
export function isValidRideId(rideId: string): boolean {
    // Ride ID should be alphanumeric, 6-20 characters
    return /^[A-Za-z0-9]{6,20}$/.test(rideId);
}
