import axios from 'axios';
import { logger } from '../utils/logger';
import { socketService } from './socketService';

export class SMSService {
    private readonly apiKey: string | undefined;
    private readonly templateId: string | undefined;
    private readonly apiUrl = 'https://api.sent.dm/v3/messages';

    constructor() {
        this.apiKey = process.env.SENT_API_KEY;
        this.templateId = process.env.SENT_TEMPLATE_ID;
    }

    /**
     * Send SMS message via Sent.dm API
     */
    async send(to: string, message: string): Promise<void> {
        // Try to send simulated SMS via WebSocket first
        const simulated = socketService.sendSimulatedSMS(to, message);
        if (simulated) {
            logger.info('Simulated SMS sent instead of Sent.dm', { to, message });
            return;
        }

        // If API key or template ID is missing, we can't send real SMS
        if (!this.apiKey || this.apiKey === 'your_sent_api_key_here' || !this.templateId) {
            logger.warn('Sent.dm not configured and no simulator connected, skipping SMS send', { to, message });
            return;
        }

        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    to: [to],
                    template: {
                        id: this.templateId,
                        parameters: {
                            message: message // Assumes the template has a {{message}} parameter
                        }
                    }
                },
                {
                    headers: {
                        'x-api-key': this.apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success) {
                logger.info('SMS sent via Sent.dm', { 
                    to, 
                    messageId: response.data.data.recipients[0].message_id 
                });
            } else {
                logger.error('Sent.dm API returned success=false', { 
                    error: response.data.error 
                });
                throw new Error(response.data.error?.message || 'Failed to send message via Sent.dm');
            }
        } catch (error: any) {
            logger.error('Failed to send SMS via Sent.dm', {
                to,
                error: error.response?.data?.error?.message || error.message
            });
            throw error;
        }
    }

    /**
     * Verify Webhook signature
     * Note: Sent.dm uses different signature verification. 
     * In development/POC, we might skip this or implement Sent.dm specific verification.
     */
    verifySignature(_signature: string, _url: string, _params: any): boolean {
        // TODO: Implement Sent.dm signature verification if needed
        return true; 
    }
}

export const smsService = new SMSService();
