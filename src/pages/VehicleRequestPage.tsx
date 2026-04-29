import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Car, Send, Phone, User as UserIcon } from "lucide-react";
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
import { toast } from "sonner";

const schema = z.object({
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
  const { pushLocal } = useNotifications();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [recommenders, setRecommenders] = useState<AppUser[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedAt] = useState(() => new Date());

  useEffect(() => {
    fetchVehicles().then(setVehicles).catch(() => {});
    fetchAppUsers()
      .then((users) =>
        // Anyone approved can be picked as recommender; sorted by name.
        setRecommenders(users.filter((u) => u.is_approved).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")))
      )
      .catch(() => {});
  }, []);

  const requesterName = profile?.name || user?.user_metadata?.full_name || user?.email || "—";

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
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
      const etd = `${travelDate}T${values.etd}:00`;
      const eta = `${travelDate}T${values.eta}:00`;
      const vehicle = vehicles.find((v) => v.id === values.vehicle_id);
      const recommender = recommenders.find((u) => u.id === values.recommending_approval_id);

      const created = await upsertVehicleRequest({
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

      // Site-wide broadcast so other users see the new trip on the timeline.
      try {
        await pushNotification({
          kind: "new_request",
          title: "New travel request on the schedule",
          body: `${requesterName} → ${values.destination} on ${format(new Date(travelDate), "MMM d")} (${values.etd}–${values.eta})${vehicle ? " · " + vehicle.name : ""}`,
          link: "/dashboard",
        });
      } catch {
        // notifications table optional — ignore
      }

      // DM the chosen recommender so they don't miss it.
      if (recommender) {
        try {
          await pushNotification({
            userId: recommender.id,
            kind: "status_change",
            title: "You were tagged as recommender",
            body: `${requesterName} listed you as recommending approval on a trip to ${values.destination}.`,
            link: "/dashboard",
          });
        } catch {
          // ignore
        }
      }

      pushLocal({
        title: "Vehicle request submitted",
        body: `${values.destination} · ${travelDate}`,
        link: "/dashboard",
      });
      toast.success("Vehicle request submitted");
      navigate("/dashboard");
      // suppress lint about unused created
      void created;
    } catch (e) {
      toast.error((e as Error).message || "Could not submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto page-enter">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Car className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Submit Vehicle Request</h1>
          <p className="text-sm text-muted-foreground">Reserve a service vehicle for an official trip.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <LiquidGlassCard glowIntensity="sm" shadowIntensity="md" blurIntensity="lg">
          <CardHeader>
            <CardTitle className="text-base">Request Details</CardTitle>
            <CardDescription>
              Date Prepared: <Badge variant="outline" className="ml-1">{format(submittedAt, "PPpp")}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="destination">Destination *</Label>
                <Input id="destination" placeholder="e.g. Iloilo City Hall" {...register("destination")} />
                {errors.destination && <p className="text-xs text-destructive">{errors.destination.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="travel_date">Date of Travel *</Label>
                <Input id="travel_date" type="date" {...register("travel_date")} />
                {errors.travel_date && <p className="text-xs text-destructive">{errors.travel_date.message}</p>}
              </div>
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
                <Label>Vehicle (preferred)</Label>
                <Select value={watch("vehicle_id") || ""} onValueChange={(v) => setValue("vehicle_id", v)}>
                  <SelectTrigger><SelectValue placeholder={vehicles.length ? "Choose a vehicle" : "No vehicles seeded"} /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}{v.plate_number ? ` · ${v.plate_number}` : ""}{v.driver_name ? ` · ${v.driver_name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedVehicle?.driver_name && (
                  <div className="text-[11px] text-muted-foreground flex items-center gap-3 pt-1">
                    <span className="inline-flex items-center gap-1"><UserIcon className="h-3 w-3" />{selectedVehicle.driver_name}</span>
                    {selectedVehicle.driver_contact && (
                      <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{selectedVehicle.driver_contact}</span>
                    )}
                  </div>
                )}
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
                <p className="text-[11px] text-muted-foreground">Pick the user whose endorsement you'll seek before approval.</p>
              </div>
            </div>
          </CardContent>
        </LiquidGlassCard>

        <LiquidGlassCard glowIntensity="xs" shadowIntensity="sm" blurIntensity="md">
          <CardContent className="pt-5 grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Requested By</p>
              <p className="font-medium">{requesterName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Status</p>
              <Badge variant="secondary">Pending</Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Approved</p>
              <Badge variant="outline">Awaiting approval</Badge>
            </div>
          </CardContent>
        </LiquidGlassCard>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate("/dashboard")}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            <Send className="h-4 w-4 mr-2" /> {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default VehicleRequestPage;
