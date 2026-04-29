import { useMemo, useState } from "react";
import { addDays, differenceInMinutes, format, isSameDay, parseISO, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Vehicle, VehicleRequest, RequestStatus } from "@/lib/queries";

interface Props {
  vehicles: Vehicle[];
  requests: VehicleRequest[];
  onSelect?: (req: VehicleRequest) => void;
}

const STATUS_STYLES: Record<RequestStatus, { bar: string; chip: string; ring: string; label: string }> = {
  Pending:     { bar: "bg-amber-400/80 hover:bg-amber-500",     chip: "bg-amber-100 text-amber-800 border-amber-300",     ring: "ring-amber-300/40",     label: "Pending" },
  Recommended: { bar: "bg-sky-500/80 hover:bg-sky-600",         chip: "bg-sky-100 text-sky-800 border-sky-300",           ring: "ring-sky-300/40",       label: "Recommended" },
  Approved:    { bar: "bg-emerald-500/80 hover:bg-emerald-600", chip: "bg-emerald-100 text-emerald-800 border-emerald-300", ring: "ring-emerald-300/40", label: "Approved" },
  Rejected:    { bar: "bg-rose-400/70 hover:bg-rose-500",       chip: "bg-rose-100 text-rose-800 border-rose-300",         ring: "ring-rose-300/40",      label: "Rejected" },
};

// ─── Layout constants ────────────────────────
const HOUR_PX = 56;        // pixels per hour
const ROW_HEIGHT = 56;     // px
const VEHICLE_COL_WIDTH = 200;  // px
const HOURS_PER_DAY = 24;

