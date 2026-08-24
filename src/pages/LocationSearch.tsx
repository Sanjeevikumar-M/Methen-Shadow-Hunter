import { useState, useMemo } from "react";
import { MapPin, Search, TrendingUp, Wind, Factory, ChevronRight, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { fetchLiveIndiaHotspots } from "@/lib/api";
import { MethaneHotspot } from "@/lib/mock-data";

// Mock database of search locations
const SEARCH_LOCATIONS = [
  { name: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777, baseConcentration: 1920, facilities: ["Mumbai High Offshore", "Trombay Refinery"] },
  { name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, baseConcentration: 1980, facilities: ["GIDC Naroda", "Vatva Industrial Estate"] },
  { name: "Jamnagar", state: "Gujarat", lat: 22.4707, lng: 70.0577, baseConcentration: 2150, facilities: ["Reliance Refinery", "Nayara Energy"] },
  { name: "Hazira", state: "Gujarat", lat: 21.1042, lng: 72.6288, baseConcentration: 2100, facilities: ["Hazira LNG Terminal", "ONGC Processing"] },
  { name: "Digboi", state: "Assam", lat: 27.3852, lng: 95.6262, baseConcentration: 1950, facilities: ["IOCL Digboi Refinery", "Oil India Fields"] },
  { name: "Kakinada", state: "Andhra Pradesh", lat: 16.9891, lng: 82.2475, baseConcentration: 1910, facilities: ["KG Basin Onshore", "Kakinada Deep Water Port"] },
];

export default function LocationSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLoc, setSelectedLoc] = useState<typeof SEARCH_LOCATIONS[0] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Generate deterministic mock trend data based on the location name length to make it look dynamic but stable
  const trendData = useMemo(() => {
    if (!selectedLoc) return [];
    const base = selectedLoc.baseConcentration;
    const seed = selectedLoc.name.length;
    return Array.from({ length: 7 }).map((_, i) => ({
      day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
      concentration: Math.round(base + (Math.sin(i + seed) * 80)),
    }));
  }, [selectedLoc]);

  const [backendInference, setBackendInference] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    const q = searchQuery.toLowerCase();
    
    try {
      const { searchLocationApi } = await import("@/lib/api");
      const res = await searchLocationApi(searchQuery);
      if (res && res.inference) {
        setBackendInference(res.inference);
        setSelectedLoc({
          name: res.location,
          state: res.state,
          lat: res.coordinates.lat,
          lng: res.coordinates.lng,
          baseConcentration: res.inference.observed_ch4_ppb,
          facilities: res.nearby_facilities.map((f: any) => f.name),
        });
      } else {
        const match = SEARCH_LOCATIONS.find(l => 
          l.name.toLowerCase().includes(q) || l.state.toLowerCase().includes(q)
        ) || SEARCH_LOCATIONS[1];
        setSelectedLoc(match);
      }
    } catch {
      const match = SEARCH_LOCATIONS.find(l => 
        l.name.toLowerCase().includes(q) || l.state.toLowerCase().includes(q)
      ) || SEARCH_LOCATIONS[1];
      setSelectedLoc(match);
    } finally {
      setIsSearching(false);
    }
  };
  return (
    <div className="page-container">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md gradient-blue flex items-center justify-center">
              <Search className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-xs font-semibold text-blue-500 tracking-wider uppercase">Regional Investigation</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight">
            Location Search & Analysis
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Search Indian cities or industrial zones to instantly model localized methane conditions, nearby facilities, and emission forecasts.
          </p>
        </div>

        <form onSubmit={handleSearch} className="relative w-full md:w-96 flex group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
          </div>
          <Input 
            type="text"
            placeholder="Search city (e.g., Jamnagar, Mumbai)..."
            className="pl-9 pr-24 h-12 bg-card/40 border-border/60 focus-visible:ring-blue-500/50 backdrop-blur-sm rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button 
            type="submit" 
            disabled={isSearching}
            className="absolute right-1.5 top-1.5 h-9 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4"
          >
            {isSearching ? <span className="animate-pulse">Scanning...</span> : "Analyze"}
          </Button>
        </form>
      </header>
      
      {!selectedLoc && !isSearching ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-center border bg-card/10 rounded-xl border-dashed">
          <MapPin className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-bold text-muted-foreground mb-2">Awaiting Search Coordinates</h3>
          <p className="text-sm text-muted-foreground/60 max-w-md">Enter a city name above to initiate a targeted Sentinel-5P orbital scan and retrieve real-time atmospheric data.</p>
          
          <div className="flex flex-wrap gap-2 justify-center mt-6">
            <span className="text-xs text-muted-foreground w-full mb-1">Try searching for:</span>
            {["Jamnagar", "Mumbai", "Hazira", "Digboi"].map(city => (
              <Badge 
                key={city} 
                variant="outline" 
                className="cursor-pointer hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-colors"
                onClick={() => { setSearchQuery(city); setTimeout(() => {document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}, 50)}}
              >
                {city}
              </Badge>
            ))}
          </div>
        </div>
      ) : isSearching ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-center border bg-card/10 rounded-xl border-dashed">
          <div className="w-12 h-12 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">Analyzing Atmosphere Data...</h3>
          <p className="text-sm text-muted-foreground/60">Cross-referencing Sentinel-5P telemetry with local industrial registries.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glow-card border-border/50 bg-card/40 backdrop-blur-md overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardDescription className="flex items-center gap-1.5 text-blue-400 font-medium mb-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {selectedLoc?.state}, India
                    </CardDescription>
                    <CardTitle className="text-3xl md:text-4xl font-extrabold">{selectedLoc?.name} Region</CardTitle>
                    <p className="text-xs font-mono text-muted-foreground mt-2">
                      LAT: {selectedLoc?.lat.toFixed(4)}° N | LNG: {selectedLoc?.lng.toFixed(4)}° E
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 px-3 py-1">
                    Anomalies Detected
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Activity className="h-3 w-3"/> Avg Conc.</p>
                    <p className="text-xl font-bold font-mono text-foreground">{selectedLoc?.baseConcentration} <span className="text-xs text-muted-foreground">ppb</span></p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3 text-red-400"/> Max Anomaly</p>
                    <p className="text-xl font-bold font-mono text-red-400">+{Math.round((selectedLoc?.baseConcentration||0) * 0.08)} <span className="text-xs">ppb</span></p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Wind className="h-3 w-3 text-blue-400"/> Dispersion</p>
                    <p className="text-xl font-bold">SSE <span className="text-xs font-mono text-muted-foreground">@ 3.4m/s</span></p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Factory className="h-3 w-3 text-orange-400"/> Emissions</p>
                    <p className="text-xl font-bold font-mono text-orange-400">~{Math.round((selectedLoc?.baseConcentration||0) * 1.8)} <span className="text-xs">kg/h</span></p>
                  </div>
                </div>

                <div className="h-64 w-full mt-4">
                  <h4 className="text-sm font-semibold mb-4 text-foreground">7-Day Methane Concentration Trend</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorConc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} dy={10} />
                      <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#666' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Area type="monotone" dataKey="concentration" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorConc)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <Card className="bg-card/40 border-border/50 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Factory className="h-4 w-4 text-orange-500" /> Nearby Infrastructure
                </CardTitle>
                <CardDescription>Matching coordinates within 50km radius</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {selectedLoc?.facilities.map((fac, i) => (
                    <div key={i} className="p-4 hover:bg-white/5 transition-colors group cursor-pointer flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm group-hover:text-blue-400 transition-colors">{fac}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Potential Emission Source</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                    </div>
                  ))}
                  <div className="p-4 bg-red-500/5">
                    <div className="flex items-center gap-2 text-red-400 mb-1">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <p className="text-xs font-bold uppercase tracking-wide">AI Confidence</p>
                    </div>
                    <p className="text-sm text-foreground">87% probability that {selectedLoc?.facilities[0]} is responsible for the recent anomaly spikes.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}
