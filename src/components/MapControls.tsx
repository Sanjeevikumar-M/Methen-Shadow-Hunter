import { Satellite, Layers, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface MapControlsProps {
  liveEnabled: boolean;
  onLiveToggle: (enabled: boolean) => void;
  clusterEnabled: boolean;
  onClusterToggle: (enabled: boolean) => void;
  anomalyEnabled: boolean;
  onAnomalyToggle: (enabled: boolean) => void;
}

export function MapControls({
  liveEnabled,
  onLiveToggle,
  clusterEnabled,
  onClusterToggle,
  anomalyEnabled,
  onAnomalyToggle,
}: MapControlsProps) {
  return (
    <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5">
      {/* Live Satellite Pipeline */}
      <div className="map-control-item">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={cn(
            "w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors duration-300",
            liveEnabled ? "bg-emerald-500/20" : "bg-secondary/60"
          )}>
            <Satellite className={cn(
              "h-3.5 w-3.5 transition-colors duration-300",
              liveEnabled ? "text-emerald-400" : "text-muted-foreground"
            )} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-semibold text-foreground leading-tight">Satellite Pipeline</span>
            <div className="flex items-center gap-1">
              {liveEnabled && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
              <span className={cn(
                "text-[9px] font-mono leading-tight",
                liveEnabled ? "text-emerald-400" : "text-muted-foreground/60"
              )}>
                {liveEnabled ? "LIVE" : "PAUSED"}
              </span>
            </div>
          </div>
        </div>
        <Switch
          checked={liveEnabled}
          onCheckedChange={onLiveToggle}
          className="scale-75 shrink-0"
        />
      </div>

      {/* Cluster by Concentration */}
      <div className="map-control-item">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={cn(
            "w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors duration-300",
            clusterEnabled ? "bg-blue-500/20" : "bg-secondary/60"
          )}>
            <Layers className={cn(
              "h-3.5 w-3.5 transition-colors duration-300",
              clusterEnabled ? "text-blue-400" : "text-muted-foreground"
            )} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-semibold text-foreground leading-tight">Concentration Clusters</span>
            <span className={cn(
              "text-[9px] font-mono leading-tight",
              clusterEnabled ? "text-blue-400" : "text-muted-foreground/60"
            )}>
              {clusterEnabled ? "GROUPED" : "OFF"}
            </span>
          </div>
        </div>
        <Switch
          checked={clusterEnabled}
          onCheckedChange={onClusterToggle}
          className="scale-75 shrink-0"
        />
      </div>

      {/* Anomaly Detection */}
      <div className="map-control-item">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={cn(
            "w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors duration-300",
            anomalyEnabled ? "bg-orange-500/20" : "bg-secondary/60"
          )}>
            <AlertTriangle className={cn(
              "h-3.5 w-3.5 transition-colors duration-300",
              anomalyEnabled ? "text-orange-400" : "text-muted-foreground"
            )} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-semibold text-foreground leading-tight">Anomaly Detection</span>
            <span className={cn(
              "text-[9px] font-mono leading-tight",
              anomalyEnabled ? "text-orange-400" : "text-muted-foreground/60"
            )}>
              {anomalyEnabled ? "SCANNING" : "OFF"}
            </span>
          </div>
        </div>
        <Switch
          checked={anomalyEnabled}
          onCheckedChange={onAnomalyToggle}
          className="scale-75 shrink-0"
        />
      </div>
    </div>
  );
}
