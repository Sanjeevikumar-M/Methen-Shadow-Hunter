import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Legend } from "recharts";
import { fetchEmissionEstimates, mockHotspots, type EmissionEstimate } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, Activity, Calculator } from "lucide-react";

const chartTheme = {
  grid: "hsl(220, 14%, 15%)",
  text: "hsl(215, 12%, 55%)",
  green: "hsl(140, 70%, 45%)",
  blue: "hsl(200, 70%, 45%)",
  teal: "hsl(160, 60%, 40%)",
  orange: "hsl(38, 92%, 50%)",
  red: "hsl(0, 72%, 50%)",
  purple: "hsl(270, 70%, 55%)",
};

const tooltipStyle = { background: "hsl(220,16%,12%)", border: "1px solid hsl(220,14%,18%)", borderRadius: 8, color: "#e5e5e5", fontSize: 12 };

const facilityEmissions = mockHotspots
  .sort((a, b) => b.emissionRate - a.emissionRate)
  .slice(0, 6)
  .map((h) => ({
    facility: h.nearestFacility.split(" ").slice(0, 2).join(" "),
    emission: h.emissionRate,
    gaussian: h.gaussianEmissionRate,
    concentration: h.concentration,
    anomaly: h.anomalyDelta,
  }));

// Gaussian plume model explanation data
const gaussianData = Array.from({ length: 20 }, (_, i) => {
  const x = (i / 19) * 6; // km downwind
  const sigma_y = 0.22 * x * Math.pow(1 + 0.0001 * x, -0.5);
  const sigma_z = 0.16 * x * Math.pow(1 + 0.0001 * x, -0.5);
  const Q = 500; // kg/hr source strength
  const u = 6; // m/s wind speed
  const C = (Q / (Math.PI * sigma_y * sigma_z * u)) * Math.exp(-0.5 * Math.pow(0 / sigma_y, 2));
  return { x: Math.round(x * 10) / 10, concentration: Math.round(C * 100) / 100, sigma_y: Math.round(sigma_y * 100) / 100 };
});

