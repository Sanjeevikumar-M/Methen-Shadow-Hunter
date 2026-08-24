export interface MethaneHotspot {
  id: string;
  lat: number;
  lng: number;
  concentration: number; // ppb
  regionalAverage: number; // ppb - for anomaly detection
  anomalyDelta: number; // ppb above regional average
  emissionRate: number; // kg/hr
  gaussianEmissionRate: number; // kg/hr via Gaussian plume model
  confidenceScore: number;
  nearestFacility: string;
  facilityRank: number; // 1=most likely responsible
  detectedAt: string;
  plumeArea: number; // km²
  plumeLength: number; // km
  plumeWidth: number; // km
  windSpeed: number; // m/s
  windDirection: number; // degrees
  windDirectionLabel: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  highResTrigger: boolean; // triggered multi-scale fusion
  source: "Sentinel-5P" | "CarbonMapper" | "MethaneSAT" | "GHGSat";
  country?: string;
  region?: string;
}

export interface EmissionEstimate {
  month: string;
  concentration: number;
  emissionRate: number;
  plumeSize: number;
  anomaly: number;
  baseline: number;
}

export interface Facility {
  id: string;
  name: string;
  operator: string;
  lat: number;
  lng: number;
  estimatedEmission: number;
  impactSummary: string;
  recommendedActions: string[];
  riskLevel: "high" | "medium" | "low";
  facilityType: string;
  lastInspection: string;
  distanceFromHotspot: number; // km
  windAligned: boolean;
  country?: string;
}

export interface WindData {
  speed: number; // m/s
  direction: number; // degrees
  label: string;
  plumeDirection: string;
  source: string;
}

export interface IndiaStateStats {
  state: string;
  code: string;
  avgConcentration: number;
  regionalAverage: number;
  anomalyDelta: number;
  hotspots: number;
  dominantSector: string;
  riskLevel: "critical" | "high" | "medium" | "low";
}

export interface IndiaSatellitePass {
  satellite: string;
  orbitId: string;
  scheduledTime: string;
  coverageRegion: string;
  resolution: string;
  status: "completed" | "upcoming" | "in-progress";
}

export interface RiskPrediction {
  id: string;
  lat: number;
  lng: number;
  region: string;
  country: string;
  riskScore: number; // 0-100
  riskLevel: "high" | "medium" | "low";
  factors: string[];
}

