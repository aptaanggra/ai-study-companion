import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL, getAi } from "./ai-gateway.server";
import { ensureSchema, getSql } from "./db.server";

const AnalyzeSchema = z.object({
  userId: z.string().min(8).max(64),
  title: z.string().trim().min(2).max(120),
  imageDataUrl: z.string().regex(/^data:image\/(png|jpe?g|webp);base64,/).max(8_000_000),
});

export const analyzeWorksheet = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalyzeSchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const users = await sql`SELECT jenjang, kelas FROM app_users WHERE id = ${data.userId} LIMIT 1`;
    if (users.length === 0) throw new Error("User belum dikonfigurasi");
    const { jenjang, kelas } = users[0] as { jenjang: string; kelas: number };

    const provider = getAi();
    const { output } = await generateText({
      model: provider(DEFAULT_MODEL),
      output: Output.object({
        schema: z.object({
          score: z.number().min(0).max(100),
          result: z.string(),
        }),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Anda guru pembimbing untuk siswa ${jenjang} kelas ${kelas}. Berikut foto lembar tugas siswa berjudul "${data.title}".
Lakukan: (1) baca isi tugas, (2) periksa jawaban siswa bila ada, (3) berikan koreksi & penjelasan per nomor, (4) skor keseluruhan 0-100, (5) saran perbaikan dan langkah belajar berikutnya.
Format markdown rapi dengan heading: "## Ringkasan Tugas", "## Koreksi", "## Saran Belajar". Jika gambar tidak terbaca, jelaskan dengan ramah.`,
            },
            { type: "image", image: data.imageDataUrl },
          ],
        },
      ],
    });

    const [row] = await sql`
      INSERT INTO analyses (user_id, title, image_data_url, result, score)
      VALUES (${data.userId}, ${data.title}, ${data.imageDataUrl}, ${output.result}, ${output.score})
      RETURNING id, created_at
    `;
    return { id: row.id as string, ...output };
  });

const UserSchema = z.object({ userId: z.string().min(8).max(64) });

export const listAnalyses = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UserSchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT id, title, score, created_at FROM analyses
      WHERE user_id = ${data.userId} ORDER BY created_at DESC LIMIT 50
    `;
    return rows.map((r) => ({
      id: r.id as string,
      title: r.title as string,
      score: (r.score as number | null) ?? null,
      createdAt: (r.created_at as Date).toISOString(),
    }));
  });

const ItemSchema = z.object({
  userId: z.string().min(8).max(64),
  id: z.string().uuid(),
});

export const getAnalysis = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ItemSchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT id, title, image_data_url, result, score, created_at FROM analyses
      WHERE id = ${data.id} AND user_id = ${data.userId} LIMIT 1
    `;
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id as string,
      title: r.title as string,
      imageDataUrl: r.image_data_url as string,
      result: r.result as string,
      score: (r.score as number | null) ?? null,
      createdAt: (r.created_at as Date).toISOString(),
    };
  });