const VehicleTimeline = ({ vehicles, requests, onSelect }: Props) => {
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [daysToShow, setDaysToShow] = useState<number>(3);

  const days = useMemo(
    () => Array.from({ length: daysToShow }, (_, i) => addDays(anchor, i)),
    [anchor, daysToShow]
  );

  const totalHours = daysToShow * HOURS_PER_DAY;
  const timelineWidth = totalHours * HOUR_PX;

  // If a request has no assigned vehicle yet, group it under "Unassigned".
  const rows: Array<{ id: string; name: string; sub: string | null }> = useMemo(() => {
    const list: Array<{ id: string; name: string; sub: string | null }> = vehicles.map((v) => ({
      id: v.id,
      name: v.name,
      sub: v.plate_number,
    }));
    const hasUnassigned = requests.some((r) => !r.vehicle_id);
    if (hasUnassigned) list.push({ id: "__unassigned__", name: "Unassigned", sub: "Awaiting dispatch" });
    return list;
  }, [vehicles, requests]);

  const requestsByVehicle = useMemo(() => {
    const map = new Map<string, VehicleRequest[]>();
    for (const r of requests) {
      const key = r.vehicle_id ?? "__unassigned__";
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [requests]);

  const rangeStart = anchor.getTime();
  const rangeEnd = addDays(anchor, daysToShow).getTime();

  const goPrev = () => setAnchor((d) => addDays(d, -daysToShow));
  const goNext = () => setAnchor((d) => addDays(d, daysToShow));
  const goToday = () => setAnchor(startOfDay(new Date()));

  const computeBlock = (req: VehicleRequest) => {
    const start = parseISO(req.etd).getTime();
    const end = parseISO(req.eta).getTime();
    if (end < rangeStart || start > rangeEnd) return null;
    const clampedStart = Math.max(start, rangeStart);
    const clampedEnd = Math.min(end, rangeEnd);
    const minutesFromStart = differenceInMinutes(clampedStart, rangeStart);
    const durationMin = Math.max(30, differenceInMinutes(clampedEnd, clampedStart));
    return {
      left: (minutesFromStart / 60) * HOUR_PX,
      width: (durationMin / 60) * HOUR_PX,
    };
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" className="h-8" onClick={goToday}>Today</Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
          <span className="ml-3 text-sm font-medium">
            {format(anchor, "MMM d")} – {format(addDays(anchor, daysToShow - 1), "MMM d, yyyy")}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {(["Pending", "Recommended", "Approved", "Rejected"] as RequestStatus[]).map((s) => (
            <span key={s} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${STATUS_STYLES[s].chip}`}>
              <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[s].bar}`} />
              {STATUS_STYLES[s].label}
            </span>
          ))}
          <div className="flex items-center gap-1 ml-2">
            {[1, 3, 7].map((n) => (
              <Button
                key={n}
                size="sm"
                variant={daysToShow === n ? "default" : "outline"}
                className="h-7 px-2.5 text-xs"
                onClick={() => setDaysToShow(n)}
              >
                {n}d
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable timeline */}
      <div className="border border-border/40 rounded-xl bg-white/50 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: VEHICLE_COL_WIDTH + timelineWidth }}>
            {/* Header row */}
            <div className="flex sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-border/40">
              <div
                style={{ width: VEHICLE_COL_WIDTH }}
                className="shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r border-border/40"
              >
                Vehicle
              </div>
              <div className="flex" style={{ width: timelineWidth }}>
                {days.map((d) => (
                  <div
                    key={d.toISOString()}
                    style={{ width: HOURS_PER_DAY * HOUR_PX }}
                    className={`border-r border-border/40 ${isSameDay(d, new Date()) ? "bg-primary/5" : ""}`}
                  >
                    <div className="px-2 py-1 text-xs font-medium">
                      {format(d, "EEE, MMM d")}
                    </div>
                    <div className="flex">
                      {Array.from({ length: HOURS_PER_DAY }, (_, h) => (
                        <div
                          key={h}
                          style={{ width: HOUR_PX }}
                          className="text-[10px] text-muted-foreground text-center border-l border-border/20 first:border-l-0 py-0.5"
                        >
                          {h % 3 === 0 ? `${h.toString().padStart(2, "0")}:00` : ""}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vehicle rows */}
            {rows.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No vehicles configured yet. Seed the <code>vehicles</code> table to populate the fleet.
              </div>
            ) : (
              rows.map((row) => {
                const reqs = requestsByVehicle.get(row.id) ?? [];
                return (
                  <div key={row.id} className="flex border-b border-border/30 last:border-b-0">
                    <div
                      style={{ width: VEHICLE_COL_WIDTH, height: ROW_HEIGHT }}
                      className="shrink-0 px-3 flex items-center gap-2 border-r border-border/40 bg-white/40"
                    >
                      <div className={`flex h-7 w-7 items-center justify-center rounded-md ${row.id === "__unassigned__" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                        <Car className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{row.name}</p>
                        {row.sub && <p className="text-[10px] text-muted-foreground truncate">{row.sub}</p>}
                      </div>
                    </div>

                    <div className="relative" style={{ width: timelineWidth, height: ROW_HEIGHT }}>
                      {/* Day backgrounds + grid lines */}
                      {days.map((d, dayIdx) => (
                        <div
                          key={d.toISOString()}
                          className={`absolute top-0 bottom-0 border-r border-border/30 ${isSameDay(d, new Date()) ? "bg-primary/5" : ""}`}
                          style={{ left: dayIdx * HOURS_PER_DAY * HOUR_PX, width: HOURS_PER_DAY * HOUR_PX }}
                        >
                          {Array.from({ length: HOURS_PER_DAY }, (_, h) => (
                            <div
                              key={h}
                              className="absolute top-0 bottom-0 border-l border-border/10"
                              style={{ left: h * HOUR_PX }}
                            />
                          ))}
                        </div>
                      ))}

                      {/* Now indicator */}
                      {(() => {
                        const now = Date.now();
                        if (now < rangeStart || now > rangeEnd) return null;
                        const left = (differenceInMinutes(now, rangeStart) / 60) * HOUR_PX;
                        return (
                          <div
                            className="absolute top-0 bottom-0 w-px bg-rose-500/70 z-20"
                            style={{ left }}
                          >
                            <div className="absolute -top-1 -left-[3px] h-1.5 w-1.5 rounded-full bg-rose-500" />
                          </div>
                        );
                      })()}

                      {/* Blocks */}
                      {reqs.map((req) => {
                        const block = computeBlock(req);
                        if (!block) return null;
                        const style = STATUS_STYLES[req.status] ?? STATUS_STYLES.Pending;
                        return (
                          <TooltipProvider key={req.id} delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => onSelect?.(req)}
                                  className={`absolute top-2 h-10 rounded-md ring-1 ${style.ring} ${style.bar} text-white text-xs font-medium px-2 flex items-center gap-1.5 overflow-hidden whitespace-nowrap shadow-sm transition-transform hover:scale-[1.01] cursor-pointer`}
                                  style={{ left: block.left, width: block.width }}
                                >
                                  <span className="truncate">{req.destination}</span>
                                  <span className="opacity-80 truncate hidden sm:inline">· {req.requested_by_name ?? "—"}</span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold">{req.destination}</span>
                                    <Badge variant="outline" className={`text-[10px] ${style.chip}`}>{style.label}</Badge>
                                  </div>
                                  <p>{req.purpose}</p>
                                  <p className="text-muted-foreground">
                                    {format(parseISO(req.etd), "MMM d, HH:mm")} → {format(parseISO(req.eta), "HH:mm")}
                                  </p>
                                  <p className="text-muted-foreground">By: {req.requested_by_name ?? "—"}</p>
                                  {req.passengers && <p className="text-muted-foreground">Passengers: {req.passengers}</p>}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleTimeline;