function windLabel(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function plumeDirectionLabel(deg: number): string {
  const opposite = (deg + 180) % 360;
  const label = windLabel(opposite);
  const toFull: Record<string, string> = {
    N: "North", NNE: "North-NorthEast", NE: "North-East", ENE: "East-NorthEast",
    E: "East", ESE: "East-SouthEast", SE: "South-East", SSE: "South-SouthEast",
    S: "South", SSW: "South-SouthWest", SW: "South-West", WSW: "West-SouthWest",
    W: "West", WNW: "West-NorthWest", NW: "North-West", NNW: "North-NorthWest"
  };
  return toFull[label] ?? label;
}

// Gaussian Plume Model simplified emission rate
// E ≈ C × u × σy × σz × π where C=concentration, u=wind speed
function gaussianEmission(anomaly: number, windSpeed: number, plumeWidth: number): number {
  return Math.round(anomaly * windSpeed * plumeWidth * 0.042);
}

const REGIONAL_AVERAGES: Record<string, number> = {
  "Iraq": 1720, "Turkmenistan": 1740, "Russia": 1730, "China": 1710,
  "USA": 1695, "Qatar": 1700, "Brazil": 1680, "Kazakhstan": 1715, "India": 1725,
};

// ─── Global Hotspots ─────────────────────────────────────────────────────────
export const mockHotspots: MethaneHotspot[] = [
  {
    id: "HS-001", lat: 31.77, lng: 47.85, country: "Iraq", region: "Southern Iraq",
    concentration: 2150, regionalAverage: 1720, anomalyDelta: 430,
    emissionRate: 485, gaussianEmissionRate: gaussianEmission(430, 6.2, 3.1),
    confidenceScore: 0.94, nearestFacility: "Rumaila Oil Field", facilityRank: 1,
    detectedAt: "2026-03-10T14:23:00Z", plumeArea: 12.4, plumeLength: 4.8, plumeWidth: 2.6,
    windSpeed: 6.2, windDirection: 225, windDirectionLabel: windLabel(225),
    riskLevel: "high", highResTrigger: true, source: "Sentinel-5P",
  },
  {
    id: "HS-002", lat: 36.18, lng: 44.01, country: "Iraq", region: "Northern Iraq",
    concentration: 1890, regionalAverage: 1720, anomalyDelta: 170,
    emissionRate: 320, gaussianEmissionRate: gaussianEmission(170, 4.8, 2.1),
    confidenceScore: 0.89, nearestFacility: "Kirkuk Oil Field", facilityRank: 1,
    detectedAt: "2026-03-09T08:15:00Z", plumeArea: 8.7, plumeLength: 3.6, plumeWidth: 2.4,
    windSpeed: 4.8, windDirection: 155, windDirectionLabel: windLabel(155),
    riskLevel: "medium", highResTrigger: false, source: "Sentinel-5P",
  },
  {
    id: "HS-003", lat: 39.76, lng: 54.42, country: "Turkmenistan", region: "Caspian",
    concentration: 2480, regionalAverage: 1740, anomalyDelta: 740,
    emissionRate: 610, gaussianEmissionRate: gaussianEmission(740, 7.5, 4.2),
    confidenceScore: 0.97, nearestFacility: "Galkynysh Gas Field", facilityRank: 1,
    detectedAt: "2026-03-11T03:45:00Z", plumeArea: 18.2, plumeLength: 6.4, plumeWidth: 2.8,
    windSpeed: 7.5, windDirection: 310, windDirectionLabel: windLabel(310),
    riskLevel: "critical", highResTrigger: true, source: "CarbonMapper",
  },
  {
    id: "HS-004", lat: 31.97, lng: 104.17, country: "China", region: "Sichuan",
    concentration: 1720, regionalAverage: 1710, anomalyDelta: 10,
    emissionRate: 275, gaussianEmissionRate: gaussianEmission(10, 3.1, 1.8),
    confidenceScore: 0.82, nearestFacility: "Sichuan Basin Plant", facilityRank: 2,
    detectedAt: "2026-03-08T19:30:00Z", plumeArea: 6.1, plumeLength: 2.8, plumeWidth: 2.2,
    windSpeed: 3.1, windDirection: 90, windDirectionLabel: windLabel(90),
    riskLevel: "low", highResTrigger: false, source: "Sentinel-5P",
  },
  {
    id: "HS-005", lat: 31.42, lng: 48.75, country: "Iraq", region: "Southern Iraq",
    concentration: 1950, regionalAverage: 1720, anomalyDelta: 230,
    emissionRate: 390, gaussianEmissionRate: gaussianEmission(230, 5.3, 2.7),
    confidenceScore: 0.91, nearestFacility: "West Qurna Field", facilityRank: 1,
    detectedAt: "2026-03-10T22:10:00Z", plumeArea: 10.3, plumeLength: 3.9, plumeWidth: 2.6,
    windSpeed: 5.3, windDirection: 200, windDirectionLabel: windLabel(200),
    riskLevel: "high", highResTrigger: true, source: "MethaneSAT",
  },
  {
    id: "HS-006", lat: 25.28, lng: 51.53, country: "Qatar", region: "Persian Gulf",
    concentration: 1580, regionalAverage: 1700, anomalyDelta: -120,
    emissionRate: 220, gaussianEmissionRate: gaussianEmission(50, 2.8, 1.5),
    confidenceScore: 0.78, nearestFacility: "Dukhan Oil Field", facilityRank: 2,
    detectedAt: "2026-03-07T11:00:00Z", plumeArea: 4.8, plumeLength: 2.2, plumeWidth: 2.2,
    windSpeed: 2.8, windDirection: 45, windDirectionLabel: windLabel(45),
    riskLevel: "low", highResTrigger: false, source: "Sentinel-5P",
  },
  {
    id: "HS-007", lat: 56.13, lng: 75.45, country: "Russia", region: "West Siberia",
    concentration: 2320, regionalAverage: 1730, anomalyDelta: 590,
    emissionRate: 540, gaussianEmissionRate: gaussianEmission(590, 8.1, 3.8),
    confidenceScore: 0.95, nearestFacility: "Samotlor Field", facilityRank: 1,
    detectedAt: "2026-03-11T07:20:00Z", plumeArea: 15.6, plumeLength: 5.8, plumeWidth: 2.7,
    windSpeed: 8.1, windDirection: 270, windDirectionLabel: windLabel(270),
    riskLevel: "critical", highResTrigger: true, source: "GHGSat",
  },
  {
    id: "HS-008", lat: 32.35, lng: -103.68, country: "USA", region: "Permian Basin",
    concentration: 1680, regionalAverage: 1695, anomalyDelta: -15,
    emissionRate: 290, gaussianEmissionRate: gaussianEmission(60, 4.5, 2.0),
    confidenceScore: 0.86, nearestFacility: "Permian Basin Site", facilityRank: 2,
    detectedAt: "2026-03-09T16:45:00Z", plumeArea: 7.2, plumeLength: 3.0, plumeWidth: 2.4,
    windSpeed: 4.5, windDirection: 180, windDirectionLabel: windLabel(180),
    riskLevel: "medium", highResTrigger: false, source: "CarbonMapper",
  },
  {
    id: "HS-009", lat: -21.18, lng: -49.63, country: "Brazil", region: "São Paulo",
    concentration: 1420, regionalAverage: 1680, anomalyDelta: -260,
    emissionRate: 180, gaussianEmissionRate: gaussianEmission(30, 2.2, 1.4),
    confidenceScore: 0.74, nearestFacility: "São Paulo Landfill", facilityRank: 1,
    detectedAt: "2026-03-06T13:30:00Z", plumeArea: 3.5, plumeLength: 1.8, plumeWidth: 1.9,
    windSpeed: 2.2, windDirection: 120, windDirectionLabel: windLabel(120),
    riskLevel: "low", highResTrigger: false, source: "Sentinel-5P",
  },
  {
    id: "HS-010", lat: 51.52, lng: 52.45, country: "Russia", region: "Orenburg",
    concentration: 2050, regionalAverage: 1715, anomalyDelta: 335,
    emissionRate: 425, gaussianEmissionRate: gaussianEmission(335, 6.8, 3.0),
    confidenceScore: 0.92, nearestFacility: "Orenburg Gas Plant", facilityRank: 1,
    detectedAt: "2026-03-10T05:15:00Z", plumeArea: 11.8, plumeLength: 4.4, plumeWidth: 2.7,
    windSpeed: 6.8, windDirection: 50, windDirectionLabel: windLabel(50),
    riskLevel: "high", highResTrigger: true, source: "MethaneSAT",
  },
];

// ─── India Hotspots ───────────────────────────────────────────────────────────
export const indiaHotspots: MethaneHotspot[] = [
  {
    id: "IN-001", lat: 21.89, lng: 72.93, country: "India", region: "Gujarat",
    concentration: 2080, regionalAverage: 1725, anomalyDelta: 355,
    emissionRate: 412, gaussianEmissionRate: gaussianEmission(355, 5.8, 2.9),
    confidenceScore: 0.93, nearestFacility: "ONGC Gandhar Gas Plant", facilityRank: 1,
    detectedAt: "2026-03-11T09:10:00Z", plumeArea: 11.2, plumeLength: 4.4, plumeWidth: 2.5,
    windSpeed: 5.8, windDirection: 190, windDirectionLabel: windLabel(190),
    riskLevel: "high", highResTrigger: true, source: "Sentinel-5P",
  },
  {
    id: "IN-002", lat: 18.88, lng: 72.82, country: "India", region: "Maharashtra",
    concentration: 2210, regionalAverage: 1725, anomalyDelta: 485,
    emissionRate: 490, gaussianEmissionRate: gaussianEmission(485, 6.4, 3.3),
    confidenceScore: 0.96, nearestFacility: "ONGC Uran Plant (Mumbai High)", facilityRank: 1,
    detectedAt: "2026-03-12T05:45:00Z", plumeArea: 14.1, plumeLength: 5.2, plumeWidth: 2.7,
    windSpeed: 6.4, windDirection: 230, windDirectionLabel: windLabel(230),
    riskLevel: "critical", highResTrigger: true, source: "CarbonMapper",
  },
  {
    id: "IN-003", lat: 27.02, lng: 71.38, country: "India", region: "Rajasthan",
    concentration: 1960, regionalAverage: 1725, anomalyDelta: 235,
    emissionRate: 345, gaussianEmissionRate: gaussianEmission(235, 5.1, 2.6),
    confidenceScore: 0.89, nearestFacility: "Cairn Energy Barmer Block", facilityRank: 1,
    detectedAt: "2026-03-10T14:30:00Z", plumeArea: 9.4, plumeLength: 3.8, plumeWidth: 2.5,
    windSpeed: 5.1, windDirection: 145, windDirectionLabel: windLabel(145),
    riskLevel: "high", highResTrigger: false, source: "Sentinel-5P",
  },
  {
    id: "IN-004", lat: 27.20, lng: 94.72, country: "India", region: "Assam",
    concentration: 2350, regionalAverage: 1725, anomalyDelta: 625,
    emissionRate: 558, gaussianEmissionRate: gaussianEmission(625, 7.2, 3.6),
    confidenceScore: 0.97, nearestFacility: "ONGC Duliajan Assam Fields", facilityRank: 1,
    detectedAt: "2026-03-11T03:20:00Z", plumeArea: 17.3, plumeLength: 6.1, plumeWidth: 2.8,
    windSpeed: 7.2, windDirection: 70, windDirectionLabel: windLabel(70),
    riskLevel: "critical", highResTrigger: true, source: "MethaneSAT",
  },
  {
    id: "IN-005", lat: 17.01, lng: 82.24, country: "India", region: "Andhra Pradesh",
    concentration: 1870, regionalAverage: 1725, anomalyDelta: 145,
    emissionRate: 285, gaussianEmissionRate: gaussianEmission(145, 4.3, 2.1),
    confidenceScore: 0.84, nearestFacility: "Petronet LNG Gangavaram", facilityRank: 2,
    detectedAt: "2026-03-09T18:55:00Z", plumeArea: 7.8, plumeLength: 3.2, plumeWidth: 2.4,
    windSpeed: 4.3, windDirection: 315, windDirectionLabel: windLabel(315),
    riskLevel: "medium", highResTrigger: false, source: "Sentinel-5P",
  },
  {
    id: "IN-006", lat: 28.61, lng: 77.23, country: "India", region: "Delhi NCR",
    concentration: 1940, regionalAverage: 1725, anomalyDelta: 215,
    emissionRate: 310, gaussianEmissionRate: gaussianEmission(215, 3.8, 2.3),
    confidenceScore: 0.87, nearestFacility: "Delhi NCR Landfill Complex", facilityRank: 1,
    detectedAt: "2026-03-10T21:40:00Z", plumeArea: 8.6, plumeLength: 3.5, plumeWidth: 2.5,
    windSpeed: 3.8, windDirection: 100, windDirectionLabel: windLabel(100),
    riskLevel: "medium", highResTrigger: false, source: "Sentinel-5P",
  },
  {
    id: "IN-007", lat: 21.13, lng: 72.64, country: "India", region: "Gujarat",
    concentration: 2090, regionalAverage: 1725, anomalyDelta: 365,
    emissionRate: 425, gaussianEmissionRate: gaussianEmission(365, 6.0, 3.0),
    confidenceScore: 0.92, nearestFacility: "Shell Hazira LNG Terminal", facilityRank: 1,
    detectedAt: "2026-03-11T12:15:00Z", plumeArea: 12.0, plumeLength: 4.6, plumeWidth: 2.6,
    windSpeed: 6.0, windDirection: 215, windDirectionLabel: windLabel(215),
    riskLevel: "high", highResTrigger: true, source: "GHGSat",
  },
  {
    id: "IN-008", lat: 23.02, lng: 72.57, country: "India", region: "Gujarat",
    concentration: 1780, regionalAverage: 1725, anomalyDelta: 55,
    emissionRate: 198, gaussianEmissionRate: gaussianEmission(55, 2.9, 1.8),
    confidenceScore: 0.79, nearestFacility: "BPCL Koyali Refinery", facilityRank: 2,
    detectedAt: "2026-03-08T16:00:00Z", plumeArea: 5.1, plumeLength: 2.4, plumeWidth: 2.1,
    windSpeed: 2.9, windDirection: 340, windDirectionLabel: windLabel(340),
    riskLevel: "low", highResTrigger: false, source: "Sentinel-5P",
  },
];

export const allHotspots: MethaneHotspot[] = [...mockHotspots, ...indiaHotspots];

// ─── India State Stats ────────────────────────────────────────────────────────
export const indiaStateStats: IndiaStateStats[] = [
  { state: "Assam", code: "AS", avgConcentration: 2350, regionalAverage: 1725, anomalyDelta: 625, hotspots: 1, dominantSector: "Crude Oil Production", riskLevel: "critical" },
  { state: "Maharashtra", code: "MH", avgConcentration: 2210, regionalAverage: 1725, anomalyDelta: 485, hotspots: 1, dominantSector: "Offshore Gas / LNG", riskLevel: "critical" },
  { state: "Gujarat", code: "GJ", avgConcentration: 2010, regionalAverage: 1725, anomalyDelta: 285, hotspots: 3, dominantSector: "LNG / Petroleum Refining", riskLevel: "high" },
  { state: "Rajasthan", code: "RJ", avgConcentration: 1960, regionalAverage: 1725, anomalyDelta: 235, hotspots: 1, dominantSector: "Crude Oil Extraction", riskLevel: "high" },
  { state: "Delhi NCR", code: "DL", avgConcentration: 1940, regionalAverage: 1725, anomalyDelta: 215, hotspots: 1, dominantSector: "Municipal Landfill", riskLevel: "medium" },
  { state: "Andhra Pradesh", code: "AP", avgConcentration: 1870, regionalAverage: 1725, anomalyDelta: 145, hotspots: 1, dominantSector: "LNG Import Terminal", riskLevel: "medium" },
  { state: "West Bengal", code: "WB", avgConcentration: 1820, regionalAverage: 1725, anomalyDelta: 95, hotspots: 0, dominantSector: "Landfill / Coal", riskLevel: "low" },
  { state: "Madhya Pradesh", code: "MP", avgConcentration: 1790, regionalAverage: 1725, anomalyDelta: 65, hotspots: 0, dominantSector: "Coal Mine Gas", riskLevel: "low" },
  { state: "Tamil Nadu", code: "TN", avgConcentration: 1760, regionalAverage: 1725, anomalyDelta: 35, hotspots: 0, dominantSector: "Power Plants", riskLevel: "low" },
  { state: "Punjab", code: "PB", avgConcentration: 1750, regionalAverage: 1725, anomalyDelta: 25, hotspots: 0, dominantSector: "Agriculture / Paddy", riskLevel: "low" },
];

// ─── India Satellite Passes ───────────────────────────────────────────────────
export const indiaSatellitePasses: IndiaSatellitePass[] = [
  { satellite: "Sentinel-5P", orbitId: "S5P-36421", scheduledTime: "2026-03-12T06:15:00Z", coverageRegion: "Gujarat & Rajasthan", resolution: "7×7 km", status: "completed" },
  { satellite: "Sentinel-5P", orbitId: "S5P-36422", scheduledTime: "2026-03-12T07:55:00Z", coverageRegion: "Maharashtra & Goa", resolution: "7×7 km", status: "completed" },
  { satellite: "MethaneSAT", orbitId: "MSAT-1240", scheduledTime: "2026-03-12T09:30:00Z", coverageRegion: "Assam & NE India", resolution: "1 km", status: "completed" },
  { satellite: "Sentinel-5P", orbitId: "S5P-36423", scheduledTime: "2026-03-12T13:45:00Z", coverageRegion: "Delhi NCR & UP", resolution: "7×7 km", status: "in-progress" },
  { satellite: "CarbonMapper", orbitId: "CM-0881", scheduledTime: "2026-03-12T15:20:00Z", coverageRegion: "Andhra Pradesh Coast", resolution: "30 m", status: "upcoming" },
  { satellite: "Sentinel-5P", orbitId: "S5P-36424", scheduledTime: "2026-03-12T17:10:00Z", coverageRegion: "Rajasthan & Gujarat", resolution: "7×7 km", status: "upcoming" },
  { satellite: "GHGSat", orbitId: "GHG-D10-182", scheduledTime: "2026-03-12T19:00:00Z", coverageRegion: "Mumbai High Offshore", resolution: "25 m", status: "upcoming" },
];

export const mockEmissionTrends: EmissionEstimate[] = [
  { month: "Oct", concentration: 1820, emissionRate: 310, plumeSize: 7.2, anomaly: 100, baseline: 1720 },
  { month: "Nov", concentration: 1950, emissionRate: 345, plumeSize: 8.5, anomaly: 230, baseline: 1720 },
  { month: "Dec", concentration: 2100, emissionRate: 390, plumeSize: 10.1, anomaly: 380, baseline: 1720 },
  { month: "Jan", concentration: 2250, emissionRate: 420, plumeSize: 11.8, anomaly: 530, baseline: 1720 },
  { month: "Feb", concentration: 2180, emissionRate: 405, plumeSize: 11.2, anomaly: 460, baseline: 1720 },
  { month: "Mar", concentration: 2350, emissionRate: 460, plumeSize: 13.4, anomaly: 630, baseline: 1720 },
];

export const mockFacilities: Facility[] = [
  // ── India ────────────────────────────────────────────────────────────────
  {
    id: "FAC-IND-001", name: "ONGC Duliajan Assam Fields", operator: "ONGC Ltd.", country: "India",
    lat: 27.20, lng: 94.72, estimatedEmission: 558,
    facilityType: "Oil & Gas Production", lastInspection: "2025-10-12",
    distanceFromHotspot: 0.6, windAligned: true,
    impactSummary: "Highest India anomaly at +625 ppb. Wind-aligned plume drifting East at 7.2 m/s. Critical super-emitter event. CPCB notification required within 24 hours. MethaneSAT high-res confirms plume from Duliajan cluster.",
    recommendedActions: ["Issue MoEFCC super-emitter notice", "OISD emergency inspection", "Deploy ground LDAR sensors", "Cross-notify Nagaland/Arunachal Pradesh border authorities"],
    riskLevel: "high",
  },
  {
    id: "FAC-IND-002", name: "ONGC Uran Plant (Mumbai High)", operator: "ONGC Ltd.", country: "India",
    lat: 18.88, lng: 72.82, estimatedEmission: 490,
    facilityType: "Offshore Gas Processing", lastInspection: "2025-09-05",
    distanceFromHotspot: 1.0, windAligned: true,
    impactSummary: "Critical offshore emission at +485 ppb. Mumbai High platform complex is primary attribution. CarbonMapper confirms plume toward SW Maharashtra coast. High shipping lane methane exposure risk.",
    recommendedActions: ["Offshore LDAR drone inspection", "Emergency shutdown protocol review", "Notify Coast Guard for maritime monitoring", "Submit CPCB Proforma-I disclosure"],
    riskLevel: "high",
  },
  {
    id: "FAC-IND-003", name: "ONGC Gandhar Gas Plant", operator: "ONGC Ltd.", country: "India",
    lat: 21.89, lng: 72.93, estimatedEmission: 412,
    facilityType: "Gas Processing Plant", lastInspection: "2025-11-22",
    distanceFromHotspot: 1.4, windAligned: true,
    impactSummary: "Significant anomaly +355 ppb over Gujarat coastal zone. Plume drifting S toward Gulf of Khambhat. Inspection overdue by 4 months. OISD-STD-116 compliance review triggered.",
    recommendedActions: ["OISD inspection under STD-116", "Fugitive emission survey at compressor stations", "Review flare gas recovery system", "Gujarat SPCB notice for Schedule-1 violation"],
    riskLevel: "high",
  },
  {
    id: "FAC-IND-004", name: "Shell Hazira LNG Terminal", operator: "Shell India", country: "India",
    lat: 21.13, lng: 72.64, estimatedEmission: 425,
    facilityType: "LNG Import Terminal", lastInspection: "2025-12-10",
    distanceFromHotspot: 0.9, windAligned: true,
    impactSummary: "High-emission event at Hazira LNG jetty. GHGSat 25 m imagery confirms plume from LNG storage tank cluster. +365 ppb anomaly exceeds CPCB threshold. Possible BOG management failure.",
    recommendedActions: ["Inspect BOG compressor for leaks", "Review LNG loading arm seal integrity", "Third-party emission audit under Environment Act 1986", "Notify local MCZR authorities"],
    riskLevel: "high",
  },
  {
    id: "FAC-IND-005", name: "Cairn Energy Barmer Block", operator: "Vedanta / Cairn", country: "India",
    lat: 27.02, lng: 71.38, estimatedEmission: 345,
    facilityType: "Oil Production Block", lastInspection: "2025-07-18",
    distanceFromHotspot: 2.1, windAligned: true,
    impactSummary: "Moderate emission from Rajasthan oil block. +235 ppb anomaly. Wellhead gas flaring suspected. Rajasthan India's largest onshore oil producer — priority monitoring zone.",
    recommendedActions: ["Aerial reconnaissance of Mangala Processing Terminal", "Review gas utilization plan compliance", "Submit DGH quarterly emission return", "Evaluate gas lift system leakage"],
    riskLevel: "medium",
  },
  // ── Global ────────────────────────────────────────────────────────────────
  {
    id: "FAC-001", name: "Rumaila Oil Field", operator: "BP / CNPC", country: "Iraq",
    lat: 31.77, lng: 47.85, estimatedEmission: 485,
    facilityType: "Oil Production", lastInspection: "2025-11-15",
    distanceFromHotspot: 1.2, windAligned: true,
    impactSummary: "Significant methane plume over 12.4 km². Emission anomaly of +430 ppb above regional baseline. Gaussian plume modeling confirms emission rate of 485 kg/hr. Facility ranked #1 by wind-direction alignment.",
    recommendedActions: ["Deploy ground-based methane sensors", "Conduct aerial LDAR survey", "Issue EPA Super-Emitter compliance notice", "Require 30-day remediation plan"],
    riskLevel: "high",
  },
  {
    id: "FAC-002", name: "Galkynysh Gas Field", operator: "Türkmengaz", country: "Turkmenistan",
    lat: 39.76, lng: 54.42, estimatedEmission: 610,
    facilityType: "Gas Production", lastInspection: "2025-08-20",
    distanceFromHotspot: 0.8, windAligned: true,
    impactSummary: "Largest detected plume at 18.2 km² with anomaly of +740 ppb. Persistent super-emitter event >72 hours. Cross-border transport detected toward Iran.",
    recommendedActions: ["Escalate to UNEP IMEO", "Request operator emergency disclosure", "Multi-satellite tracking protocol", "Cross-border regulatory response"],
    riskLevel: "high",
  },
  {
    id: "FAC-003", name: "Samotlor Field", operator: "Rosneft", country: "Russia",
    lat: 56.13, lng: 75.45, estimatedEmission: 540,
    facilityType: "Oil Production", lastInspection: "2025-09-30",
    distanceFromHotspot: 1.5, windAligned: true,
    impactSummary: "Major event with 15.6 km² plume and +590 ppb anomaly. Boreal forest ecosystem impact zone. High wind speed (8.1 m/s) accelerating westward transport.",
    recommendedActions: ["Cold-weather aerial monitoring", "UAV inspection team", "Cross-reference satellite flaring data", "Environmental impact assessment for boreal zone"],
    riskLevel: "high",
  },
  {
    id: "FAC-004", name: "Permian Basin Site", operator: "Various Operators", country: "USA",
    lat: 32.35, lng: -103.68, estimatedEmission: 290,
    facilityType: "Oil & Gas Well Cluster", lastInspection: "2026-01-10",
    distanceFromHotspot: 3.4, windAligned: false,
    impactSummary: "Moderate clustered emission from well sites. Not wind-aligned — lower attribution confidence. Possible pneumatic controller or completion leaks.",
    recommendedActions: ["Well-by-well LDAR inspection", "Review completion practices", "Assess pneumatic controller emissions", "Submit EPA OOOOa compliance verification"],
    riskLevel: "medium",
  },
  {
    id: "FAC-005", name: "São Paulo Landfill", operator: "Municipal Authority", country: "Brazil",
    lat: -21.18, lng: -49.63, estimatedEmission: 180,
    facilityType: "Municipal Landfill", lastInspection: "2025-12-01",
    distanceFromHotspot: 2.1, windAligned: true,
    impactSummary: "Persistent but below-threshold landfill gas emission. Gas capture system may be underperforming. Low immediate risk but requires ongoing monitoring.",
    recommendedActions: ["Audit landfill gas capture efficiency", "Inspect geomembrane cover integrity", "Review gas collection well spacing", "Evaluate flare combustion efficiency"],
    riskLevel: "low",
  },
];

export const mockReport = {
  generatedAt: "2026-03-12T10:00:00Z",
  totalFacilities: 10,
  totalEmissions: 5128,
  summary: "Sentinel-5P TROPOMI analysis reveals 18 significant methane anomalies across 7 countries including 8 sites in India. Anomaly detection (CH₄ vs. regional baseline) identifies 13 true hotspots above threshold. Five facilities classified as super-emitters (>400 kg/hr). India contributes 3,023 kg/hr — 59% of total detected emissions. Gaussian plume modeling estimates combined emission of 5,128 kg/hr. ONGC Duliajan Assam Fields is the highest Indian priority at 558 kg/hr with +625 ppb anomaly. Galkynysh Gas Field (Turkmenistan) remains the global #1 at 610 kg/hr.",
};

export const mockRiskPredictions: RiskPrediction[] = [
  { id: "RISK-001", lat: 51.0, lng: 60.0, region: "Orenburg Region", country: "Russia", riskScore: 88, riskLevel: "high", factors: ["Historical hotspot cluster", "Aging pipeline infrastructure", "Seasonal freeze-thaw stress"] },
  { id: "RISK-002", lat: 40.5, lng: 53.0, region: "Caspian Corridor", country: "Turkmenistan", riskScore: 92, riskLevel: "high", factors: ["Super-emitter history", "No recent LDAR inspection", "High wind transport risk"] },
  { id: "RISK-003", lat: 31.5, lng: 46.0, region: "Southern Iraq", country: "Iraq", riskScore: 75, riskLevel: "high", factors: ["Dense facility cluster", "Known flaring activity", "Warm-season venting risk"] },
  { id: "RISK-IND-001", lat: 27.2, lng: 94.7, region: "Assam Oil Belt", country: "India", riskScore: 91, riskLevel: "high", factors: ["Active super-emitter detected", "Aging ONGC infrastructure", "Remote monitoring gap"] },
  { id: "RISK-IND-002", lat: 21.5, lng: 72.7, region: "Gujarat Coast", country: "India", riskScore: 83, riskLevel: "high", factors: ["Multiple LNG terminals", "High monsoon wind variability", "Dense facility cluster"] },
  { id: "RISK-IND-003", lat: 19.0, lng: 73.0, region: "Mumbai High Offshore", country: "India", riskScore: 78, riskLevel: "high", factors: ["Offshore platform aging", "High maritime traffic zone", "Limited in-situ sensors"] },
  { id: "RISK-004", lat: 32.0, lng: -102.0, region: "Permian Basin", country: "USA", riskScore: 58, riskLevel: "medium", factors: ["High drilling activity", "Distributed well sites", "Mid-range anomaly history"] },
  { id: "RISK-005", lat: 55.0, lng: 80.0, region: "West Siberia", country: "Russia", riskScore: 63, riskLevel: "medium", factors: ["Permafrost degradation", "Aging Soviet-era infrastructure", "Limited monitoring"] },
  { id: "RISK-IND-004", lat: 27.0, lng: 71.4, region: "Rajasthan Desert Block", country: "India", riskScore: 61, riskLevel: "medium", factors: ["Rapid field expansion", "Gas flaring at wellheads", "Remote desert monitoring"] },
  { id: "RISK-006", lat: 32.0, lng: 104.0, region: "Sichuan Basin", country: "China", riskScore: 42, riskLevel: "medium", factors: ["Rapid gas field expansion", "Variable seasonal emissions", "Growing infrastructure"] },
  { id: "RISK-007", lat: 25.0, lng: 52.0, region: "Persian Gulf", country: "Qatar", riskScore: 28, riskLevel: "low", factors: ["Modern LDAR compliance", "Low anomaly delta", "Active monitoring program"] },
  { id: "RISK-008", lat: -22.0, lng: -47.0, region: "São Paulo State", country: "Brazil", riskScore: 22, riskLevel: "low", factors: ["Landfill gas capture active", "Below regional baseline", "Recent inspection"] },
];

export const mockGlobalMetrics = {
  totalHotspotsToday: 18,
  totalEmissionsToday: 19840,
  activeAlerts: 5,
  satellitePassesToday: 31,
  countryEmissions: [
    { country: "India", flag: "🇮🇳", emissions: 3023, hotspots: 8 },
    { country: "Russia", flag: "🇷🇺", emissions: 965, hotspots: 2 },
    { country: "Iraq", flag: "🇮🇶", emissions: 805, hotspots: 3 },
    { country: "Turkmenistan", flag: "🇹🇲", emissions: 610, hotspots: 1 },
    { country: "USA", flag: "🇺🇸", emissions: 290, hotspots: 1 },
    { country: "China", flag: "🇨🇳", emissions: 275, hotspots: 1 },
    { country: "Qatar", flag: "🇶🇦", emissions: 220, hotspots: 1 },
    { country: "Brazil", flag: "🇧🇷", emissions: 180, hotspots: 1 },
  ],
  topFacilities: [
    { name: "Galkynysh Gas Field", country: "Turkmenistan", emission: 610, risk: "critical" },
    { name: "ONGC Duliajan Assam", country: "India", emission: 558, risk: "critical" },
    { name: "Samotlor Field", country: "Russia", emission: 540, risk: "critical" },
    { name: "ONGC Uran / Mumbai High", country: "India", emission: 490, risk: "critical" },
    { name: "Rumaila Oil Field", country: "Iraq", emission: 485, risk: "high" },
    { name: "Shell Hazira LNG", country: "India", emission: 425, risk: "high" },
    { name: "Orenburg Gas Plant", country: "Russia", emission: 425, risk: "high" },
  ],
};

export const indiaStats = {
  totalHotspots: 8,
  criticalHotspots: 2,
  totalEmissions: 3023,
  topState: "Assam",
  topEmitter: "ONGC Duliajan Assam Fields",
  coveragePercent: 94,
  lastUpdated: "2026-03-12T08:00:00Z",
  avgAnomaly: 314,
};

export const mockAlertsFull = [
  {
    id: "ALT-IND-001", facility: "ONGC Duliajan Assam Fields", location: "Assam, India",
    emission: 558, anomaly: 625, riskLevel: "Critical",
    lat: 27.20, lng: 94.72, timestamp: "4 min ago",
    message: "India's highest methane anomaly: +625 ppb. MethaneSAT confirms super-emitter at Duliajan. OISD emergency inspection initiated. Alert forwarded to MoEFCC and CPCB.",
    windSpeed: 7.2, windDir: "E", country: "🇮🇳",
  },
  {
    id: "ALT-IND-002", facility: "ONGC Uran Plant (Mumbai High)", location: "Maharashtra, India",
    emission: 490, anomaly: 485, riskLevel: "Critical",
    lat: 18.88, lng: 72.82, timestamp: "12 min ago",
    message: "Critical offshore CH₄ emission at Mumbai High. +485 ppb anomaly. CarbonMapper 30 m plume confirmed. ONGC platform operations under review. Coast Guard maritime zone alert activated.",
    windSpeed: 6.4, windDir: "SW", country: "🇮🇳",
  },
  {
    id: "ALT-001", facility: "Galkynysh Gas Field", location: "Turkmenistan",
    emission: 610, anomaly: 740, riskLevel: "Critical",
    lat: 39.76, lng: 54.42, timestamp: "2 min ago",
    message: "Anomaly +740 ppb above regional baseline. Super-emitter threshold exceeded by 52.5%. Wind-aligned plume drifting North-West. Immediate regulatory escalation required.",
    windSpeed: 7.5, windDir: "NW", country: "🇹🇲",
  },
  {
    id: "ALT-002", facility: "Samotlor Field", location: "Russia",
    emission: 540, anomaly: 590, riskLevel: "Critical",
    lat: 56.13, lng: 75.45, timestamp: "18 min ago",
    message: "Anomaly +590 ppb. High wind (8.1 m/s) transporting plume westward. Boreal ecosystem impact zone activated. CarbonMapper high-res triggered.",
    windSpeed: 8.1, windDir: "W", country: "🇷🇺",
  },
  {
    id: "ALT-003", facility: "Rumaila Oil Field", location: "Iraq",
    emission: 485, anomaly: 430, riskLevel: "High",
    lat: 31.77, lng: 47.85, timestamp: "1 hr ago",
    message: "Anomaly +430 ppb. Super-emitter threshold exceeded. South-West plume drift. Facility ranked #1 for attribution. 30-day remediation plan required.",
    windSpeed: 6.2, windDir: "SW", country: "🇮🇶",
  },
];

// Attach wind direction labels
mockHotspots.forEach(h => {
  (h as MethaneHotspot & { plumeDriftLabel: string }).plumeDriftLabel = plumeDirectionLabel(h.windDirection);
});
indiaHotspots.forEach(h => {
  (h as MethaneHotspot & { plumeDriftLabel: string }).plumeDriftLabel = plumeDirectionLabel(h.windDirection);
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchHotspots(): Promise<MethaneHotspot[]> {
  await delay(800);
  return mockHotspots;
}

export async function fetchAllHotspots(): Promise<MethaneHotspot[]> {
  await delay(800);
  return allHotspots;
}

export async function fetchIndiaHotspots(): Promise<MethaneHotspot[]> {
  await delay(600);
  return indiaHotspots;
}

export async function fetchEmissionEstimates(): Promise<EmissionEstimate[]> {
  await delay(600);
  return mockEmissionTrends;
}

export async function fetchFacilities(): Promise<Facility[]> {
  await delay(700);
  return mockFacilities;
}

export async function fetchReport() {
  await delay(1000);
  return mockReport;
}

export const stats = {
  activeHotspots: 18,
  estimatedEmissions: 5128,
  satellitesUsed: 4,
  facilitiesFlagged: 10,
};
