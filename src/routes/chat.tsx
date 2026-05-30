import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ImagePicker } from "@/components/ImagePicker";
import { getOrCreateUserId } from "@/lib/user-id";
import { listThreads, startThread, deleteThread } from "@/lib/chat.functions";
import { FlaskConical, Trash2 } from "lucide-react";

export const Route = createFileRoute("/chat")({
  ssr: false,
  head: () => ({ meta: [{ title: "Diskusi Sains · EduMandiri" }] }),
  component: ChatIndex,
});

function ChatIndex() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => setUserId(getOrCreateUserId()), []);
  const list = useServerFn(listThreads);
  const start = useServerFn(startThread);
  const del = useServerFn(deleteThread);
  const navigate = useNavigate();

  const { data: threads, refetch } = useQuery({
    queryKey: ["threads", userId],
    queryFn: () => list({ data: { userId: userId! } }),
    enabled: !!userId,
  });

  const [topic, setTopic] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: () => start({ data: { userId: userId!, topic, imageDataUrl: image ?? undefined } }),
    onSuccess: (res) => navigate({ to: "/chat/$threadId", params: { threadId: res.threadId } }),
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl">Ruang Diskusi Sains</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Eksplorasi topik bersama AI pembimbing — dengan analisa, eksperimen, dan pembuktian.
          </p>
        </div>

        <form
          className="soft-card p-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!userId || !topic.trim()) return;
            create.mutate();
          }}
        >
          <label className="text-sm font-medium">Topik yang ingin kamu eksplorasi</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="mis. Mengapa langit berwarna biru? Bagaimana cara kerja energi panas matahari?"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <ImagePicker value={image} onChange={setImage} />
          <button
            disabled={!topic.trim() || create.isPending}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {create.isPending ? "Membuat thread…" : "Mulai eksplorasi"}
          </button>
        </form>

        <div>
          <h2 className="text-lg mb-3">Thread terakhir</h2>
          {!threads || threads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada thread. Mulai topik pertamamu di atas.</p>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-3">
              {threads.map((t) => (
                <li key={t.id} className="soft-card p-4 flex items-start justify-between gap-3">
                  <Link to="/chat/$threadId" params={{ threadId: t.id }} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <FlaskConical className="h-3.5 w-3.5" /> {t.subject ?? "Sains"}
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(t.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </p>
                  </Link>
                  <button
                    onClick={async () => {
                      if (!userId) return;
                      if (!confirm("Hapus thread ini?")) return;
                      await del({ data: { userId, threadId: t.id } });
                      refetch();
                    }}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="hapus"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
