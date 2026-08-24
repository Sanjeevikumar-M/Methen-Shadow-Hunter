import { motion } from "framer-motion";
import {
  Satellite, Radio, Globe, Database, CheckCircle2,
  Clock, Zap, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PipelineViz } from "@/components/PipelineViz";
import { cn } from "@/lib/utils";
import { indiaSatellitePasses } from "@/lib/mock-data";
import { ModelStatusCard } from "@/components/ModelStatusCard";
import { DataProvenanceCard } from "@/components/DataProvenanceCard";

const satellites = [
  {
    name: "Sentinel-5P (TROPOMI)",
    agency: "ESA / Copernicus",
    icon: Satellite,
    color: "text-primary", bg: "bg-primary/10", border: "border-primary/20",
    specs: [
      { k: "Swath Width", v: "2600 km" },
      { k: "Spatial Resolution", v: "7 × 7 km" },
      { k: "Revisit Time", v: "Daily (global)" },
      { k: "CH₄ Measurement", v: "SWIR band (2305 nm)" },
      { k: "Sensitivity", v: "~6 ppb (1σ)" },
      { k: "Start", v: "October 2017" },
    ],
    desc: "Primary workhorse. ESA Sentinel-5P TROPOMI provides daily global XCH₄ column measurements. Open data via Google Earth Engine — most comprehensive coverage.",
    status: "operational",
  },
  {
    name: "MethaneSAT",
    agency: "EDF / NZ Space Agency",
    icon: Radio,
    color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20",
    specs: [
      { k: "Swath Width", v: "200 km (regional)" },
      { k: "Spatial Resolution", v: "~1 km" },
      { k: "Revisit Time", v: "5–7 days (target zones)" },
      { k: "CH₄ Measurement", v: "SWIR absorption" },
      { k: "Sensitivity", v: "~2 ppb (1σ)" },
      { k: "Start", v: "March 2024" },
    ],
    desc: "EDF's purpose-built methane satellite. Better resolution than Sentinel-5P for targeted basin monitoring. 1 km resolution enables attribution to individual facilities.",
    status: "operational",
  },
  {
    name: "CarbonMapper",
    agency: "Planet Labs / CMA",
    icon: Globe,
    color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20",
    specs: [
      { k: "Swath Width", v: "16 km (targeted)" },
      { k: "Spatial Resolution", v: "30 m" },
      { k: "Revisit Time", v: "On-demand tasking" },
      { k: "CH₄ Measurement", v: "AVIRIS-NG derived" },
      { k: "Sensitivity", v: "Plume-level" },
      { k: "Start", v: "Ongoing" },
    ],
    desc: "High-resolution targeted imaging. 30 m resolution resolves individual plumes and enables pinpoint facility attribution. Used to confirm super-emitter events.",
    status: "operational",
  },
  {
    name: "GHGSat",
    agency: "GHGSat Inc.",
    icon: Database,
    color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20",
    specs: [
      { k: "Swath Width", v: "12 km (targeted)" },
      { k: "Spatial Resolution", v: "25 m" },
      { k: "Revisit Time", v: "Commercial tasking" },
      { k: "CH₄ Measurement", v: "VNIR spectrometer" },
      { k: "Sensitivity", v: "< 100 kg/hr" },
      { k: "Start", v: "2016 (Iris)" },
    ],
    desc: "Commercial high-resolution satellite constellation. Detects facility-level methane down to <100 kg/hr. Used for precise attribution and regulatory compliance.",
    status: "operational",
  },
];

const globalCoverageStats = [
  { label: "Daily Global Coverage", value: "100%", color: "text-primary" },
  { label: "India Coverage Today", value: "94%", color: "text-blue-400" },
  { label: "Satellite Passes Today", value: "31", color: "text-orange-400" },
  { label: "Data Latency", value: "< 4 hrs", color: "text-cyan-400" },
  { label: "Data Volume", value: "13 TB/day", color: "text-purple-400" },
  { label: "Anomalies Detected", value: "18", color: "text-red-400" },
];

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn("text-[10px] border", status === "operational"
      ? "bg-primary/10 text-primary border-primary/25"
      : "bg-yellow-500/10 text-yellow-400 border-yellow-500/25"
    )}>
      {status === "operational" ? <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> : <Clock className="h-2.5 w-2.5 mr-1" />}
      {status}
    </Badge>
  );
}

function formatPassTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
}

