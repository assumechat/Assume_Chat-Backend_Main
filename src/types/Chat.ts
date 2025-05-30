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
export enum ChatEvent {
  JOIN_ROOM = 'joinRoom',
  JOINED_ROOM = 'joinedRoom',
  HANDSHAKE = 'handshake',    // <— new
  MESSAGE = 'message',
  TYPING = 'typing',
  PEER_LEFT = 'peerLeft',
}