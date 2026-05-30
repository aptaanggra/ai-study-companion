import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Markdown } from "@/components/Markdown";
import { getOrCreateUserId } from "@/lib/user-id";
import { getTodayEssay, listEssays, submitEssay } from "@/lib/essay.functions";

export const Route = createFileRoute("/essay")({
  head: () => ({ meta: [{ title: "Soal Esai · EduMandiri" }] }),
  component: EssayPage,
});

function EssayPage() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => setUserId(getOrCreateUserId()), []);
  const today = useServerFn(getTodayEssay);
  const list = useServerFn(listEssays);
  const submit = useServerFn(submitEssay);
  const qc = useQueryClient();

  const { data: essay } = useQuery({
    queryKey: ["essay-today", userId],
    queryFn: () => today({ data: { userId: userId! } }),
    enabled: !!userId,
  });
  const { data: history } = useQuery({
    queryKey: ["essay-list", userId],
    queryFn: () => list({ data: { userId: userId! } }),
    enabled: !!userId,
  });

  const [answer, setAnswer] = useState("");
  useEffect(() => { if (essay?.answer) setAnswer(essay.answer); }, [essay?.id]);

  const mutation = useMutation({
    mutationFn: () => submit({ data: { userId: userId!, essayId: essay!.id, answer } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["essay-today", userId] });
      qc.invalidateQueries({ queryKey: ["essay-list", userId] });
    },
  });

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl">Soal Esai Hari Ini</h1>
          <p className="text-sm text-muted-foreground mt-1">Jawab dalam maksimal 2 paragraf.</p>
        </div>

        {essay && (
          <div className="soft-card p-6 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{essay.date}</p>
              <p className="mt-2 text-lg font-display">{essay.prompt}</p>
            </div>
            {essay.feedback ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-display text-primary">{essay.score}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs uppercase text-muted-foreground mb-2">Umpan balik AI</p>
                  <Markdown>{essay.feedback}</Markdown>
                </div>
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground">Lihat jawabanmu</summary>
                  <p className="mt-2 whitespace-pre-wrap">{essay.answer}</p>
                </details>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); if (answer.trim().length >= 10) mutation.mutate(); }}>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={6}
                  maxLength={3000}
                  placeholder="Tulis jawabanmu di sini (maks 2 paragraf)…"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">{answer.length} / 3000</span>
                  <button
                    disabled={answer.trim().length < 10 || mutation.isPending}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                  >
                    {mutation.isPending ? "Menilai…" : "Kirim jawaban"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {history && history.length > 0 && (
          <div>
            <h2 className="text-lg mb-3">Riwayat</h2>
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="soft-card p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{h.date}</p>
                    <p className="text-sm line-clamp-1">{h.prompt}</p>
                  </div>
                  {h.score !== null && (
                    <span className="text-sm font-display text-primary shrink-0">{h.score}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}
