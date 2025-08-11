import { Server, Socket } from 'socket.io';


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

const waitingQueue: QueueUser[] = [];
const activeRooms = new Map<string, ActiveRoom>();
const userToRoom = new Map<string, string>();
const QUEUE_TIMEOUT = 30000;
const ROOM_TIMEOUT = 300000;// change in prod

export function initializeQueueSocket(io: Server) {
    const queueNs = io.of('/queue');

    queueNs.on('connection', (socket: Socket) => {
        emitQueueUpdate(socket);
        broadcastQueueStats();
        // back to the queue or the first one to the queue  
        socket.on('joinQueue', (preferences = {}) => {
            leaveCurrentRoom(socket.id);
            
            if (!isInQueue(socket.id)) {
                const queueUser: QueueUser = {
                    socketId: socket.id,
                    joinedAt: Date.now(),
                    preferences
                };
                
                waitingQueue.push(queueUser);
                
                setTimeout(() => {
                    handleQueueTimeout(socket.id);
                }, QUEUE_TIMEOUT);
            }
            
            broadcastQueueStats();
            tryPairUsers();
        });

        socket.on('leaveQueue', () => {
            removeFromQueue(socket.id);
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

    function isInQueue(socketId: string): boolean {
        return waitingQueue.some(user => user.socketId === socketId);
    }

    function removeFromQueue(socketId: string): void {
        const index = waitingQueue.findIndex(user => user.socketId === socketId);
        if (index !== -1) {
            waitingQueue.splice(index, 1);
        }
    }

    function leaveCurrentRoom(socketId: string): void {
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

    function handleQueueTimeout(socketId: string): void {
        if (isInQueue(socketId)) {
            removeFromQueue(socketId);
            queueNs.to(socketId).emit('queueTimeout', { 
                message: 'No match found within 30 seconds. Please try again.' 
            });
            broadcastQueueStats();
        }
    }

    function handleUserDisconnect(socketId: string): void {
        removeFromQueue(socketId);
        leaveCurrentRoom(socketId);
        broadcastQueueStats();
    }
    // try pairing up users only when with even numbers provide a mutex lock approach to prevent others from joining this
    function tryPairUsers(): void {
        while (waitingQueue.length >= 2) {
            const user1 = waitingQueue.shift()!;
            const user2 = waitingQueue.shift()!;
            
            const socket1 = queueNs.sockets.get(user1.socketId);
            const socket2 = queueNs.sockets.get(user2.socketId);
            
            if (!socket1 || !socket2) {
                if (socket1) waitingQueue.unshift(user1);
                if (socket2) waitingQueue.unshift(user2);
                continue;
            }
            
            const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const room: ActiveRoom = {
                roomId,
                users: [user1.socketId, user2.socketId],
                createdAt: Date.now()
            };
            
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
        }
    }
    //broadcaast queue updates
    function emitQueueUpdate(socket: Socket): void {
        const position = waitingQueue.findIndex(user => user.socketId === socket.id);
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
    function broadcastQueueStats(): void {
        const stats = {
            waiting: waitingQueue.length,
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