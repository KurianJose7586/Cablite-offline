import { Request, Response } from 'express';
import { parseSMS, SMSMessageType, isValidRideId } from '../utils/smsParser';
import { rideService } from '../services/rideService';
import { smsService } from '../services/smsService';
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
                await smsService.send(From, `Invalid message format. ${error.message}`);
                res.status(200).send('<Response></Response>');
                return;
            }

            // Validate ride ID
            if (parsed.rideId && !isValidRideId(parsed.rideId)) {
                await smsService.send(
                    From,
                    'Invalid Ride ID format. Must be 6-20 alphanumeric characters.'
                );
                res.status(200).send('<Response></Response>');
                return;
            }

            // Route to appropriate handler
            switch (parsed.type) {
                case SMSMessageType.RIDE_REQUEST:
                    if (!parsed.data) {
                        throw new Error('Missing ride request data');
                    }
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
                        await smsService.send(From, 'UPDATE requires location: UPDATE|RIDEID|LAT|LNG');
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

                case SMSMessageType.UNKNOWN:
                    await smsService.send(
                        From,
                        'Unknown command. Use RIDEREQ, UPDATE, or CANCEL.'
                    );
                    break;
            }

            // Respond to Twilio
            res.status(200).send('<Response></Response>');

        } catch (error: any) {
            logger.error('Error processing SMS', {
                error: error.message,
                stack: error.stack
            });
            res.status(500).send('<Response></Response>');
        }
    }
}

export const smsController = new SMSController();
