import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const periods = ["Daily", "Weekly", "Monthly"] as const;

interface TimelineSliderProps {
  onPeriodChange?: (period: string) => void;
  onTimeChange?: (value: number) => void;
}

export function TimelineSlider({ onPeriodChange, onTimeChange }: TimelineSliderProps) {
  const [period, setPeriod] = useState<string>("Daily");
  const [time, setTime] = useState([70]);

  const days = ["Mar 6", "Mar 7", "Mar 8", "Mar 9", "Mar 10", "Mar 11", "Mar 12"];
  const dayIndex = Math.round((time[0] / 100) * (days.length - 1));

  return (
    <div className="absolute bottom-4 right-4 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 w-64">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">Timeline</p>
        <div className="flex gap-0.5">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => { setPeriod(p); onPeriodChange?.(p); }}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] transition-colors",
                period === p ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <Slider
        value={time}
        onValueChange={(v) => { setTime(v); onTimeChange?.(v[0]); }}
        min={0}
        max={100}
        step={1}
        className="my-2"
      />
      <p className="text-[10px] text-muted-foreground text-center">{days[dayIndex]}, 2026</p>
    </div>
  );
}
