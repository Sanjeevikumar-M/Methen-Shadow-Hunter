import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { MethaneHotspot } from "@/lib/mock-data";

interface HotspotPanelProps {
  hotspots: MethaneHotspot[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function HotspotPanel({ hotspots, selectedId, onSelect }: HotspotPanelProps) {
  return (
    <div className="border rounded-lg bg-card overflow-hidden h-full flex flex-col">
      <div className="p-3 border-b">
        <h3 className="text-sm font-semibold text-foreground">Detected Hotspots</h3>
        <p className="text-xs text-muted-foreground">{hotspots.length} active sources</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {hotspots.map((hs) => (
            <button
              key={hs.id}
              onClick={() => onSelect(hs.id)}
              className={cn(
                "w-full text-left p-2.5 rounded-md text-xs transition-colors",
                selectedId === hs.id
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-secondary border border-transparent"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-semibold text-foreground">{hs.id}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-medium",
                  hs.confidenceScore > 0.9 ? "bg-primary/15 text-primary" :
                  hs.confidenceScore > 0.8 ? "bg-warning/15 text-warning" :
                  "bg-muted text-muted-foreground"
                )}>
                  {(hs.confidenceScore * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-muted-foreground truncate">{hs.nearestFacility}</p>
              <div className="flex gap-3 mt-1 text-muted-foreground">
                <span>{hs.concentration} ppb</span>
                <span>{hs.emissionRate} kg/hr</span>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
