import { Server, Socket } from 'socket.io';

export function initializeChatSocket(io: Server) {
    const chatNs = io.of('/chat');

    chatNs.on('connection', (socket: Socket) => {
        console.log(`🔌 [Chat] ${socket.id} connected`);

        socket.on('joinRoom', ({ roomId }) => {
            socket.join(roomId);
            socket.emit('joinedRoom', { roomId });
        });

        socket.on('message', ({ roomId, text }) => {
            // broadcast to everyone in the room (including sender)
            chatNs.to(roomId).emit('message', {
                sender: socket.id,
                text,
                timestamp: Date.now(),
            });
        });

        socket.on('disconnect', () =>
            console.log(`❌ [Chat] ${socket.id} disconnected`)
        );
    });
}
// 9116768791