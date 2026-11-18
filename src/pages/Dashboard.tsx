import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Car, Package, CalendarRange, CheckCircle2, Clock, ThumbsUp, X, Plus, Trash2, ArrowRight } from "lucide-react";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import VehicleTimeline from "@/components/VehicleTimeline";
import { useFetch } from "@/hooks/use-fetch";
import {
  fetchVehicles, fetchVehicleRequests, fetchPadalaRequests,
  setVehicleRequestStatus, deleteVehicleRequest, pushNotification,
  setVehicleAssignment,
  type VehicleRequest, type RequestStatus,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_BADGE_STYLE: Record<RequestStatus, string> = {
  Pending:     "border-[#F2B53A]/60 bg-[#F2B53A]/20 text-[#8A5A00] dark:text-[#F2B53A]",
  Recommended: "border-sky-400/50 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  Approved:    "border-[#A9CDBE] bg-[#A9CDBE]/30 text-[#1A4D3B] dark:bg-[#A9CDBE]/20 dark:text-[#A9CDBE]",
  Rejected:    "border-destructive/50 bg-destructive/15 text-destructive",
};

const Dashboard = () => {
  const { profile, canRecommend, canApprove, isAdmin } = useAuth();
  const { refetch: refetchNotifications } = useNotifications();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data, loading, error, refetch } = useFetch(async () => {
    const [vehicles, vehicleRequests, padalaRequests] = await Promise.all([
      fetchVehicles(),
      fetchVehicleRequests(),
      fetchPadalaRequests(),
    ]);
    return { vehicles, vehicleRequests, padalaRequests };
  });

  const [selected, setSelected] = useState<VehicleRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const stats = useMemo(() => {
    const v = data?.vehicleRequests ?? [];
    const p = data?.padalaRequests ?? [];
    return {
      vehicleCount: data?.vehicles.length ?? 0,
      pending: v.filter((r) => r.status === "Pending").length,
      recommended: v.filter((r) => r.status === "Recommended").length,
      approved: v.filter((r) => r.status === "Approved").length,
      padalaCount: p.length,
    };
  }, [data]);

  const timelineTrips = useMemo(
    () => (data?.vehicleRequests ?? []).filter((r) => r.status !== "Rejected"),
    [data?.vehicleRequests]
  );

  const sortedByDate = useMemo(() => {
    return [...(data?.vehicleRequests ?? [])].sort((a, b) =>
      (b.date_prepared ?? "").localeCompare(a.date_prepared ?? "")
    );
  }, [data?.vehicleRequests]);

  const recentRecommended = useMemo(
    () => sortedByDate.filter((r) => r.status === "Recommended").slice(0, 5),
    [sortedByDate]
  );
  const recentApproved = useMemo(
    () => sortedByDate.filter((r) => r.status === "Approved").slice(0, 5),
    [sortedByDate]
  );
  const recentRejected = useMemo(
    () => sortedByDate.filter((r) => r.status === "Rejected").slice(0, 5),
    [sortedByDate]
  );
  const recentPadala = useMemo(
    () => (data?.padalaRequests ?? []).slice(0, 5),
    [data?.padalaRequests]
  );

  useEffect(() => {
    const reqId = searchParams.get("req");
    if (!reqId) return;
    const found = (data?.vehicleRequests ?? []).find((r) => r.id === reqId);
    if (found) setSelected(found);
  }, [searchParams, data?.vehicleRequests]);

  const clearSelected = () => {
    setSelected(null);
    if (searchParams.has("req")) {
      const next = new URLSearchParams(searchParams);
      next.delete("req");
      setSearchParams(next, { replace: true });
    }
  };

  const handleVehicleAssign = async (req: VehicleRequest, vehicleId: string) => {
    if (!isAdmin) return;
    const vehicleIdOrNull = vehicleId === "__none__" ? null : vehicleId;
    const vehicle = (data?.vehicles ?? []).find((v) => v.id === vehicleIdOrNull);
    setActionLoading(true);
    try {
      await setVehicleAssignment(req.id, vehicleIdOrNull, vehicle?.name ?? null);
      toast.success(vehicleIdOrNull ? `Assigned ${vehicle?.name ?? "vehicle"}` : "Vehicle unassigned");
      setSelected({ ...req, vehicle_id: vehicleIdOrNull, vehicle_name: vehicle?.name ?? null });
      refetch();
    } catch (e) {
      const msg =
        (e as { message?: string })?.message ||
        (e as { details?: string })?.details ||
        "Assignment failed";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (req: VehicleRequest) => {
    if (!isAdmin) return;
    const ok = window.confirm(
      `Delete this trip permanently?\n\n${req.origin ?? "—"} → ${req.destination}\n${req.travel_date}\n\nThis cannot be undone.`
    );
    if (!ok) return;
    setActionLoading(true);
    try {
      await deleteVehicleRequest(req.id);
      toast.success("Trip deleted");
      clearSelected();
      refetch();
    } catch (e) {
      const msg =
        (e as { message?: string })?.message ||
        (e as { details?: string })?.details ||
        "Delete failed";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (req: VehicleRequest, status: RequestStatus) => {
    if (!profile) return;
    setActionLoading(true);
    try {
      await setVehicleRequestStatus(req.id, status, profile.id, profile.name ?? profile.email);

      let notifyError: string | null = null;
      if (req.requested_by_id) {
        try {
          await pushNotification({
            kind: "status_change",
            userId: req.requested_by_id,
            title: `Your trip was ${status.toLowerCase()}`,
            body: `${req.destination} on ${req.travel_date} — by ${profile.name ?? profile.email}`,
            link: `/dashboard?req=${req.id}`,
          });
        } catch (e) {
          notifyError = (e as { message?: string })?.message ?? "notification failed";
        }
      }
      if (notifyError) {
        toast.warning("Notification didn't fire", { description: notifyError, duration: 12000 });
      }

      toast.success(`Marked as ${status}`);
      clearSelected();
      refetch();
      refetchNotifications();
    } catch (e) {
      const msg =
        (e as { message?: string })?.message ||
        (e as { details?: string })?.details ||
        "Action failed";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 page-enter">
      {/* Header + Actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#A9CDBE]/60 bg-[#A9CDBE]/25 px-3 py-0.5 text-xs font-medium text-[#1A4D3B] dark:border-[#A9CDBE]/30 dark:bg-[#A9CDBE]/10 dark:text-[#A9CDBE]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#256D54] dark:bg-[#A9CDBE] animate-pulse" />
            Live Fleet Dispatch
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Dispatch Timeline</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Live multi-vehicle schedule. Pending, Recommended, and Approved trips stay visible so every team can coordinate routes and ride-along parcels.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            onClick={() => navigate("/padala-request")}
            className="border-[#F2B53A]/70 bg-[#F2B53A]/15 text-[#0B1325] hover:bg-[#F2B53A]/30 dark:bg-[#F2B53A]/15 dark:text-[#F2B53A] dark:hover:bg-[#F2B53A]/25 font-semibold"
          >
            <Package className="h-4 w-4 mr-2 text-[#B87D0A] dark:text-[#F2B53A]" />
            Attach Padala
          </Button>
          <Button onClick={() => navigate("/travel-request")} className="font-semibold shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> New Travel Request
          </Button>
        </div>
      </div>

      {/* Asymmetric Fleet Telemetry Strip */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Primary Fleet Capacity Tile (Sage Accent) */}
        <LiquidGlassCard glowIntensity="sm" shadowIntensity="sm" blurIntensity="lg" className="lg:col-span-3">
          <div className="p-5 flex items-center justify-between h-full">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Active Vehicles</span>
              <p className="font-mono text-3xl font-bold tracking-tight mt-1 tabular-nums">{stats.vehicleCount}</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1D5944] dark:text-[#A9CDBE] mt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#256D54] dark:bg-[#A9CDBE]" />
                Regional fleet online
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#A9CDBE]/30 text-[#1A4D3B] dark:bg-[#A9CDBE]/15 dark:text-[#A9CDBE] ring-1 ring-[#A9CDBE]/50">
              <Car className="h-6 w-6" />
            </div>
          </div>
        </LiquidGlassCard>

        {/* Dispatch Approval Pipeline Tile */}
        <LiquidGlassCard glowIntensity="sm" shadowIntensity="sm" blurIntensity="lg" className="lg:col-span-6">
          <div className="p-5 h-full flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Dispatch Queue</span>
              <span className="text-[11px] text-muted-foreground">Pending → Recommended → Approved</span>
            </div>
            <div className="grid grid-cols-3 gap-3 items-center">
              <div className="rounded-xl border border-[#F2B53A]/45 bg-[#F2B53A]/15 dark:bg-[#F2B53A]/10 px-3.5 py-2.5">
                <div className="flex items-center justify-between text-xs font-medium text-[#8A5A00] dark:text-[#F2B53A]">
                  <span>Pending</span>
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <p className="font-mono text-2xl font-bold tabular-nums mt-0.5">{stats.pending}</p>
              </div>
              <div className="rounded-xl border border-sky-400/35 bg-sky-500/10 px-3.5 py-2.5">
                <div className="flex items-center justify-between text-xs font-medium text-sky-700 dark:text-sky-300">
                  <span>Recommended</span>
                  <ThumbsUp className="h-3.5 w-3.5" />
                </div>
                <p className="font-mono text-2xl font-bold tabular-nums mt-0.5">{stats.recommended}</p>
              </div>
              <div className="rounded-xl border border-[#A9CDBE]/60 bg-[#A9CDBE]/25 dark:bg-[#A9CDBE]/15 px-3.5 py-2.5">
                <div className="flex items-center justify-between text-xs font-medium text-[#1A4D3B] dark:text-[#A9CDBE]">
                  <span>Approved</span>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <p className="font-mono text-2xl font-bold tabular-nums mt-0.5">{stats.approved}</p>
              </div>
            </div>
          </div>
        </LiquidGlassCard>

        {/* Padala Tile (Signal Gold Accent) */}
        <LiquidGlassCard glowIntensity="sm" shadowIntensity="sm" blurIntensity="lg" className="lg:col-span-3">
          <div className="p-5 flex items-center justify-between h-full">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Padala Parcels</span>
              <p className="font-mono text-3xl font-bold tracking-tight mt-1 tabular-nums">{stats.padalaCount}</p>
              <button
                type="button"
                onClick={() => navigate("/padala-request")}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9C6500] dark:text-[#F2B53A] hover:underline mt-1"
              >
                Send a parcel <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2B53A]/25 text-[#8A5A00] dark:bg-[#F2B53A]/20 dark:text-[#F2B53A] ring-1 ring-[#F2B53A]/50">
              <Package className="h-6 w-6" />
            </div>
          </div>
        </LiquidGlassCard>
      </div>

      {/* Hero: Multi-Vehicle Schedule Timeline */}
      <LiquidGlassCard glowIntensity="md" shadowIntensity="md" blurIntensity="lg">
        <CardHeader className="flex-row items-center gap-2.5 pb-3 border-b border-border/40">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A9CDBE]/30 text-[#1A4D3B] dark:bg-[#A9CDBE]/15 dark:text-[#A9CDBE]">
            <CalendarRange className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-display">Multi-Vehicle Schedule</CardTitle>
            <CardDescription className="text-xs">Select any trip block to inspect details, assign a vehicle, or update approval status.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading timeline…</div>
          ) : error ? (
            <div className="h-64 flex items-center justify-center text-sm text-destructive">Failed to load timeline.</div>
          ) : (
            <VehicleTimeline
              vehicles={data?.vehicles ?? []}
              requests={timelineTrips}
              padala={data?.padalaRequests ?? []}
              onSelect={(r) => setSelected(r)}
            />
          )}
        </CardContent>
      </LiquidGlassCard>

      {/* Recent activity trackers */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <RecentTrips
          title="Recently Recommended"
          icon={ThumbsUp}
          tint="text-sky-700 bg-sky-100 dark:text-sky-300 dark:bg-sky-500/15"
          items={recentRecommended}
          emptyText="No trips have been recommended yet."
          onSelect={(r) => setSelected(r)}
        />
        <RecentTrips
          title="Recently Approved"
          icon={CheckCircle2}
          tint="text-[#1A4D3B] bg-[#A9CDBE]/35 dark:text-[#A9CDBE] dark:bg-[#A9CDBE]/15"
          items={recentApproved}
          emptyText="No trips have been approved yet."
          onSelect={(r) => setSelected(r)}
        />
        <RecentTrips
          title="Recently Rejected"
          icon={X}
          tint="text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-500/15"
          items={recentRejected}
          emptyText="No rejections — clean slate."
          onSelect={(r) => setSelected(r)}
        />
        <LiquidGlassCard glowIntensity="xs" shadowIntensity="sm" blurIntensity="md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md text-[#8A5A00] bg-[#F2B53A]/30 dark:text-[#F2B53A] dark:bg-[#F2B53A]/15">
                <Package className="h-3.5 w-3.5" />
              </span>
              Recent Padala
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPadala.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No padala requests yet.</p>
            ) : (
              <div className="space-y-2">
                {recentPadala.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background/60 dark:bg-[#0B1325]/60 border border-border/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.description}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        To {p.recipient}{p.destination ? ` · ${p.destination}` : ""} · by {p.requested_by_name ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className="font-mono text-[10px]">{p.size} · {p.weight_kg}kg</Badge>
                      <Badge variant="outline" className={cn("text-[10px]", STATUS_BADGE_STYLE[p.status])}>{p.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </LiquidGlassCard>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && clearSelected()}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{selected.destination}</DialogTitle>
                <DialogDescription>{selected.purpose}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="From">{selected.origin ?? "—"}</Field>
                <Field label="To">{selected.destination}</Field>
                <Field label="Status">
                  <Badge variant="outline" className={STATUS_BADGE_STYLE[selected.status]}>
                    {selected.status}
                  </Badge>
                </Field>
                <Field label={isAdmin ? "Vehicle (admin assigns)" : "Vehicle"}>
                  {isAdmin ? (
                    <Select
                      value={selected.vehicle_id ?? "__none__"}
                      onValueChange={(v) => handleVehicleAssign(selected, v)}
                    >
                      <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue placeholder="Choose a vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Unassigned —</SelectItem>
                        {(data?.vehicles ?? []).map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}{v.plate_number ? ` · ${v.plate_number}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <>
                      {selected.vehicle_name ?? "Unassigned"}
                      {selected.vehicle_id && (
                        <span className="ml-2 text-[10px] text-muted-foreground italic">requester preference</span>
                      )}
                    </>
                  )}
                </Field>
                <Field label="Travel Date">{format(parseISO(selected.travel_date), "PPP")}</Field>
                <Field label="ETD → ETA">
                  <span className="font-mono tabular-nums">
                    {format(parseISO(selected.etd), "HH:mm")} → {format(parseISO(selected.eta), "HH:mm")}
                  </span>
                </Field>
                <Field label="Requested By">{selected.requested_by_name ?? "—"}</Field>
                <Field label="Recommending">{selected.recommending_approval_name ?? "—"}</Field>
                <Field label="Approved By" className="col-span-2">{selected.approver_name ?? "—"}</Field>
                <Field label="Passengers" className="col-span-2">
                  <span className="whitespace-pre-wrap text-muted-foreground">{selected.passengers}</span>
                </Field>
              </div>

              {/* Attached padalas */}
              {(() => {
                const linked = (data?.padalaRequests ?? []).filter(
                  (p) => p.vehicle_request_id === selected.id
                );
                if (linked.length === 0) return null;
                return (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-[#F2B53A] text-[#0B1325]">
                        <Package className="h-3.5 w-3.5" />
                      </span>
                      <span>Padala riding along ({linked.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {linked.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#F2B53A]/15 dark:bg-[#F2B53A]/10 border border-[#F2B53A]/40 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{p.description}</p>
                            <p className="text-muted-foreground truncate">
                              To {p.recipient}{p.destination ? ` · ${p.destination}` : ""} · by {p.requested_by_name ?? "—"}
                            </p>
                          </div>
                          <Badge variant="outline" className="font-mono text-[10px] shrink-0 border-[#F2B53A]/50">
                            {p.size} · {p.weight_kg}kg
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <DialogFooter className="flex-wrap gap-2 sm:justify-between">
                {isAdmin ? (
                  <Button
                    variant="ghost"
                    disabled={actionLoading}
                    onClick={() => handleDelete(selected)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </Button>
                ) : <span />}

                <div className="flex flex-wrap gap-2">
                  {(canRecommend || canApprove) &&
                    (selected.status === "Pending" || selected.status === "Recommended") && (
                      <Button variant="destructive" disabled={actionLoading} onClick={() => handleAction(selected, "Rejected")}>
                        <X className="h-4 w-4 mr-2" /> Reject
                      </Button>
                    )}

                  {canRecommend && selected.status === "Pending" && (
                    <Button variant="outline" disabled={actionLoading} onClick={() => handleAction(selected, "Recommended")}>
                      <ThumbsUp className="h-4 w-4 mr-2" /> Recommend
                    </Button>
                  )}

                  {canApprove && selected.status === "Recommended" && (
                    <Button disabled={actionLoading} onClick={() => handleAction(selected, "Approved")}>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                    </Button>
                  )}

                  {canApprove && !canRecommend && selected.status === "Pending" && (
                    <p className="text-[11px] text-muted-foreground italic w-full text-right pt-1">
                      Awaiting recommendation before approval is allowed.
                    </p>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={className}>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <div className="text-sm font-medium mt-0.5">{children}</div>
  </div>
);

interface RecentTripsProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  items: VehicleRequest[];
  emptyText: string;
  onSelect: (req: VehicleRequest) => void;
}

const RecentTrips = ({ title, icon: Icon, tint, items, emptyText, onSelect }: RecentTripsProps) => (
  <LiquidGlassCard glowIntensity="xs" shadowIntensity="sm" blurIntensity="md">
    <CardHeader className="pb-3">
      <CardTitle className="text-base font-display flex items-center gap-2">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", tint)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelect(r)}
              className="w-full text-left flex items-start justify-between gap-3 p-3 rounded-xl bg-background/60 dark:bg-[#0B1325]/60 border border-border/50 hover:bg-[#A9CDBE]/15 dark:hover:bg-[#172544] hover:border-[#A9CDBE]/60 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {r.origin ? `${r.origin} → ` : ""}{r.destination}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {format(parseISO(r.travel_date), "MMM d")} · {r.vehicle_name ?? "Unassigned"} · by {r.requested_by_name ?? "—"}
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] shrink-0 tabular-nums">
                {format(parseISO(r.etd), "HH:mm")}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </CardContent>
  </LiquidGlassCard>
);

export default Dashboard;
