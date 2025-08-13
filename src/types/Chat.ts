// src/types/chat.ts

/**
 * Core data structure for a chat message.
 */
export interface ChatMessage {
  /** ID of the room this message belongs to */
  roomId: string;
  /** Socket ID of the sender */
  senderId: string;
  /** Optional display name of the sender */
  senderName?: string;
  /** Socket ID of the peer/recipient */
  peerId: string;
  /** The text content of the message */
  content: string;
  /** Unix timestamp (ms) when the message was sent */
  timestamp: number;
}

/**
 * Event names used in the chat namespace
 */


// updated enum with additional types...
export enum ChatEvent {
  JOIN_ROOM = 'joinRoom',
  JOINED_ROOM = 'joinedRoom',
  LEAVE_ROOM = 'leaveRoom',
  HANDSHAKE = 'handshake',
  MESSAGE = 'message',
  TYPING = 'typing',
  STOP_TYPING = 'stopTyping',
  PEER_JOINED = 'peerJoined',
  PEER_LEFT = 'peerLeft',
}