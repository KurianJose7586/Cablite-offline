import { parseSMS, SMSMessageType, isValidRideId } from '../src/utils/smsParser';

describe('SMS Parser', () => {
    describe('RIDEREQ parsing', () => {
        it('should parse valid RIDEREQ message', () => {
            const result = parseSMS('RIDEREQ|R123456|12.9716|77.5946|MG Road, Bangalore');

            expect(result.type).toBe(SMSMessageType.RIDE_REQUEST);
            expect(result.rideId).toBe('R123456');
            expect(result.data?.lat).toBe(12.9716);
            expect(result.data?.lng).toBe(77.5946);
            expect(result.data?.destination).toBe('MG Road, Bangalore');
        });

        it('should handle destination with pipe characters', () => {
            const result = parseSMS('RIDEREQ|R123456|12.9716|77.5946|MG Road | Bangalore | India');

            expect(result.data?.destination).toBe('MG Road | Bangalore | India');
        });

        it('should reject invalid coordinates', () => {
            expect(() => {
                parseSMS('RIDEREQ|R123456|invalid|77.5946|MG Road');
            }).toThrow('Invalid coordinates');
        });

        it('should reject out of range coordinates', () => {
            expect(() => {
                parseSMS('RIDEREQ|R123456|91.0|77.5946|MG Road');
            }).toThrow('Coordinates out of valid range');
        });

        it('should reject incomplete RIDEREQ', () => {
            expect(() => {
                parseSMS('RIDEREQ|R123456|12.9716');
            }).toThrow('Invalid RIDEREQ format');
        });
    });

    describe('UPDATE parsing', () => {
        it('should parse valid UPDATE message', () => {
            const result = parseSMS('UPDATE|R123456');

            expect(result.type).toBe(SMSMessageType.UPDATE_REQUEST);
            expect(result.rideId).toBe('R123456');
        });

        it('should reject incomplete UPDATE', () => {
            expect(() => {
                parseSMS('UPDATE');
            }).toThrow('Invalid UPDATE format');
        });
    });

    describe('CANCEL parsing', () => {
        it('should parse valid CANCEL message', () => {
            const result = parseSMS('CANCEL|R123456');

            expect(result.type).toBe(SMSMessageType.CANCEL_REQUEST);
            expect(result.rideId).toBe('R123456');
        });

        it('should reject incomplete CANCEL', () => {
            expect(() => {
                parseSMS('CANCEL');
            }).toThrow('Invalid CANCEL format');
        });
    });

    describe('Unknown messages', () => {
        it('should handle unknown command', () => {
            const result = parseSMS('HELLO|R123456');

            expect(result.type).toBe(SMSMessageType.UNKNOWN);
        });

        it('should handle empty message', () => {
            const result = parseSMS('');

            expect(result.type).toBe(SMSMessageType.UNKNOWN);
        });
    });

    describe('Ride ID validation', () => {
        it('should accept valid ride IDs', () => {
            expect(isValidRideId('R123456')).toBe(true);
            expect(isValidRideId('RIDE12345')).toBe(true);
            expect(isValidRideId('ABC123XYZ789')).toBe(true);
        });

        it('should reject invalid ride IDs', () => {
            expect(isValidRideId('R12')).toBe(false); // Too short
            expect(isValidRideId('R123456789012345678901')).toBe(false); // Too long
            expect(isValidRideId('R123-456')).toBe(false); // Special characters
            expect(isValidRideId('R123 456')).toBe(false); // Spaces
        });
    });
});
