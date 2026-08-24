import { useEffect, useState } from "react";
import { Cpu, Trophy, CheckCircle, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchModelStatus } from "@/lib/api";

export function ModelComparisonCard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchModelStatus().then(setData).catch(console.error);
  }, []);

  if (!data || !data.baseline_comparison) return null;

  const comparisons: Array<{
    model: string;
    features: number;
    MAE: number;
    RMSE: number;
    R2: number;
    MAPE: number;
  }> = data.baseline_comparison;

  const bestModel = data.best_performing_model || "MethanePINN";

  return (
    <Card className="glow-border overflow-hidden border border-primary/25 bg-card/70 backdrop-blur-md">
      <CardHeader className="pb-3 border-b border-border/50 bg-secondary/30 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-primary">
            <Trophy className="h-4 w-4 text-yellow-400" />
            Model Benchmark Comparison (Held-Out Test Set)
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            Comparing MethanePINN against baseline algorithms on 15% held-out test data
          </p>
        </div>
        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
          Best: {bestModel}
        </Badge>
      </CardHeader>

      <CardContent className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground bg-secondary/20">
                <th className="p-2 font-bold uppercase text-[10px]">Model Algorithm</th>
                <th className="p-2 font-bold uppercase text-[10px] text-center">Features</th>
                <th className="p-2 font-bold uppercase text-[10px] text-right">RMSE (ppb)</th>
                <th className="p-2 font-bold uppercase text-[10px] text-right">MAE (ppb)</th>
                <th className="p-2 font-bold uppercase text-[10px] text-right">R² Score</th>
                <th className="p-2 font-bold uppercase text-[10px] text-right">MAPE (%)</th>
                <th className="p-2 font-bold uppercase text-[10px] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {comparisons.map((item) => {
                const isBest = item.model === bestModel;
                const isPINN = item.model.includes("PINN");
                return (
                  <tr
                    key={item.model}
                    className={`transition-colors ${
                      isBest ? "bg-primary/10 font-semibold" : "hover:bg-secondary/20"
                    }`}
                  >
                    <td className="p-2 flex items-center gap-1.5 text-foreground font-bold">
                      {isBest && <Trophy className="h-3.5 w-3.5 text-yellow-400 shrink-0" />}
                      {item.model}
                      {isPINN && (
                        <Badge variant="outline" className="text-[9px] py-0 px-1 border-primary/40 text-primary">
                          Proposed
                        </Badge>
                      )}
                    </td>
                    <td className="p-2 text-center text-muted-foreground">{item.features}</td>
                    <td className="p-2 text-right font-extrabold text-orange-400">{item.RMSE}</td>
                    <td className="p-2 text-right text-yellow-400">{item.MAE}</td>
                    <td className="p-2 text-right text-emerald-400 font-extrabold">
                      {(item.R2 * 100).toFixed(1)}%
                    </td>
                    <td className="p-2 text-right text-blue-400">{item.MAPE}%</td>
                    <td className="p-2 text-center">
                      {isBest ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0">
                          BEST ACCURACY
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">Baseline</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
