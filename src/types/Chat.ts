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
  /** Emitted by client to join a room */
  JOIN_ROOM = 'joinRoom',
  /** Acknowledgement that client joined */
  JOINED_ROOM = 'joinedRoom',
  /** Emitted by either side to send a message */
  MESSAGE = 'message',
  /** Emitted by server or client when typing */
  TYPING = 'typing',
  /** Emitted by server when peer disconnects */
  PEER_LEFT = 'peerLeft',
}
