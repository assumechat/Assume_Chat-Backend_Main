import { Server, Socket } from 'socket.io';
import { ChatEvent, ChatMessage } from '../types/Chat';

type SessionDescription = {
  type?: 'offer' | 'answer' | 'pranswer' | 'rollback'
  sdp?: string
}

type IceCandidate = {
  candidate?: string
  sdpMid?: string | null
  sdpMLineIndex?: number | null
}

export function initializeChatSocket(io: Server) {
  const chatNs = io.of('/chat');
  const activeRooms = new Map<string, Set<string>>();
  const userRooms = new Map<string, string>();

  chatNs.on('connection', (socket: Socket) => {
    socket.on(ChatEvent.JOIN_ROOM, ({ roomId }) => {
      if (!socket.rooms.has(roomId)) {
        socket.join(roomId);
        
        if (!activeRooms.has(roomId)) {
          activeRooms.set(roomId, new Set());
        }
        activeRooms.get(roomId)!.add(socket.id);
        userRooms.set(socket.id, roomId);
        
        socket.emit(ChatEvent.JOINED_ROOM, { roomId });
        socket.to(roomId).emit(ChatEvent.PEER_JOINED, { peerId: socket.id, roomId });
      }
    });

    socket.on(ChatEvent.HANDSHAKE, (payload: {
      roomId?: string;
      userId?: string;
      userName?: string;
      walletAddress?: string;
    }) => {
      const { roomId, userId, userName, walletAddress } = payload;
      // Get room from socket's current rooms if not provided
      const targetRoom = roomId || Array.from(socket.rooms).find(r => r !== socket.id);
      if (targetRoom) {
        socket.to(targetRoom).emit(ChatEvent.HANDSHAKE, { 
          peerId: socket.id,
          userId, 
          userName,
          walletAddress
        });
      }
    });

    socket.on(ChatEvent.MESSAGE, (payload: { 
      roomId: string; 
      content: string; 
      peerId: string 
    }) => {
      const { roomId, content, peerId } = payload;
      
      if (!content.trim()) return;
      
      const msg: ChatMessage = {
        roomId,
        senderId: socket.id,
        peerId,
        content: content.trim(),
        timestamp: Date.now(),
      };
      
      chatNs.to(roomId).emit(ChatEvent.MESSAGE, msg);
    });

    socket.on(ChatEvent.TYPING, ({ roomId, peerId }: { 
      roomId: string; 
      peerId: string 
    }) => {
      socket.to(roomId).emit(ChatEvent.TYPING, { 
        senderId: socket.id, 
        peerId 
      });
    });

    socket.on(ChatEvent.STOP_TYPING, ({ roomId, peerId }: { 
      roomId: string; 
      peerId: string 
    }) => {
      socket.to(roomId).emit(ChatEvent.STOP_TYPING, { 
        senderId: socket.id, 
        peerId 
      });
    });

    socket.on("video-offer", ({ roomId, description }: { roomId: string; description: SessionDescription }) => {
      socket.to(roomId).emit("video-offer", {
        description,
        peerId: socket.id,
      });
    });

    socket.on("video-answer", ({ roomId, description }: { roomId: string; description: SessionDescription }) => {
      socket.to(roomId).emit("video-answer", {
        description,
        peerId: socket.id,
      });
    });

    socket.on("video-ice-candidate", ({ roomId, candidate }: { roomId: string; candidate: IceCandidate }) => {
      socket.to(roomId).emit("video-ice-candidate", {
        candidate,
        peerId: socket.id,
      });
    });

    socket.on("end-call", ({ roomId }: { roomId: string }) => {
      socket.to(roomId).emit("end-call", { peerId: socket.id });
    });

    socket.on(ChatEvent.LEAVE_ROOM, ({ roomId }) => {
      leaveRoom(socket.id, roomId);
    });

    socket.on('disconnect', () => {
      handleDisconnect(socket.id);
    });
  });

  function leaveRoom(socketId: string, roomId: string) {
    const socket = chatNs.sockets.get(socketId);
    if (!socket) return;

    socket.leave(roomId);
    socket.to(roomId).emit(ChatEvent.PEER_LEFT, { peerId: socketId, roomId });
    
    if (activeRooms.has(roomId)) {
      activeRooms.get(roomId)!.delete(socketId);
      if (activeRooms.get(roomId)!.size === 0) {
        activeRooms.delete(roomId);
      }
    }
    
    userRooms.delete(socketId);
  }

  function handleDisconnect(socketId: string) {
    const roomId = userRooms.get(socketId);
    if (roomId) {
      leaveRoom(socketId, roomId);
    }
    
    const socket = chatNs.sockets.get(socketId);
    if (socket) {
      const rooms = Array.from(socket.rooms).filter((r) => r !== socketId);
      rooms.forEach((roomId) => {
        chatNs.to(roomId).emit(ChatEvent.PEER_LEFT, { peerId: socketId, roomId });
      });
    }
  }
}