import { useLocation, Link } from "react-router-dom";
import {
  BarChart3, Globe, Satellite, FileText, Info,
  Menu, X, Brain, Wind, TrendingUp, Search, Bell,
  ChevronLeft, ChevronRight, Activity, MapPin
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}


const navItems = [
  { title: "Dashboard", url: "/", icon: Globe, desc: "Global overview" },
  { title: "India Monitoring Map", url: "/india", icon: MapPin, desc: "Primary focus" },
  { title: "Hotspot Detection", url: "/detection", icon: Brain, desc: "Anomaly engine" },
  { title: "Emission Analysis", url: "/analysis", icon: BarChart3, desc: "Rate modeling" },
  { title: "Location Search", url: "/search", icon: Search, desc: "City hotspots" },
  { title: "Prediction", url: "/prediction", icon: TrendingUp, desc: "Risk forecasting" },
  { title: "Alerts", url: "/alerts", icon: Bell, desc: "Authority notifications" },
  { title: "Reports", url: "/compliance", icon: FileText, desc: "Export data" },
];

function NavItem({ item, isActive, collapsed, onClick }: {
  item: typeof navItems[0];
  isActive: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={item.url}
      onClick={onClick}
      title={collapsed ? item.title : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg transition-all duration-150 select-none",
        collapsed ? "w-10 h-10 justify-center mx-auto" : "px-3 py-2 mx-2",
        isActive
          ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(142_70%_48%_/_0.25)]"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
      )}
    >
      <item.icon className={cn(
        "shrink-0 transition-colors",
        collapsed ? "h-4.5 w-4.5" : "h-4 w-4",
        isActive ? "text-primary" : "text-sidebar-foreground group-hover:text-foreground"
      )} />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col overflow-hidden min-w-0"
          >
            <span className="text-sm font-medium leading-tight whitespace-nowrap">{item.title}</span>
            <span className="text-[10px] text-muted-foreground/70 leading-tight whitespace-nowrap">{item.desc}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Collapsed tooltip */}
      {collapsed && (
        <div className="pointer-events-none absolute left-full ml-2 px-2 py-1 rounded-md bg-card border border-border text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
          {item.title}
        </div>
      )}
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useIsDesktop();

  const isActive = (url: string) =>
    url === "/" ? location.pathname === "/" : location.pathname.startsWith(url);

  const currentPage = navItems.find((i) => isActive(i.url)) ?? navItems[0];

  const sidebarWidth = collapsed ? 64 : 220;
  const contentMargin = isDesktop ? sidebarWidth : 0;

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* ===== Desktop Sidebar ===== */}
      <motion.nav
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden md:flex flex-col fixed h-full z-30 gradient-sidebar border-r border-sidebar-border overflow-hidden"
        style={{ width: sidebarWidth }}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center border-b border-sidebar-border shrink-0 h-14",
          collapsed ? "justify-center px-2" : "px-4 gap-2.5"
        )}>
          <div className="w-8 h-8 rounded-lg gradient-green flex items-center justify-center shrink-0 shadow-md glow-green">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <p className="text-sm font-bold text-foreground whitespace-nowrap leading-tight">Methane</p>
                <p className="text-[10px] text-primary font-semibold whitespace-nowrap leading-tight tracking-wider uppercase">Shadow Hunter</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav Items */}
        <div className="flex-1 py-3 overflow-y-auto overflow-x-hidden custom-scroll space-y-0.5">
          {navItems.map((item) => (
            <NavItem
              key={item.url}
              item={item}
              isActive={isActive(item.url)}
              collapsed={collapsed}
            />
          ))}
        </div>

        {/* Live Status */}
        <div className={cn(
          "border-t border-sidebar-border p-3 shrink-0 flex items-center",
          collapsed ? "justify-center" : "gap-2"
        )}>
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow shrink-0" />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] text-muted-foreground whitespace-nowrap"
              >
                Live monitoring active
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-sidebar-accent border border-sidebar-border flex items-center justify-center hover:bg-sidebar-accent/80 transition-colors z-10"
        >
          {collapsed
            ? <ChevronRight className="h-3 w-3 text-muted-foreground" />
            : <ChevronLeft className="h-3 w-3 text-muted-foreground" />
          }
        </button>
      </motion.nav>

      {/* ===== Mobile Drawer ===== */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-background/70 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.nav
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              className="fixed left-0 top-0 w-60 h-full z-50 gradient-sidebar border-r border-sidebar-border flex flex-col"
            >
              {/* Mobile header */}
              <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg gradient-green flex items-center justify-center shadow-md">
                    <Activity className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-tight">Methane</p>
                    <p className="text-[10px] text-primary font-semibold leading-tight tracking-wider uppercase">Shadow Hunter</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Mobile nav items */}
              <div className="flex-1 py-3 space-y-0.5 overflow-y-auto custom-scroll">
                {navItems.map((item) => (
                  <NavItem
                    key={item.url}
                    item={item}
                    isActive={isActive(item.url)}
                    collapsed={false}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </div>
              <div className="border-t border-sidebar-border p-4 flex items-center gap-2 shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
                <span className="text-[10px] text-muted-foreground">Live monitoring active</span>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* ===== Main Content ===== */}
      {/* On desktop: shifted by sidebar. On mobile sidebar is overlay, so no shift. */}
      <motion.div
        className="flex-1 flex flex-col min-h-screen"
        animate={{ marginLeft: contentMargin }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        style={{ marginLeft: contentMargin }}
      >
        {/* Top Bar */}
        <header className="h-14 border-b border-border flex items-center px-4 gap-3 sticky top-0 bg-background/80 backdrop-blur-md z-20">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-xs font-semibold text-primary tracking-wide uppercase">MSH</span>
              <span className="text-muted-foreground/60 text-xs">/</span>
            </div>
            <div className="flex items-center gap-2">
              <currentPage.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-semibold text-foreground truncate">{currentPage.title}</span>
            </div>
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/8 border border-primary/15">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-[11px] font-medium text-primary">Live</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Satellite className="h-3 w-3" />
              <span>Sentinel-5P</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto custom-scroll">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-border/60 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground/70 font-medium">
            Methane Shadow Hunter — Satellite-Powered Global Methane Detection
          </p>
          <p className="text-[11px] text-muted-foreground/50">
            Sentinel-5P · Gaussian Plume · ERA5 Wind · CarbonMapper
          </p>
        </footer>
      </motion.div>
    </div>
  );
}
