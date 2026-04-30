import { useMemo, useState } from "react";
import {
  addDays, addMonths, differenceInMinutes, differenceInDays,
  format, isSameDay, isSameMonth, parseISO, startOfDay, startOfMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight, Car, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Vehicle, VehicleRequest, RequestStatus, PadalaRequest } from "@/lib/queries";
import { cn } from "@/lib/utils";

interface Props {
  vehicles: Vehicle[];
  requests: VehicleRequest[];
  padala?: PadalaRequest[];
  onSelect?: (req: VehicleRequest) => void;
}

const STATUS_STYLES: Record<RequestStatus, { bar: string; chip: string; ring: string; label: string }> = {
  Pending:     { bar: "bg-amber-400/85 hover:bg-amber-500",     chip: "bg-amber-100 text-amber-800 border-amber-300",     ring: "ring-amber-300/40",     label: "Pending" },
  Recommended: { bar: "bg-sky-500/85 hover:bg-sky-600",         chip: "bg-sky-100 text-sky-800 border-sky-300",           ring: "ring-sky-300/40",       label: "Recommended" },
  Approved:    { bar: "bg-emerald-500/85 hover:bg-emerald-600", chip: "bg-emerald-100 text-emerald-800 border-emerald-300", ring: "ring-emerald-300/40", label: "Approved" },
  Rejected:    { bar: "bg-rose-400/75 hover:bg-rose-500",       chip: "bg-rose-100 text-rose-800 border-rose-300",         ring: "ring-rose-300/40",      label: "Rejected" },
};

// Per-vehicle palette — used for the row's left rail and the trip block's
// left edge so you can tell at a glance which vehicle a block belongs to,
// independent of its status color.
const VEHICLE_PALETTE = [
  { id: "blue",    swatch: "bg-blue-500",    text: "text-blue-700",    soft: "bg-blue-50",    border: "border-blue-500",    hex: "#3b82f6" },
  { id: "purple",  swatch: "bg-purple-500",  text: "text-purple-700",  soft: "bg-purple-50",  border: "border-purple-500",  hex: "#a855f7" },
  { id: "orange",  swatch: "bg-orange-500",  text: "text-orange-700",  soft: "bg-orange-50",  border: "border-orange-500",  hex: "#f97316" },
  { id: "cyan",    swatch: "bg-cyan-500",    text: "text-cyan-700",    soft: "bg-cyan-50",    border: "border-cyan-500",    hex: "#06b6d4" },
  { id: "pink",    swatch: "bg-pink-500",    text: "text-pink-700",    soft: "bg-pink-50",    border: "border-pink-500",    hex: "#ec4899" },
  { id: "indigo",  swatch: "bg-indigo-500",  text: "text-indigo-700",  soft: "bg-indigo-50",  border: "border-indigo-500",  hex: "#6366f1" },
  { id: "teal",    swatch: "bg-teal-500",    text: "text-teal-700",    soft: "bg-teal-50",    border: "border-teal-500",    hex: "#14b8a6" },
  { id: "fuchsia", swatch: "bg-fuchsia-500", text: "text-fuchsia-700", soft: "bg-fuchsia-50", border: "border-fuchsia-500", hex: "#d946ef" },
];
const UNASSIGNED_PALETTE = { id: "muted", swatch: "bg-muted-foreground/40", text: "text-muted-foreground", soft: "bg-muted/40", border: "border-muted-foreground/40", hex: "#94a3b8" };

// ─── Range presets ───────────────────────────
type RangeKey = "1d" | "3d" | "7d" | "1m" | "3m" | "6m";
interface RangePreset {
  key: RangeKey;
  label: string;
  unit: "hour" | "day";
  cells: number;
  cellPx: number;
}
const RANGES: RangePreset[] = [
  { key: "1d", label: "1d", unit: "hour", cells: 24,        cellPx: 56 },
  { key: "3d", label: "3d", unit: "hour", cells: 24 * 3,    cellPx: 36 },
  { key: "7d", label: "7d", unit: "hour", cells: 24 * 7,    cellPx: 22 },
  { key: "1m", label: "1m", unit: "day",  cells: 31,        cellPx: 48 },
  { key: "3m", label: "3m", unit: "day",  cells: 92,        cellPx: 28 },
  { key: "6m", label: "6m", unit: "day",  cells: 183,       cellPx: 18 },
];

// Tall rows so trip blocks fit From → To, time range, requester, and
// purpose without truncation at common widths.
const ROW_HEIGHT = 104;
const VEHICLE_COL_WIDTH = 220;
const BLOCK_TOP = 8;
const BLOCK_HEIGHT = 88;

