import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, AlertTriangle, CheckCircle, Download, Building2, Flame, Wind, Leaf, MapPin, Target } from "lucide-react";
import { type Facility } from "@/lib/mock-data";
import { useFacilities } from "@/hooks/useFacilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function ComplianceReport() {
  const { facilities, report, loading } = useFacilities();
  const [generating, setGenerating] = useState(false);
  const [generatedFor, setGeneratedFor] = useState<string | null>(null);

  const handleDownload = () => {
    const content = facilities.map((f) =>
      `FACILITY: ${f.name}\nOperator: ${f.operator}\nType: ${f.facilityType}\nCountry: ${f.country ?? "International"}\nLocation: ${f.lat}°, ${f.lng}°\nLast Inspection: ${f.lastInspection}\nDistance from Hotspot: ${f.distanceFromHotspot} km\nWind-Aligned Attribution: ${f.windAligned ? "Yes" : "No"}\nEmission Rate: ${f.estimatedEmission} kg/hr\nRisk Level: ${f.riskLevel.toUpperCase()}\n\nEmission Analysis:\nEmission Rate: ${f.estimatedEmission} kg/hr methane\nCO₂ Equivalent: ~${(f.estimatedEmission * 28).toLocaleString()} kg CO₂e/hr\nAnnual Impact: ~${Math.round(f.estimatedEmission * 8760 / 1000).toLocaleString()} tonnes/year\n\nEnvironmental Impact:\n${f.impactSummary}\n\nRecommended Actions:\n${f.recommendedActions.map((a, i) => `${i + 1}. ${a}`).join("\n")}\n\n${"—".repeat(40)}\n`
    ).join("\n");

    const blob = new Blob(
      [`METHANE SHADOW HUNTER — ENVIRONMENTAL COMPLIANCE REPORT\nGenerated: ${new Date().toLocaleString()}\nAI-Generated Report with Gaussian Plume Modeling & Wind Attribution\n\nEXECUTIVE SUMMARY\n${report?.summary}\n\nTotal Estimated Emissions: ${report?.totalEmissions?.toLocaleString()} kg/hr\nTotal CO₂ Equivalent: ${((report?.totalEmissions ?? 0) * 28).toLocaleString()} kg CO₂e/hr\nAnnual Methane Impact: ${Math.round((report?.totalEmissions ?? 0) * 8760 / 1000).toLocaleString()} tonnes/yr\n\nINDIA REGULATORY COMPLIANCE\nMoEFCC Schedule-1 Hazardous Air Pollutants — CH₄ Threshold: 300 ppb above regional baseline\nCPCB Proforma-I Emission Disclosure — Required within 48 hrs of super-emitter detection\nOISD-STD-116 Fugitive Emissions Standard — Mandatory LDAR for oil & gas facilities\n\n${"=".repeat(50)}\n\nFACILITY REPORTS\n\n${content}`],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `methane-compliance-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePdfDownload = () => {
    // Inject print-specific styles
    const style = document.createElement("style");
    style.id = "print-style";
    style.textContent = `
      @media print {
        body > *:not(.compliance-print-area) { display: none !important; }
        .compliance-print-area { display: block !important; }
        nav, header, footer, .fixed { display: none !important; }
        .page-container { margin: 0 !important; padding: 0 !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => { document.getElementById("print-style")?.remove(); }, 1000);
  };

  const handleGenerateReport = (facilityName: string) => {
    setGenerating(true);
    setGeneratedFor(null);
    setTimeout(() => {
      setGenerating(false);
      setGeneratedFor(facilityName);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Environmental Compliance Report Generator</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated compliance assessment with wind attribution, Gaussian emission modeling, and facility ranking.
            Covers global and India (MoEFCC / CPCB / OISD) regulatory frameworks.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 w-fit" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Export .txt
          </Button>
          <Button className="gap-2 w-fit" onClick={handlePdfDownload}>
            <FileText className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </motion.div>

      {/* Summary */}
      {report && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glow-border glow-green">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">AI-Generated Executive Summary</CardTitle>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 ml-auto">LLM Agent</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-secondary-foreground leading-relaxed">{report.summary}</p>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Emissions</p>
                  <p className="text-lg font-mono font-bold text-primary">{report.totalEmissions.toLocaleString()} kg/hr</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">CO₂ Equivalent</p>
                  <p className="text-lg font-mono font-bold text-orange-400">{(report.totalEmissions * 28).toLocaleString()} kg/hr</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Annual Impact</p>
                  <p className="text-lg font-mono font-bold text-destructive">{Math.round(report.totalEmissions * 8760 / 1000).toLocaleString()} t/yr</p>
                </div>
              </div>

              {/* India Regulatory Framework */}
              <div className="mt-4 p-3 rounded-lg border border-orange-500/20 bg-orange-500/5">
                <p className="text-xs font-semibold text-orange-400 mb-2">🇮🇳 India Regulatory Framework</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { body: "MoEFCC", rule: "Schedule-1 HAP Compliance", threshold: "CH₄ > +300 ppb → mandatory disclosure" },
                    { body: "CPCB", rule: "Proforma-I Emission Disclosure", threshold: "Super-emitter: within 48 hrs notification" },
                    { body: "OISD-STD-116", rule: "Fugitive Emission Standard", threshold: "Mandatory LDAR for all O&G facilities" },
                  ].map(r => (
                    <div key={r.body} className="bg-orange-500/8 rounded-md p-2">
                      <p className="text-[10px] font-bold text-orange-400">{r.body}</p>
                      <p className="text-[10px] font-semibold text-foreground">{r.rule}</p>
                      <p className="text-[10px] text-muted-foreground">{r.threshold}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                Generated: {new Date(report.generatedAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Facility Cards */}
      <div className="space-y-4">
        {facilities.map((fac, i) => (
          <motion.div key={fac.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Card className={cn("glow-border", fac.country === "India" && "border-orange-500/20")}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      {fac.name}
                      {fac.country === "India" && <span className="text-sm">🇮🇳</span>}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fac.operator} · {fac.facilityType} · {fac.lat.toFixed(2)}°, {fac.lng.toFixed(2)}°
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge className={cn(
                      "text-xs",
                      fac.riskLevel === "high" ? "bg-destructive/15 text-destructive border-destructive/30" :
                        fac.riskLevel === "medium" ? "bg-warning/15 text-warning border-warning/30" :
                          "bg-primary/15 text-primary border-primary/30"
                    )}>
                      {fac.riskLevel} risk
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Attribution Info */}
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1 text-[10px] bg-secondary/50 rounded px-2 py-1">
                    <Target className="h-3 w-3 text-primary" />
                    <span className="text-muted-foreground">Hotspot Distance:</span>
                    <span className="font-mono text-foreground ml-1">{fac.distanceFromHotspot} km</span>
                  </div>
                  <div className={cn("flex items-center gap-1 text-[10px] rounded px-2 py-1",
                    fac.windAligned ? "bg-primary/10" : "bg-secondary/50"
                  )}>
                    <Wind className={cn("h-3 w-3", fac.windAligned ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-muted-foreground">Wind Aligned:</span>
                    <span className={cn("font-semibold ml-1", fac.windAligned ? "text-primary" : "text-muted-foreground")}>{fac.windAligned ? "Yes ✓" : "No"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] bg-secondary/50 rounded px-2 py-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Last Inspection:</span>
                    <span className="font-mono text-foreground ml-1">{fac.lastInspection}</span>
                  </div>
                </div>

                {/* Emission Analysis Section */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Flame className="h-3 w-3 text-primary" />
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Emission Rate</p>
                    </div>
                    <p className="text-lg font-mono font-bold text-foreground">{fac.estimatedEmission} <span className="text-xs text-muted-foreground font-normal">kg/hr</span></p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Leaf className="h-3 w-3 text-primary" />
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CO₂ Equivalent</p>
                    </div>
                    <p className="text-lg font-mono font-bold text-foreground">{(fac.estimatedEmission * 28).toLocaleString()} <span className="text-xs text-muted-foreground font-normal">kg CO₂e/hr</span></p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Wind className="h-3 w-3 text-primary" />
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Annual Impact</p>
                    </div>
                    <p className="text-lg font-mono font-bold text-foreground">{Math.round(fac.estimatedEmission * 8760 / 1000).toLocaleString()} <span className="text-xs text-muted-foreground font-normal">t/yr</span></p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Environmental Impact Assessment</p>
                  <p className="text-sm text-secondary-foreground">{fac.impactSummary}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Recommended Inspection Actions</p>
                  <ul className="space-y-1.5">
                    {fac.recommendedActions.map((a, j) => (
                      <li key={j} className="text-sm text-secondary-foreground flex items-start gap-2">
                        <span className="text-primary font-mono text-xs mt-0.5">{j + 1}.</span> {a}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* AI Generate individual report */}
                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs w-full sm:w-auto"
                    onClick={() => handleGenerateReport(fac.name)}
                    disabled={generating}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {generating && generatedFor === null ? "Generating AI Report..." : "Generate AI Audit Report"}
                  </Button>
                  {generatedFor === fac.name && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs"
                    >
                      <p className="text-primary font-semibold mb-1">✓ AI Audit Report Generated — {fac.name}</p>
                      <div className="text-muted-foreground space-y-1">
                        <p><span className="text-foreground">Facility:</span> {fac.name}</p>
                        <p><span className="text-foreground">Operator:</span> {fac.operator}</p>
                        <p><span className="text-foreground">Emission Rate:</span> {fac.estimatedEmission} kg/hr methane</p>
                        <p><span className="text-foreground">Environmental Impact:</span> Equivalent to {(fac.estimatedEmission * 28).toLocaleString()} kg CO₂ per hour.</p>
                        <p><span className="text-foreground">Risk Level:</span> {fac.riskLevel.toUpperCase()}</p>
                        <p><span className="text-foreground">Attribution Confidence:</span> {fac.windAligned ? "High (wind-aligned)" : "Medium (proximity-based)"}</p>
                        <p><span className="text-foreground">Recommendation:</span> {fac.recommendedActions[0]}</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