export default function SatelliteData() {
  return (
    <div className="page-container">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="gradient-hero rounded-2xl p-6 md:p-8 border border-primary/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md gradient-green flex items-center justify-center">
              <Satellite className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-xs font-semibold text-primary tracking-wider uppercase">Satellite Pipeline</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2">
            Satellite Data <span className="gradient-text">Processing Pipeline</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            End-to-end pipeline from raw satellite telemetry to actionable methane intelligence. 
            Four satellite sources feed into 8 automated processing stages producing daily hotspot detections,
            emission estimates, and compliance reports.
          </p>
        </div>
      </motion.div>

      {/* Coverage Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2"
      >
        {globalCoverageStats.map((s) => (
          <div key={s.label} className="glow-card rounded-xl border border-border p-3 text-center">
            <p className={cn("text-xl font-bold font-mono", s.color)}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Pipeline + Data Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* Pipeline */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glow-border h-full">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                8-Step Processing Pipeline
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">Automated daily execution on Google Earth Engine</p>
            </CardHeader>
            <CardContent className="pt-4">
              <PipelineViz mode="vertical" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Data sources + Satellite pass */}
        <div className="space-y-4">
          {/* Satellite data sources */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {satellites.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.06 }}
              >
                <Card className={cn("glow-card border", s.border, s.bg, "h-full")}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", s.bg, "border", s.border)}>
                          <s.icon className={cn("h-4 w-4", s.color)} />
                        </div>
                        <div>
                          <CardTitle className={cn("text-xs font-bold", s.color)}>{s.name}</CardTitle>
                          <p className="text-[10px] text-muted-foreground">{s.agency}</p>
                        </div>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{s.desc}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {s.specs.map(sp => (
                        <div key={sp.k} className="bg-background/40 rounded-md px-2 py-1">
                          <p className="text-[9px] text-muted-foreground/70">{sp.k}</p>
                          <p className={cn("text-[11px] font-mono font-semibold", s.color)}>{sp.v}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Today's Pass Schedule */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="glow-border">
              <CardHeader className="pb-2 border-b border-border/50">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Today's India Satellite Pass Schedule (IST)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {indiaSatellitePasses.map((pass, i) => (
                  <div
                    key={pass.orbitId}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 border-b border-border/40 last:border-0 text-xs",
                      pass.status === "in-progress" && "bg-blue-500/5",
                      i % 2 === 0 && pass.status !== "in-progress" && "bg-secondary/5"
                    )}
                  >
                    <div className="shrink-0">
                      {pass.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                      {pass.status === "in-progress" && <div className="h-3.5 w-3.5 rounded-full bg-blue-400 animate-pulse" />}
                      {pass.status === "upcoming" && <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-foreground">{pass.satellite}</span>
                      <span className="text-muted-foreground ml-1.5 font-mono text-[10px]">{pass.orbitId}</span>
                      {pass.status === "in-progress" && (
                        <span className="ml-1.5 text-[9px] bg-blue-500/15 text-blue-400 px-1 rounded animate-pulse">LIVE</span>
                      )}
                    </div>
                    <div className="text-muted-foreground hidden sm:block flex-1 truncate">{pass.coverageRegion}</div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-semibold text-foreground">{formatPassTime(pass.scheduledTime)}</p>
                      <p className="text-[10px] text-muted-foreground">{pass.resolution}</p>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0",
                      pass.status === "completed" ? "border-primary/25 text-primary" :
                        pass.status === "in-progress" ? "border-blue-500/25 text-blue-400" :
                          "border-border/50 text-muted-foreground"
                    )}>
                      {pass.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Model Status & Provenance */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModelStatusCard />
            <DataProvenanceCard />
          </motion.div>

          {/* Data quality info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="glow-border bg-primary/3 border-primary/15">
              <CardContent className="p-4 flex gap-3">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-primary mb-1">Data Quality & Preprocessing</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    All Sentinel-5P data is quality-filtered with QA flag &gt; 0.5. Cloud fraction &lt; 30% threshold enforced.
                    Spatial averaging uses 0.05° × 0.05° grid. Temporal compositing uses 7-day rolling maximum to reduce gaps.
                    Radiometric calibration artifacts corrected using reference sector method (Pacific Ocean baseline).
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {["QA > 0.5", "Cloud < 30%", "0.05° grid", "7-day composite", "Pacific baseline"].map(t => (
                      <Badge key={t} variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/15">{t}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
