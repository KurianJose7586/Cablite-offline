import { Router } from 'express';
import { smsController } from '../controllers/smsController';

const router = Router();

/**
 * POST /webhook/sms
 * Twilio incoming SMS webhook
 */
router.post('/sms', (req, res) => smsController.handleIncomingSMS(req, res));

export default router;
