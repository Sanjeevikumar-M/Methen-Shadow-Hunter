import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  index?: number;
  variant?: "default" | "accent";
  trend?: { dir: "up" | "down"; pct: string };
}

export function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  index = 0,
  variant = "default",
  trend,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        "rounded-xl border bg-card p-4 glow-card transition-all",
        variant === "accent"
          ? "border-primary/30 glow-green"
          : "border-border/60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest leading-none mb-2">
            {title}
          </p>
          <p className={cn(
            "text-2xl font-bold font-mono leading-none",
            variant === "accent" ? "text-primary" : "text-foreground"
          )}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
            {trend && (
              <span className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                trend.dir === "up"
                  ? "text-red-400 bg-red-500/10"
                  : "text-emerald-400 bg-emerald-500/10"
              )}>
                {trend.dir === "up" ? "↑" : "↓"} {trend.pct}
              </span>
            )}
          </div>
        </div>
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          variant === "accent" ? "bg-primary/15" : "bg-secondary"
        )}>
          <Icon className={cn("h-5 w-5", variant === "accent" ? "text-primary" : "text-muted-foreground")} />
        </div>
      </div>
    </motion.div>
  );
}
