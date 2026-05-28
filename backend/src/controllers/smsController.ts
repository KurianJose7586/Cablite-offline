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
        logger.debug('Raw SMS Webhook received', { body: req.body, headers: req.headers });
        try {
            // Support multiple formats:
            // 1. InfiniReach: { event: "message.received", data: { from, message, messageId } }
            // 2. Twilio: { From, Body, MessageSid }
            // 3. Android Gateway: { phoneNumber, message, messageId }
            
            let from, body, messageId;
            const isInfiniReach = req.body.event === 'message.received' || req.body.event === 'message.inbound';

            if (isInfiniReach) {
                from = req.body.data?.from;
                body = req.body.data?.body || req.body.data?.message;
                messageId = req.body.data?.messageId;
            } else {
                // Ignore other InfiniReach events (sent, delivered, failed)
                if (req.body.event && !isInfiniReach) {
                    res.status(200).send('OK');
                    return;
                }

                from = req.body.phoneNumber || req.body.From;
                body = req.body.message || req.body.Body;
                messageId = req.body.messageId || req.body.MessageSid;
            }

            if (!from || !body) {
                logger.warn('Received malformed SMS webhook', { body: req.body });
                res.status(400).send('Malformed request');
                return;
            }

            logger.info('Incoming SMS', {
                from,
                body,
                messageId,
                source: isInfiniReach ? 'InfiniReach' : (req.body.deviceId ? 'AndroidGateway' : 'Twilio')
            });

            // Check for duplicate message (idempotency)
            if (messageId) {
                const existingRide = await prisma.ride.findUnique({
                    where: { twilioMessageSid: messageId }
                });

                if (existingRide) {
                    logger.info('Duplicate SMS detected, ignoring', { messageId });
                    res.status(200).send('OK');
                    return;
                }
            }

            // Parse SMS
            let parsed;
            try {
                parsed = parseSMS(body);
            } catch (error: any) {
                logger.warn('SMS parsing failed', {
                    from,
                    body,
                    error: error.message
                });
                await smsService.send(from, `ERR|Invalid format: ${error.message}`);
                res.status(200).send('OK');
                return;
            }

            // Route to appropriate handler
            switch (parsed.type) {
                case SMSMessageType.RIDE_REQUEST:
                    if (!parsed.data) throw new Error('Missing ride request data');
                    await rideService.createRideFromSMS(
                        from,
                        parsed.rideId,
                        parsed.data.lat!,
                        parsed.data.lng!,
                        parsed.data.destination!,
                        messageId || `LOCAL-${Date.now()}`
                    );
                    break;

                case SMSMessageType.UPDATE_REQUEST:
                    if (!parsed.data || parsed.data.lat === undefined || parsed.data.lng === undefined) {
                        await smsService.send(from, 'ERR|UPDATE requires location');
                        break;
                    }
                    await rideService.handleUpdateRequest(
                        from,
                        parsed.rideId,
                        parsed.data.lat,
                        parsed.data.lng
                    );
                    break;

                case SMSMessageType.CANCEL_REQUEST:
                    await rideService.handleCancelRequest(from, parsed.rideId);
                    break;

                case SMSMessageType.SEARCH_REQUEST:
                    if (!parsed.data?.query) {
                        await smsService.send(from, 'ERR|SRCH requires query');
                        break;
                    }
                    logger.info('Handling Deep Search request', { query: parsed.data.query, from });
                    
                    const result = await searchService.search(parsed.data.query);
                    
                    if (result) {
                        // Reply with correct pipe delimiter: SEARCH_REPLY_v3|Name|Lat|Lng
                        const now = new Date().toLocaleTimeString();
                        const response = `SEARCH_REPLY_v3|${result.name} [${now}]|${result.lat}|${result.lng}`;
                        await smsService.send(from, response);
                    } else {
                        await smsService.send(from, `ERR|No results found for: ${parsed.data.query}`);
                    }
                    break;

                case SMSMessageType.UNKNOWN:
                    await smsService.send(from, 'ERR|Unknown command');
                    break;
            }

            // InfiniReach and Gateway apps prefer plain OK
            res.status(200).send('OK');

        } catch (error: any) {
            logger.error('Error processing SMS', { error: error.message });
            res.status(500).send('Error');
        }
    }
}

export const smsController = new SMSController();
