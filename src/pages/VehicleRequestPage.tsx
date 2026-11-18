import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
  fetchVehicles, fetchAppUsers, upsertVehicleRequest, pushNotification,
  type Vehicle, type AppUser,
} from "@/lib/queries";
import { combineDateTimePHT } from "@/lib/utils";
import { toast } from "sonner";

const schema = z.object({
  origin: z.string().min(2, "Required"),
  destination: z.string().min(2, "Required"),
  purpose: z.string().min(2, "Required"),
  travel_date: z.string().min(1, "Required"),
  etd: z.string().min(1, "Required"),
  eta: z.string().min(1, "Required"),
  passengers: z.string().min(2, "List at least one passenger"),
  recommending_approval_id: z.string().optional(),
  vehicle_id: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const VehicleRequestPage = () => {
  const { profile, user } = useAuth();
  const { refetch: refetchNotifications } = useNotifications();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [recommenders, setRecommenders] = useState<AppUser[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedAt] = useState(() => new Date());

  useEffect(() => {
    fetchVehicles().then(setVehicles).catch(() => {});
    fetchAppUsers()
      .then((users) =>
        setRecommenders(users.filter((u) => u.is_approved).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")))
      )
      .catch(() => {});
  }, []);

  const requesterName = profile?.name || user?.user_metadata?.full_name || user?.email || "—";

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      origin: "DOST Region VI Office",
      destination: "",
      purpose: "",
      travel_date: format(new Date(), "yyyy-MM-dd"),
      etd: "",
      eta: "",
      passengers: requesterName,
      recommending_approval_id: "",
      vehicle_id: "",
    },
  });

  const selectedVehicle = vehicles.find((v) => v.id === watch("vehicle_id"));

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const travelDate = values.travel_date;
      const etd = combineDateTimePHT(travelDate, values.etd);
      const eta = combineDateTimePHT(travelDate, values.eta);
      const vehicle = vehicles.find((v) => v.id === values.vehicle_id);
      const recommender = recommenders.find((u) => u.id === values.recommending_approval_id);

      const created = await upsertVehicleRequest({
        origin: values.origin,
        destination: values.destination,
        purpose: values.purpose,
        travel_date: travelDate,
        etd,
        eta,
        passengers: values.passengers,
        requested_by_id: profile?.id ?? null,
        requested_by_name: requesterName,
        recommending_approval_id: recommender?.id ?? null,
        recommending_approval_name: recommender?.name ?? null,
        status: "Pending",
        vehicle_id: values.vehicle_id || null,
        vehicle_name: vehicle?.name ?? null,
      });

      const tripLink = `/dashboard?req=${created.id}`;

      let notifyError: string | null = null;
      try {
        await pushNotification({
          kind: "new_request",
          title: "New travel request on the schedule",
          body: `${requesterName}: ${values.origin} → ${values.destination} on ${format(new Date(travelDate), "MMM d")} (${values.etd}–${values.eta})${vehicle ? " · " + vehicle.name : ""}`,
          link: tripLink,
        });
      } catch (e) {
        notifyError = (e as { message?: string })?.message ?? "broadcast failed";
      }

      if (recommender) {
        try {
          await pushNotification({
            userId: recommender.id,
            kind: "status_change",
            title: "You were tagged as recommender",
            body: `${requesterName} listed you as recommending approval on a trip to ${values.destination}.`,
            link: tripLink,
          });
        } catch (e) {
          notifyError = (e as { message?: string })?.message ?? "recommender DM failed";
        }
      }

      toast.success("Vehicle request submitted", {
        description: recommender
          ? `${recommender.name ?? recommender.email} has been notified.`
          : "Visible on the dispatch timeline.",
      });
      if (notifyError) {
        toast.warning("Notification didn't fire", {
          description: notifyError,
          duration: 12000,
        });
      }
      refetchNotifications();
      navigate(tripLink);
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
        <h1 className="font-display text-2xl font-bold tracking-tight text-balance">Submit Vehicle Request</h1>
        <p className="text-sm text-muted-foreground mt-1 text-pretty">Reserve a service vehicle for an official trip.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <LiquidGlassCard glowIntensity="sm" shadowIntensity="md" blurIntensity="lg">
          <CardHeader>
            <CardTitle className="font-display text-base">Request Details</CardTitle>
            <CardDescription>
              Date Prepared: <Badge variant="outline" className="ml-1 font-mono text-[11px] tabular-nums">{format(submittedAt, "PPpp")}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="origin">From *</Label>
                <Input id="origin" placeholder="e.g. DOST Region VI Office" {...register("origin")} />
                {errors.origin && <p className="text-xs text-destructive">{errors.origin.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="destination">To (Destination) *</Label>
                <Input id="destination" placeholder="e.g. Iloilo City Hall" {...register("destination")} />
                {errors.destination && <p className="text-xs text-destructive">{errors.destination.message}</p>}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="travel_date">Date of Travel *</Label>
                <Input id="travel_date" type="date" {...register("travel_date")} />
                {errors.travel_date && <p className="text-xs text-destructive">{errors.travel_date.message}</p>}
              </div>
              <div className="hidden sm:block" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="purpose">Purpose *</Label>
              <Textarea id="purpose" rows={3} placeholder="Describe the purpose of the trip" {...register("purpose")} />
              {errors.purpose && <p className="text-xs text-destructive">{errors.purpose.message}</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="etd">Estimated Time of Departure *</Label>
                <Input id="etd" type="time" {...register("etd")} />
                {errors.etd && <p className="text-xs text-destructive">{errors.etd.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eta">Estimated Time of Arrival *</Label>
                <Input id="eta" type="time" {...register("eta")} />
                {errors.eta && <p className="text-xs text-destructive">{errors.eta.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="passengers">Authorized Passengers *</Label>
              <Textarea id="passengers" rows={2} placeholder="One name per line, or comma-separated" {...register("passengers")} />
              {errors.passengers && <p className="text-xs text-destructive">{errors.passengers.message}</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Preferred Vehicle (suggestion only)</Label>
                <Select value={watch("vehicle_id") || ""} onValueChange={(v) => setValue("vehicle_id", v)}>
                  <SelectTrigger><SelectValue placeholder={vehicles.length ? "Suggest a vehicle (optional)" : "No vehicles seeded"} /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}{v.plate_number ? ` · ${v.plate_number}` : ""}{v.driver_name ? ` · ${v.driver_name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedVehicle?.driver_name && (
                  <p className="text-[11px] text-muted-foreground pt-1 font-mono tabular-nums">
                    Driver: {selectedVehicle.driver_name}
                    {selectedVehicle.driver_contact ? ` · ${selectedVehicle.driver_contact}` : ""}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Final dispatch is assigned by an Admin.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Recommending Approval</Label>
                <Select
                  value={watch("recommending_approval_id") || ""}
                  onValueChange={(v) => setValue("recommending_approval_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={recommenders.length ? "Choose a recommender" : "No approved users yet"} />
                  </SelectTrigger>
                  <SelectContent>
                    {recommenders.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email}
                        <span className="ml-2 text-[10px] text-muted-foreground">{u.role}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Select the recommender who will endorse this request.</p>
              </div>
            </div>
          </CardContent>
        </LiquidGlassCard>

        <LiquidGlassCard glowIntensity="xs" shadowIntensity="sm" blurIntensity="md">
          <CardContent className="pt-5 grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Requested By</p>
              <p className="font-medium mt-0.5">{requesterName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Status</p>
              <Badge variant="outline" className="mt-0.5 border-[#F2B53A]/60 bg-[#F2B53A]/20 text-[#8A5A00] dark:text-[#F2B53A]">Pending</Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Approval</p>
              <Badge variant="outline" className="mt-0.5">Awaiting approval</Badge>
            </div>
          </CardContent>
        </LiquidGlassCard>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate("/dashboard")}>Cancel</Button>
          <Button type="submit" disabled={submitting} className="font-semibold">
            {submitting ? "Submitting…" : "Submit Request"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default VehicleRequestPage;
