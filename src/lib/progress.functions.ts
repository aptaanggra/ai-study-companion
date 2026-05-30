import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureSchema, getSql } from "./db.server";

const UserSchema = z.object({ userId: z.string().min(8).max(64) });

export const getProgress = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UserSchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();

    const [threads] = await sql`SELECT COUNT(*)::int AS c FROM threads WHERE user_id = ${data.userId}`;
    const [msgs] = await sql`
      SELECT COUNT(*)::int AS c FROM messages m
      JOIN threads t ON t.id = m.thread_id WHERE t.user_id = ${data.userId}
    `;
    const [essays] = await sql`SELECT COUNT(*)::int AS c FROM daily_essays WHERE user_id = ${data.userId} AND answer IS NOT NULL`;
    const [analyses] = await sql`SELECT COUNT(*)::int AS c FROM analyses WHERE user_id = ${data.userId}`;
    const [avgEssay] = await sql`SELECT AVG(score)::int AS s FROM daily_essays WHERE user_id = ${data.userId} AND score IS NOT NULL`;
    const [avgAnalysis] = await sql`SELECT AVG(score)::int AS s FROM analyses WHERE user_id = ${data.userId} AND score IS NOT NULL`;

    const last14 = await sql`
      SELECT day::date AS day,
        COALESCE(SUM(CASE WHEN src='essay' THEN 1 ELSE 0 END),0)::int AS essays,
        COALESCE(SUM(CASE WHEN src='analysis' THEN 1 ELSE 0 END),0)::int AS analyses,
        COALESCE(SUM(CASE WHEN src='thread' THEN 1 ELSE 0 END),0)::int AS threads
      FROM (
        SELECT generate_series((CURRENT_DATE - INTERVAL '13 days')::date, CURRENT_DATE, '1 day') AS day
      ) d
      LEFT JOIN (
        SELECT created_at::date AS d, 'essay' AS src FROM daily_essays WHERE user_id = ${data.userId} AND answer IS NOT NULL
        UNION ALL SELECT created_at::date, 'analysis' FROM analyses WHERE user_id = ${data.userId}
        UNION ALL SELECT created_at::date, 'thread' FROM threads WHERE user_id = ${data.userId}
      ) e ON e.d = d.day
      GROUP BY day ORDER BY day ASC
    `;

    return {
      totals: {
        threads: threads.c as number,
        messages: msgs.c as number,
        essays: essays.c as number,
        analyses: analyses.c as number,
      },
      averages: {
        essay: (avgEssay.s as number | null) ?? null,
        analysis: (avgAnalysis.s as number | null) ?? null,
      },
      activity: last14.map((r) => ({
        day: (r.day as Date).toISOString().slice(5, 10),
        essays: r.essays as number,
        analyses: r.analyses as number,
        threads: r.threads as number,
      })),
    };
  });
