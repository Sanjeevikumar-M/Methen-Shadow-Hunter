import { useEffect, useState } from "react";
import { Cpu, CheckCircle2, Award, Zap, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchModelStatus, type ModelStatusInfo } from "@/lib/api";

export function ModelStatusCard() {
  const [info, setInfo] = useState<ModelStatusInfo | null>(null);

  useEffect(() => {
    fetchModelStatus().then(setInfo).catch(console.error);
  }, []);

  if (!info) return null;

  return (
    <Card className="glow-border overflow-hidden border border-primary/20 bg-card/60 backdrop-blur-md">
      <CardHeader className="pb-2 border-b border-border/50 bg-secondary/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-primary">
            <Cpu className="h-4 w-4 text-primary" />
            AI Model Status — Physics-Informed Neural Network (PINN)
          </CardTitle>
          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
            {info.version}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-secondary/40 rounded-lg p-2.5">
            <p className="text-[10px] text-muted-foreground">Framework</p>
            <p className="text-xs font-bold font-mono text-foreground mt-0.5">{info.framework}</p>
          </div>
          <div className="bg-secondary/40 rounded-lg p-2.5">
            <p className="text-[10px] text-muted-foreground">Validation R² Score</p>
            <p className="text-xs font-bold font-mono text-emerald-400 mt-0.5">{(info.metrics.r2_score * 100).toFixed(1)}%</p>
          </div>
          <div className="bg-secondary/40 rounded-lg p-2.5">
            <p className="text-[10px] text-muted-foreground">Validation RMSE</p>
            <p className="text-xs font-bold font-mono text-orange-400 mt-0.5">{info.metrics.rmse_ppb} ppb</p>
          </div>
          <div className="bg-secondary/40 rounded-lg p-2.5">
            <p className="text-[10px] text-muted-foreground">Training Samples</p>
            <p className="text-xs font-bold font-mono text-blue-400 mt-0.5">{info.training_samples.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-2 font-mono">
          <span>Region: <strong className="text-foreground">{info.region}</strong></span>
          <span>Last Training: <strong className="text-foreground">{new Date(info.last_training_time).toLocaleDateString()}</strong></span>
        </div>
      </CardContent>
    </Card>
  );
}
