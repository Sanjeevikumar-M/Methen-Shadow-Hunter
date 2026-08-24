import { useState, useEffect } from "react";
import { fetchNearestFacilities, type Facility as ApiFacility } from "@/lib/api";
import { fetchFacilities as fetchMockFacilities, fetchReport, type Facility } from "@/lib/mock-data";

export function useFacilities() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [report, setReport] = useState<{ summary: string; generatedAt: string; totalEmissions: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Try live API first
        const [liveFacilities, reportData] = await Promise.all([
          fetchNearestFacilities(),
          fetchReport(),
        ]);

        if (liveFacilities && liveFacilities.length > 0) {
          // Map API facility shape to the mock Facility shape for compatibility
          const mapped: Facility[] = liveFacilities.map((f, i) => ({
            id: `fac-${i}`,
            name: f.name,
            type: f.type as Facility["type"],
            lat: f.lat,
            lng: f.lng,
            totalEmissions: 0,
            trend: "stable" as const,
            complianceStatus: "compliant" as const,
          }));
          setFacilities(mapped);
        } else {
          // Fallback to mock data
          const mockFacilities = await fetchMockFacilities();
          setFacilities(mockFacilities);
        }

        setReport(reportData);
      } catch (err) {
        console.warn("Live facilities unavailable – using mock data", err);
        const [mockFacilities, reportData] = await Promise.all([
          fetchMockFacilities(),
          fetchReport(),
        ]);
        setFacilities(mockFacilities);
        setReport(reportData);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { facilities, report, loading };
}
