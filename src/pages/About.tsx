import { motion } from "framer-motion";
import {
  Satellite, Brain, Shield, Globe, Wind, BarChart3,
  TrendingUp, Zap, FileText, Activity, CheckCircle2, ArrowRight,
  Layers, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] },
});

const features = [
  {
    icon: Satellite,
    title: "Sentinel-5P TROPOMI",
    description: "ESA's Sentinel-5P satellite carries the TROPOMI instrument measuring methane column concentrations globally at 7×7 km resolution with daily revisit.",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  {
    icon: Brain,
    title: "AI Anomaly Detection",
    description: "Statistical ML model compares CH₄ readings against regional baselines. Events exceeding the baseline by >2σ (~200 ppb) are flagged as true anomalies, reducing false positives from seasonal variability.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    icon: Wind,
    title: "Gaussian Plume Model",
    description: "ERA5 reanalysis wind data is integrated with the Gaussian dispersion equation to simulate plume shape, drift direction, and particle trajectory from the source facility.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  {
    icon: BarChart3,
    title: "Emission Rate Estimation",
    description: "The Integrated Mass Enhancement (IME) method quantifies emission rates in kg/hr using plume area, background CH₄ columns, and ERA5 wind speed data.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  {
    icon: Shield,
    title: "Compliance Automation",
    description: "Detected super-emitter events automatically generate compliance dossiers for regulatory bodies, UNEP IMEO, and national environmental agencies with full audit traceability.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
  {
    icon: TrendingUp,
    title: "Risk Forecasting",
    description: "AI-powered risk scoring combines temporal emission patterns, facility metadata, weather forecasts, and infrastructure age to predict future leak probability.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  {
    icon: Layers,
    title: "Multi-Scale Fusion",
    description: "When Sentinel-5P flags a region, CarbonMapper or MethaneSAT high-resolution imagery is triggered for precise source pinpointing down to equipment-level attribution.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    icon: AlertTriangle,
    title: "Emergency Alert System",
    description: "Real-time alert pipeline routes critical super-emitter detections directly to regulators, operations teams, and media within minutes of detection confirmation.",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
];

const methodology = [
  { step: 1, title: "Data Acquisition", detail: "Sentinel-5P TROPOMI methane column (XCH₄) data retrieved via Google Earth Engine API at 7×7 km resolution." },
  { step: 2, title: "Preprocessing", detail: "Cloud filtering, quality flag masking (QA > 0.5), and spatial/temporal aggregation to 7-day composites." },
  { step: 3, title: "Regional Baseline", detail: "Per-pixel regional median computed over 90-day rolling window to establish local background XCH₄ values." },
  { step: 4, title: "Anomaly Flagging", detail: "Statistical Z-score analysis; hotspots exceeding baseline by >2σ (~200 ppb) are flagged as CH₄ anomalies." },
  { step: 5, title: "Plume Characterization", detail: "Gaussian plume model applied with ERA5 10m wind vectors to compute plume length, width, area, and drift direction." },
  { step: 6, title: "Facility Attribution", detail: "Hotspot centroids cross-referenced against GFEI, EPA GHGRP, and IEA oil/gas facility databases using geospatial proximity matching." },
  { step: 7, title: "Emission Quantification", detail: "IME (Integrated Mass Enhancement) method: ṁ = IME × U_eff / L_eff converts column enhancement to surface flux (kg/hr)." },
  { step: 8, title: "Risk Scoring", detail: "Composite risk index from emission magnitude, recurrence frequency, facility type, proximity to population, and weather conditions." },
];

const dataSources = [
  { name: "Sentinel-5P TROPOMI", org: "ESA / Copernicus", type: "Satellite", desc: "Global XCH₄ at 7×7 km, daily revisit" },
  { name: "ERA5 Reanalysis", org: "ECMWF / Copernicus", type: "Meteorology", desc: "Hourly 10m wind U/V components" },
  { name: "NOAA GDAS", org: "NOAA / NCEP", type: "Meteorology", desc: "Global atmospheric analysis fields" },
  { name: "CarbonMapper", org: "Carbon Mapper", type: "High-Res Sat", desc: "1–10 m plume imagery on demand" },
  { name: "MethaneSAT", org: "EDF", type: "High-Res Sat", desc: "Sub-km CH₄ column mapping" },
  { name: "GFEI Database", org: "IEA / CCAC", type: "Facility", desc: "Global fossil-fuel infrastructure index" },
  { name: "Google Earth Engine", org: "Google", type: "Processing", desc: "Petabyte-scale satellite data pipeline" },
];

const stats = [
  { value: "13", unit: "TB/day", label: "Satellite data processed" },
  { value: "7×7", unit: "km", label: "Sentinel-5P resolution" },
  { value: "<4", unit: "hrs", label: "Detection latency" },
  { value: "95%+", unit: "accuracy", label: "Super-emitter detection" },
  { value: "200+", unit: "ppb Δ", label: "Anomaly threshold" },
  { value: "24/7", unit: "global", label: "Continuous monitoring" },
];

export default function About() {
  return (
    <div className="page-container max-w-5xl">
      {/* ===== Hero ===== */}
      <motion.div {...FADE_UP(0)} className="gradient-hero rounded-2xl p-6 md:p-8 border border-primary/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-primary/4 blur-3xl pointer-events-none" />
        <div className="relative max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md gradient-green flex items-center justify-center">
              <Globe className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-xs font-semibold text-primary tracking-wider uppercase">About the Platform</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight mb-3">
            Methane{" "}
            <span className="gradient-text">Shadow Hunter</span>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A satellite-powered methane super-emitter detection platform processing Sentinel-5P TROPOMI
            data through Google Earth Engine. Combines anomaly detection, ERA5 wind integration,
            Gaussian plume modeling, and multi-scale satellite fusion to identify and attribute
            methane leaks to specific facilities — automatically, globally, continuously.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-4">
            {["Open Source", "Real-time Detection", "UNEP Aligned", "IPCC Compatible"].map(t => (
              <Badge key={t} variant="outline" className="text-[11px] bg-primary/5 text-primary border-primary/20 gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" />
                {t}
              </Badge>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ===== Key Statistics ===== */}
      <motion.div {...FADE_UP(0.05)}>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Platform Performance
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="glow-card rounded-xl p-3 text-center"
            >
              <p className="text-xl font-black font-mono text-primary">{s.value}</p>
              <p className="text-[10px] font-semibold text-muted-foreground">{s.unit}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-tight">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ===== Features Grid ===== */}
      <motion.div {...FADE_UP(0.1)}>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Core Capabilities
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
            >
              <Card className={cn("glow-card h-full border", f.border, "bg-transparent")}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", f.bg)}>
                      <f.icon className={cn("h-4.5 w-4.5", f.color)} />
                    </div>
                    <CardTitle className={cn("text-sm font-semibold", f.color)}>{f.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ===== Methodology ===== */}
      <motion.div {...FADE_UP(0.2)}>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Detection Methodology
        </h2>
        <Card className="glow-border bg-card/60">
          <CardContent className="p-4">
            <div className="space-y-0">
              {methodology.map((m, i) => (
                <motion.div
                  key={m.step}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.04 }}
                  className="flex gap-3 py-3 border-b border-border/40 last:border-0"
                >
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center">
                      <span className="text-[10px] font-bold font-mono text-primary">{m.step}</span>
                    </div>
                    {i < methodology.length - 1 && <div className="w-px flex-1 bg-primary/15 min-h-[8px]" />}
                  </div>
                  <div className="pb-1">
                    <p className="text-xs font-semibold text-foreground mb-0.5">{m.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{m.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== Data Sources Table ===== */}
      <motion.div {...FADE_UP(0.25)}>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Satellite className="h-4 w-4 text-primary" />
          Data Sources & Integrations
        </h2>
        <Card className="glow-border overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="p-3 text-left text-muted-foreground font-medium">Dataset</th>
                    <th className="p-3 text-left text-muted-foreground font-medium">Provider</th>
                    <th className="p-3 text-left text-muted-foreground font-medium">Type</th>
                    <th className="p-3 text-left text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {dataSources.map((ds, i) => (
                    <tr key={ds.name} className={cn("border-b border-border/40 hover:bg-secondary/20 transition-colors", i % 2 === 0 && "bg-secondary/5")}>
                      <td className="p-3 font-semibold text-foreground">{ds.name}</td>
                      <td className="p-3 text-muted-foreground">{ds.org}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] border-primary/20 bg-primary/5 text-primary">{ds.type}</Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{ds.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== CTA / Context ===== */}
      <motion.div {...FADE_UP(0.3)} className="rounded-xl border border-primary/15 bg-primary/5 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-primary mb-1">Built for Global Impact</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Methane Shadow Hunter addresses the critical need for continuous, automated, global methane monitoring.
            Methane is responsible for ~30% of current global warming — detecting and stopping super-emitter leaks
            is one of the fastest-acting climate interventions available.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-primary text-xs font-semibold shrink-0">
          <span>Explore the Platform</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </motion.div>

      <p className="text-[11px] text-muted-foreground/60 text-center pb-2">
        Methane Shadow Hunter © 2026 · Built for a hackathon · All data for demonstration purposes
      </p>
    </div>
  );
}
