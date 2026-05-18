import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

export class SocketService {
    private io: Server | null = null;
    // Map phone numbers to socket IDs for the simulator
    private passengerSockets: Map<string, string> = new Map();

    init(server: HttpServer) {
        this.io = new Server(server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        this.io.on('connection', (socket: Socket) => {
            logger.info(`Socket connected: ${socket.id}`);

            // Passenger simulator registers with its phone number
            socket.on('register_simulator', (data: { phoneNumber: string }) => {
                if (data.phoneNumber) {
                    this.passengerSockets.set(data.phoneNumber, socket.id);
                    logger.info(`Simulator registered for phone: ${data.phoneNumber}`);
                }
            });

            socket.on('disconnect', () => {
                logger.info(`Socket disconnected: ${socket.id}`);
                // Remove from map if exists
                for (const [phone, id] of this.passengerSockets.entries()) {
                    if (id === socket.id) {
                        this.passengerSockets.delete(phone);
                        break;
                    }
                }
            });
        });
    }

    /**
     * Check if a simulator is connected for a phone number
     */
    isSimulatorConnected(phoneNumber: string): boolean {
        return this.passengerSockets.has(phoneNumber);
    }

    /**
     * Send simulated SMS to a registered passenger simulator
     */
    sendSimulatedSMS(phoneNumber: string, message: string): boolean {
        if (!this.io) {
            logger.warn('Socket.io not initialized');
            return false;
        }

        const socketId = this.passengerSockets.get(phoneNumber);
        if (socketId) {
            this.io.to(socketId).emit('incoming_sms', {
                from: 'CabLite',
                message,
                timestamp: new Date().toISOString()
            });
            logger.info(`Simulated SMS sent to ${phoneNumber}`);
            return true;
        }

        logger.warn(`Simulator not connected for phone ${phoneNumber}, could not send SMS`);
        return false;
    }
}

export const socketService = new SocketService();
