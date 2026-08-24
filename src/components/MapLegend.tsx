export function MapLegend() {
  const levels = [
    { color: "#22c55e", label: "Normal (<1500 ppb)" },
    { color: "#eab308", label: "Elevated (1500–1800)" },
    { color: "#f97316", label: "High (1800–2200)" },
    { color: "#ef4444", label: "Extreme (>2200)" },
  ];

  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 space-y-1.5">
      <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">CH₄ Concentration</p>
      {levels.map((l) => (
        <div key={l.label} className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
          <span className="text-[10px] text-muted-foreground">{l.label}</span>
        </div>
      ))}
    </div>
  );
}
