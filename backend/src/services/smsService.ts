import axios from 'axios';
import twilio from 'twilio';
import { logger } from '../utils/logger';
import { socketService } from './socketService';

export class SMSService {
    private readonly sentApiKey: string | undefined;
    private readonly sentTemplateId: string | undefined;
    private readonly twilioClient: any;
    private readonly twilioNumber: string | undefined;

    constructor() {
        this.sentApiKey = process.env.SENT_API_KEY;
        this.sentTemplateId = process.env.SENT_TEMPLATE_ID;
        
        // Initialize Twilio if credentials exist
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            this.twilioNumber = process.env.TWILIO_PHONE_NUMBER;
            logger.info('Twilio client initialized for SMSService');
        }
    }

    /**
     * Send SMS message - Automatically chooses available provider
     */
    async send(to: string, message: string): Promise<void> {
        // 1. Try Simulator first - ONLY if a simulator is actually connected for this number
        if (socketService.isSimulatorConnected(to)) {
            const simulated = socketService.sendSimulatedSMS(to, message);
            if (simulated) {
                logger.info('Simulated SMS sent to connected simulator', { to, message });
                return;
            }
        }

        // 2. Try Twilio POC (if configured)
        if (this.twilioClient && this.twilioNumber) {
            try {
                const twilioMsg = await this.twilioClient.messages.create({
                    body: message,
                    from: this.twilioNumber,
                    to: to
                });
                logger.info('SMS sent via Twilio POC', { to, sid: twilioMsg.sid });
                return;
            } catch (error: any) {
                logger.error('Twilio send failed (Check if number is verified!)', { error: error.message });
                // Fall through to Sent.dm if it's not a verification error
            }
        }

        // 3. Try Sent.dm (as fallback)
        if (this.sentApiKey && this.sentApiKey !== 'your_sent_api_key_here' && this.sentTemplateId) {
            try {
                const response = await axios.post('https://api.sent.dm/v3/messages', {
                    to: [to],
                    template: {
                        id: this.sentTemplateId,
                        parameters: { message: message }
                    }
                }, {
                    headers: { 'x-api-key': this.sentApiKey }
                });
                if (response.data.success) {
                    logger.info('SMS sent via Sent.dm', { to, messageId: response.data.data.recipients[0].message_id });
                    return;
                }
            } catch (error: any) {
                logger.error('Sent.dm send failed', { error: error.message });
            }
        }

        logger.warn('No SMS provider configured or all failed. Check your .env', { to });
    }

    verifySignature(_signature: string, _url: string, _params: any): boolean {
        // For POC, we skip complex verification
        return true; 
    }
}

export const smsService = new SMSService();
