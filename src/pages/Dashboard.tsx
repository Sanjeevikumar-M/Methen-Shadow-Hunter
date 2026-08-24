import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Flame, Wind, Satellite, Building2,
  TrendingUp, AlertTriangle, Globe, Zap, Activity, MapPin
} from "lucide-react";
import { ModelStatusCard } from "@/components/ModelStatusCard";
import { ModelEvaluationCard } from "@/components/ModelEvaluationCard";
import { ModelComparisonCard } from "@/components/ModelComparisonCard";
import { DataQualityCard } from "@/components/DataQualityCard";
import { DataProvenanceCard } from "@/components/DataProvenanceCard";
import { StatCard } from "@/components/StatCard";
import { MethaneMap } from "@/components/MethaneMap";
import { HotspotPanel } from "@/components/HotspotPanel";
import { GlobalIntelligence } from "@/components/GlobalIntelligence";
import { AlertSystem } from "@/components/AlertSystem";
import { fetchLiveIndiaStats, indiaStats } from "@/lib/api";
import { useHotspots } from "@/hooks/useHotspots";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: "easeOut" as const },
});

const systemBadges = [
  { label: "Sentinel-5P", color: "bg-primary/10 text-primary border-primary/20" },
  { label: "ERA5 Wind", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { label: "Gaussian Plume", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  { label: "Google Earth Engine", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { label: "CarbonMapper", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
];

export default function Dashboard() {
  const { hotspots, liveStats, loading } = useHotspots();
  const [selectedId, setSelectedId] = useState<string>();
  const [pipelineActive, setPipelineActive] = useState(true);
  const [clusterMode, setClusterMode] = useState(false);
  const [anomalyMode, setAnomalyMode] = useState(false);

  const criticalCount = hotspots.filter(h => h.riskLevel === "critical").length;
  const superEmitters = hotspots.filter(h => h.emissionRate > 400).length;

  return (
    <div className="page-container">
      <AlertSystem />

      {/* ===== Hero Section ===== */}
      <motion.div {...FADE_UP(0)} className="gradient-hero rounded-2xl p-6 md:p-8 border border-primary/10 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/4 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-blue-500/4 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md gradient-green flex items-center justify-center">
                <Globe className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-xs font-semibold text-primary tracking-wider uppercase">Global Monitoring Dashboard</span>
              {liveStats?.status === "online" && (
                <span className="text-[9px] bg-green-500/15 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded font-bold animate-pulse">
                  API LIVE
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight mb-2">
              Satellite-Powered{" "}
              <span className="gradient-text">Methane Leak Detection</span>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              Real-time analysis of Sentinel-5P TROPOMI methane column data via Google Earth Engine.
              Automated super-emitter detection, Gaussian plume modeling, and facility attribution —
              all in one intelligence platform.
            </p>
            {/* System Tags */}
            <div className="flex flex-wrap gap-1.5 mt-4">
              {systemBadges.map(b => (
                <Badge key={b.label} variant="outline" className={cn("text-[11px] font-medium", b.color)}>
                  {b.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Quick Risk Summary */}
          {!loading && (
            <motion.div {...FADE_UP(0.15)} className="flex flex-row md:flex-col gap-2 shrink-0">
              <div className="glass-card rounded-xl px-4 py-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </div>
                <div>
                  <p className="text-lg font-bold font-mono text-red-400">{criticalCount}</p>
                  <p className="text-[10px] text-muted-foreground">Critical Sites</p>
                </div>
              </div>
              <div className="glass-card rounded-xl px-4 py-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-lg font-bold font-mono text-orange-400">{superEmitters}</p>
                  <p className="text-[10px] text-muted-foreground">Super-Emitters</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ===== Stat Cards ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Active Hotspots" value={liveStats?.activeHotspots || 0} icon={Flame} subtitle="Global + India" index={0} variant="accent" />
        <StatCard title="Est. Emissions" value={`${(liveStats?.estimatedEmissions || 0).toLocaleString()} kg/hr`} icon={Wind} subtitle="Combined rate" index={1} />
        <StatCard title="Satellites Used" value={liveStats?.satellitesUsed || 0} icon={Satellite} subtitle="Sentinel-5P" index={2} />
        <StatCard title="Facilities Flagged" value={liveStats?.facilitiesFlagged || 0} icon={Building2} subtitle="For inspection" index={3} />
      </div>

      {/* ===== India vs Global Quick Compare ===== */}
      {!loading && (
        <motion.div {...FADE_UP(0.15)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* India Card */}
            <div className="glow-card rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-xs font-semibold text-orange-400">🇮🇳 India Focus</span>
                </div>
                <p className="text-2xl font-bold font-mono text-foreground">{indiaStats.totalHotspots}</p>
                <p className="text-[11px] text-muted-foreground">hotspots · {indiaStats.totalEmissions.toLocaleString()} kg/hr</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Top State</p>
                <p className="text-sm font-bold text-orange-400">{indiaStats.topState}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{indiaStats.criticalHotspots} critical</p>
                <Link to="/india" className="text-[10px] text-primary hover:underline mt-1 block">View India →</Link>
              </div>
            </div>
            {/* Global (non-India) Card */}
            <div className="glow-card rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-xs font-semibold text-blue-400">🌍 Global (ex-India)</span>
                </div>
                <p className="text-2xl font-bold font-mono text-foreground">{(liveStats?.activeHotspots || 0) - indiaStats.totalHotspots}</p>
                <p className="text-[11px] text-muted-foreground">hotspots · {((liveStats?.estimatedEmissions || 0) - indiaStats.totalEmissions).toLocaleString()} kg/hr</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Top Emitter</p>
                <p className="text-sm font-bold text-blue-400">Galkynysh</p>
                <p className="text-[10px] text-muted-foreground mt-1">Turkmenistan</p>
                <button onClick={() => window.scrollTo({ top: 300, behavior: 'smooth' })} className="text-[10px] text-primary hover:underline mt-1 block w-full text-right cursor-pointer border-none bg-transparent p-0">View on Map →</button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ===== Map + Panel ===== */}
      <motion.div {...FADE_UP(0.2)}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Live Hotspot Map
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
            {loading ? "Loading…" : `${hotspots.length} hotspots detected`}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4" style={{ minHeight: 520 }}>
          <div className="rounded-xl border border-border glow-card overflow-hidden" style={{ minHeight: 480 }}>
            {loading ? (
              <Skeleton className="w-full h-full min-h-[480px]" />
            ) : (
              <MethaneMap 
                hotspots={hotspots} 
                selectedId={selectedId} 
                onSelectHotspot={setSelectedId} 
                center={[22.5937, 78.9629]} 
                zoom={5}
                liveEnabled={pipelineActive}
                onLiveToggle={setPipelineActive}
                clusterEnabled={clusterMode}
                onClusterToggle={setClusterMode}
                anomalyEnabled={anomalyMode}
                onAnomalyToggle={setAnomalyMode}
              />
            )}
          </div>
          <div className="h-[520px]">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[78px] w-full rounded-xl" />)}
              </div>
            ) : (
              <HotspotPanel hotspots={hotspots} selectedId={selectedId} onSelect={setSelectedId} />
            )}
          </div>
        </div>
      </motion.div>

      {/* ===== Detection Pipeline Info ===== */}
      <motion.div {...FADE_UP(0.25)}>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Detection Pipeline
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              step: "01",
              title: "Satellite Acquisition",
              desc: "Sentinel-5P TROPOMI captures global CH₄ column measurements at 7×7 km resolution daily.",
              color: "border-primary/20 bg-primary/5",
              textColor: "text-primary",
            },
            {
              step: "02",
              title: "Anomaly Detection",
              desc: "ML algorithms compare readings against regional baselines. Events with Δ > 200 ppb are flagged.",
              color: "border-blue-500/20 bg-blue-500/5",
              textColor: "text-blue-400",
            },
            {
              step: "03",
              title: "Plume Attribution",
              desc: "ERA5 wind integration + Gaussian dispersion modeling traces plume to source facility.",
              color: "border-orange-500/20 bg-orange-500/5",
              textColor: "text-orange-400",
            },
            {
              step: "04",
              title: "Compliance Report",
              desc: "Super-emitter events are quantified and routed to regulators, UNEP IMEO, and facility operators.",
              color: "border-purple-500/20 bg-purple-500/5",
              textColor: "text-purple-400",
            },
          ].map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className={cn("rounded-xl border p-4 glow-card", s.color)}
            >
              <span className={cn("text-2xl font-black font-mono opacity-40", s.textColor)}>{s.step}</span>
              <h3 className={cn("text-sm font-semibold mt-1 mb-1.5", s.textColor)}>{s.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* AI Model Evaluation & Comparison section */}
      <motion.div {...FADE_UP(0.28)} className="space-y-4">
        <ModelEvaluationCard />
        <ModelComparisonCard />
        <DataQualityCard />
      </motion.div>

      {/* AI Model Status & Provenance */}
      <motion.div {...FADE_UP(0.3)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ModelStatusCard />
        <DataProvenanceCard />
      </motion.div>

      {/* Global Intelligence */}
      {!loading && (
        <motion.div {...FADE_UP(0.35)}>
          <GlobalIntelligence />
        </motion.div>
      )}
    </div>
  );
}
