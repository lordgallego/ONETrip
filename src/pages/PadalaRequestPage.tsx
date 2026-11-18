import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, isAfter, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/hooks/use-notifications";
import {
  fetchVehicleRequests, upsertPadalaRequest, pushNotification,
  type PadalaSize, type VehicleRequest,
} from "@/lib/queries";
import { toast } from "sonner";

const SIZES: PadalaSize[] = ["Small", "Medium", "Large", "Extra Large"];
const NO_TRIP = "__none__";

const schema = z.object({
  size: z.enum(["Small", "Medium", "Large", "Extra Large"]),
  weight_kg: z.coerce.number().positive("Weight must be > 0"),
  description: z.string().min(2, "Required"),
  recipient: z.string().min(2, "Required"),
  destination: z.string().optional(),
  vehicle_request_id: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const PadalaRequestPage = () => {
  const { profile, user } = useAuth();
  const { refetch: refetchNotifications } = useNotifications();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<VehicleRequest[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedAt] = useState(() => new Date());

  const requesterName = profile?.name || user?.user_metadata?.full_name || user?.email || "—";

  useEffect(() => {
    fetchVehicleRequests()
      .then((all) => {
        const now = new Date();
        const upcoming = all
          .filter((r) => r.status !== "Rejected")
          .filter((r) => {
            try {
              return isAfter(parseISO(r.eta), now);
            } catch {
              return true;
            }
          })
          .sort((a, b) => a.etd.localeCompare(b.etd));
        setTrips(upcoming);
      })
      .catch(() => {});
  }, []);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      size: "Small",
      weight_kg: 0.5,
      description: "",
      recipient: "",
      destination: "",
      vehicle_request_id: NO_TRIP,
    },
  });

  const tripId = watch("vehicle_request_id");
  const selectedTrip = useMemo(
    () => (tripId && tripId !== NO_TRIP ? trips.find((t) => t.id === tripId) : undefined),
    [tripId, trips]
  );

  useEffect(() => {
    if (selectedTrip) setValue("destination", selectedTrip.destination);
  }, [selectedTrip, setValue]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const linkedTrip = values.vehicle_request_id && values.vehicle_request_id !== NO_TRIP
        ? trips.find((t) => t.id === values.vehicle_request_id)
        : undefined;

      const created = await upsertPadalaRequest({
        size: values.size,
        weight_kg: values.weight_kg,
        description: values.description,
        recipient: values.recipient,
        destination: values.destination || linkedTrip?.destination || null,
        status: "Pending",
        requested_by_id: profile?.id ?? null,
        requested_by_name: requesterName,
        vehicle_request_id: linkedTrip?.id ?? null,
        vehicle_id: linkedTrip?.vehicle_id ?? null,
      });

      const link = linkedTrip ? `/dashboard?req=${linkedTrip.id}` : "/dashboard";

      let notifyError: string | null = null;
      const broadcastBody = linkedTrip
        ? `${requesterName} attached a ${values.size.toLowerCase()} parcel (${values.weight_kg} kg) for ${values.recipient} to ${linkedTrip.requested_by_name ?? "an existing"} trip → ${linkedTrip.destination}.`
        : `${requesterName} → ${values.recipient}${values.destination ? " · " + values.destination : ""} (${values.size}, ${values.weight_kg} kg)`;
      try {
        await pushNotification({
          kind: linkedTrip ? "padala_attached" : "new_request",
          title: linkedTrip ? "Padala attached to a trip" : "New Padala request",
          body: broadcastBody,
          link,
        });
      } catch (e) {
        notifyError = (e as { message?: string })?.message ?? "broadcast failed";
      }
      if (linkedTrip?.requested_by_id) {
        try {
          await pushNotification({
            kind: "padala_attached",
            title: "Padala attached to your trip",
            body: `${requesterName} is sending a ${values.size.toLowerCase()} parcel (${values.weight_kg} kg) to ${values.recipient} on your trip to ${linkedTrip.destination}.`,
            link,
            userId: linkedTrip.requested_by_id,
          });
        } catch (e) {
          notifyError = (e as { message?: string })?.message ?? "trip-owner DM failed";
        }
      }

      toast.success(linkedTrip ? "Padala attached to trip" : "Padala request submitted");
      if (notifyError) {
        toast.warning("Notification didn't fire", {
          description: notifyError,
          duration: 12000,
        });
      }
      refetchNotifications();
      navigate(link);
      void created;
    } catch (e) {
      const msg =
        (e as { message?: string })?.message ||
        (e as { details?: string })?.details ||
        "Could not submit request";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto page-enter">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-balance">Submit Padala (Parcel)</h1>
        <p className="text-sm text-muted-foreground mt-1 text-pretty">Send an item — optionally riding along an existing scheduled trip.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Ride-along selector */}
        <LiquidGlassCard glowIntensity="sm" shadowIntensity="md" blurIntensity="lg">
          <CardHeader>
            <CardTitle className="font-display text-base">Ride along an existing trip?</CardTitle>
            <CardDescription className="text-pretty">
              If a vehicle is already heading to your destination, attach your parcel instead of dispatching a new trip.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={watch("vehicle_request_id") || NO_TRIP}
              onValueChange={(v) => setValue("vehicle_request_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={trips.length ? "Pick an upcoming trip…" : "No upcoming trips"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TRIP}>— Standalone (no ride-along) —</SelectItem>
                {trips.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {format(parseISO(t.etd), "MMM d, HH:mm")} → {t.destination}
                    <span className="ml-2 text-[10px] text-muted-foreground">{t.vehicle_name ?? "Unassigned"} · {t.status}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedTrip && (
              <div className="p-3.5 rounded-xl bg-[#A9CDBE]/20 dark:bg-[#A9CDBE]/10 border border-[#A9CDBE]/50 dark:border-[#A9CDBE]/30 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{selectedTrip.destination}</span>
                  <Badge variant="outline" className="text-[10px] border-[#A9CDBE] text-[#1A4D3B] dark:text-[#A9CDBE]">
                    {selectedTrip.status}
                  </Badge>
                </div>
                <p className="font-mono text-muted-foreground tabular-nums">
                  {format(parseISO(selectedTrip.etd), "EEE, MMM d · HH:mm")} → {format(parseISO(selectedTrip.eta), "HH:mm")}
                </p>
                <p className="text-muted-foreground">
                  {selectedTrip.vehicle_name ?? "Vehicle TBD"} · Requested by {selectedTrip.requested_by_name ?? "—"}
                </p>
                <p className="text-[11px] font-medium text-[#1A4D3B] dark:text-[#A9CDBE] pt-1">
                  Your padala will link to this trip. {selectedTrip.requested_by_name ? `${selectedTrip.requested_by_name} will be notified.` : ""}
                </p>
              </div>
            )}
          </CardContent>
        </LiquidGlassCard>

        <LiquidGlassCard glowIntensity="sm" shadowIntensity="md" blurIntensity="lg">
          <CardHeader>
            <CardTitle className="font-display text-base">Parcel Details</CardTitle>
            <CardDescription>
              Date Prepared: <Badge variant="outline" className="ml-1 font-mono text-[11px] tabular-nums">{format(submittedAt, "PPpp")}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Classification (Size) *</Label>
                <Select value={watch("size")} onValueChange={(v) => setValue("size", v as PadalaSize)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weight_kg">Weight (kg) *</Label>
                <Input id="weight_kg" type="number" step="0.1" min="0" {...register("weight_kg")} />
                {errors.weight_kg && <p className="text-xs text-destructive">{errors.weight_kg.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Item Description *</Label>
              <Textarea id="description" rows={3} placeholder="What is being sent?" {...register("description")} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="recipient">Recipient *</Label>
                <Input id="recipient" placeholder="Recipient name / office" {...register("recipient")} />
                {errors.recipient && <p className="text-xs text-destructive">{errors.recipient.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  placeholder={selectedTrip ? selectedTrip.destination : "e.g. DOST PSTC Aklan"}
                  {...register("destination")}
                />
                {selectedTrip && (
                  <p className="text-[11px] text-muted-foreground">Auto-filled from the selected trip — edit if it's a sub-stop.</p>
                )}
              </div>
            </div>
          </CardContent>
        </LiquidGlassCard>

        <LiquidGlassCard glowIntensity="xs" shadowIntensity="sm" blurIntensity="md">
          <CardContent className="pt-5 grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Requested By</p>
              <p className="font-medium mt-0.5">{requesterName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Status</p>
              <Badge variant="outline" className="mt-0.5 border-[#F2B53A]/60 bg-[#F2B53A]/20 text-[#8A5A00] dark:text-[#F2B53A]">Pending</Badge>
            </div>
          </CardContent>
        </LiquidGlassCard>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate("/dashboard")}>Cancel</Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-[#F2B53A] text-[#0B1325] hover:bg-[#e5a82b] font-semibold"
          >
            {submitting ? "Submitting…" : (selectedTrip ? "Attach Padala" : "Submit Padala")}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PadalaRequestPage;
