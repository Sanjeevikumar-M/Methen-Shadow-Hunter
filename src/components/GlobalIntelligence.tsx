import { motion } from "framer-motion";
import { Globe, TrendingUp, Factory, Satellite, Activity, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { mockGlobalMetrics } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const chartTheme = {
  grid: "hsl(220, 14%, 15%)",
  text: "hsl(215, 12%, 55%)",
  green: "hsl(140, 70%, 45%)",
};

const tooltipStyle = { background: "hsl(220,16%,12%)", border: "1px solid hsl(220,14%,18%)", borderRadius: 8, color: "#e5e5e5", fontSize: 12 };

export function GlobalIntelligence() {
  const m = mockGlobalMetrics;

  const stats = [
    { icon: Globe, label: "Active Hotspots", value: m.totalHotspotsToday.toString(), sub: `Today` },
    { icon: Activity, label: "Total Emissions", value: `${m.totalEmissionsToday.toLocaleString()} kg/hr`, sub: "Combined" },
    { icon: Flame, label: "Active Alerts", value: m.activeAlerts.toString(), sub: "Super-emitters" },
    { icon: Satellite, label: "Satellite Passes", value: m.satellitePassesToday.toString(), sub: "24h coverage" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Globe className="h-4 w-4 text-primary" />
        Global Methane Intelligence Dashboard
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
            <Card className="glow-border">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-base font-bold font-mono text-foreground leading-tight">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Country emissions chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="glow-border">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-foreground mb-3">🌍 Emissions by Country (kg/hr)</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={m.countryEmissions} layout="vertical" margin={{ left: 90 }}>
                  <XAxis type="number" tick={{ fill: chartTheme.text, fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="country"
                    tick={{ fill: chartTheme.text, fontSize: 10 }}
                    width={85}
                    tickFormatter={(v) => {
                      const entry = m.countryEmissions.find(c => c.country === v);
                      return entry ? `${entry.flag} ${v}` : v;
                    }}
                  />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} kg/hr`, "Emissions"]} />
                  <Bar dataKey="emissions" fill={chartTheme.green} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top facilities table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <Card className="glow-border">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Factory className="h-3.5 w-3.5 text-primary" />
                Top Emitting Facilities
              </p>
              <div className="space-y-2">
                {m.topFacilities.map((f, i) => (
                  <div key={f.name} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground truncate font-medium">{f.name}</p>
                      <p className="text-[9px] text-muted-foreground">{f.country}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono font-bold text-foreground">{f.emission} kg/hr</p>
                      <span className={cn("text-[9px] font-semibold",
                        f.risk === "critical" ? "text-destructive" :
                          f.risk === "high" ? "text-orange-400" : "text-yellow-400"
                      )}>
                        {f.risk}
                      </span>
                    </div>
                    <div className="w-14 h-1.5 rounded-full bg-secondary overflow-hidden shrink-0">
                      <div
                        className={cn("h-full rounded-full",
                          f.risk === "critical" ? "bg-destructive" :
                            f.risk === "high" ? "bg-orange-500" : "bg-yellow-500"
                        )}
                        style={{ width: `${(f.emission / 650) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Country hotspot count */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card className="glow-border">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-foreground mb-3">Active Hotspots by Country</p>
            <div className="flex flex-wrap gap-2">
              {m.countryEmissions.map(c => (
                <div key={c.country} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                  <span className="text-base">{c.flag}</span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{c.country}</p>
                    <p className="text-[9px] text-muted-foreground">{c.hotspots} hotspot{c.hotspots > 1 ? "s" : ""} · {c.emissions} kg/hr</p>
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
