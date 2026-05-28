import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

export class SocketService {
    private io: Server | null = null;
    // Map phone numbers to socket IDs for the simulator
    private passengerSockets: Map<string, string> = new Map();
    // Hardware gateway socket ID
    private hardwareGatewaySocket: string | null = null;

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

            // Hardware gateway registers
            socket.on('register_hardware_gateway', (data: { token: string }) => {
                if (data.token === 'HARDWARE_GW_001') {
                    this.hardwareGatewaySocket = socket.id;
                    logger.info('Hardware Gateway connected and authenticated');
                }
            });

            socket.on('disconnect', () => {
                logger.info(`Socket disconnected: ${socket.id}`);
                
                if (socket.id === this.hardwareGatewaySocket) {
                    this.hardwareGatewaySocket = null;
                    logger.info('Hardware Gateway disconnected');
                }

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
     * Check if hardware gateway is online
     */
    isHardwareGatewayConnected(): boolean {
        return this.hardwareGatewaySocket !== null;
    }

    /**
     * Send command to hardware gateway to send a physical SMS
     */
    sendPhysicalSMS(to: string, message: string): boolean {
        if (!this.io || !this.hardwareGatewaySocket) {
            return false;
        }

        this.io.to(this.hardwareGatewaySocket).emit('send_sms', {
            to,
            message
        });
        
        logger.info(`Command sent to Hardware Gateway: ${to}`);
        return true;
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
