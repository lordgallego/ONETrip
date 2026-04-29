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
import { Trash2, Check, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

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

  const roleVariant = (role: AppRole) => {
    if (role === "Admin")       return "default";
    if (role === "Approver")    return "default";
    if (role === "Recommender") return "secondary";
    return "outline";
  };

  return (
    <div className="p-6 space-y-6 page-enter">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">Approve new sign-ins and assign roles for One Trip.</p>
        </div>
      </div>

      {/* PENDING USERS */}
      {pendingUsers.length > 0 && (
        <LiquidGlassCard glowIntensity="sm" shadowIntensity="md" blurIntensity="lg">
          <CardHeader>
            <CardTitle className="text-base">Pending Approval ({pendingUsers.length})</CardTitle>
            <CardDescription>New Google sign-ins awaiting your review.</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6 space-y-3">
            {pendingUsers.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-amber-50/60 border border-amber-200/50">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-medium">{user.name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                {canManageUsers && (
                  <div className="flex items-center gap-2">
                    <Select onValueChange={(role) => handleApprove(user.id, role as AppRole)}>
                      <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder="Approve as..." /></SelectTrigger>
                      <SelectContent>
                        {APP_ROLES.map((r) => <SelectItem key={r} value={r}>Approve as {r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-9" onClick={() => handleApprove(user.id, "Member")}>
                      <Check className="h-4 w-4 mr-1" /> Quick Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="h-9 text-destructive" onClick={() => handleDelete(user.id, user.email)}>
                      <X className="h-4 w-4" />
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
          <CardTitle className="text-base">Registered Users ({approvedUsers.length})</CardTitle>
          <CardDescription>Change a user's role or remove them from the system.</CardDescription>
        </CardHeader>
        <div className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
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
                          <Badge variant={roleVariant(user.role)}>{user.role}</Badge>
                        )}
                      </TableCell>
                      {canManageUsers && (
                        <TableCell>
                          {!isSelf && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(user.id, user.email)}>
                              <Trash2 className="h-4 w-4" />
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
