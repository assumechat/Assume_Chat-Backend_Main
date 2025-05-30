// src/sockets/chatSocket.ts
import { Server, Socket } from 'socket.io';
import { ChatEvent, ChatMessage } from '../types/Chat';

/**
 * Initialize the "chat" namespace for real-time messaging
 */
export function initializeChatSocket(io: Server) {
  const chatNs = io.of('/chat');

  chatNs.on('connection', (socket: Socket) => {
    console.log(`🔌 [Chat] ${socket.id} connected`);

    // Client requests to join a room
    socket.on(ChatEvent.JOIN_ROOM, ({ roomId }) => {
      if (!socket.rooms.has(roomId)) {
        socket.join(roomId);
        console.log(`🛖 [Chat] ${socket.id} joined room ${roomId}`);
        socket.emit(ChatEvent.JOINED_ROOM, { roomId });
      }
    });

    socket.on(ChatEvent.HANDSHAKE, (payload: {
      roomId: string;
      userId: string;
      userName?: string;
    }) => {
      const { roomId, userId, userName } = payload;
      // send to everyone else in that room
      socket.to(roomId).emit(ChatEvent.HANDSHAKE, { userId, userName });
      console.log(`🤝 [Chat] handshake from ${socket.id} in ${roomId}:`, userId, userName);
    });

    // Handle incoming chat messages
    socket.on(ChatEvent.MESSAGE, (payload: { roomId: string; content: string; peerId: string }) => {
      const { roomId, content, peerId } = payload;
      const msg: ChatMessage = {
        roomId,
        senderId: socket.id,
        peerId,
        content,
        timestamp: Date.now(),
      };
      // Broadcast to everyone in the room (including sender)
      chatNs.to(roomId).emit(ChatEvent.MESSAGE, msg);
      console.log(`💬 [Chat] ${socket.id} -> ${roomId}: ${content}`);
    });

    // Optional: Typing indicator
    socket.on(ChatEvent.TYPING, ({ roomId, peerId }: { roomId: string; peerId: string }) => {
      socket.to(roomId).emit(ChatEvent.TYPING, { senderId: socket.id, peerId });
    });

    socket.on('leaveRoom', ({ roomId }) => {
      socket.leave(roomId);
      socket.to(roomId).emit('peerLeft', { peerId: socket.id, roomId });
      console.log(`⬅️ [Chat] ${socket.id} left room ${roomId} (peer notified)`);
    });
    // Handle disconnects
    socket.on('disconnect', (reason) => {
      console.log(`❌ [Chat] ${socket.id} disconnected: ${reason}`);
      // Inform peers in all rooms this socket was in
      const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
      rooms.forEach((roomId) => {
        socket.to(roomId).emit(ChatEvent.PEER_LEFT, { peerId: socket.id, roomId });
      });
    });
  });
}
