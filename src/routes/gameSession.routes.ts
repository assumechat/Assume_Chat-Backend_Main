import { Router } from "express"

import {
  getGameSession,
  markJoinOnChain,
  recordGameMove,
  settleGameSession,
  upsertGameSession,
} from "../controllers/gameSession.controller"

const router = Router()

router.get("/sessions/:roomId", getGameSession)
router.post("/sessions", upsertGameSession)
router.patch("/sessions/:roomId/join", markJoinOnChain)
router.patch("/sessions/:roomId/move", recordGameMove)
router.patch("/sessions/:roomId/settle", settleGameSession)

export default router












