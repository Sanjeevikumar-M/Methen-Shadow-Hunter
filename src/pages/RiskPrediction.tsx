import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, Activity, CalendarDays, ArrowUpRight, Zap, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

// Mock predictive model data for regions in India
const PREDICTION_REGIONS = [
  { 
    id: "IND-GJ-01", 
    region: "Jamnagar Reliance Complex", 
    state: "Gujarat",
    currentConc: 2150,
    forecast48h: 2310,
    probabilityIncrease: 84,
    risk: "High",
    factors: ["Wind stagnating", "Refinery throughput +12%", "Historical leak pattern match"]
  },
  { 
    id: "IND-AS-02", 
    region: "Digboi Oil Field", 
    state: "Assam",
    currentConc: 1950,
    forecast48h: 2010,
    probabilityIncrease: 62,
    risk: "Moderate",
    factors: ["Aging pipeline infrastructure", "Seasonal pressure variations"]
  },
  { 
    id: "IND-MH-03", 
    region: "Mumbai High Offshore", 
    state: "Maharashtra",
    currentConc: 1920,
    forecast48h: 1890,
    probabilityIncrease: 15,
    risk: "Low",
    factors: ["Strong offshore dispersion winds", "Recent maintenance cycle complete"]
  }
];

// Generate fake forecast timeline data (Past 3 days + Next 2 days)
const generateForecastData = (base: number, volatility: number) => {
  const days = ["T-72h", "T-48h", "T-24h", "NOW", "T+24h", "T+48h"];
  return days.map((day, i) => {
    const isForecast = i > 3;
    const modifier = isForecast ? volatility * (i - 2) : (Math.random() - 0.5) * volatility;
    return {
      time: day,
      historical: isForecast ? null : Math.round(base + modifier),
      forecast: !isForecast ? null : Math.round(base + modifier),
      baseline: base
    };
  });
};

export default function RiskPrediction() {
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState(PREDICTION_REGIONS[0]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Simulate model loading
    setLoading(true);
    const timer = setTimeout(() => {
      const volatility = selectedRegion.risk === "High" ? 80 : selectedRegion.risk === "Moderate" ? 40 : -15;
      setChartData(generateForecastData(selectedRegion.currentConc, volatility));
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [selectedRegion]);

  return (
    <div className="page-container">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md gradient-purple flex items-center justify-center">
            <TrendingUp className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-xs font-semibold text-purple-500 tracking-wider uppercase">AI Forecasting</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight">
          Emission Risk Prediction
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Predictive spatial models calculating 48-hour methane concentration trajectories and quantitative emission risk probabilities across Indian industrial sectors.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Region Selector */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Monitored Zones</h3>
          {PREDICTION_REGIONS.map((region) => (
            <Card 
              key={region.id}
              className={`cursor-pointer transition-all border ${selectedRegion.id === region.id ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)] bg-purple-500/5' : 'border-border/50 bg-card/40 hover:bg-card/60'}`}
              onClick={() => setSelectedRegion(region)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-bold text-sm leading-tight text-foreground">{region.region}</p>
                </div>
                <div className="flex justify-between items-end">
                  <p className="text-xs text-muted-foreground">{region.state}</p>
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] uppercase font-bold
                      ${region.risk === 'High' ? 'text-red-400 border-red-500/30 bg-red-500/10' : 
                        region.risk === 'Moderate' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' : 
                        'text-green-400 border-green-500/30 bg-green-500/10'}`}
                  >
                    {region.risk}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Right Column: Prediction Details */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card/40 border-border/50 backdrop-blur-md">
              <CardContent className="p-5 flex flex-col justify-center h-full">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Target className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-semibold">Expected Concentration</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-mono font-bold text-foreground">
                    {loading ? "..." : selectedRegion.forecast48h}
                  </span>
                  <span className="text-sm text-muted-foreground pb-1">ppb (48h)</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Current: {selectedRegion.currentConc} ppb <span className="text-purple-400">({selectedRegion.forecast48h > selectedRegion.currentConc ? '+' : ''}{selectedRegion.forecast48h - selectedRegion.currentConc})</span>
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/40 border-border/50 backdrop-blur-md relative overflow-hidden">
              {selectedRegion.probabilityIncrease > 75 && (
                <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
              )}
              <CardContent className="p-5 flex flex-col justify-center h-full relative z-10">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <ArrowUpRight className="h-4 w-4 text-orange-400" />
                  <span className="text-sm font-semibold">Emission Increase Prob.</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className={`text-3xl font-mono font-bold ${selectedRegion.probabilityIncrease > 75 ? 'text-red-400' : 'text-foreground'}`}>
                    {loading ? "..." : `${selectedRegion.probabilityIncrease}%`}
                  </span>
                </div>
                <div className="w-full bg-secondary h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-1000" 
                    style={{ width: `${selectedRegion.probabilityIncrease}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-card/40 backdrop-blur-md border ${selectedRegion.risk === 'High' ? 'border-red-500/50' : selectedRegion.risk === 'Moderate' ? 'border-yellow-500/50' : 'border-green-500/50'}`}>
              <CardContent className="p-5 flex flex-col justify-center h-full items-center text-center">
                <AlertTriangle className={`h-8 w-8 mb-2 ${selectedRegion.risk === 'High' ? 'text-red-500' : selectedRegion.risk === 'Moderate' ? 'text-yellow-500' : 'text-green-500'}`} />
                <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">Risk Classification</span>
                <span className={`text-2xl font-black uppercase tracking-widest ${selectedRegion.risk === 'High' ? 'text-red-400' : selectedRegion.risk === 'Moderate' ? 'text-yellow-400' : 'text-green-400'}`}>
                  {selectedRegion.risk}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Forecast Chart */}
          <Card className="bg-card/40 border-border/50 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-purple-400" />
                72h Historical vs 48h Forecast
              </CardTitle>
              <CardDescription>Simulated AI trajectory model based on current atmospheric conditions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-purple-500 animate-spin" />
                </div>
              ) : (
                <div className="h-64 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} dy={10} />
                      <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))', fontSize: '13px' }}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px', marginBottom: '4px' }}
                      />
                      <ReferenceLine x="NOW" stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                      
                      <Line 
                        type="monotone" 
                        dataKey="historical" 
                        name="Historical (ppb)" 
                        stroke="#3b82f6" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} 
                        activeDot={{ r: 6 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="forecast" 
                        name="AI Forecast (ppb)" 
                        stroke="#a855f7" 
                        strokeWidth={3} 
                        strokeDasharray="5 5"
                        dot={{ r: 4, fill: '#a855f7', strokeWidth: 0 }} 
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Model Factors */}
          <Card className="bg-card/40 border-border/50 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Primary Risk Factors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {selectedRegion.factors.map((factor, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground bg-white/5 p-2 rounded-md">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
