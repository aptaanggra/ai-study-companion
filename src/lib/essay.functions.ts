import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL, getAi } from "./ai-gateway.server";
import { ensureSchema, getSql } from "./db.server";

function todayISO() {
  // Use server UTC date; good enough for "soal harian"
  return new Date().toISOString().slice(0, 10);
}

const UserSchema = z.object({ userId: z.string().min(8).max(64) });

export const getTodayEssay = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UserSchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const date = todayISO();

    const users = await sql`SELECT jenjang, kelas FROM app_users WHERE id = ${data.userId} LIMIT 1`;
    if (users.length === 0) throw new Error("User belum dikonfigurasi");
    const { jenjang, kelas } = users[0] as { jenjang: string; kelas: number };

    const existing = await sql`
      SELECT id, prompt, answer, feedback, score FROM daily_essays
      WHERE user_id = ${data.userId} AND essay_date = ${date} LIMIT 1
    `;
    if (existing.length > 0) {
      const e = existing[0];
      return {
        id: e.id as string,
        date,
        prompt: e.prompt as string,
        answer: (e.answer as string | null) ?? null,
        feedback: (e.feedback as string | null) ?? null,
        score: (e.score as number | null) ?? null,
      };
    }

    const provider = getAi();
    const { text } = await generateText({
      model: provider(DEFAULT_MODEL),
      prompt: `Buat satu soal esai populer yang ringan dan menyenangkan untuk siswa ${jenjang} kelas ${kelas} di Indonesia.
Soal harus reflektif, bisa dijawab maksimal 2 paragraf, dan memancing pemikiran kritis tentang sains, sosial, atau kehidupan sehari-hari.
Tulis HANYA pertanyaannya dalam 1-3 kalimat, tanpa nomor, tanpa instruksi tambahan, tanpa tanda kutip.`,
    });
    const prompt = text.trim().replace(/^["']|["']$/g, "");

    const [row] = await sql`
      INSERT INTO daily_essays (user_id, essay_date, prompt)
      VALUES (${data.userId}, ${date}, ${prompt})
      RETURNING id
    `;
    return { id: row.id as string, date, prompt, answer: null, feedback: null, score: null };
  });

const SubmitSchema = z.object({
  userId: z.string().min(8).max(64),
  essayId: z.string().uuid(),
  answer: z.string().trim().min(10).max(3000),
});

export const submitEssay = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SubmitSchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT prompt FROM daily_essays WHERE id = ${data.essayId} AND user_id = ${data.userId} LIMIT 1
    `;
    if (rows.length === 0) throw new Error("Soal tidak ditemukan");
    const prompt = rows[0].prompt as string;

    const users = await sql`SELECT jenjang, kelas FROM app_users WHERE id = ${data.userId} LIMIT 1`;
    const { jenjang, kelas } = users[0] as { jenjang: string; kelas: number };

    const provider = getAi();
    const { output } = await generateText({
      model: provider(DEFAULT_MODEL),
      output: Output.object({
        schema: z.object({
          score: z.number().min(0).max(100),
          feedback: z.string(),
        }),
      }),
      prompt: `Anda adalah guru pembimbing untuk siswa ${jenjang} kelas ${kelas}.
Soal: "${prompt}"
Jawaban siswa (max 2 paragraf): "${data.answer}"

Berikan penilaian objektif dan umpan balik yang hangat, lugas, membangun dalam Bahasa Indonesia.
Format feedback dengan markdown ringkas: 1 paragraf apresiasi singkat, lalu list "Yang sudah baik" dan "Saran perbaikan". Skor 0-100.`,
    });

    await sql`
      UPDATE daily_essays SET answer = ${data.answer}, feedback = ${output.feedback}, score = ${output.score}
      WHERE id = ${data.essayId} AND user_id = ${data.userId}
    `;
    return output;
  });

export const listEssays = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UserSchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT id, essay_date, prompt, answer, score FROM daily_essays
      WHERE user_id = ${data.userId} ORDER BY essay_date DESC LIMIT 30
    `;
    return rows.map((r) => ({
      id: r.id as string,
      date: (r.essay_date as Date).toISOString().slice(0, 10),
      prompt: r.prompt as string,
      answer: (r.answer as string | null) ?? null,
      score: (r.score as number | null) ?? null,
    }));
  });
