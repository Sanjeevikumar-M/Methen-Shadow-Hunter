import { useState, useEffect } from "react";
import { fetchLiveIndiaHotspots, fetchLiveStats } from "@/lib/api";
import type { MethaneHotspot } from "@/lib/mock-data";

export function useHotspots() {
  const [hotspots, setHotspots] = useState<MethaneHotspot[]>([]);
  const [liveStats, setLiveStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [hData, sData] = await Promise.all([
          fetchLiveIndiaHotspots(),
          fetchLiveStats()
        ]);
        setHotspots(hData);
        setLiveStats(sData);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    
    loadData();
    const timer = setInterval(loadData, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return { hotspots, liveStats, loading };
}
