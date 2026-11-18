import { Router, type IRouter } from "express";
import { db, gameResultsTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { GetGameHistoryQueryParams, GetGameStateQueryParams } from "@workspace/api-zod";
import { type GameEngine } from "../lib/game-engine";

let gameEngineRef: GameEngine | null = null;

export function setGameEngine(engine: GameEngine) {
  gameEngineRef = engine;
}

const router: IRouter = Router();

router.get("/game/state", async (req, res): Promise<void> => {
  const parsed = GetGameStateQueryParams.safeParse(req.query);
  const mode = (parsed.success && parsed.data.mode) ? parsed.data.mode : "1m";

  const state = gameEngineRef?.getState(mode as "30s" | "1m" | "3m");
  if (!state) {
    res.status(503).json({ error: "Game engine not running" });
    return;
  }
  res.json(state);
});

router.get("/game/history", async (req, res): Promise<void> => {
  const parsed = GetGameHistoryQueryParams.safeParse(req.query);
  const mode = (parsed.success && parsed.data.mode) ? parsed.data.mode : undefined;
  const limit = (parsed.success && parsed.data.limit) ? Number(parsed.data.limit) : 20;

  const query = db.select().from(gameResultsTable).orderBy(desc(gameResultsTable.createdAt)).limit(limit);
  if (mode) {
    const results = await db.select().from(gameResultsTable)
      .where(eq(gameResultsTable.mode, mode))
      .orderBy(desc(gameResultsTable.createdAt))
      .limit(limit);
    res.json(results);
    return;
  }
  const results = await query;
  res.json(results);
});

router.get("/game/stats", async (_req, res): Promise<void> => {
  const [totalRow] = await db.select({ count: sql<number>`count(*)` }).from(gameResultsTable);
  const total = Number(totalRow?.count ?? 0);

  const colorRows = await db
    .select({ color: gameResultsTable.resultColor, count: sql<number>`count(*)` })
    .from(gameResultsTable)
    .groupBy(gameResultsTable.resultColor);

  const sizeRows = await db
    .select({ size: gameResultsTable.resultSize, count: sql<number>`count(*)` })
    .from(gameResultsTable)
    .groupBy(gameResultsTable.resultSize);

  const numRows = await db
    .select({ number: gameResultsTable.resultNumber, count: sql<number>`count(*)` })
    .from(gameResultsTable)
    .groupBy(gameResultsTable.resultNumber);

  const colorMap: Record<string, number> = {};
  for (const r of colorRows) colorMap[r.color] = Number(r.count);

  const sizeMap: Record<string, number> = {};
  for (const r of sizeRows) sizeMap[r.size] = Number(r.count);

  const numberDistribution = numRows.map((r) => ({ number: r.number, count: Number(r.count) }));

  res.json({
    totalGames: total,
    redCount: colorMap["red"] ?? 0,
    greenCount: colorMap["green"] ?? 0,
    violetCount: colorMap["violet"] ?? 0,
    bigCount: sizeMap["big"] ?? 0,
    smallCount: sizeMap["small"] ?? 0,
    numberDistribution,
  });
});

export default router;
