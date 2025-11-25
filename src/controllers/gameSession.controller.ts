import type { Request, Response } from "express"

import GameSession, {
  type GameSessionDocument,
  type GameSessionStatus,
} from "../models/GameSession.model"

function normalizeAddress(address?: string) {
  if (!address) return undefined
  return address.toLowerCase()
}

function respondWithSession(res: Response, session: GameSessionDocument) {
  return res.json({
    data: session,
  })
}

export async function getGameSession(req: Request, res: Response) {
  try {
    const { roomId } = req.params
    const session = await GameSession.findOne({ roomId })
    if (!session) {
      return res.status(404).json({ message: "Session not found" })
    }
    return respondWithSession(res, session)
  } catch (error) {
    console.error("Failed to fetch session", error)
    return res.status(500).json({ message: "Unable to fetch game session" })
  }
}

export async function upsertGameSession(req: Request, res: Response) {
  try {
    const { roomId, matchId, stakeWei, initiatorWallet, opponentWallet, txHash } = req.body ?? {}

    if (!roomId || typeof roomId !== "string") {
      return res.status(400).json({ message: "roomId is required" })
    }
    if (typeof matchId !== "number") {
      return res.status(400).json({ message: "matchId must be a number" })
    }
    if (!stakeWei || typeof stakeWei !== "string") {
      return res.status(400).json({ message: "stakeWei is required" })
    }
    if (!initiatorWallet || !opponentWallet) {
      return res.status(400).json({ message: "Both wallet addresses are required" })
    }

    const normalizedInitiator = normalizeAddress(initiatorWallet)
    const normalizedOpponent = normalizeAddress(opponentWallet)

    const session = await GameSession.findOneAndUpdate(
      { roomId },
      {
        roomId,
        matchId,
        stakeWei,
        initiatorWallet: normalizedInitiator,
        opponentWallet: normalizedOpponent,
        status: "onchain_pending" satisfies GameSessionStatus,
        "txHashes.create": txHash,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    return respondWithSession(res, session)
  } catch (error) {
    console.error("Failed to upsert session", error)
    return res.status(500).json({ message: "Unable to store game session" })
  }
}

export async function markJoinOnChain(req: Request, res: Response) {
  try {
    const { roomId } = req.params
    const { txHash } = req.body ?? {}

    if (!txHash) {
      return res.status(400).json({ message: "txHash is required" })
    }

    const session = await GameSession.findOneAndUpdate(
      { roomId },
      {
        status: "live" satisfies GameSessionStatus,
        "txHashes.join": txHash,
      },
      { new: true }
    )

    if (!session) {
      return res.status(404).json({ message: "Session not found" })
    }

    return respondWithSession(res, session)
  } catch (error) {
    console.error("Failed to mark join", error)
    return res.status(500).json({ message: "Unable to update join state" })
  }
}

export async function recordGameMove(req: Request, res: Response) {
  try {
    const { roomId } = req.params
    const { wallet, move, txHash } = req.body ?? {}

    if (!wallet || !move) {
      return res.status(400).json({ message: "wallet and move are required" })
    }

    if (!["cooperate", "cheat"].includes(move)) {
      return res.status(400).json({ message: "move must be cooperate or cheat" })
    }

    const normalizedWallet = normalizeAddress(wallet)
    const session = await GameSession.findOne({ roomId })

    if (!session) {
      return res.status(404).json({ message: "Session not found" })
    }

    let playerKey: "player1" | "player2" | null = null

    if (session.initiatorWallet && session.initiatorWallet === normalizedWallet) {
      playerKey = "player1"
    } else if (session.opponentWallet && session.opponentWallet === normalizedWallet) {
      playerKey = "player2"
    }

    if (!playerKey) {
      return res.status(400).json({ message: "Wallet not part of this match" })
    }

    session.decisions[playerKey] = move

    if (playerKey === "player1") {
      session.txHashes.player1Move = txHash
    } else {
      session.txHashes.player2Move = txHash
    }

    if (session.decisions.player1 && session.decisions.player2) {
      session.status = "moves_submitted"
    }

    await session.save()
    return respondWithSession(res, session)
  } catch (error) {
    console.error("Failed to record move", error)
    return res.status(500).json({ message: "Unable to record move" })
  }
}

export async function settleGameSession(req: Request, res: Response) {
  try {
    const { roomId } = req.params
    const { txHash, payoffPlayer1, payoffPlayer2 } = req.body ?? {}

    const session = await GameSession.findOne({ roomId })

    if (!session) {
      return res.status(404).json({ message: "Session not found" })
    }

    session.status = "settled"
    session.txHashes.settle = txHash
    session.payoff = {
      player1: payoffPlayer1,
      player2: payoffPlayer2,
    }

    await session.save()
    return respondWithSession(res, session)
  } catch (error) {
    console.error("Failed to settle match", error)
    return res.status(500).json({ message: "Unable to settle game session" })
  }
}

