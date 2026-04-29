import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Car, Package, CalendarRange, CheckCircle2, Clock, ThumbsUp, X, Plus } from "lucide-react";
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
  setVehicleRequestStatus, pushNotification,
  type VehicleRequest, type RequestStatus,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const STATUS_BADGE: Record<RequestStatus, "default" | "secondary" | "outline" | "destructive"> = {
  Pending: "secondary",
  Recommended: "default",
  Approved: "default",
  Rejected: "destructive",
};

const Dashboard = () => {
  const { profile, canRecommend, canApprove } = useAuth();
  const navigate = useNavigate();

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
            link: "/dashboard",
          });
        } catch {
          // notifications optional
        }
      }

      toast.success(`Marked as ${status}`);
      setSelected(null);
      refetch();
    } catch (e) {
      toast.error((e as Error).message || "Action failed");
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
              requests={data?.vehicleRequests ?? []}
              padala={data?.padalaRequests ?? []}
              onSelect={(r) => setSelected(r)}
            />
          )}
        </CardContent>
      </LiquidGlassCard>

      {/* Recent Padala */}
      <LiquidGlassCard glowIntensity="xs" shadowIntensity="sm" blurIntensity="md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Recent Padala</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.padalaRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No padala requests yet.</p>
          ) : (
            <div className="space-y-2">
              {data?.padalaRequests.slice(0, 5).map((p) => (
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

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.destination}</DialogTitle>
                <DialogDescription>{selected.purpose}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
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

              <DialogFooter className="flex-wrap gap-2 sm:justify-end">
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

export default Dashboard;
