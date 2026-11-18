import { Router, type IRouter } from "express";
import { db, betsTable, usersTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { PlaceBetBody, GetUserBetsQueryParams } from "@workspace/api-zod";
import { type GameEngine } from "../lib/game-engine";

let gameEngineRef: GameEngine | null = null;

export function setBetsGameEngine(engine: GameEngine) {
  gameEngineRef = engine;
}

const router: IRouter = Router();

router.post("/bets", requireAuth, async (req, res): Promise<void> => {
  const parsed = PlaceBetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { mode, betType, betValue, amount } = parsed.data;

  if (amount <= 0) {
    res.status(400).json({ error: "Bet amount must be positive" });
    return;
  }

  const gameState = gameEngineRef?.getState(mode as "30s" | "1m" | "3m");
  if (!gameState) {
    res.status(503).json({ error: "Game engine not running" });
    return;
  }

  if (!gameState.bettingOpen) {
    res.status(400).json({ error: "Betting is closed for this round" });
    return;
  }

  const userId = req.user!.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const currentBalance = parseFloat(user.balance);
  if (currentBalance < amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  await db.update(usersTable)
    .set({ balance: sql`${usersTable.balance} - ${amount.toString()}` })
    .where(eq(usersTable.id, userId));

  const [bet] = await db.insert(betsTable).values({
    userId,
    periodId: gameState.periodId,
    mode,
    betType,
    betValue,
    amount: amount.toString(),
    status: "pending",
  }).returning();

  res.status(201).json({
    id: bet.id,
    userId: bet.userId,
    periodId: bet.periodId,
    mode: bet.mode,
    betType: bet.betType,
    betValue: bet.betValue,
    amount: parseFloat(bet.amount),
    status: bet.status,
    payout: bet.payout ? parseFloat(bet.payout) : null,
    createdAt: bet.createdAt,
  });
});

router.get("/bets", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetUserBetsQueryParams.safeParse(req.query);
  const limit = (parsed.success && parsed.data.limit) ? Number(parsed.data.limit) : 50;
  const offset = (parsed.success && parsed.data.offset) ? Number(parsed.data.offset) : 0;

  const bets = await db.select().from(betsTable)
    .where(eq(betsTable.userId, req.user!.userId))
    .orderBy(desc(betsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(bets.map((b) => ({
    id: b.id,
    userId: b.userId,
    periodId: b.periodId,
    mode: b.mode,
    betType: b.betType,
    betValue: b.betValue,
    amount: parseFloat(b.amount),
    status: b.status,
    payout: b.payout ? parseFloat(b.payout) : null,
    createdAt: b.createdAt,
  })));
});

router.get("/bets/active", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const bets = await db.select().from(betsTable)
    .where(and(eq(betsTable.userId, userId), eq(betsTable.status, "pending")))
    .orderBy(desc(betsTable.createdAt));

  res.json(bets.map((b) => ({
    id: b.id,
    userId: b.userId,
    periodId: b.periodId,
    mode: b.mode,
    betType: b.betType,
    betValue: b.betValue,
    amount: parseFloat(b.amount),
    status: b.status,
    payout: b.payout ? parseFloat(b.payout) : null,
    createdAt: b.createdAt,
  })));
});

export default router;
