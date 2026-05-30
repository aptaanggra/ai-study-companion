import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

export function ImagePicker({
  value,
  onChange,
  maxBytes = 4_500_000,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  maxBytes?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handle(file: File) {
    setErr(null);
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      setErr("Format harus PNG/JPG/WEBP");
      return;
    }
    if (file.size > maxBytes) {
      setErr(`Ukuran maksimum ${Math.round(maxBytes / 1_000_000)}MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  if (value) {
    return (
      <div className="relative inline-block">
        <img src={value} alt="lampiran" className="max-h-40 rounded-lg border border-border" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-1 shadow"
          aria-label="hapus gambar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-dashed border-border bg-muted/40 hover:bg-muted text-muted-foreground"
      >
        <ImagePlus className="h-4 w-4" /> Tambah gambar
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
          e.target.value = "";
        }}
      />
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}