const VehicleTimeline = ({ vehicles, requests, padala = [], onSelect }: Props) => {
  const [rangeKey, setRangeKey] = useState<RangeKey>("3d");
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));

  const range = RANGES.find((r) => r.key === rangeKey)!;
  const isHourMode = range.unit === "hour";

  const totalWidth = range.cells * range.cellPx;
  const rangeStart = anchor.getTime();
  const rangeEnd = isHourMode
    ? addDays(anchor, range.cells / 24).getTime()
    : addDays(anchor, range.cells).getTime();

  const padalaByTrip = useMemo(() => {
    const m = new Map<string, PadalaRequest[]>();
    for (const p of padala) {
      if (!p.vehicle_request_id) continue;
      const arr = m.get(p.vehicle_request_id) ?? [];
      arr.push(p);
      m.set(p.vehicle_request_id, arr);
    }
    return m;
  }, [padala]);

  // Rows = vehicles + (Unassigned bucket if any unassigned trips exist).
  // Each row carries a deterministic color from VEHICLE_PALETTE based on
  // its index in the sorted vehicle list, so the same vehicle always shows
  // the same color across reloads.
  interface Row {
    id: string;
    name: string;
    sub: string | null;
    plate: string | null;
    palette: typeof VEHICLE_PALETTE[number];
  }
  const rows: Row[] = useMemo(() => {
    const list: Row[] = vehicles.map((v, idx) => ({
      id: v.id,
      name: v.name,
      sub: v.driver_name ?? null,
      plate: v.plate_number,
      palette: VEHICLE_PALETTE[idx % VEHICLE_PALETTE.length],
    }));
    if (requests.some((r) => !r.vehicle_id)) {
      list.push({
        id: "__unassigned__",
        name: "Unassigned",
        sub: "Awaiting dispatch",
        plate: null,
        palette: UNASSIGNED_PALETTE,
      });
    }
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

  const goPrev = () => {
    if (isHourMode) setAnchor((d) => addDays(d, -range.cells / 24));
    else if (rangeKey === "1m") setAnchor((d) => addMonths(d, -1));
    else if (rangeKey === "3m") setAnchor((d) => addMonths(d, -3));
    else setAnchor((d) => addMonths(d, -6));
  };
  const goNext = () => {
    if (isHourMode) setAnchor((d) => addDays(d, range.cells / 24));
    else if (rangeKey === "1m") setAnchor((d) => addMonths(d, 1));
    else if (rangeKey === "3m") setAnchor((d) => addMonths(d, 3));
    else setAnchor((d) => addMonths(d, 6));
  };
  const goToday = () =>
    setAnchor(isHourMode ? startOfDay(new Date()) : startOfMonth(new Date()));

  const xFor = (when: number): number => {
    if (isHourMode) {
      const minutes = differenceInMinutes(when, rangeStart);
      return (minutes / 60) * range.cellPx;
    }
    const days = differenceInDays(when, rangeStart);
    return days * range.cellPx;
  };

  const computeBlock = (req: VehicleRequest) => {
    const start = parseISO(req.etd).getTime();
    const end = parseISO(req.eta).getTime();
    if (end < rangeStart || start > rangeEnd) return null;
    const clampedStart = Math.max(start, rangeStart);
    const clampedEnd = Math.min(end, rangeEnd);
    const left = xFor(clampedStart);
    const minWidth = isHourMode ? 36 : range.cellPx * 0.5;
    const width = Math.max(minWidth, xFor(clampedEnd) - left);
    return { left, width };
  };

  // ─── Header rendering ────────────────────────
  const renderHourHeader = () => {
    const days = Array.from({ length: range.cells / 24 }, (_, i) => addDays(anchor, i));
    return (
      <div className="flex" style={{ width: totalWidth }}>
        {days.map((d) => (
          <div
            key={d.toISOString()}
            style={{ width: 24 * range.cellPx }}
            className={`border-r border-border/40 ${isSameDay(d, new Date()) ? "bg-primary/5" : ""}`}
          >
            <div className="px-2 py-1 text-xs font-medium">{format(d, "EEE, MMM d")}</div>
            <div className="flex">
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  style={{ width: range.cellPx }}
                  className="text-[10px] text-muted-foreground text-center border-l border-border/20 first:border-l-0 py-0.5"
                >
                  {h % 3 === 0 ? `${h.toString().padStart(2, "0")}:00` : ""}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDayHeader = () => {
    const days = Array.from({ length: range.cells }, (_, i) => addDays(anchor, i));
    return (
      <div className="flex" style={{ width: totalWidth }}>
        {days.map((d, idx) => {
          const monthStart = idx === 0 || !isSameMonth(d, days[idx - 1]);
          return (
            <div
              key={d.toISOString()}
              style={{ width: range.cellPx }}
              className={`border-l border-border/15 first:border-l-0 ${isSameDay(d, new Date()) ? "bg-primary/10" : ""}`}
            >
              {monthStart && (
                <div className="text-[10px] font-semibold text-primary px-1 truncate border-b border-border/40">
                  {format(d, "MMM yyyy")}
                </div>
              )}
              <div className={`text-[10px] text-center text-muted-foreground py-0.5 ${monthStart ? "" : "pt-[14px]"}`}>
                {format(d, "d")}
              </div>
            </div>
          );
        })}
      </div>
    );
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
            {isHourMode
              ? `${format(anchor, "MMM d")} – ${format(addDays(anchor, range.cells / 24 - 1), "MMM d, yyyy")}`
              : `${format(anchor, "MMM d, yyyy")} – ${format(addDays(anchor, range.cells - 1), "MMM d, yyyy")}`
            }
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs">
            {(["Pending", "Recommended", "Approved", "Rejected"] as RequestStatus[]).map((s) => (
              <span key={s} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${STATUS_STYLES[s].chip}`}>
                <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[s].bar}`} />
                {STATUS_STYLES[s].label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {RANGES.map((r) => (
              <Button
                key={r.key}
                size="sm"
                variant={rangeKey === r.key ? "default" : "outline"}
                className="h-7 px-2.5 text-xs"
                onClick={() => {
                  setRangeKey(r.key);
                  if (r.unit === "day" && isHourMode) setAnchor(startOfMonth(anchor));
                  if (r.unit === "hour" && !isHourMode) setAnchor(startOfDay(new Date()));
                }}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Vehicle color legend */}
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-muted-foreground">Vehicles:</span>
          {rows.map((row) => (
            <span
              key={row.id}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${row.palette.soft} ${row.palette.text}`}
            >
              <span className={`h-2 w-2 rounded-full ${row.palette.swatch}`} />
              {row.name}
            </span>
          ))}
        </div>
      )}

      {/* Scrollable timeline */}
      <div className="border border-border/40 rounded-xl bg-white/50 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: VEHICLE_COL_WIDTH + totalWidth }}>
            {/* Header row */}
            <div className="flex sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-border/40">
              <div
                style={{ width: VEHICLE_COL_WIDTH, position: "sticky", left: 0 }}
                className="shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r border-border/40 bg-white/85 backdrop-blur-md z-30"
              >
                Vehicle / Driver
              </div>
              {isHourMode ? renderHourHeader() : renderDayHeader()}
            </div>

            {/* Vehicle rows */}
            {rows.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No vehicles configured yet. Run <code>schema.sql</code> to seed the fleet.
              </div>
            ) : (
              rows.map((row) => {
                const reqs = requestsByVehicle.get(row.id) ?? [];
                return (
                  <div key={row.id} className="flex border-b border-border/30 last:border-b-0">
                    {/* Row label with vehicle color rail — sticky so it stays
                        visible when the user scrolls horizontally. */}
                    <div
                      style={{
                        width: VEHICLE_COL_WIDTH,
                        height: ROW_HEIGHT,
                        position: "sticky",
                        left: 0,
                      }}
                      className={`shrink-0 flex items-stretch border-r border-border/40 z-10 ${row.palette.soft}/30 bg-white`}
                    >
                      <div className={`w-1.5 shrink-0 ${row.palette.swatch}`} />
                      <div className="flex-1 px-3 flex items-center gap-2 min-w-0 bg-white/85 backdrop-blur-sm">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-md ${row.palette.soft} ${row.palette.text} shrink-0`}>
                          <Car className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{row.name}</p>
                          {row.plate && <p className="text-[10px] text-muted-foreground truncate">{row.plate}</p>}
                          {row.sub && (
                            <p className="text-[10px] text-muted-foreground truncate">{row.sub}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timeline track */}
                    <div className="relative" style={{ width: totalWidth, height: ROW_HEIGHT }}>
                      {/* Cell backgrounds + grid lines */}
                      {isHourMode
                        ? Array.from({ length: range.cells / 24 }, (_, dayIdx) => {
                            const d = addDays(anchor, dayIdx);
                            return (
                              <div
                                key={d.toISOString()}
                                className={`absolute top-0 bottom-0 border-r border-border/30 ${isSameDay(d, new Date()) ? "bg-primary/5" : ""}`}
                                style={{ left: dayIdx * 24 * range.cellPx, width: 24 * range.cellPx }}
                              />
                            );
                          })
                        : Array.from({ length: range.cells }, (_, dayIdx) => {
                            const d = addDays(anchor, dayIdx);
                            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                            return (
                              <div
                                key={d.toISOString()}
                                className={`absolute top-0 bottom-0 border-r border-border/15 ${isSameDay(d, new Date()) ? "bg-primary/10" : isWeekend ? "bg-muted/30" : ""}`}
                                style={{ left: dayIdx * range.cellPx, width: range.cellPx }}
                              />
                            );
                          })}

                      {/* Now indicator */}
                      {(() => {
                        const now = Date.now();
                        if (now < rangeStart || now > rangeEnd) return null;
                        return (
                          <div
                            className="absolute top-0 bottom-0 w-px bg-rose-500/70 z-20"
                            style={{ left: xFor(now) }}
                          >
                            <div className="absolute -top-1 -left-[3px] h-1.5 w-1.5 rounded-full bg-rose-500" />
                          </div>
                        );
                      })()}

                      {/* Trip blocks */}
                      {reqs.map((req) => {
                        const block = computeBlock(req);
                        if (!block) return null;
                        const status = STATUS_STYLES[req.status] ?? STATUS_STYLES.Pending;
                        const padalaCount = padalaByTrip.get(req.id)?.length ?? 0;
                        // Adaptive content: each tier shows progressively more
                        // info as horizontal space grows. Wider blocks also
                        // allow From/To to wrap onto two lines so long names
                        // remain readable instead of truncating.
                        const w = block.width;
                        const showLabels = w >= 90;            // "From"/"To" prefix labels
                        const showTime = w >= 130;             // ETD–ETA · requester
                        const showPurpose = w >= 200;          // italic purpose
                        const allowWrap = w >= 220;            // let long origins wrap
                        return (
                          <TooltipProvider key={req.id} delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => onSelect?.(req)}
                                  className={`absolute rounded-md ring-1 ${status.ring} ${status.bar} text-white text-xs font-medium shadow-sm transition-transform hover:scale-[1.01] cursor-pointer overflow-hidden`}
                                  style={{
                                    left: block.left,
                                    width: block.width,
                                    top: BLOCK_TOP,
                                    height: BLOCK_HEIGHT,
                                    borderLeft: `4px solid ${row.palette.hex}`,
                                  }}
                                >
                                  <div className="flex flex-col h-full px-2 py-1.5 gap-0.5 text-left">
                                    {/* FROM */}
                                    <div className="flex items-start gap-1.5 min-w-0 leading-tight">
                                      {showLabels && (
                                        <span className="opacity-75 text-[9px] font-bold uppercase tracking-wider shrink-0 w-7 mt-px">From</span>
                                      )}
                                      <span className={cn("text-[11px] font-medium min-w-0", allowWrap ? "break-words line-clamp-2" : "truncate")}>
                                        {req.origin ?? "—"}
                                      </span>
                                    </div>
                                    {/* TO */}
                                    <div className="flex items-start gap-1.5 min-w-0 leading-tight">
                                      {showLabels ? (
                                        <span className="opacity-75 text-[9px] font-bold uppercase tracking-wider shrink-0 w-7 mt-px">To</span>
                                      ) : (
                                        <span className="opacity-80 text-[10px] font-bold shrink-0">→</span>
                                      )}
                                      <span className={cn("text-[12px] font-semibold min-w-0 flex-1", allowWrap ? "break-words line-clamp-2" : "truncate")}>
                                        {req.destination}
                                      </span>
                                      {padalaCount > 0 && (
                                        <span className="inline-flex items-center gap-0.5 bg-white/25 rounded-sm px-1 text-[10px] shrink-0 mt-px">
                                          <Package className="h-2.5 w-2.5" /> {padalaCount}
                                        </span>
                                      )}
                                    </div>
                                    {/* Time + requester */}
                                    {showTime && (
                                      <div className="text-[10px] opacity-90 truncate leading-tight mt-0.5">
                                        {format(parseISO(req.etd), "HH:mm")}–{format(parseISO(req.eta), "HH:mm")}
                                        {req.requested_by_name ? ` · ${req.requested_by_name}` : ""}
                                      </div>
                                    )}
                                    {/* Purpose */}
                                    {showPurpose && req.purpose && (
                                      <div className="text-[10px] opacity-75 italic leading-tight line-clamp-1">
                                        {req.purpose}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold">{req.origin ?? "—"} → {req.destination}</span>
                                    <Badge variant="outline" className={`text-[10px] ${status.chip}`}>{status.label}</Badge>
                                  </div>
                                  <p>{req.purpose}</p>
                                  <p className="text-muted-foreground">
                                    {format(parseISO(req.etd), "MMM d, HH:mm")} → {format(parseISO(req.eta), "MMM d, HH:mm")}
                                  </p>
                                  <p className="text-muted-foreground flex items-center gap-1.5">
                                    <span className={`h-2 w-2 rounded-full ${row.palette.swatch}`} />
                                    {row.name}
                                  </p>
                                  <p className="text-muted-foreground">By: {req.requested_by_name ?? "—"}</p>
                                  {padalaCount > 0 && (
                                    <p className="text-muted-foreground inline-flex items-center gap-1">
                                      <Package className="h-3 w-3" /> {padalaCount} padala riding along
                                    </p>
                                  )}
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
