import { fetchAppUsers, updateAppUser, deleteAppUser } from "@/lib/queries";
import { useFetch } from "@/hooks/use-fetch";
import { useAuth, type AppRole, APP_ROLES } from "@/lib/auth";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AdminUsersPage = () => {
  const { canManageUsers, profile: currentUser } = useAuth();
  const { data: users, loading, error, refetch } = useFetch(() => fetchAppUsers());

  const pendingUsers = (users ?? []).filter((u) => !u.is_approved);
  const approvedUsers = (users ?? []).filter((u) => u.is_approved);

  const handleApprove = async (userId: string, role: AppRole = "Member") => {
    try {
      await updateAppUser(userId, { is_approved: true, role });
      toast.success(`User approved as ${role}`);
      refetch();
    } catch (e) { toast.error((e as Error).message || "Failed to approve"); }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateAppUser(userId, { role: role as AppRole });
      toast.success("Role updated");
      refetch();
    } catch (e) { toast.error((e as Error).message); }
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Remove ${email} from the system?`)) return;
    try {
      await deleteAppUser(userId);
      toast.success("User removed");
      refetch();
    } catch (e) { toast.error((e as Error).message); }
  };

  const roleClass = (role: AppRole) => {
    if (role === "Admin")       return "border-[#F2B53A]/60 bg-[#F2B53A]/20 text-[#8A5A00] dark:text-[#F2B53A]";
    if (role === "Approver")    return "border-[#A9CDBE] bg-[#A9CDBE]/30 text-[#1A4D3B] dark:bg-[#A9CDBE]/15 dark:text-[#A9CDBE]";
    if (role === "Recommender") return "border-sky-400/40 bg-sky-500/15 text-sky-700 dark:text-sky-300";
    return "border-border bg-muted/60 text-muted-foreground";
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-balance">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1 text-pretty">Approve new Google sign-ins and assign operational roles for 1TRIP.</p>
      </div>

      {/* PENDING USERS */}
      {pendingUsers.length > 0 && (
        <LiquidGlassCard glowIntensity="sm" shadowIntensity="md" blurIntensity="lg">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#F2B53A]" aria-hidden />
              Pending Approval ({pendingUsers.length})
            </CardTitle>
            <CardDescription>New Google sign-ins awaiting your review.</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6 space-y-3">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-[#F2B53A]/15 dark:bg-[#F2B53A]/10 border border-[#F2B53A]/45"
              >
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-medium">{user.name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                {canManageUsers && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select onValueChange={(role) => handleApprove(user.id, role as AppRole)}>
                      <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder="Approve as…" /></SelectTrigger>
                      <SelectContent>
                        {APP_ROLES.map((r) => <SelectItem key={r} value={r}>Approve as {r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-9 border-[#A9CDBE]/60 hover:bg-[#A9CDBE]/20" onClick={() => handleApprove(user.id, "Member")}>
                      Approve as Member
                    </Button>
                    <Button size="sm" variant="ghost" className="h-9 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(user.id, user.email)}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </LiquidGlassCard>
      )}

      {/* APPROVED USERS */}
      <LiquidGlassCard glowIntensity="sm" shadowIntensity="md" blurIntensity="lg">
        <CardHeader>
          <CardTitle className="font-display text-base">Registered Users ({approvedUsers.length})</CardTitle>
          <CardDescription>Change a user's role or remove them from the system.</CardDescription>
        </CardHeader>
        <div className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">Failed to load. Please refresh.</div>
          ) : approvedUsers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No registered users yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  {canManageUsers && <TableHead className="w-[60px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedUsers.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        {canManageUsers && !isSelf ? (
                          <Select value={user.role} onValueChange={(v) => handleRoleChange(user.id, v)}>
                            <SelectTrigger className="w-[170px] h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {APP_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className={cn(roleClass(user.role))}>{user.role}</Badge>
                        )}
                      </TableCell>
                      {canManageUsers && (
                        <TableCell>
                          {!isSelf && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove ${user.email}`}
                              className="size-8 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(user.id, user.email)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </LiquidGlassCard>
    </div>
  );
};

export default AdminUsersPage;
