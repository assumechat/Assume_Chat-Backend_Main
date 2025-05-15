// src/sockets/queueSocket.ts
import { Server, Socket } from 'socket.io';

const waiting: string[] = [];

export function initializeQueueSocket(io: Server) {
    const queueNs = io.of('/queue');

    queueNs.on('connection', (socket: Socket) => {
        console.log(`🔌 [Queue] ${socket.id} connected`);
        emitQueueUpdate(socket);

        socket.on('joinQueue', () => {
            if (!waiting.includes(socket.id)) {
                waiting.push(socket.id);
                console.log(`➡️ [Queue] ${socket.id} joined (pos=${waiting.length})`);
            }
            broadcastQueueUpdate();
            tryPair();
        });

        socket.on('leaveQueue', () => {
            const idx = waiting.indexOf(socket.id);
            if (idx !== -1) {
                waiting.splice(idx, 1);
                console.log(`⬅️ [Queue] ${socket.id} left`);
            }
            broadcastQueueUpdate();
            tryPair();
        });

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

    function emitQueueUpdate(socket: Socket) {
        socket.emit('queueUpdate', {
            position: waiting.indexOf(socket.id) + 1 || null,
            waiting: waiting.length,
            online: queueNs.sockets.size,
        });
    }

    function broadcastQueueUpdate() {
        waiting.forEach((id, idx) => {
            queueNs.to(id).emit('queueUpdate', {
                position: idx + 1,
                waiting: waiting.length,
                online: queueNs.sockets.size,
            });
        });
    }

    // ——— New pairing logic ———
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
