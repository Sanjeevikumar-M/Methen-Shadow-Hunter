import { useEffect, useState } from "react";
import { GitBranch, Database, ShieldCheck, FileCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchSatelliteLatest, type SatelliteLatestInfo } from "@/lib/api";

export function DataProvenanceCard() {
  const [satInfo, setSatInfo] = useState<SatelliteLatestInfo | null>(null);

  useEffect(() => {
    fetchSatelliteLatest().then(setSatInfo).catch(console.error);
  }, []);

  if (!satInfo) return null;

  return (
    <Card className="glow-border overflow-hidden border border-blue-500/20 bg-card/60 backdrop-blur-md">
      <CardHeader className="pb-2 border-b border-border/50 bg-secondary/20">
        <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-blue-400">
          <GitBranch className="h-4 w-4 text-blue-400" />
          Data Provenance & Traceability Lineage
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="bg-secondary/30 rounded-lg p-2.5 border border-border/40">
            <span className="text-[9px] font-bold text-muted-foreground uppercase">1. Satellite Source</span>
            <p className="font-semibold text-foreground mt-1">{satInfo.satellite}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{satInfo.dataset_name}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-2.5 border border-border/40">
            <span className="text-[9px] font-bold text-muted-foreground uppercase">2. Persistent Storage</span>
            <p className="font-semibold text-emerald-400 mt-1">{satInfo.storage_path}</p>
            <p className="text-[10px] text-muted-foreground font-mono">ID: {satInfo.observation_id}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-2.5 border border-border/40">
            <span className="text-[9px] font-bold text-muted-foreground uppercase">3. Physics Model</span>
            <p className="font-semibold text-orange-400 mt-1">3D Gaussian Plume</p>
            <p className="text-[10px] text-muted-foreground font-mono">Briggs Rise & Pasquill-Gifford</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-2.5 border border-border/40">
            <span className="text-[9px] font-bold text-muted-foreground uppercase">4. Deep Inference</span>
            <p className="font-semibold text-primary mt-1">MethanePINN v2.1</p>
            <p className="text-[10px] text-muted-foreground font-mono">PyTorch Combined Loss</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-2 font-mono">
          <span>GEE Image ID: <strong className="text-foreground">{satInfo.gee_image_id}</strong></span>
          <span>Acquisition Time: <strong className="text-foreground">{new Date(satInfo.acquisition_time).toLocaleString()}</strong></span>
        </div>
      </CardContent>
    </Card>
  );
}
