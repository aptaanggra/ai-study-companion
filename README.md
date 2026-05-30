# EduMandiri — Belajar Mandiri dengan AI

Aplikasi belajar mandiri berbasis AI untuk siswa SD, SMP, dan SMA di Indonesia.
Tampilan bersih, soft, modern, dan compact untuk pengalaman belajar yang menyenangkan.

## Fitur

1. **Ruang Diskusi & Eksplorasi Sains (AI)**  
   Multi-thread diskusi terstruktur dengan panduan AI. Setiap thread dilengkapi hipotesis awal, potensi sains/ekonomi, playground uji coba eksperimen sederhana, dan perbincangan lanjutan. Dukungan unggah gambar.

2. **Soal Esai Harian**  
   Soal reflektif otomatis sesuai jenjang dan kelas, maksimal 2 paragraf. Penilaian dan umpan balik oleh AI dengan skor 0–100.

3. **Analisa Tugas Sekolah**  
   Unggah/foto lembar tugas sekolah untuk dianalisis dan dinilai oleh AI, lengkap dengan saran perbaikan.

4. **Laporan Progres**  
   Dashboard aktivitas harian, total thread, esai, analisis, dan rata-rata skor.

## Tech Stack

- **Framework:** TanStack Start (React 19 + Vite 7 + Nitro)
- **Styling:** Tailwind CSS v4 dengan design tokens oklch (tema Sage & Cream)
- **Database:** NeonDB (PostgreSQL) via `postgres.js`
- **AI:** Lovable AI Gateway (`@ai-sdk/openai-compatible`) — model `google/gemini-3-flash-preview`
- **Deployment:** Netlify (target production)

## Environment Variables

Buat file `.env` di root project (atau konfigurasi di Netlify):

```bash
DATABASE_URL=postgres://user:pass@host.neon.tech/dbname?sslmode=require
LOVABLE_API_KEY=lov_sk_xxxxxxxx
```

| Variable | Keterangan |
|----------|------------|
| `DATABASE_URL` | Connection string NeonDB (SSL required) |
| `LOVABLE_API_KEY` | API key dari Lovable AI Gateway |

> ⚠️ **Jangan** commit file `.env` ke repository.

## Setup Lokal

```bash
# 1. Clone repo
git clone <repo-url>
cd edumandiri

# 2. Install dependencies
bun install

# 3. Buat .env sesuai instruksi di atas

# 4. Jalankan development server
bun run dev
```

Akses aplikasi di `http://localhost:3000`.

## Build & Deploy

```bash
# Build production
bun run build
```

Deploy folder `dist` ke Netlify. Pastikan environment variables `DATABASE_URL` dan `LOVABLE_API_KEY` sudah diatur di dashboard Netlify.

## Struktur Folder

```
src/
├── components/          # UI components & layout
├── lib/
│   ├── ai-gateway.server.ts   # Konfigurasi AI provider
│   ├── db.server.ts           # Koneksi NeonDB & schema
│   ├── chat.functions.ts    # Server fn: diskusi sains
│   ├── essay.functions.ts   # Server fn: esai harian
│   ├── analyze.functions.ts # Server fn: analisa tugas
│   ├── progress.functions.ts# Server fn: laporan progres
│   └── config.functions.ts  # Server fn: konfigurasi user
├── routes/              # File-based routing (TanStack)
├── styles.css           # Design tokens & Tailwind
└── server.ts            # SSR entry wrapper
```

## Lisensi

MIT
