import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Bell, Wind, MapPin, Activity, Flag } from "lucide-react";
import { mockAlertsFull } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function AlertSystem() {
  const [alerts, setAlerts] = useState(mockAlertsFull.slice(0, 0));
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAlerts(mockAlertsFull), 1500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = (id: string) => setAlerts((a) => a.filter((x) => x.id !== id));

  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter(a => a.riskLevel === "Critical").length;
  const highCount = alerts.filter(a => a.riskLevel === "High").length;
  const indiaCount = alerts.filter(a => a.id.startsWith("ALT-IND")).length;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col items-end gap-2">
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-xs shadow-lg",
          "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"
        )}
      >
        <Bell className="h-3.5 w-3.5" />
        {criticalCount > 0 && <span className="bg-destructive text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{criticalCount} CRITICAL</span>}
        {highCount > 0 && <span className="bg-orange-500/20 text-orange-400 text-[9px] font-bold px-1.5 py-0.5 rounded">{highCount} HIGH</span>}
        {indiaCount > 0 && <span className="bg-orange-400/20 text-orange-300 text-[9px] font-bold px-1.5 py-0.5 rounded">🇮🇳 {indiaCount}</span>}
        {!expanded ? "▼" : "▲"}
      </motion.button>

      <AnimatePresence>
        {expanded && alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className={cn(
              "bg-card border rounded-lg p-3 w-80 shadow-xl",
              alert.riskLevel === "Critical" ? "border-destructive/40" : "border-orange-500/30",
              alert.id.startsWith("ALT-IND") && "border-l-2 border-l-orange-400"
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className={cn("h-3.5 w-3.5", alert.riskLevel === "Critical" ? "text-destructive" : "text-orange-400")} />
                <span className={cn("text-xs font-semibold", alert.riskLevel === "Critical" ? "text-destructive" : "text-orange-400")}>
                  🚨 {alert.riskLevel} — Super-Emitter
                </span>
                {alert.id.startsWith("ALT-IND") && (
                  <span className="text-[9px] bg-orange-500/15 text-orange-400 px-1 py-0.5 rounded font-bold">🇮🇳 INDIA</span>
                )}
              </div>
              <button onClick={() => dismiss(alert.id)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-foreground font-bold mb-0.5">{alert.facility}</p>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
              <MapPin className="h-2.5 w-2.5" />
              <span>{alert.location} · {alert.lat.toFixed(2)}°, {alert.lng.toFixed(2)}°</span>
              {"country" in alert && <span className="ml-1">{(alert as { country: string }).country}</span>}
            </div>
            <div className="grid grid-cols-3 gap-1 mb-2">
              <div className="bg-destructive/10 rounded px-1.5 py-1 text-center">
                <p className="text-[9px] text-muted-foreground">Emission</p>
                <p className="text-[10px] font-mono font-bold text-destructive">{alert.emission} kg/hr</p>
              </div>
              <div className="bg-orange-500/10 rounded px-1.5 py-1 text-center">
                <p className="text-[9px] text-muted-foreground">Anomaly</p>
                <p className="text-[10px] font-mono font-bold text-orange-400">+{alert.anomaly} ppb</p>
              </div>
              <div className="bg-blue-500/10 rounded px-1.5 py-1 text-center">
                <p className="text-[9px] text-muted-foreground">Wind</p>
                <p className="text-[10px] font-mono font-bold text-blue-400">{alert.windSpeed}m/s {alert.windDir}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-border/50 pt-2">{alert.message}</p>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <Activity className="h-2.5 w-2.5" />
                <span>{alert.timestamp}</span>
              </div>
              <div className="flex gap-1">
                {alert.id.startsWith("ALT-IND") ? (
                  <>
                    <span className="text-[9px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded">MoEFCC</span>
                    <span className="text-[9px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded">CPCB</span>
                  </>
                ) : (
                  <>
                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Regulators</span>
                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">UNEP IMEO</span>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
