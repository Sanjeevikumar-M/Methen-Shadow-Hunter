import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Brain, Filter, ArrowUpDown, MapPin, AlertTriangle, Cpu, Satellite, Activity, Zap } from "lucide-react";
import { fetchHotspots, type MethaneHotspot } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type SortKey = "concentration" | "emissionRate" | "confidenceScore" | "anomalyDelta" | "detectedAt";
type SortDir = "asc" | "desc";

const ANOMALY_THRESHOLD = 200; // ppb above regional average

export default function AIDetection() {
  const [hotspots, setHotspots] = useState<MethaneHotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("anomalyDelta");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [minConcentration, setMinConcentration] = useState(0);
  const [minEmission, setMinEmission] = useState(0);
  const [minAnomaly, setMinAnomaly] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchHotspots().then((d) => { setHotspots(d); setLoading(false); });
  }, []);

  const regionalAvg = useMemo(() => {
    if (!hotspots.length) return 0;
    return Math.round(hotspots.reduce((a, h) => a + h.regionalAverage, 0) / hotspots.length);
  }, [hotspots]);

  const filtered = useMemo(() => {
    return hotspots
      .filter((h) => h.concentration >= minConcentration && h.emissionRate >= minEmission && h.anomalyDelta >= minAnomaly)
      .sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
        return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
      });
  }, [hotspots, sortKey, sortDir, minConcentration, minEmission, minAnomaly]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button onClick={() => toggleSort(field)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className={cn("h-3 w-3", sortKey === field && "text-primary")} />
    </button>
  );

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const superEmitters = hotspots.filter((h) => h.emissionRate > 400);
  const trueAnomalies = hotspots.filter((h) => h.anomalyDelta >= ANOMALY_THRESHOLD);
  const highResTriggers = hotspots.filter((h) => h.highResTrigger);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Methane Detection
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Anomaly detection relative to regional baseline (avg. {regionalAvg} ppb) — reduces false positives.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
            <AlertTriangle className="h-3 w-3" />
            {superEmitters.length} Super-Emitters
          </Badge>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1">
            <Activity className="h-3 w-3" />
            {trueAnomalies.length} True Anomalies
          </Badge>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-3.5 w-3.5" />
            Filters
          </Button>
        </div>
      </motion.div>

      {/* Anomaly Detection Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="glow-border bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Cpu className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-primary mb-1">Anomaly Detection Algorithm</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Each detected CH₄ reading is compared against the <span className="text-foreground font-mono">regional baseline average ({regionalAvg} ppb)</span>.
                  Hotspots with <span className="text-primary font-mono">Δ &gt; {ANOMALY_THRESHOLD} ppb</span> are flagged as true anomalies,
                  reducing false positives from atmospheric variability. Standard threshold-only detection (e.g., &gt;1900 ppb)
                  would miss subtle leaks in high-baseline regions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      {showFilters && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Card className="glow-border">
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Min Concentration: {minConcentration} ppb</label>
                <Slider value={[minConcentration]} onValueChange={([v]) => setMinConcentration(v)} min={0} max={2500} step={100} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Min Emission Rate: {minEmission} kg/hr</label>
                <Slider value={[minEmission]} onValueChange={([v]) => setMinEmission(v)} min={0} max={700} step={50} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Min Anomaly Δ: {minAnomaly} ppb</label>
                <Slider value={[minAnomaly]} onValueChange={([v]) => setMinAnomaly(v)} min={-300} max={800} step={50} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Sort By</label>
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anomalyDelta">Anomaly Δ (Recommended)</SelectItem>
                    <SelectItem value="concentration">Concentration</SelectItem>
                    <SelectItem value="emissionRate">Emission Rate</SelectItem>
                    <SelectItem value="confidenceScore">Confidence</SelectItem>
                    <SelectItem value="detectedAt">Detection Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Predictive Risk Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "True Anomalies", value: trueAnomalies.length, desc: `Δ>+${ANOMALY_THRESHOLD}ppb`, color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle },
          { label: "Super-Emitters", value: superEmitters.length, desc: ">400 kg/hr", color: "text-orange-400", bg: "bg-orange-500/10", icon: Zap },
          { label: "High-Res Triggers", value: highResTriggers.length, desc: "Multi-scale", color: "text-blue-400", bg: "bg-blue-500/10", icon: Satellite },
          { label: "Below Baseline", value: hotspots.filter(h => h.anomalyDelta < 0).length, desc: "Not anomalous", color: "text-primary", bg: "bg-primary/10", icon: Activity },
        ].map((r, i) => (
          <motion.div key={r.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="glow-border">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", r.bg)}>
                  <r.icon className={cn("h-4 w-4", r.color)} />
                </div>
                <div>
                  <p className={cn("text-xl font-bold font-mono", r.color)}>{r.value}</p>
                  <p className="text-[10px] text-muted-foreground">{r.label}</p>
                  <p className="text-[9px] text-muted-foreground/70">{r.desc}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Detection Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="glow-border overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Detected Hotspots — Anomaly Analysis ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="p-3 text-left"><SortHeader label="ID" field="detectedAt" /></th>
                    <th className="p-3 text-left text-xs text-muted-foreground">Location</th>
                    <th className="p-3 text-left"><SortHeader label="CH₄ (ppb)" field="concentration" /></th>
                    <th className="p-3 text-left"><SortHeader label="Anomaly Δ" field="anomalyDelta" /></th>
                    <th className="p-3 text-left"><SortHeader label="Emission (kg/hr)" field="emissionRate" /></th>
                    <th className="p-3 text-left"><SortHeader label="Confidence" field="confidenceScore" /></th>
                    <th className="p-3 text-left text-xs text-muted-foreground">Facility (Rank)</th>
                    <th className="p-3 text-left text-xs text-muted-foreground">Source</th>
                    <th className="p-3 text-left text-xs text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((hs, i) => {
                    const isSuperEmitter = hs.emissionRate > 400;
                    const isAnomaly = hs.anomalyDelta >= ANOMALY_THRESHOLD;
                    return (
                      <motion.tr
                        key={hs.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className={cn(
                          "border-b border-border/50 hover:bg-secondary/30 transition-colors",
                          isSuperEmitter && "bg-destructive/5",
                        )}
                      >
                        <td className="p-3 font-mono font-semibold text-foreground">{hs.id}</td>
                        <td className="p-3 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {hs.lat.toFixed(2)}°, {hs.lng.toFixed(2)}°
                          </span>
                        </td>
                        <td className="p-3">
                          <div>
                            <span className={cn("font-mono font-semibold",
                              hs.concentration > 2200 ? "text-destructive" :
                                hs.concentration > 1800 ? "text-warning" : "text-primary"
                            )}>{hs.concentration}</span>
                            <div className="text-[9px] text-muted-foreground">avg: {hs.regionalAverage}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={cn("font-mono font-bold text-xs px-1.5 py-0.5 rounded",
                            hs.anomalyDelta >= 400 ? "bg-red-500/15 text-red-400" :
                              hs.anomalyDelta >= 200 ? "bg-orange-500/15 text-orange-400" :
                                hs.anomalyDelta >= 0 ? "bg-yellow-500/15 text-yellow-400" :
                                  "bg-green-500/15 text-green-400"
                          )}>
                            {hs.anomalyDelta >= 0 ? "+" : ""}{hs.anomalyDelta}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-foreground">{hs.emissionRate}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", hs.confidenceScore > 0.9 ? "bg-primary" : hs.confidenceScore > 0.8 ? "bg-warning" : "bg-muted-foreground")}
                                style={{ width: `${hs.confidenceScore * 100}%` }}
                              />
                            </div>
                            <span className="text-muted-foreground">{(hs.confidenceScore * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          <div className="truncate max-w-[130px]">{hs.nearestFacility}</div>
                          <div className="text-[9px] text-primary">Rank #{hs.facilityRank}</div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[9px]">{hs.source}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            {isSuperEmitter && (
                              <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[9px]">Super-Emitter</Badge>
                            )}
                            {isAnomaly && (
                              <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[9px]">Anomaly</Badge>
                            )}
                            {hs.highResTrigger && (
                              <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[9px]">Hi-Res ✓</Badge>
                            )}
                            {!isSuperEmitter && !isAnomaly && (
                              <Badge variant="outline" className="text-[9px]">Active</Badge>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Multi-Scale Fusion Architecture */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card className="glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Satellite className="h-4 w-4 text-primary" />
              Multi-Scale Satellite Fusion Architecture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center text-center text-xs">
              {[
                { label: "Sentinel-5P Detection", desc: "7×7 km global coverage", color: "bg-primary/10 border-primary/30 text-primary" },
                { label: "→", color: "", desc: "" },
                { label: "Anomaly Flagged", desc: "Δ > regional baseline", color: "bg-orange-500/10 border-orange-500/30 text-orange-400" },
                { label: "→", color: "", desc: "" },
                { label: "CarbonMapper / MethaneSAT", desc: "High-res source pinpointing", color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
              ].map((step, i) => (
                step.label === "→" ? (
                  <div key={i} className="text-muted-foreground text-lg font-bold hidden md:block">→</div>
                ) : (
                  <div key={i} className={cn("rounded-lg border p-3", step.color)}>
                    <p className="font-semibold text-xs">{step.label}</p>
                    {step.desc && <p className="text-[10px] mt-0.5 opacity-75">{step.desc}</p>}
                  </div>
                )
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] text-muted-foreground">
              {hotspots.filter(h => h.highResTrigger).map(h => (
                <div key={h.id} className="flex items-center gap-1.5 bg-blue-500/5 border border-blue-500/15 rounded px-2 py-1.5">
                  <Satellite className="h-3 w-3 text-blue-400 shrink-0" />
                  <div>
                    <p className="text-blue-400 font-mono">{h.id}</p>
                    <p className="text-[9px]">{h.source} triggered</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
