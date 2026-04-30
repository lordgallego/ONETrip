import { supabaseAnon as supabase, supabase as supabaseAuth } from "./supabase";
import type { AppRole } from "./auth";

// ─── Domain Types ───────────────────────────────────────────

export type RequestStatus = "Pending" | "Recommended" | "Approved" | "Rejected";

export interface Vehicle {
  id: string;
  name: string;
  plate_number: string | null;
  capacity: number | null;
  driver_name: string | null;
  driver_contact: string | null;
}

export interface VehicleRequest {
  id: string;
  date_prepared: string;          // ISO timestamp
  origin: string | null;          // "From" — departure point
  destination: string;            // "To"
  purpose: string;
  travel_date: string;            // ISO date
  etd: string;                    // ISO timestamp (estimated time of departure)
  eta: string;                    // ISO timestamp (estimated time of arrival)
  passengers: string;
  requested_by_id: string | null;
  requested_by_name: string | null;
  recommending_approval_id: string | null;
  recommending_approval_name: string | null;
  status: RequestStatus;
  approver_id: string | null;
  approver_name: string | null;
  vehicle_id: string | null;
  vehicle_name: string | null;
  notes: string | null;
}

export type PadalaSize = "Small" | "Medium" | "Large" | "Extra Large";

export interface PadalaRequest {
  id: string;
  date_prepared: string;
  size: PadalaSize;
  weight_kg: number;
  description: string;
  recipient: string;
  destination: string | null;
  status: RequestStatus;
  requested_by_id: string | null;
  requested_by_name: string | null;
  vehicle_id: string | null;
  vehicle_request_id: string | null;   // ride-along link
  notes: string | null;
}

export interface AppUser {
  id: string;
  name: string | null;
  email: string;
  role: AppRole;
  is_approved: boolean;
}

export type NotificationKind = "info" | "new_request" | "status_change" | "padala_attached";

export interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  body: string | null;
  link: string | null;
  kind: NotificationKind;
  app: string | null;
  read: boolean;
  created_at: string;
}

/** Namespace for One Trip notifications — keeps this app's bell isolated
 *  from any other app sharing the same Supabase project. */
export const ONE_TRIP_APP = "one_trip";

// ─── Helpers ────────────────────────────────────────────────

async function safeSelect<T>(promise: Promise<{ data: T[] | null; error: any }>): Promise<T[]> {
  const { data, error } = await promise;
  if (error) {
    if (error.code === "42P01" || /relation .* does not exist/i.test(error.message ?? "")) {
      return [];
    }
    throw error;
  }
  return data ?? [];
}

// ─── App Users ──────────────────────────────────────────────

export async function fetchAppUsers(): Promise<AppUser[]> {
  return safeSelect<AppUser>(
    supabase.from("app_users").select("*").order("name") as any
  );
}