export default function EmissionAnalysis() {
  const [data, setData] = useState<EmissionEstimate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmissionEstimates().then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const totalGaussian = mockHotspots.reduce((a, h) => a + h.gaussianEmissionRate, 0);
  const totalSimple = mockHotspots.reduce((a, h) => a + h.emissionRate, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Emission Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gaussian plume modeling, anomaly detection, plume shape analysis, and facility attribution.
        </p>
      </motion.div>

      {/* Gaussian Model Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="glow-border bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="flex items-start gap-2 flex-1">
                <Calculator className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-primary mb-1">Gaussian Plume Model</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Emission Rate ∝ CH₄_anomaly × wind_speed × plume_width × calibration_factor
                    <br />
                    <span className="font-mono text-foreground">E = Δconc × u × σy × 0.042</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Simple Sum</p>
                  <p className="text-lg font-mono font-bold text-foreground">{totalSimple.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">kg/hr</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gaussian Model</p>
                  <p className="text-lg font-mono font-bold text-primary">{totalGaussian.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">kg/hr</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Annual Impact</p>
                  <p className="text-lg font-mono font-bold text-orange-400">{Math.round(totalGaussian * 8760 / 1000).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">tonnes/yr</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CH4 Concentration Trend with Anomaly Baseline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                CH₄ Concentration vs Baseline Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="month" tick={{ fill: chartTheme.text, fontSize: 12 }} />
                  <YAxis tick={{ fill: chartTheme.text, fontSize: 12 }} domain={[1600, "auto"]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: chartTheme.text }} />
                  <Line type="monotone" dataKey="baseline" stroke={chartTheme.text} strokeWidth={1} strokeDasharray="5 5" dot={false} name="Baseline" />
                  <Line type="monotone" dataKey="concentration" stroke={chartTheme.green} strokeWidth={2} dot={{ fill: chartTheme.green, r: 4 }} name="Observed CH₄" />
                  <Bar dataKey="anomaly" fill={chartTheme.orange} fillOpacity={0.25} radius={[3, 3, 0, 0]} name="Anomaly Δ" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Emission Rates — Simple vs Gaussian */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Simple vs Gaussian Emission Rate (kg/hr)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={facilityEmissions} layout="vertical" margin={{ left: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis type="number" tick={{ fill: chartTheme.text, fontSize: 10 }} />
                  <YAxis type="category" dataKey="facility" tick={{ fill: chartTheme.text, fontSize: 10 }} width={65} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: chartTheme.text }} />
                  <Bar dataKey="emission" fill={chartTheme.blue} radius={[0, 3, 3, 0]} name="Simple Rate" />
                  <Bar dataKey="gaussian" fill={chartTheme.green} radius={[0, 3, 3, 0]} name="Gaussian Model" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Historical Anomaly */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Historical Anomaly Magnitude (ppb above baseline)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="month" tick={{ fill: chartTheme.text, fontSize: 12 }} />
                  <YAxis tick={{ fill: chartTheme.text, fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: chartTheme.text }} />
                  <Bar dataKey="anomaly" fill={chartTheme.orange} fillOpacity={0.6} radius={[4, 4, 0, 0]} name="Anomaly Δ ppb" />
                  <Line type="monotone" dataKey="emissionRate" stroke={chartTheme.red} strokeWidth={2} dot={{ fill: chartTheme.red, r: 3 }} yAxisId={0} name="Emission Rate" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Facility Anomaly Comparison */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Facility Anomaly Δ vs Emission Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {facilityEmissions.map((f, i) => (
                  <div key={f.facility}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground truncate">{f.facility}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className={cn("text-[9px]",
                          f.anomaly >= 400 ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            f.anomaly >= 200 ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                              f.anomaly >= 0 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                                "bg-green-500/10 text-green-400 border-green-500/20"
                        )}>Δ{f.anomaly >= 0 ? "+" : ""}{f.anomaly}</Badge>
                        <span className="text-[10px] font-mono text-foreground">{f.emission} kg/hr</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(f.emission / 700) * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.08 }}
                        className={cn("h-full rounded-full",
                          f.emission > 400 ? "bg-red-500" : f.emission > 300 ? "bg-orange-500" : "bg-primary"
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-muted-foreground mt-3">Bar width = emission rate. Badge = CH₄ anomaly vs regional baseline.</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Gaussian Dispersion Curve */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
          <Card className="glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                Gaussian Plume Dispersion — Centerline Concentration vs Distance
              </CardTitle>
              <p className="text-xs text-muted-foreground">Source: 500 kg/hr, Wind: 6 m/s. C ∝ Q/(σy·σz·u) — concentration decays exponentially downwind.</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={gaussianData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="x" tick={{ fill: chartTheme.text, fontSize: 11 }} label={{ value: "Distance downwind (km)", fill: chartTheme.text, fontSize: 11, position: "insideBottom", offset: -5 }} />
                  <YAxis tick={{ fill: chartTheme.text, fontSize: 11 }} label={{ value: "Conc. (kg/m³)", fill: chartTheme.text, fontSize: 10, angle: -90, position: "insideLeft" }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [v, n === "concentration" ? "Centerline Conc." : "Lateral Spread σy"]} />
                  <Legend wrapperStyle={{ fontSize: 11, color: chartTheme.text }} />
                  <Area type="monotone" dataKey="concentration" stroke={chartTheme.green} fill={chartTheme.green} fillOpacity={0.15} strokeWidth={2} name="Centerline Conc." />
                  <Line type="monotone" dataKey="sigma_y" stroke={chartTheme.orange} strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Lateral Spread σy" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Plume Size */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-2">
          <Card className="glow-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Plume Size Estimation (km²)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="month" tick={{ fill: chartTheme.text, fontSize: 12 }} />
                  <YAxis tick={{ fill: chartTheme.text, fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="plumeSize" stroke={chartTheme.teal} fill={chartTheme.teal} fillOpacity={0.2} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
