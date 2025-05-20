// src/sockets/queueSocket.ts
import { Server, Socket } from 'socket.io';

// In-memory waiting list (for single-instance setups)
const waiting: string[] = [];

export function initializeQueueSocket(io: Server) {
    const queueNs = io.of('/queue');

    queueNs.on('connection', (socket: Socket) => {
        console.log(`🔌 [Queue] ${socket.id} connected`);
        // Notify just this socket of its position
        emitQueueUpdate(socket);
        // Notify all waiting clients of updated counts
        broadcastQueueUpdate();

        // Handle join
        socket.on('joinQueue', () => {
            if (!waiting.includes(socket.id)) {
                waiting.push(socket.id);
                console.log(`➡️ [Queue] ${socket.id} joined (pos=${waiting.length})`);
            }
            broadcastQueueUpdate();
            tryPair();
        });

        // Handle leave
        socket.on('leaveQueue', () => {
            const idx = waiting.indexOf(socket.id);
            if (idx !== -1) {
                waiting.splice(idx, 1);
                console.log(`⬅️ [Queue] ${socket.id} left`);
            }
            broadcastQueueUpdate();
            tryPair();
        });

        // Clean up on disconnect
        socket.on('disconnect', () => {
            const idx = waiting.indexOf(socket.id);
            if (idx !== -1) {
                waiting.splice(idx, 1);
                console.log(`❌ [Queue] ${socket.id} disconnected and removed`);
            }
            broadcastQueueUpdate();
            tryPair();
        });
    });

    /** Send queue status to a single socket */
    function emitQueueUpdate(socket: Socket) {
        const pos = waiting.indexOf(socket.id);
        socket.emit('queueUpdate', {
            position: pos >= 0 ? pos + 1 : null,
            waiting: waiting.length,
            online: queueNs.sockets.size,
        });
    }

    /** Broadcast queue status to all waiting clients in the queue */
    /** Broadcast queue status to all connected clients */
    function broadcastQueueUpdate() {
        const waitingCount = waiting.length;
        const onlineCount = queueNs.sockets.size;

        // First, send a summary update to everyone (no position)
        queueNs.emit('queueUpdate', {
            position: null,
            waiting: waitingCount,
            online: onlineCount,
        });

        // Then, send detailed position updates to those in the waiting list
        waiting.forEach((id, idx) => {
            queueNs.to(id).emit('queueUpdate', {
                position: idx + 1,
                waiting: waitingCount,
                online: onlineCount,
            });
        });
    }
    /** Pair off clients in the queue when there are at least two waiting */
    function tryPair() {
        while (waiting.length >= 2) {
            const a = waiting.shift()!; // oldest
            const b = waiting.shift()!; // next oldest
            const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            console.log(`🤝 [Queue] Matched ${a} ↔ ${b} in ${roomId}`);

            queueNs.to(a).emit('matched', { roomId, peer: b });
            queueNs.to(b).emit('matched', { roomId, peer: a });
        }
        broadcastQueueUpdate();
    }
}
