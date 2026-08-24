import { motion } from "framer-motion";
import {
  Satellite, Filter, Zap, Wind, Calculator,
  Building2, FileText, BarChart3, CheckCircle2, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    num: "01", icon: Satellite, title: "Satellite Acquisition",
    desc: "Sentinel-5P TROPOMI captures global XCH₄ column measurements at 7×7 km resolution with daily revisit.",
    color: "text-primary", bg: "bg-primary/10", border: "border-primary/25", line: "bg-primary/30",
  },
  {
    num: "02", icon: Filter, title: "Preprocessing & Filtering",
    desc: "Cloud masking (QA > 0.5), spatial aggregation, temporal compositing over 7-day rolling windows.",
    color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/25", line: "bg-blue-500/30",
  },
  {
    num: "03", icon: Zap, title: "Anomaly Detection",
    desc: "Per-pixel Z-score analysis vs. 90-day regional baseline. Events > 2σ (~200 ppb) flagged as true anomalies.",
    color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/25", line: "bg-orange-500/30",
  },
  {
    num: "04", icon: Wind, title: "Plume Detection & Modeling",
    desc: "ERA5 wind integration + Gaussian dispersion model traces plume shape, drift direction, width, and length.",
    color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/25", line: "bg-cyan-500/30",
  },
  {
    num: "05", icon: Calculator, title: "Emission Rate Estimation",
    desc: "IME (Integrated Mass Enhancement): ṁ = IME × U_eff / L_eff estimates flux in kg/hr from column data.",
    color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/25", line: "bg-purple-500/30",
  },
  {
    num: "06", icon: Building2, title: "Facility Attribution",
    desc: "Hotspot centroids cross-referenced against GFEI, ONGC, and IEA infrastructure databases using proximity + wind alignment.",
    color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/25", line: "bg-yellow-500/30",
  },
  {
    num: "07", icon: FileText, title: "Compliance Report",
    desc: "Super-emitter events trigger automated compliance dossiers for regulators, UNEP IMEO, CPCB, and operators.",
    color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", line: "bg-red-500/30",
  },
  {
    num: "08", icon: BarChart3, title: "Dashboard Visualization",
    desc: "All findings rendered to interactive map, analytics charts, alert system, and downloadable reports.",
    color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", line: "bg-emerald-500/30",
  },
];

interface PipelineVizProps {
  /** "vertical" = full labelled pipeline, "horizontal" = compact pills */
  mode?: "vertical" | "horizontal";
  className?: string;
}

export function PipelineViz({ mode = "vertical", className }: PipelineVizProps) {
  if (mode === "horizontal") {
    return (
      <div className={cn("flex items-center gap-1 flex-wrap", className)}>
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-1">
            <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold", s.bg, s.border, s.color)}>
              <s.icon className="h-2.5 w-2.5" />
              {s.title}
            </div>
            {i < steps.length - 1 && <span className="text-muted-foreground/40 text-xs">›</span>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-0", className)}>
      {steps.map((s, i) => (
        <motion.div
          key={s.num}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex gap-4"
        >
          {/* Left: number + line */}
          <div className="flex flex-col items-center shrink-0">
            <div className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0",
              s.bg, s.border
            )}>
              <s.icon className={cn("h-4 w-4", s.color)} />
            </div>
            {i < steps.length - 1 && (
              <div className={cn("w-0.5 flex-1 my-1 min-h-[20px] rounded-full", s.line)} />
            )}
          </div>

          {/* Right: content */}
          <div className={cn("pb-5", i === steps.length - 1 && "pb-0")}>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-[10px] font-black font-mono opacity-60", s.color)}>STEP {s.num}</span>
              <CheckCircle2 className={cn("h-3 w-3 opacity-60", s.color)} />
            </div>
            <h3 className={cn("text-sm font-semibold mb-1", s.color)}>{s.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Compact 4-step summary for dashboard
export const pipelineSummarySteps = [
  { label: "Satellite Acquisition", icon: Satellite, color: "text-primary", bg: "bg-primary/10" },
  { label: "Anomaly Detection", icon: Zap, color: "text-orange-400", bg: "bg-orange-500/10" },
  { label: "Plume Modeling", icon: Wind, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { label: "Compliance Report", icon: FileText, color: "text-purple-400", bg: "bg-purple-500/10" },
];

export function PipelineSummary() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {pipelineSummarySteps.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/50 bg-card/60 text-center"
        >
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", s.bg)}>
            <s.icon className={cn("h-4 w-4", s.color)} />
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground leading-tight">{s.label}</span>
          {i < pipelineSummarySteps.length - 1 && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground/30 hidden sm:block">›</div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

export { Clock };
