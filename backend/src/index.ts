import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import webhookRoutes from './routes/webhook';
import driverRoutes from './routes/driver';
import './services/broadcastService'; // Initialize event listeners

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// Health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Routes (to be added)
app.get('/', (_req, res) => {
    res.json({
        message: 'CabLite Backend API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            webhook: '/webhook/sms',
            driver: {
                accept: '/driver/accept',
                location: '/driver/location',
                status: '/driver/status'
            }
        }
    });
});

// API Routes
app.use('/webhook', webhookRoutes);
app.use('/driver', driverRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path
    });

    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    logger.info(`🚀 CabLite Backend running on port ${PORT}`);
    logger.info(`📍 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);

    // Start background workers
    const { startExpiryWorker } = require('./jobs/expiryWorker');
    startExpiryWorker();
});

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');

    const { stopExpiryWorker } = require('./jobs/expiryWorker');
    const { disconnectRedis } = require('./db/redis');

    stopExpiryWorker();
    await disconnectRedis();

    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');

    const { stopExpiryWorker } = require('./jobs/expiryWorker');
    const { disconnectRedis } = require('./db/redis');

    stopExpiryWorker();
    await disconnectRedis();

    process.exit(0);
});

export default app;
