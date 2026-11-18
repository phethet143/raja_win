import { Router, type IRouter } from "express";
import { db, usersTable, betsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/wallet", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const [wonRow] = await db
    .select({ total: sql<string>`coalesce(sum(payout), 0)` })
    .from(betsTable)
    .where(eq(betsTable.userId, userId));

  const [betRow] = await db
    .select({ total: sql<string>`coalesce(sum(amount), 0)` })
    .from(betsTable)
    .where(eq(betsTable.userId, userId));

  res.json({
    balance: parseFloat(user.balance),
    totalWon: parseFloat(wonRow?.total ?? "0"),
    totalBet: parseFloat(betRow?.total ?? "0"),
  });
});

export default router;
