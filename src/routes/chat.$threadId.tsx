import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ImagePicker } from "@/components/ImagePicker";
import { Markdown } from "@/components/Markdown";
import { getOrCreateUserId } from "@/lib/user-id";
import { getThread, sendMessage } from "@/lib/chat.functions";
import { ArrowLeft, Send } from "lucide-react";

export const Route = createFileRoute("/chat/$threadId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Thread Diskusi · EduMandiri" }] }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => setUserId(getOrCreateUserId()), []);

  const fetchThread = useServerFn(getThread);
  const send = useServerFn(sendMessage);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["thread", threadId, userId],
    queryFn: () => fetchThread({ data: { userId: userId!, threadId } }),
    enabled: !!userId,
  });

  const [msg, setMsg] = useState("");
  const [img, setImg] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [data?.messages.length]);

  const mutation = useMutation({
    mutationFn: () => send({ data: { userId: userId!, threadId, message: msg, imageDataUrl: img ?? undefined } }),
    onSuccess: () => {
      setMsg(""); setImg(null);
      qc.invalidateQueries({ queryKey: ["thread", threadId] });
    },
  });

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <Link to="/chat" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4" /> Semua thread
        </Link>
        {isLoading || !data ? (
          <p className="text-sm text-muted-foreground">Memuat…</p>
        ) : (
          <>
            <h1 className="text-2xl mb-4">{data.thread.title}</h1>
            <div className="space-y-4 mb-6">
              {data.messages.map((m) => (
                <div key={m.id}>
                  {m.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5">
                        {m.imageDataUrl && <img src={m.imageDataUrl} alt="" className="mb-2 rounded-lg max-h-48" />}
                        <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="px-1">
                      <p className="text-xs text-muted-foreground mb-1">AI Pembimbing</p>
                      <Markdown>{m.content}</Markdown>
                    </div>
                  )}
                </div>
              ))}
              {mutation.isPending && (
                <p className="text-sm text-muted-foreground animate-pulse">AI sedang berpikir…</p>
              )}
              <div ref={endRef} />
            </div>

            <form
              className="soft-card p-3 sticky bottom-4"
              onSubmit={(e) => { e.preventDefault(); if (msg.trim() && !mutation.isPending) mutation.mutate(); }}
            >
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={2}
                maxLength={4000}
                placeholder="Lanjutkan diskusi atau ajukan pertanyaan…"
                className="w-full px-2 py-1 bg-transparent text-sm focus:outline-none resize-none"
              />
              <div className="flex items-center justify-between gap-2 mt-2">
                <ImagePicker value={img} onChange={setImg} />
                <button
                  disabled={!msg.trim() || mutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> Kirim
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </AppShell>
  );
}
