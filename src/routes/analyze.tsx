import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ImagePicker } from "@/components/ImagePicker";
import { Markdown } from "@/components/Markdown";
import { getOrCreateUserId } from "@/lib/user-id";
import { analyzeWorksheet, getAnalysis, listAnalyses } from "@/lib/analyze.functions";

export const Route = createFileRoute("/analyze")({
  ssr: false,
  head: () => ({ meta: [{ title: "Analisa Tugas · EduMandiri" }] }),
  component: AnalyzePage,
});

function AnalyzePage() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => setUserId(getOrCreateUserId()), []);
  const analyze = useServerFn(analyzeWorksheet);
  const list = useServerFn(listAnalyses);
  const getOne = useServerFn(getAnalysis);
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: history } = useQuery({
    queryKey: ["analyses", userId],
    queryFn: () => list({ data: { userId: userId! } }),
    enabled: !!userId,
  });
  const { data: detail } = useQuery({
    queryKey: ["analysis", selectedId],
    queryFn: () => getOne({ data: { userId: userId!, id: selectedId! } }),
    enabled: !!userId && !!selectedId,
  });

  const mutation = useMutation({
    mutationFn: () => analyze({ data: { userId: userId!, title, imageDataUrl: image! } }),
    onSuccess: (res) => {
      setTitle(""); setImage(null);
      setSelectedId(res.id);
      qc.invalidateQueries({ queryKey: ["analyses", userId] });
    },
  });

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl">Analisa Tugas Sekolah</h1>
          <p className="text-sm text-muted-foreground mt-1">Foto lembar tugas, AI akan menilai dan memberi koreksi.</p>
        </div>

        <form
          className="soft-card p-5 space-y-3"
          onSubmit={(e) => { e.preventDefault(); if (title.trim() && image) mutation.mutate(); }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Judul tugas (mis. PR Matematika Bab 3)"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <ImagePicker value={image} onChange={setImage} />
          <button
            disabled={!title.trim() || !image || mutation.isPending}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {mutation.isPending ? "Menganalisa…" : "Analisa sekarang"}
          </button>
        </form>

        {detail && (
          <div className="soft-card p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-lg">{detail.title}</h2>
              {detail.score !== null && (
                <span className="text-2xl font-display text-primary">{detail.score}</span>
              )}
            </div>
            <img src={detail.imageDataUrl} alt={detail.title} className="max-h-64 rounded-lg border border-border mb-4" />
            <Markdown>{detail.result}</Markdown>
          </div>
        )}

        {history && history.length > 0 && (
          <div>
            <h2 className="text-lg mb-3">Riwayat</h2>
            <ul className="grid sm:grid-cols-2 gap-2">
              {history.map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => setSelectedId(h.id)}
                    className={`soft-card w-full text-left p-3 ${selectedId === h.id ? "ring-2 ring-ring" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm line-clamp-1">{h.title}</p>
                      {h.score !== null && <span className="text-sm font-display text-primary">{h.score}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(h.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}
