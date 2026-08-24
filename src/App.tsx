import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import AIDetection from "@/pages/AIDetection";
import SatelliteData from "@/pages/SatelliteData";
import EmissionAnalysis from "@/pages/EmissionAnalysis";
import ComplianceReport from "@/pages/ComplianceReport";
import WindPlume from "@/pages/WindPlume";
import RiskPrediction from "@/pages/RiskPrediction";
import About from "@/pages/About";
import IndiaMonitoring from "@/pages/IndiaMonitoring";
import LocationSearch from "@/pages/LocationSearch";
import AlertsPage from "@/pages/AlertsPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/india" element={<IndiaMonitoring />} />
            <Route path="/detection" element={<AIDetection />} />
            <Route path="/analysis" element={<EmissionAnalysis />} />
            <Route path="/search" element={<LocationSearch />} />
            <Route path="/prediction" element={<RiskPrediction />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/compliance" element={<ComplianceReport />} />
            {/* Keeping legacy routes hidden but functional if accessed directly */}
            <Route path="/satellite" element={<SatelliteData />} />
            <Route path="/wind-plume" element={<WindPlume />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
