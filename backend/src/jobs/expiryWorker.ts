import * as cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { expiryService } from '../services/expiryService';
import { logger } from '../utils/logger';

// Run every 10 seconds: "*/10 * * * * *"
// Format: second minute hour day month weekday
const CRON_SCHEDULE = '*/10 * * * * *';

let expiryTask: ScheduledTask | null = null;

/**
 * Start the expiry worker
 * Checks for expired rides every 10 seconds
 */
export function startExpiryWorker(): void {
    if (expiryTask) {
        logger.warn('Expiry worker already running');
        return;
    }

    expiryTask = cron.schedule(CRON_SCHEDULE, async () => {
        try {
            await expiryService.checkExpiredRides();
        } catch (error: any) {
            logger.error('Expiry worker iteration failed', {
                error: error.message,
                stack: error.stack
            });
        }
    });

    logger.info('✅ Expiry worker started', {
        schedule: CRON_SCHEDULE,
        description: 'Checks every 10 seconds for expired rides'
    });
}

/**
 * Stop the expiry worker
 * Called during graceful shutdown
 */
export function stopExpiryWorker(): void {
    if (expiryTask) {
        expiryTask.stop();
        expiryTask = null;
        logger.info('Expiry worker stopped');
    }
}

/**
 * Check if expiry worker is running
 */
export function isExpiryWorkerRunning(): boolean {
    return expiryTask !== null;
}