export async function updateAppUser(id: string, updates: Partial<AppUser>) {
  const { error } = await supabaseAuth.from("app_users").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteAppUser(id: string) {
  const { error } = await supabaseAuth.from("app_users").delete().eq("id", id);
  if (error) throw error;
}

// ─── Vehicles ───────────────────────────────────────────────

export async function fetchVehicles(): Promise<Vehicle[]> {
  return safeSelect<Vehicle>(
    supabase.from("vehicles").select("*").order("name") as any
  );
}

// ─── Vehicle Requests ───────────────────────────────────────

export async function fetchVehicleRequests(): Promise<VehicleRequest[]> {
  return safeSelect<VehicleRequest>(
    supabase
      .from("vehicle_requests")
      .select("*")
      .order("travel_date", { ascending: true }) as any
  );
}

export async function upsertVehicleRequest(req: Partial<VehicleRequest> & {
  destination: string;
  purpose: string;
  travel_date: string;
  etd: string;
  eta: string;
  passengers: string;
}) {
  const { data, error } = await supabaseAuth
    .from("vehicle_requests")
    .upsert(req)
    .select()
    .single();
  if (error) throw error;
  return data as VehicleRequest;
}

export async function deleteVehicleRequest(id: string) {
  const { error } = await supabaseAuth.from("vehicle_requests").delete().eq("id", id);
  if (error) throw error;
}

export async function deletePadalaRequest(id: string) {
  const { error } = await supabaseAuth.from("padala_requests").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Admin override: assign or reassign a vehicle to a request.
 * The requester's chosen vehicle is just a preference — the admin makes
 * the final dispatch decision.
 */
export async function setVehicleAssignment(
  requestId: string,
  vehicleId: string | null,
  vehicleName: string | null,
) {
  const { error } = await supabaseAuth
    .from("vehicle_requests")
    .update({ vehicle_id: vehicleId, vehicle_name: vehicleName })
    .eq("id", requestId);
  if (error) throw error;
}

export async function setVehicleRequestStatus(
  id: string,
  status: RequestStatus,
  actorId: string | null,
  actorName: string | null,
) {
  const updates: Partial<VehicleRequest> = { status };
  if (status === "Recommended") {
    updates.recommending_approval_id = actorId;
    updates.recommending_approval_name = actorName;
  } else if (status === "Approved" || status === "Rejected") {
    updates.approver_id = actorId;
    updates.approver_name = actorName;
  }
  const { error } = await supabaseAuth.from("vehicle_requests").update(updates).eq("id", id);
  if (error) throw error;
}

// ─── Padala Requests ────────────────────────────────────────

export async function fetchPadalaRequests(): Promise<PadalaRequest[]> {
  return safeSelect<PadalaRequest>(
    supabase
      .from("padala_requests")
      .select("*")
      .order("date_prepared", { ascending: false }) as any
  );
}

export async function upsertPadalaRequest(req: Partial<PadalaRequest> & {
  size: PadalaSize;
  weight_kg: number;
  description: string;
  recipient: string;
}) {
  const { data, error } = await supabaseAuth
    .from("padala_requests")
    .upsert(req)
    .select()
    .single();
  if (error) throw error;
  return data as PadalaRequest;
}

// ─── Notifications ──────────────────────────────────────────

function isMissingAppColumn(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  // Postgres error 42703 = undefined_column
  if (err.code === "42703") return true;
  return /column .*app.* does not exist/i.test(err.message ?? "");
}

function isMissingTable(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  if (err.code === "42P01") return true;
  return /relation .* does not exist/i.test(err.message ?? "");
}

export async function fetchNotifications(userId: string | null): Promise<Notification[]> {
  if (!userId) return [];
  // First try with the app-namespace filter so we ignore foreign-app rows.
  let res = await supabase
    .from("notifications")
    .select("*")
    .eq("app", ONE_TRIP_APP)
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(50);

  // If the column hasn't been added yet, fall back to a plain query so the
  // bell still works while the user runs the migration.
  if (res.error && isMissingAppColumn(res.error)) {
    res = await supabase
      .from("notifications")
      .select("*")
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(50);
  }
  if (res.error) {
    if (isMissingTable(res.error)) return [];
    throw res.error;
  }
  return res.data ?? [];
}

export async function markNotificationRead(id: string) {
  const { error } = await supabaseAuth.from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
}

/**
 * Fire a notification. Pass userId=null for site-wide broadcasts.
 * `kind` lets the bell render different icons / styles for each event type.
 */
export async function pushNotification(opts: {
  userId?: string | null;
  title: string;
  body?: string;
  link?: string;
  kind?: NotificationKind;
}) {
  const base = {
    user_id: opts.userId ?? null,
    title: opts.title,
    body: opts.body ?? null,
    link: opts.link ?? null,
    kind: opts.kind ?? "info",
    read: false,
  };
  // Insert with the namespace tag first; if the schema migration hasn't
  // added the 'app' column yet, retry without it. Same fallback for 'kind'.
  let { error } = await supabaseAuth.from("notifications").insert({ ...base, app: ONE_TRIP_APP });
  if (error && isMissingAppColumn(error)) {
    ({ error } = await supabaseAuth.from("notifications").insert(base));
  }
  if (error && /column .*kind.* does not exist/i.test(error.message ?? "")) {
    const { kind: _k, ...withoutKind } = base;
    ({ error } = await supabaseAuth.from("notifications").insert(withoutKind));
  }
  if (error) throw error;
}

/** @deprecated use pushNotification */
export async function broadcastNotification(title: string, body: string, link?: string | null) {
  await pushNotification({ title, body, link: link ?? undefined, kind: "info" });
}
