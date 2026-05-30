import postgres from "postgres";

let sqlSingleton: ReturnType<typeof postgres> | null = null;

export function getSql() {
  if (sqlSingleton) return sqlSingleton;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  sqlSingleton = postgres(url, {
    ssl: "require",
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  return sqlSingleton;
}

let migrated = false;

export async function ensureSchema() {
  if (migrated) return;
  const sql = getSql();
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      jenjang TEXT NOT NULL,
      kelas INT NOT NULL,
      nama TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS threads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      subject TEXT,
      brief JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS threads_user_idx ON threads(user_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      image_data_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS messages_thread_idx ON messages(thread_id, created_at);

    CREATE TABLE IF NOT EXISTS daily_essays (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      essay_date DATE NOT NULL,
      prompt TEXT NOT NULL,
      answer TEXT,
      feedback TEXT,
      score INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, essay_date)
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      image_data_url TEXT NOT NULL,
      result TEXT NOT NULL,
      score INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS analyses_user_idx ON analyses(user_id, created_at DESC);
  `);
  migrated = true;
}
