import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Package, Send } from "lucide-react";
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
import { upsertPadalaRequest, broadcastNotification, type PadalaSize } from "@/lib/queries";
import { toast } from "sonner";

const SIZES: PadalaSize[] = ["Small", "Medium", "Large", "Extra Large"];

const schema = z.object({
  size: z.enum(["Small", "Medium", "Large", "Extra Large"]),
  weight_kg: z.coerce.number().positive("Weight must be > 0"),
  description: z.string().min(2, "Required"),
  recipient: z.string().min(2, "Required"),
  destination: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const PadalaRequestPage = () => {
  const { profile, user } = useAuth();
  const { pushLocal } = useNotifications();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submittedAt] = useState(() => new Date());

  const requesterName = profile?.name || user?.user_metadata?.full_name || user?.email || "—";

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { size: "Small", weight_kg: 0.5, description: "", recipient: "", destination: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await upsertPadalaRequest({
        size: values.size,
        weight_kg: values.weight_kg,
        description: values.description,
        recipient: values.recipient,
        destination: values.destination || null,
        status: "Pending",
        requested_by_id: profile?.id ?? null,
        requested_by_name: requesterName,
      });

      try {
        await broadcastNotification(
          "New Padala Request",
          `${requesterName} sent a ${values.size.toLowerCase()} parcel to ${values.recipient}.`,
          "/dashboard",
        );
      } catch {
        // optional broadcast — ignore
      }

      pushLocal({
        title: "Padala request submitted",
        body: `${values.size} · ${values.weight_kg} kg · ${values.recipient}`,
        link: "/dashboard",
      });
      toast.success("Padala request submitted");
      navigate("/dashboard");
    } catch (e) {
      toast.error((e as Error).message || "Could not submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto page-enter">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Submit Padala (Parcel)</h1>
          <p className="text-sm text-muted-foreground">Send an item via the next available dispatch.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <LiquidGlassCard glowIntensity="sm" shadowIntensity="md" blurIntensity="lg">
          <CardHeader>
            <CardTitle className="text-base">Parcel Details</CardTitle>
            <CardDescription>
              Date Prepared: <Badge variant="outline" className="ml-1">{format(submittedAt, "PPpp")}</Badge>
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
                <Input id="destination" placeholder="e.g. DOST PSTC Aklan" {...register("destination")} />
              </div>
            </div>
          </CardContent>
        </LiquidGlassCard>

        <LiquidGlassCard glowIntensity="xs" shadowIntensity="sm" blurIntensity="md">
          <CardContent className="pt-5 grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Requested By</p>
              <p className="font-medium">{requesterName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Status</p>
              <Badge variant="secondary">Pending</Badge>
            </div>
          </CardContent>
        </LiquidGlassCard>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate("/dashboard")}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            <Send className="h-4 w-4 mr-2" /> {submitting ? "Submitting..." : "Submit Padala"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PadalaRequestPage;
