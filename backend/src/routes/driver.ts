import { Router } from 'express';
import { driverController } from '../controllers/driverController';

const router = Router();

/**
 * POST /driver/accept
 * Accept a ride offer
 */
router.post('/accept', (req, res) => driverController.acceptRide(req, res));

/**
 * POST /driver/location
 * Update driver location
 */
router.post('/location', (req, res) => driverController.updateLocation(req, res));

/**
 * POST /driver/status
 * Update driver online/offline status
 */
router.post('/status', (req, res) => driverController.updateStatus(req, res));

export default router;
