import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import {
  Users,
  UserPlus,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  PauseCircle,
  PlayCircle,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface TeamMember {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  companyRole: string | null;
  companyStatus: string | null;
  inviteExpiresAt: string | null;
  createdAt: string | null;
}

function statusBadge(status: string | null) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
    case "suspended":
      return <Badge className="bg-red-100 text-red-700 border-red-200">Suspended</Badge>;
    case "pending_invite":
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Invite Pending</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function ContractorTeam() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteResult, setInviteResult] = useState<{ inviteUrl: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<TeamMember | null>(null);

  const { data: team = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/contractor/enterprise/team"],
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; firstName?: string; lastName?: string }) =>
      apiRequest("/api/contractor/enterprise/invite-tech", "POST", data),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/contractor/enterprise/team"] });
      setInviteResult(data);
      toast({ title: "Invite sent", description: `Invitation email sent to ${inviteEmail}` });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message || "Failed to send invite", variant: "destructive" });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest(`/api/contractor/enterprise/team/${userId}/suspend`, "PATCH"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/contractor/enterprise/team"] });
      toast({ title: "Team member suspended" });
      setSuspendTarget(null);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reactivateMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest(`/api/contractor/enterprise/team/${userId}/reactivate`, "PATCH"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/contractor/enterprise/team"] });
      toast({ title: "Team member reactivated" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest(`/api/contractor/enterprise/team/${userId}`, "DELETE"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/contractor/enterprise/team"] });
      toast({ title: "Team member removed" });
      setRemoveTarget(null);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const typedUser = user as any;
  const isOwner =
    typedUser?.role === "contractor" &&
    (typedUser?.companyRole === "owner" || typedUser?.companyRole === "admin");

  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-slate-600">Only company owners can manage the team.</p>
            <Link href="/contractor-dashboard">
              <Button variant="outline" className="mt-4">
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    inviteMutation.mutate({
      email: inviteEmail,
      firstName: inviteFirstName || undefined,
      lastName: inviteLastName || undefined,
    });
  };

  const copyInviteUrl = () => {
    if (inviteResult?.inviteUrl) {
      navigator.clipboard.writeText(inviteResult.inviteUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const resetInviteDialog = () => {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteFirstName("");
    setInviteLastName("");
    setInviteResult(null);
    setCopiedUrl(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/contractor-dashboard">
          <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
          <p className="text-slate-500 text-sm">Invite and manage your field technicians</p>
        </div>
        <div className="ml-auto">
          <Button
            onClick={() => setInviteOpen(true)}
            style={{ background: "#1560A2" }}
            className="text-white"
          >
            <UserPlus size={16} className="mr-2" />
            Invite Tech
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users size={18} className="text-[#1560A2]" />
            Field Technicians
          </CardTitle>
          <CardDescription>
            {team.length} tech{team.length !== 1 ? "s" : ""} on your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-slate-400">Loading team members…</div>
          ) : team.length === 0 ? (
            <div className="py-10 text-center">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium mb-1">No technicians yet</p>
              <p className="text-slate-400 text-sm">
                Invite your first tech to get started.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus size={15} className="mr-2" />
                Invite Tech
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {team.map((member) => (
                <div key={member.id} className="py-4 flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg, #0C3460, #1560A2)" }}
                  >
                    {(member.firstName?.[0] || member.email?.[0] || "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {member.firstName && member.lastName
                        ? `${member.firstName} ${member.lastName}`
                        : member.email || "Unknown"}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                      <Mail size={11} />
                      {member.email}
                    </p>
                    {member.companyStatus === "pending_invite" && member.inviteExpiresAt && (
                      <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                        <Clock size={11} />
                        Invite expires{" "}
                        {format(new Date(member.inviteExpiresAt), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">{statusBadge(member.companyStatus)}</div>
                  <div className="flex items-center gap-1 shrink-0">
                    {member.companyStatus === "active" && (
                      <button
                        title="Suspend"
                        className="p-1.5 rounded hover:bg-amber-50 text-amber-500 hover:text-amber-700"
                        onClick={() => setSuspendTarget(member)}
                      >
                        <PauseCircle size={16} />
                      </button>
                    )}
                    {member.companyStatus === "suspended" && (
                      <button
                        title="Reactivate"
                        className="p-1.5 rounded hover:bg-green-50 text-green-500 hover:text-green-700"
                        onClick={() => reactivateMutation.mutate(member.id)}
                        disabled={reactivateMutation.isPending}
                      >
                        <PlayCircle size={16} />
                      </button>
                    )}
                    <button
                      title="Remove from team"
                      className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"
                      onClick={() => setRemoveTarget(member)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={(o) => { if (!o) resetInviteDialog(); else setInviteOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Field Technician</DialogTitle>
          </DialogHeader>
          {inviteResult ? (
            <div className="flex flex-col gap-4 py-2">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3">
                <CheckCircle size={18} />
                <span className="text-sm font-medium">Invite sent to {inviteEmail}</span>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-2">
                  Or share this invite link directly:
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={inviteResult.inviteUrl}
                    className="flex-1 text-xs border rounded px-3 py-2 bg-slate-50 text-slate-600 truncate"
                  />
                  <button
                    onClick={copyInviteUrl}
                    className="px-3 py-2 border rounded text-slate-500 hover:bg-slate-100"
                    title="Copy link"
                  >
                    {copiedUrl ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={resetInviteDialog}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="flex flex-col gap-4 py-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="tech@example.com"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    First Name
                  </label>
                  <Input
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Last Name
                  </label>
                  <Input
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    placeholder="Smith"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400">
                The tech will receive an email with a link to set up their account.
                Invite links expire in 7 days.
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetInviteDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  style={{ background: "#1560A2" }}
                  className="text-white"
                >
                  {inviteMutation.isPending ? "Sending…" : "Send Invite"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Suspend Confirm */}
      <ConfirmDialog
        open={!!suspendTarget}
        onOpenChange={(o) => { if (!o) setSuspendTarget(null); }}
        title="Suspend Team Member?"
        description={`${suspendTarget?.firstName || suspendTarget?.email} will no longer be able to access the company dashboard until reactivated.`}
        confirmLabel="Suspend"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => suspendTarget && suspendMutation.mutate(suspendTarget.id)}
      />

      {/* Remove Confirm */}
      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}
        title="Remove from Team?"
        description={`${removeTarget?.firstName || removeTarget?.email} will be unlinked from your company. Their account will remain active.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
      />
    </div>
  );
}
