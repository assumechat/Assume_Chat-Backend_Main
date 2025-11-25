import { Schema, model, type Document } from "mongoose"

export type GameSessionStatus =
  | "waiting"
  | "onchain_pending"
  | "live"
  | "moves_submitted"
  | "settled"

export interface GameSessionDocument extends Document {
  roomId: string
  matchId?: number
  stakeWei?: string
  initiatorWallet?: string
  opponentWallet?: string
  status: GameSessionStatus
  txHashes: {
    create?: string
    join?: string
    player1Move?: string
    player2Move?: string
    settle?: string
  }
  decisions: {
    player1?: "cooperate" | "cheat"
    player2?: "cooperate" | "cheat"
  }
  payoff?: {
    player1?: string
    player2?: string
  }
}

const GameSessionSchema = new Schema<GameSessionDocument>(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    matchId: { type: Number },
    stakeWei: { type: String },
    initiatorWallet: { type: String },
    opponentWallet: { type: String },
    status: {
      type: String,
      enum: ["waiting", "onchain_pending", "live", "moves_submitted", "settled"],
      default: "waiting",
    },
    txHashes: {
      create: { type: String },
      join: { type: String },
      player1Move: { type: String },
      player2Move: { type: String },
      settle: { type: String },
    },
    decisions: {
      player1: { type: String, enum: ["cooperate", "cheat", null], default: null },
      player2: { type: String, enum: ["cooperate", "cheat", null], default: null },
    },
    payoff: {
      player1: { type: String },
      player2: { type: String },
    },
  },
  {
    timestamps: true,
  }
)

export default model<GameSessionDocument>("GameSession", GameSessionSchema)












