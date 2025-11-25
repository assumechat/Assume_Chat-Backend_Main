import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';

interface QueueUser {
    socketId: string;
    joinedAt: number;
    preferences?: {
        language?: string;
        interests?: string[];
    };
}

interface ActiveRoom {
    roomId: string;
    users: string[];
    createdAt: number;
}

// Redis keys
const QUEUE_KEY = 'waiting_queue';
const ACTIVE_ROOMS_KEY = 'active_rooms';
const USER_TO_ROOM_KEY = 'user_to_room';

// In-memory fallback for when Redis is not available
const waitingQueue: QueueUser[] = [];
const activeRooms = new Map<string, ActiveRoom>();
const userToRoom = new Map<string, string>();

const QUEUE_TIMEOUT = 30000;
const ROOM_TIMEOUT = 300000;// change in prod

// Redis client (optional - falls back to in-memory if not connected)
let redisClient: Redis | null = null;
let useRedis = false;

// Initialize Redis connection
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
try {
    redisClient = new Redis(redisUrl, {
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
        maxRetriesPerRequest: 3,
        lazyConnect: false,
    });
    
    redisClient.on('error', (err) => {
        console.error('❌ Queue Redis Client Error:', err.message);
        useRedis = false;
    });
    
    redisClient.on('connect', () => {
        console.log('🔄 Queue Redis client connecting...');
    });
    
    redisClient.on('ready', () => {
        useRedis = true;
        console.log('✅ Queue Redis client ready - shared queue enabled');
    });
    
    // Test connection
    redisClient.ping().then(() => {
        useRedis = true;
        console.log('✅ Queue Redis connection test successful');
    }).catch((err) => {
        console.error('❌ Queue Redis ping failed:', err.message);
        console.log('⚠️  Queue using in-memory storage (single instance only)');
        useRedis = false;
    });
} catch (err) {
    console.error('❌ Queue Redis setup error:', err);
    console.log('⚠️  Queue using in-memory storage (single instance only)');
    useRedis = false;
}

