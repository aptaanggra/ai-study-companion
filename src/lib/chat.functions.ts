import { createServerFn } from "@tanstack/react-start";
import { generateText, type ImagePart, type ModelMessage, type TextPart } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL, getAi } from "./ai-gateway.server";
import { ensureSchema, getSql } from "./db.server";

async function getUserContext(userId: string) {
  const sql = getSql();
  const rows = await sql`SELECT jenjang, kelas, nama FROM app_users WHERE id = ${userId} LIMIT 1`;
  return rows[0] as { jenjang: string; kelas: number; nama: string | null } | undefined;
}

function systemPrompt(ctx: { jenjang: string; kelas: number }) {
  return `Anda adalah guru pembimbing sains digital yang ramah, fokus, lugas, dan komprehensif untuk siswa ${ctx.jenjang} kelas ${ctx.kelas} di Indonesia.
Bahasa: Bahasa Indonesia yang hangat dan jelas, sesuai tingkat siswa.
Gaya: terstruktur dengan heading markdown ringkas, contoh konkret, gunakan analogi sehari-hari. Hindari jargon berlebihan.
Selalu kaitkan konsep dengan eksperimen sederhana yang aman dilakukan di rumah/sekolah bila relevan.`;
}

const ImageSchema = z.string().regex(/^data:image\/(png|jpe?g|webp);base64,/).max(8_000_000).optional();

const StartSchema = z.object({
  userId: z.string().min(8).max(64),
  topic: z.string().trim().min(3).max(300),
  imageDataUrl: ImageSchema,
});

export const startThread = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => StartSchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const ctx = await getUserContext(data.userId);
    if (!ctx) throw new Error("User belum dikonfigurasi");

    const provider = getAi();
    const userParts: Array<TextPart | ImagePart> = [
      {
        type: "text",
        text: `Topik eksplorasi siswa: "${data.topic}".
Buat pembukaan diskusi terstruktur dalam markdown dengan bagian berikut:
## Premis
## Hipotesis Awal
## Potensi Sains
## Potensi Ekonomi
## Pengaruh di Dunia
## Playground Uji Coba
Lalu di bagian Playground, rancang prosedur eksperimen sederhana 3-5 langkah sebagai uji bukti, sebutkan alat sederhana yang dibutuhkan, dan apa yang harus diamati.
Akhiri dengan 1 pertanyaan pemantik agar siswa lanjut berdiskusi.`,
      },
    ];
    if (data.imageDataUrl) {
      userParts.push({ type: "image", image: data.imageDataUrl });
    }

    const { text } = await generateText({
      model: provider(DEFAULT_MODEL),
      system: systemPrompt(ctx),
      messages: [{ role: "user", content: userParts }],
    });

    // Generate a short title
    let title = data.topic.length > 60 ? data.topic.slice(0, 60) + "…" : data.topic;
    try {
      const titleRes = await generateText({
        model: provider(DEFAULT_MODEL),
        prompt: `Buat judul singkat 3-6 kata (tanpa tanda kutip) untuk topik eksplorasi sains: "${data.topic}"`,
      });
      const t = titleRes.text.trim().replace(/^["']|["']$/g, "");
      if (t.length > 0 && t.length < 80) title = t;
    } catch {/* ignore */}

    const [thread] = await sql`
      INSERT INTO threads (user_id, title, subject) VALUES (${data.userId}, ${title}, ${"Sains"})
      RETURNING id, title, created_at
    `;

    await sql`
      INSERT INTO messages (thread_id, role, content, image_data_url)
      VALUES (${thread.id}, 'user', ${data.topic}, ${data.imageDataUrl ?? null})
    `;
    await sql`
      INSERT INTO messages (thread_id, role, content)
      VALUES (${thread.id}, 'assistant', ${text})
    `;

    return { threadId: thread.id as string };
  });

const ListSchema = z.object({ userId: z.string().min(8).max(64) });

export const listThreads = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ListSchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT id, title, subject, updated_at FROM threads
      WHERE user_id = ${data.userId} ORDER BY updated_at DESC LIMIT 100
    `;
    return rows.map((r) => ({
      id: r.id as string,
      title: r.title as string,
      subject: (r.subject as string | null) ?? null,
      updatedAt: (r.updated_at as Date).toISOString(),
    }));
  });

const ThreadSchema = z.object({
  userId: z.string().min(8).max(64),
  threadId: z.string().uuid(),
});

export const getThread = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ThreadSchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const threads = await sql`
      SELECT id, title, subject, created_at FROM threads
      WHERE id = ${data.threadId} AND user_id = ${data.userId} LIMIT 1
    `;
    if (threads.length === 0) return null;
    const messages = await sql`
      SELECT id, role, content, image_data_url, created_at FROM messages
      WHERE thread_id = ${data.threadId} ORDER BY created_at ASC
    `;
    return {
      thread: {
        id: threads[0].id as string,
        title: threads[0].title as string,
        subject: (threads[0].subject as string | null) ?? null,
      },
      messages: messages.map((m) => ({
        id: m.id as string,
        role: m.role as "user" | "assistant",
        content: m.content as string,
        imageDataUrl: (m.image_data_url as string | null) ?? null,
        createdAt: (m.created_at as Date).toISOString(),
      })),
    };
  });

const ReplySchema = z.object({
  userId: z.string().min(8).max(64),
  threadId: z.string().uuid(),
  message: z.string().trim().min(1).max(4000),
  imageDataUrl: ImageSchema,
});

export const sendMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ReplySchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const ctx = await getUserContext(data.userId);
    if (!ctx) throw new Error("User belum dikonfigurasi");

    // Verify ownership
    const owns = await sql`SELECT 1 FROM threads WHERE id = ${data.threadId} AND user_id = ${data.userId}`;
    if (owns.length === 0) throw new Error("Thread tidak ditemukan");

    await sql`
      INSERT INTO messages (thread_id, role, content, image_data_url)
      VALUES (${data.threadId}, 'user', ${data.message}, ${data.imageDataUrl ?? null})
    `;

    const history = await sql`
      SELECT role, content, image_data_url FROM messages
      WHERE thread_id = ${data.threadId} ORDER BY created_at ASC LIMIT 40
    `;

    const provider = getAi();
    const messages: ModelMessage[] = history.map((m) => {
      const role = m.role as "user" | "assistant";
      if (role === "user" && m.image_data_url) {
        return {
          role,
          content: [
            { type: "text", text: m.content as string },
            { type: "image", image: m.image_data_url as string },
          ],
        } as ModelMessage;
      }
      return { role, content: m.content as string } as ModelMessage;
    });

    const { text } = await generateText({
      model: provider(DEFAULT_MODEL),
      system: systemPrompt(ctx),
      messages,
    });

    await sql`INSERT INTO messages (thread_id, role, content) VALUES (${data.threadId}, 'assistant', ${text})`;
    await sql`UPDATE threads SET updated_at = now() WHERE id = ${data.threadId}`;

    return { reply: text };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ThreadSchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    await sql`DELETE FROM threads WHERE id = ${data.threadId} AND user_id = ${data.userId}`;
    return { ok: true };
  });
