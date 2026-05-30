import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getOrCreateUserId } from "@/lib/user-id";
import { getProgress } from "@/lib/progress.functions";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [{ title: "Progres · EduMandiri" }] }),
  component: ProgressPage,
});

function ProgressPage() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => setUserId(getOrCreateUserId()), []);
  const fetchFn = useServerFn(getProgress);
  const { data } = useQuery({
    queryKey: ["progress", userId],
    queryFn: () => fetchFn({ data: { userId: userId! } }),
    enabled: !!userId,
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl">Laporan Progres</h1>
          <p className="text-sm text-muted-foreground mt-1">Ringkasan aktivitas & nilai rata-ratamu.</p>
        </div>

        {!data ? (
          <p className="text-sm text-muted-foreground">Memuat…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Thread Diskusi" value={data.totals.threads} />
              <Stat label="Pesan" value={data.totals.messages} />
              <Stat label="Esai Dijawab" value={data.totals.essays} />
              <Stat label="Tugas Dianalisa" value={data.totals.analyses} />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Stat label="Rata-rata Skor Esai" value={data.averages.essay ?? "—"} accent />
              <Stat label="Rata-rata Skor Tugas" value={data.averages.analysis ?? "—"} accent />
            </div>

            <div className="soft-card p-5">
              <h2 className="text-lg mb-3">Aktivitas 14 hari terakhir</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.activity}>
                    <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="threads" stackId="a" fill="var(--primary)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="essays" stackId="a" fill="var(--accent)" />
                    <Bar dataKey="analyses" stackId="a" fill="var(--secondary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm" style={{background:"var(--primary)"}}/>Thread</span>
                <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm" style={{background:"var(--accent)"}}/>Esai</span>
                <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm" style={{background:"var(--secondary)"}}/>Analisa</span>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="soft-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