export function initializeQueueSocket(io: Server) {
    const queueNs = io.of('/queue');

    queueNs.on('connection', (socket: Socket) => {
        emitQueueUpdate(socket).catch(console.error);
        broadcastQueueStats().catch(console.error);
        // back to the queue or the first one to the queue  
        socket.on('joinQueue', async (preferences = {}) => {
            await leaveCurrentRoom(socket.id);
            
            if (!(await isInQueue(socket.id))) {
                const queueUser: QueueUser = {
                    socketId: socket.id,
                    joinedAt: Date.now(),
                    preferences
                };
                
                if (useRedis && redisClient) {
                    try {
                        await redisClient.rpush(QUEUE_KEY, JSON.stringify(queueUser));
                    } catch (err) {
                        console.error('Redis error in joinQueue:', err);
                        waitingQueue.push(queueUser);
                    }
                } else {
                    waitingQueue.push(queueUser);
                }
                
                setTimeout(() => {
                    handleQueueTimeout(socket.id);
                }, QUEUE_TIMEOUT);
            }
            
            broadcastQueueStats();
            tryPairUsers();
        });

        socket.on('leaveQueue', async () => {
            await removeFromQueue(socket.id);
            broadcastQueueStats();
        });

        socket.on('finishChat', () => {
            finishCurrentChat(socket.id);
        });

        socket.on('reconnectToRoom', ({ roomId }) => {
            if (activeRooms.has(roomId) && activeRooms.get(roomId)!.users.includes(socket.id)) {
                userToRoom.set(socket.id, roomId);
                socket.emit('reconnectedToRoom', { roomId });
            }
        });

        socket.on('disconnect', () => {
            handleUserDisconnect(socket.id);
        });
    });

    async function isInQueue(socketId: string): Promise<boolean> {
        if (useRedis && redisClient) {
            try {
                const queue = await redisClient.lrange(QUEUE_KEY, 0, -1);
                return queue.some((userStr) => {
                    const user = JSON.parse(userStr) as QueueUser;
                    return user.socketId === socketId;
                });
            } catch (err) {
                console.error('Redis error in isInQueue:', err);
                return waitingQueue.some(user => user.socketId === socketId);
            }
        }
        return waitingQueue.some(user => user.socketId === socketId);
    }

    async function removeFromQueue(socketId: string): Promise<void> {
        if (useRedis && redisClient) {
            try {
                const queue = await redisClient.lrange(QUEUE_KEY, 0, -1);
                const updatedQueue = queue.filter((userStr) => {
                    const user = JSON.parse(userStr) as QueueUser;
                    return user.socketId !== socketId;
                });
                // Replace the entire queue
                if (updatedQueue.length !== queue.length) {
                    await redisClient.del(QUEUE_KEY);
                    if (updatedQueue.length > 0) {
                        await redisClient.rpush(QUEUE_KEY, ...updatedQueue);
                    }
                }
                return;
            } catch (err) {
                console.error('Redis error in removeFromQueue:', err);
            }
        }
        const index = waitingQueue.findIndex(user => user.socketId === socketId);
        if (index !== -1) {
            waitingQueue.splice(index, 1);
        }
    }

    async function leaveCurrentRoom(socketId: string): Promise<void> {
        const currentRoom = userToRoom.get(socketId);
        if (currentRoom && activeRooms.has(currentRoom)) {
            const room = activeRooms.get(currentRoom)!;
            room.users = room.users.filter(id => id !== socketId);
            
            if (room.users.length === 0) {
                activeRooms.delete(currentRoom);
            } else {
                room.users.forEach(userId => {
                    queueNs.to(userId).emit('peerLeftChat', { roomId: currentRoom });
                });
            }
            
            userToRoom.delete(socketId);
        }
    }
    //exit chat remove id
    function finishCurrentChat(socketId: string): void {
        const currentRoom = userToRoom.get(socketId);
        if (currentRoom && activeRooms.has(currentRoom)) {
            const room = activeRooms.get(currentRoom)!;
            
            room.users.forEach(userId => {
                queueNs.to(userId).emit('chatEnded', { roomId: currentRoom });
                userToRoom.delete(userId);
            });
            
            activeRooms.delete(currentRoom);
        }
        
        broadcastQueueStats();
    }

    async function handleQueueTimeout(socketId: string): Promise<void> {
        if (await isInQueue(socketId)) {
            await removeFromQueue(socketId);
            queueNs.to(socketId).emit('queueTimeout', { 
                message: 'No match found within 30 seconds. Please try again.' 
            });
            broadcastQueueStats();
        }
    }

    async function handleUserDisconnect(socketId: string): Promise<void> {
        await removeFromQueue(socketId);
        await leaveCurrentRoom(socketId);
        broadcastQueueStats();
    }
    // try pairing up users only when with even numbers provide a mutex lock approach to prevent others from joining this
    async function tryPairUsers(): Promise<void> {
        let queueLength: number;
        let user1: QueueUser | null = null;
        let user2: QueueUser | null = null;

        // Get queue length and pop two users atomically
        if (useRedis && redisClient) {
            try {
                queueLength = await redisClient.llen(QUEUE_KEY);
                if (queueLength >= 2) {
                    // Use LPOP for atomic pop
                    const result1 = await redisClient.lpop(QUEUE_KEY);
                    const result2 = await redisClient.lpop(QUEUE_KEY);
                    
                    if (result1 && result2) {
                        user1 = JSON.parse(result1) as QueueUser;
                        user2 = JSON.parse(result2) as QueueUser;
                    } else {
                        // Put back if we didn't get both
                        if (result1) await redisClient.lpush(QUEUE_KEY, result1);
                        if (result2) await redisClient.lpush(QUEUE_KEY, result2);
                        return;
                    }
                } else {
                    return;
                }
            } catch (err) {
                console.error('Redis error in tryPairUsers:', err);
                // Fall back to in-memory
                if (waitingQueue.length >= 2) {
                    user1 = waitingQueue.shift()!;
                    user2 = waitingQueue.shift()!;
                } else {
                    return;
                }
            }
        } else {
            if (waitingQueue.length >= 2) {
                user1 = waitingQueue.shift()!;
                user2 = waitingQueue.shift()!;
            } else {
                return;
            }
        }

        if (!user1 || !user2) return;

        const socket1 = queueNs.sockets.get(user1.socketId);
        const socket2 = queueNs.sockets.get(user2.socketId);
        
        if (!socket1 || !socket2) {
            // Put users back in queue if sockets not found
            if (useRedis && redisClient) {
                try {
                    if (socket1) await redisClient.lpush(QUEUE_KEY, JSON.stringify(user1));
                    if (socket2) await redisClient.lpush(QUEUE_KEY, JSON.stringify(user2));
                } catch (err) {
                    console.error('Redis error putting users back:', err);
                    if (socket1) waitingQueue.unshift(user1);
                    if (socket2) waitingQueue.unshift(user2);
                }
            } else {
                if (socket1) waitingQueue.unshift(user1);
                if (socket2) waitingQueue.unshift(user2);
            }
            // Try again if we have more users
            if ((useRedis && queueLength! > 2) || (!useRedis && waitingQueue.length >= 2)) {
                setImmediate(() => tryPairUsers());
            }
            return;
        }
        
        const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const room: ActiveRoom = {
            roomId,
            users: [user1.socketId, user2.socketId],
            createdAt: Date.now()
        };
        
        // Store room info (using in-memory for now, can be moved to Redis if needed)
        activeRooms.set(roomId, room);
        userToRoom.set(user1.socketId, roomId);
        userToRoom.set(user2.socketId, roomId);
        
        socket1.emit('matched', { 
            roomId, 
            peer: user2.socketId,
            peerJoinedAt: user2.joinedAt 
        });
        socket2.emit('matched', { 
            roomId, 
            peer: user1.socketId,
            peerJoinedAt: user1.joinedAt 
        });
        
        setTimeout(() => {
            if (activeRooms.has(roomId)) {
                finishCurrentChat(user1.socketId);
            }
        }, ROOM_TIMEOUT);

        // Try pairing more users if available
        if (useRedis && redisClient) {
            try {
                const remaining = await redisClient.llen(QUEUE_KEY);
                if (remaining >= 2) {
                    setImmediate(() => tryPairUsers());
                }
            } catch (err) {
                console.error('Redis error checking remaining queue:', err);
            }
        } else if (waitingQueue.length >= 2) {
            setImmediate(() => tryPairUsers());
        }
    }
    //broadcaast queue updates
    async function emitQueueUpdate(socket: Socket): Promise<void> {
        let position = -1;
        if (useRedis && redisClient) {
            try {
                const queue = await redisClient.lrange(QUEUE_KEY, 0, -1);
                position = queue.findIndex((userStr) => {
                    const user = JSON.parse(userStr) as QueueUser;
                    return user.socketId === socket.id;
                });
            } catch (err) {
                console.error('Redis error in emitQueueUpdate:', err);
                position = waitingQueue.findIndex(user => user.socketId === socket.id);
            }
        } else {
            position = waitingQueue.findIndex(user => user.socketId === socket.id);
        }
        
        const currentRoom = userToRoom.get(socket.id);
        
        socket.emit('queueUpdate', {
            position: position >= 0 ? position + 1 : null,
            inQueue: position >= 0,
            inChat: !!currentRoom,
            currentRoom: currentRoom || null,
            estimatedWait: position >= 0 ? Math.max(0, position * 5) : null
        });
    }
    // broadcast stats
    async function broadcastQueueStats(): Promise<void> {
        let queueLength = 0;
        if (useRedis && redisClient) {
            try {
                queueLength = await redisClient.llen(QUEUE_KEY);
            } catch (err) {
                console.error('Redis error in broadcastQueueStats:', err);
                queueLength = waitingQueue.length;
            }
        } else {
            queueLength = waitingQueue.length;
        }

        const stats = {
            waiting: queueLength,
            online: queueNs.sockets.size,
            activeChatRooms: activeRooms.size,
            totalChatters: activeRooms.size * 2
        };
        
        queueNs.emit('queueStats', stats);
        
        queueNs.sockets.forEach((socket) => {
            emitQueueUpdate(socket);
        });
    }

    setInterval(() => {
        const now = Date.now();
        for (const [roomId, room] of activeRooms.entries()) {
            if (now - room.createdAt > ROOM_TIMEOUT) {
                room.users.forEach(userId => {
                    queueNs.to(userId).emit('chatEnded', { roomId, reason: 'timeout' });
                    userToRoom.delete(userId);
                });
                activeRooms.delete(roomId);
            }
        }
    }, 60000);
}