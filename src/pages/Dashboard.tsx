import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Car, Package, CalendarRange, CheckCircle2, Clock, ThumbsUp, X, Plus, Trash2 } from "lucide-react";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import VehicleTimeline from "@/components/VehicleTimeline";
import { useFetch } from "@/hooks/use-fetch";
import {
  fetchVehicles, fetchVehicleRequests, fetchPadalaRequests,
  setVehicleRequestStatus, deleteVehicleRequest, pushNotification,
  type VehicleRequest, type RequestStatus,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/hooks/use-notifications";
import { toast } from "sonner";

const STATUS_BADGE: Record<RequestStatus, "default" | "secondary" | "outline" | "destructive"> = {
  Pending: "secondary",
  Recommended: "default",
  Approved: "default",
  Rejected: "destructive",
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

  // Rejected trips drop off the timeline immediately (the public schedule
  // shouldn't be cluttered with refused requests). They remain in the DB
  // for audit / status_change-notification deep-links.
  const timelineTrips = useMemo(
    () => (data?.vehicleRequests ?? []).filter((r) => r.status !== "Rejected"),
    [data?.vehicleRequests]
  );

  // Sorted by date_prepared descending — most recent first.
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
  const recentPadala = useMemo(
    () => (data?.padalaRequests ?? []).slice(0, 5),
    [data?.padalaRequests]
  );

  // Deep-link handler: notifications carry ?req=<id> so clicking one
  // navigates to the dashboard and pops the corresponding trip dialog.
  useEffect(() => {
    const reqId = searchParams.get("req");
    if (!reqId) return;
    const found = (data?.vehicleRequests ?? []).find((r) => r.id === reqId);
    if (found) setSelected(found);
  }, [searchParams, data?.vehicleRequests]);

  // Clearing the dialog also clears ?req from the URL.
  const clearSelected = () => {
    setSelected(null);
    if (searchParams.has("req")) {
      const next = new URLSearchParams(searchParams);
      next.delete("req");
      setSearchParams(next, { replace: true });
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

      // Status changes only DM the requester (not a site-wide broadcast,
      // to avoid swamping the bell with status-change pings everyone can
      // already see on the timeline).
      if (req.requested_by_id) {
        try {
          await pushNotification({
            kind: "status_change",
            userId: req.requested_by_id,
            title: `Your trip was ${status.toLowerCase()}`,
            body: `${req.destination} on ${req.travel_date} — by ${profile.name ?? profile.email}`,
            link: `/dashboard?req=${req.id}`,
          });
        } catch {
          // notifications optional
        }
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
    <div className="p-6 space-y-6 page-enter">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dispatch Timeline</h1>
          <p className="text-sm text-muted-foreground">
            Live multi-vehicle schedule. Pending, Recommended, and Approved trips all appear here so everyone can plan around conflicts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/padala-request")}>
            <Package className="h-4 w-4 mr-2" /> New Padala
          </Button>
          <Button onClick={() => navigate("/travel-request")}>
            <Plus className="h-4 w-4 mr-2" /> New Travel Request
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Active Vehicles", value: stats.vehicleCount, icon: Car, color: "text-blue-600" },
          { label: "Pending",         value: stats.pending,      icon: Clock, color: "text-amber-600" },
          { label: "Recommended",     value: stats.recommended,  icon: ThumbsUp, color: "text-sky-600" },
          { label: "Approved",        value: stats.approved,     icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Padala",          value: stats.padalaCount,  icon: Package, color: "text-violet-600" },
        ].map((m) => (
          <LiquidGlassCard key={m.label} glowIntensity="sm" shadowIntensity="sm" blurIntensity="lg">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{m.label}</span>
                <m.icon className={`h-4 w-4 ${m.color}`} />
              </div>
              <p className="text-2xl font-bold tracking-tight mt-2">{m.value}</p>
            </div>
          </LiquidGlassCard>
        ))}
      </div>

      {/* Timeline */}
      <LiquidGlassCard glowIntensity="sm" shadowIntensity="md" blurIntensity="lg">
        <CardHeader className="flex-row items-center gap-2 pb-3">
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Multi-Vehicle Schedule</CardTitle>
          <CardDescription className="ml-auto text-xs">Click any block for details.</CardDescription>
        </CardHeader>
        <CardContent>
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
      <div className="grid gap-4 lg:grid-cols-3">
        <RecentTrips
          title="Recently Recommended"
          icon={ThumbsUp}
          tint="text-sky-600 bg-sky-100"
          items={recentRecommended}
          emptyText="No trips have been recommended yet."
          onSelect={(r) => setSelected(r)}
        />
        <RecentTrips
          title="Recently Approved"
          icon={CheckCircle2}
          tint="text-emerald-600 bg-emerald-100"
          items={recentApproved}
          emptyText="No trips have been approved yet."
          onSelect={(r) => setSelected(r)}
        />
        <LiquidGlassCard glowIntensity="xs" shadowIntensity="sm" blurIntensity="md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md text-amber-600 bg-amber-100">
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
                  <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/50 border border-border/30">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.description}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        To {p.recipient}{p.destination ? ` · ${p.destination}` : ""} · by {p.requested_by_name ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">{p.size} · {p.weight_kg}kg</Badge>
                      <Badge variant={STATUS_BADGE[p.status]} className="text-[10px]">{p.status}</Badge>
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
                <DialogTitle>{selected.destination}</DialogTitle>
                <DialogDescription>{selected.purpose}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="From">{selected.origin ?? "—"}</Field>
                <Field label="To">{selected.destination}</Field>
                <Field label="Status"><Badge variant={STATUS_BADGE[selected.status]}>{selected.status}</Badge></Field>
                <Field label="Vehicle">{selected.vehicle_name ?? "Unassigned"}</Field>
                <Field label="Travel Date">{format(parseISO(selected.travel_date), "PPP")}</Field>
                <Field label="ETD → ETA">
                  {format(parseISO(selected.etd), "HH:mm")} → {format(parseISO(selected.eta), "HH:mm")}
                </Field>
                <Field label="Requested By">{selected.requested_by_name ?? "—"}</Field>
                <Field label="Recommending">{selected.recommending_approval_name ?? "—"}</Field>
                <Field label="Approved By" className="col-span-2">{selected.approver_name ?? "—"}</Field>
                <Field label="Passengers" className="col-span-2">
                  <span className="whitespace-pre-wrap text-muted-foreground">{selected.passengers}</span>
                </Field>
              </div>

              <DialogFooter className="flex-wrap gap-2 sm:justify-between">
                {/* Admin-only destructive zone */}
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
                  {canRecommend && selected.status === "Pending" && (
                    <Button variant="outline" disabled={actionLoading} onClick={() => handleAction(selected, "Recommended")}>
                      <ThumbsUp className="h-4 w-4 mr-2" /> Recommend
                    </Button>
                  )}
                  {canApprove && (selected.status === "Pending" || selected.status === "Recommended") && (
                    <>
                      <Button variant="destructive" disabled={actionLoading} onClick={() => handleAction(selected, "Rejected")}>
                        <X className="h-4 w-4 mr-2" /> Reject
                      </Button>
                      <Button disabled={actionLoading} onClick={() => handleAction(selected, "Approved")}>
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                      </Button>
                    </>
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
      <CardTitle className="text-base flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${tint}`}>
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
              className="w-full text-left flex items-start justify-between gap-3 p-3 rounded-lg bg-white/50 border border-border/30 hover:bg-white/80 hover:border-border/60 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {r.origin ? `${r.origin} → ` : ""}{r.destination}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {format(parseISO(r.travel_date), "MMM d")} · {r.vehicle_name ?? "Unassigned"} · by {r.requested_by_name ?? "—"}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
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
