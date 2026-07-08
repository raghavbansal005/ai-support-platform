export default function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "urgent" | "high" | "medium" | "low";
}) {
  const accentClass = accent ? `text-signal-${accent}` : "text-ink";
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-ink-faint mb-2">{label}</div>
      <div className={`font-mono text-3xl font-bold ${accentClass}`}>{value}</div>
    </div>
  );
}
