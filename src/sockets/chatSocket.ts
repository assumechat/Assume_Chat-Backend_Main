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
    socket.on(ChatEvent.JOIN_ROOM, ({ roomId }: { roomId: string }) => {
      socket.join(roomId);
      console.log(`🛖 [Chat] ${socket.id} joined room ${roomId}`);
      socket.emit(ChatEvent.JOINED_ROOM, { roomId });

      // Notify peer can be handled client-side or via a 'peerJoined' event
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

// Usage in your server bootstrap:
// import { initializeChatSocket } from './sockets/chatSocket';
// const io = new Server(httpServer, { /* options */ });
// initializeChatSocket(io);
