import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureSchema, getSql } from "./db.server";

const UserIdSchema = z.object({ userId: z.string().min(8).max(64) });

const SaveConfigSchema = z.object({
  userId: z.string().min(8).max(64),
  jenjang: z.enum(["SD", "SMP", "SMA"]),
  kelas: z.number().int().min(1).max(12),
  nama: z.string().trim().max(60).optional(),
});

export const getConfig = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UserIdSchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`SELECT id, jenjang, kelas, nama FROM app_users WHERE id = ${data.userId} LIMIT 1`;
    return rows[0] ?? null;
  });

export const saveConfig = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SaveConfigSchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    await sql`
      INSERT INTO app_users (id, jenjang, kelas, nama)
      VALUES (${data.userId}, ${data.jenjang}, ${data.kelas}, ${data.nama ?? null})
      ON CONFLICT (id) DO UPDATE SET jenjang = EXCLUDED.jenjang, kelas = EXCLUDED.kelas, nama = EXCLUDED.nama
    `;
    return { ok: true };
  });
