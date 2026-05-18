import { Request, Response } from 'express';
import { parseSMS, SMSMessageType } from '../utils/smsParser';
import { rideService } from '../services/rideService';
import { smsService } from '../services/smsService';
import { searchService } from '../services/searchService';
import { logger } from '../utils/logger';
import { prisma } from '../db/prisma';

export class SMSController {
    /**
     * Handle incoming SMS webhook from Twilio
     * POST /webhook/sms
     */
    async handleIncomingSMS(req: Request, res: Response): Promise<void> {
        try {
            const { MessageSid, From, Body } = req.body;

            logger.info('Incoming SMS', {
                from: From,
                body: Body,
                messageSid: MessageSid
            });

            // Check for duplicate message (idempotency)
            const existingRide = await prisma.ride.findUnique({
                where: { twilioMessageSid: MessageSid }
            });

            if (existingRide) {
                logger.info('Duplicate SMS detected, ignoring', { messageSid: MessageSid });
                res.status(200).send('<Response></Response>');
                return;
            }

            // Parse SMS
            let parsed;
            try {
                parsed = parseSMS(Body);
            } catch (error: any) {
                logger.warn('SMS parsing failed', {
                    from: From,
                    body: Body,
                    error: error.message
                });
                await smsService.send(From, `ERR|Invalid format: ${error.message}`);
                res.status(200).send('<Response></Response>');
                return;
            }

            // Route to appropriate handler
            switch (parsed.type) {
                case SMSMessageType.RIDE_REQUEST:
                    if (!parsed.data) throw new Error('Missing ride request data');
                    await rideService.createRideFromSMS(
                        From,
                        parsed.rideId,
                        parsed.data.lat!,
                        parsed.data.lng!,
                        parsed.data.destination!,
                        MessageSid
                    );
                    break;

                case SMSMessageType.UPDATE_REQUEST:
                    if (!parsed.data || parsed.data.lat === undefined || parsed.data.lng === undefined) {
                        await smsService.send(From, 'ERR|UPDATE requires location');
                        break;
                    }
                    await rideService.handleUpdateRequest(
                        From,
                        parsed.rideId,
                        parsed.data.lat,
                        parsed.data.lng
                    );
                    break;

                case SMSMessageType.CANCEL_REQUEST:
                    await rideService.handleCancelRequest(From, parsed.rideId);
                    break;

                case SMSMessageType.SEARCH_REQUEST:
                    if (!parsed.data?.query) {
                        await smsService.send(From, 'ERR|SRCH requires query');
                        break;
                    }
                    logger.info('Handling Deep Search request', { query: parsed.data.query, from: From });
                    
                    const result = await searchService.search(parsed.data.query);
                    
                    if (result) {
                        // Reply with correct pipe delimiter: SEARCH_REPLY_v3|Name|Lat|Lng
                        const now = new Date().toLocaleTimeString();
                        const response = `SEARCH_REPLY_v3|${result.name} [${now}]|${result.lat}|${result.lng}`;
                        await smsService.send(From, response);
                    } else {
                        await smsService.send(From, `ERR|No results found for: ${parsed.data.query}`);
                    }
                    break;

                case SMSMessageType.UNKNOWN:
                    await smsService.send(From, 'ERR|Unknown command');
                    break;
            }

            res.status(200).send('<Response></Response>');

        } catch (error: any) {
            logger.error('Error processing SMS', { error: error.message });
            res.status(500).send('<Response></Response>');
        }
    }
}

export const smsController = new SMSController();
