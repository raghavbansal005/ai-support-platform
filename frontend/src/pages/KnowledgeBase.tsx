import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { api } from "@/lib/api";

interface KBDocument {
  id: string;
  filename: string;
  fileType: string;
  sizeBytes: number;
  status: "PENDING" | "PROCESSING" | "INDEXED" | "FAILED";
  errorMessage: string | null;
  uploadedAt: string;
  _count: { chunks: number };
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  PROCESSING: "bg-amber-50 text-amber-700",
  INDEXED: "bg-green-50 text-green-700",
  FAILED: "bg-red-50 text-red-700",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KnowledgeBasePage() {
  const ready = useAuthGuard();
  const [docs, setDocs] = useState<KBDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await api.get<{ documents: KBDocument[] }>("/api/knowledge-base");
    setDocs(res.documents);
  }, []);

  useEffect(() => {
    if (!ready) return;
    load();
    const interval = setInterval(load, 4000); // poll while docs are indexing
    return () => clearInterval(interval);
  }, [ready, load]);

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        await api.post("/api/knowledge-base/upload", form);
      }
      await load();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this document and its indexed chunks?")) return;
    await api.delete(`/api/knowledge-base/${id}`);
    load();
  }

  async function onReindex(id: string) {
    await api.post(`/api/knowledge-base/${id}/reindex`);
    load();
  }

  if (!ready) return null;

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold mb-1">Knowledge Base</h1>
      <p className="text-ink-soft mb-6">
        Upload the documents your assistant should learn from. Files are parsed, chunked, embedded, and stored in the
        vector database automatically.
      </p>

      <div
        className="card border-2 border-dashed border-black/10 flex flex-col items-center justify-center py-10 mb-6 cursor-pointer hover:border-accent transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onUpload(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.markdown"
          className="hidden"
          onChange={(e) => onUpload(e.target.files)}
        />
        <div className="text-3xl mb-2">▤</div>
        <p className="text-sm font-medium">Drop files here or click to browse</p>
        <p className="text-xs text-ink-faint mt-1">PDF, DOCX, TXT, or Markdown</p>
        {uploading && <p className="text-xs text-accent mt-3">Uploading...</p>}
      </div>

      {error && <div className="mb-4 text-sm text-signal-urgent bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.02] text-ink-faint text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Document</th>
              <th className="text-left px-4 py-3 font-medium">Size</th>
              <th className="text-left px-4 py-3 font-medium">Chunks</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Uploaded</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-t border-black/[0.04]">
                <td className="px-4 py-3 font-medium">{d.filename}</td>
                <td className="px-4 py-3 text-ink-soft">{formatSize(d.sizeBytes)}</td>
                <td className="px-4 py-3 font-mono text-ink-soft">{d._count.chunks}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[d.status]}`}>{d.status}</span>
                  {d.errorMessage && <div className="text-xs text-signal-urgent mt-1">{d.errorMessage}</div>}
                </td>
                <td className="px-4 py-3 text-ink-soft">{new Date(d.uploadedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button onClick={() => onReindex(d.id)} className="text-accent hover:underline text-xs font-medium">
                    Re-index
                  </button>
                  <button onClick={() => onDelete(d.id)} className="text-signal-urgent hover:underline text-xs font-medium">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-faint">
                  No documents yet. Upload your FAQ, policies, or product docs to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
