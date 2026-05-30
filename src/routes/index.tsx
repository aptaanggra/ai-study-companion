import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getOrCreateUserId } from "@/lib/user-id";
import { getConfig, saveConfig } from "@/lib/config.functions";
import { BookOpen, FlaskConical, LineChart, ScanLine, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Beranda · EduMandiri" }] }),
  component: HomePage,
});

const JENJANG = [
  { code: "SD", label: "SD", kelasOptions: [1, 2, 3, 4, 5, 6] },
  { code: "SMP", label: "SMP", kelasOptions: [7, 8, 9] },
  { code: "SMA", label: "SMA", kelasOptions: [10, 11, 12] },
] as const;

function HomePage() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => setUserId(getOrCreateUserId()), []);

  const fetchConfig = useServerFn(getConfig);
  const { data: config, isLoading, refetch } = useQuery({
    queryKey: ["config", userId],
    queryFn: () => fetchConfig({ data: { userId: userId! } }),
    enabled: !!userId,
  });

  return (
    <AppShell>
      {!userId || isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Memuat…</div>
      ) : !config ? (
        <OnboardingForm userId={userId} onDone={() => refetch()} />
      ) : (
        <Dashboard config={config} />
      )}
    </AppShell>
  );
}

function OnboardingForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [jenjang, setJenjang] = useState<"SD" | "SMP" | "SMA">("SMP");
  const [kelas, setKelas] = useState(7);
  const [nama, setNama] = useState("");
  const save = useServerFn(saveConfig);
  const mutation = useMutation({
    mutationFn: () => save({ data: { userId, jenjang, kelas, nama: nama || undefined } }),
    onSuccess: onDone,
  });

  const opts = JENJANG.find((j) => j.code === jenjang)!.kelasOptions;

  return (
    <div className="max-w-xl mx-auto mt-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs mb-3">
          <Sparkles className="h-3 w-3" /> Selamat datang
        </div>
        <h1 className="text-3xl sm:text-4xl">Atur jenjang belajarmu</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Kami akan menyesuaikan materi, soal, dan gaya bimbingan AI dengan tingkatmu.
        </p>
      </div>
      <form
        className="soft-card p-6 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div>
          <label className="text-sm font-medium">Nama panggilan (opsional)</label>
          <input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            maxLength={60}
            placeholder="mis. Rara"
            className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Jenjang</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {JENJANG.map((j) => (
              <button
                key={j.code}
                type="button"
                onClick={() => {
                  setJenjang(j.code);
                  setKelas(j.kelasOptions[0]);
                }}
                className={`py-2 rounded-lg border text-sm transition ${
                  jenjang === j.code
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-secondary"
                }`}
              >
                {j.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Kelas</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {opts.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKelas(k)}
                className={`px-3 py-1.5 rounded-lg border text-sm ${
                  kelas === k ? "bg-accent text-accent-foreground border-accent" : "border-border hover:bg-secondary"
                }`}
              >
                Kelas {k}
              </button>
            ))}
          </div>
        </div>
        <button
          disabled={mutation.isPending}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-95 disabled:opacity-50"
        >
          {mutation.isPending ? "Menyimpan…" : "Mulai belajar"}
        </button>
      </form>
    </div>
  );
}

function Dashboard({ config }: { config: { jenjang: string; kelas: number; nama: string | null } }) {
  const navigate = useNavigate();
  const features = [
    { to: "/chat", title: "Diskusi Sains", desc: "Bahas topik & uji coba bersama AI pembimbing.", icon: FlaskConical, color: "bg-secondary" },
    { to: "/essay", title: "Soal Esai Hari Ini", desc: "Jawab 1 soal ringan maks 2 paragraf.", icon: BookOpen, color: "bg-accent" },
    { to: "/analyze", title: "Analisa Tugas", desc: "Foto lembar tugas, dapatkan penilaian AI.", icon: ScanLine, color: "bg-secondary" },
    { to: "/progress", title: "Laporan Progres", desc: "Lihat aktivitas & rata-rata nilaimu.", icon: LineChart, color: "bg-accent" },
  ] as const;

  return (
    <div className="space-y-6">
      <section className="soft-card p-6 sm:p-8">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Halo{config.nama ? `, ${config.nama}` : ""}</p>
        <h1 className="text-2xl sm:text-3xl mt-1">Siap belajar hari ini?</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Jenjang <span className="text-foreground font-medium">{config.jenjang}</span> · Kelas{" "}
          <span className="text-foreground font-medium">{config.kelas}</span>
        </p>
      </section>

      <div className="grid sm:grid-cols-2 gap-4">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.to}
              onClick={() => navigate({ to: f.to })}
              className="soft-card p-5 text-left hover:translate-y-[-2px] transition-transform"
            >
              <div className={`h-10 w-10 rounded-xl ${f.color} grid place-items-center mb-3`}>
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="text-center text-xs text-muted-foreground">
        <Link to="/" className="underline">Ganti jenjang</Link> · Data tersimpan aman di akunmu
      </div>
    </div>
  );
}
