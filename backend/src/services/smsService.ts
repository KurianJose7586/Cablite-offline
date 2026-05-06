import twilio from 'twilio';
import { logger } from '../utils/logger';
import { socketService } from './socketService';

// Initialize Twilio client only if valid credentials are provided
const hasValidCredentials =
    process.env.TWILIO_ACCOUNT_SID?.startsWith('AC') &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_AUTH_TOKEN.length > 10;

const twilioClient = hasValidCredentials
    ? twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
    : null;

export class SMSService {
    /**
     * Send SMS message
     */
    async send(to: string, message: string): Promise<void> {
        // Try to send simulated SMS via WebSocket first
        const simulated = socketService.sendSimulatedSMS(to, message);
        if (simulated) {
            logger.info('Simulated SMS sent instead of Twilio', { to, message });
            return;
        }

        if (!twilioClient) {
            logger.warn('Twilio not configured and no simulator connected, skipping SMS send', { to, message });
            return;
        }

        try {
            await twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to
            });

            logger.info('SMS sent via Twilio', { to, message });
        } catch (error: any) {
            logger.error('Failed to send SMS via Twilio', {
                to,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Verify Twilio webhook signature
     */
    verifySignature(signature: string, url: string, params: any): boolean {
        if (!process.env.TWILIO_AUTH_TOKEN) {
            logger.warn('Twilio auth token not configured, skipping signature verification');
            return true; // Allow in development
        }

        return twilio.validateRequest(
            process.env.TWILIO_AUTH_TOKEN,
            signature,
            url,
            params
        );
    }
}

export const smsService = new SMSService();
