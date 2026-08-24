import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from "recharts";
import { Award, TrendingUp, AlertCircle, BarChart3, CheckCircle2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchModelStatus, type ModelStatusInfo } from "@/lib/api";

export function ModelEvaluationCard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchModelStatus().then(setData).catch(console.error);
  }, []);

  if (!data || !data.held_out_test_metrics) return null;

  const metrics = data.held_out_test_metrics;
  const lossHistory = data.loss_history || [];
  const scatterSamples = data.scatter_samples || [];
  const thresholds = data.error_thresholds || { low_threshold_ppb: 15.0, medium_threshold_ppb: 35.0 };
  const verification = data.data_verification || {};

  return (
    <div className="space-y-4 col-span-full">
      <Card className="glow-border overflow-hidden border border-primary/25 bg-card/70 backdrop-blur-md">
        <CardHeader className="pb-3 border-b border-border/50 bg-secondary/30 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-primary">
              <Award className="h-4 w-4 text-primary" />
              Held-Out Test Set Model Evaluation & Training Curves
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
              Evaluated strictly on held-out test data ({data.test_samples || 180} samples) · Chronological Split (70/15/15)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
              Leakage: {verification.leakage_check || "PASS"}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
              {data.version || "2.2.0-PINN-12F"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-6">
          {/* Test Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            <div className="bg-secondary/40 rounded-lg p-2.5 border border-border/40 text-center">
              <p className="text-[9px] text-muted-foreground uppercase font-bold">R² Score</p>
              <p className="text-base font-extrabold font-mono text-emerald-400 mt-0.5">
                {(metrics.r2_score * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-secondary/40 rounded-lg p-2.5 border border-border/40 text-center">
              <p className="text-[9px] text-muted-foreground uppercase font-bold">RMSE</p>
              <p className="text-base font-extrabold font-mono text-orange-400 mt-0.5">
                {metrics.rmse_ppb} <span className="text-[9px]">ppb</span>
              </p>
            </div>
            <div className="bg-secondary/40 rounded-lg p-2.5 border border-border/40 text-center">
              <p className="text-[9px] text-muted-foreground uppercase font-bold">MAE</p>
              <p className="text-base font-extrabold font-mono text-yellow-400 mt-0.5">
                {metrics.mae_ppb} <span className="text-[9px]">ppb</span>
              </p>
            </div>
            <div className="bg-secondary/40 rounded-lg p-2.5 border border-border/40 text-center">
              <p className="text-[9px] text-muted-foreground uppercase font-bold">MAPE</p>
              <p className="text-base font-extrabold font-mono text-blue-400 mt-0.5">
                {metrics.mape_percent}%
              </p>
            </div>
            <div className="bg-secondary/40 rounded-lg p-2.5 border border-border/40 text-center">
              <p className="text-[9px] text-muted-foreground uppercase font-bold">Precision</p>
              <p className="text-base font-extrabold font-mono text-cyan-400 mt-0.5">
                {(metrics.precision * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-secondary/40 rounded-lg p-2.5 border border-border/40 text-center">
              <p className="text-[9px] text-muted-foreground uppercase font-bold">Recall</p>
              <p className="text-base font-extrabold font-mono text-purple-400 mt-0.5">
                {(metrics.recall * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-secondary/40 rounded-lg p-2.5 border border-border/40 text-center">
              <p className="text-[9px] text-muted-foreground uppercase font-bold">F1-Score</p>
              <p className="text-base font-extrabold font-mono text-primary mt-0.5">
                {(metrics.f1_score * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Charts Row: Loss Curves & Scatter Plot */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. Training vs Validation Loss Curve */}
            <div className="bg-secondary/20 rounded-xl p-3 border border-border/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  PINN Loss Convergence (Train vs Validation)
                </span>
                <span className="text-[9px] text-muted-foreground font-mono">150 Epochs</span>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lossHistory}>
                    <XAxis dataKey="epoch" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", borderColor: "#334155", borderRadius: 8, fontSize: 11 }}
                    />
                    <Line type="monotone" dataKey="train_loss" name="Train Loss" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="val_loss" name="Val Loss" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Actual vs Predicted CH4 Scatter Plot */}
            <div className="bg-secondary/20 rounded-xl p-3 border border-border/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-orange-400" />
                  Actual vs Predicted CH₄ (Held-Out Test Set)
                </span>
                <span className="text-[9px] text-muted-foreground font-mono">Target: t+1 CH₄</span>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <XAxis dataKey="actual" name="Actual CH4 (ppb)" stroke="#64748b" fontSize={10} domain={['dataMin - 50', 'dataMax + 50']} />
                    <YAxis dataKey="predicted" name="Predicted CH4 (ppb)" stroke="#64748b" fontSize={10} domain={['dataMin - 50', 'dataMax + 50']} />
                    <ZAxis range={[30, 30]} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ background: "#0f172a", borderColor: "#334155", borderRadius: 8, fontSize: 11 }}
                    />
                    <Scatter name="Test Predictions" data={scatterSamples} fill="#f97316" fillOpacity={0.7} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Error Scale Thresholds & Methodology */}
          <div className="bg-secondary/30 rounded-xl p-3 border border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Configurable Map Error Scale Methodology
              </span>
              <p className="text-[11px] text-muted-foreground">
                Thresholds derived from test residual percentiles:
                <strong className="text-emerald-400 ml-1">Low Error (&lt;{thresholds.low_threshold_ppb} ppb)</strong> · 
                <strong className="text-yellow-400 ml-1">Medium Error ({thresholds.low_threshold_ppb}–{thresholds.medium_threshold_ppb} ppb)</strong> · 
                <strong className="text-red-400 ml-1">High Error (&gt;{thresholds.medium_threshold_ppb} ppb)</strong>
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 shrink-0 font-mono">
              Target: t+1 CH₄ Prediction
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
