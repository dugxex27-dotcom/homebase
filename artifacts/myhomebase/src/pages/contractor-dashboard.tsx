import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Proposals } from "@/components/proposals";
import { ContractorCodeEntry } from "@/components/ConnectionCodes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import { useAuth } from "@/hooks/useAuth";
import { useContractorSubscription } from "@/hooks/useContractorSubscription";

import { ContractorTrialExpiredPaywall, ContractorTrialBanner } from "@/components/contractor-feature-gate";
import { TechDashboard } from "./tech-dashboard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Gift, 
  FileText, 
  Calendar, 
  DollarSign, 
  Users, 
  Briefcase,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Plus,
  Sparkles,
  UserCog,
  Mail,
  Copy,
  Check,
  PauseCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Pencil,
  X,
  Clock,
} from "lucide-react";
import type { User as UserType, Proposal, ContractorAppointment } from "@shared/schema";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import "./home.css";

/** Fraction of seats used at which the amber "nearly full" warning appears (e.g. 0.8 = 80%). */
const SEAT_WARN_THRESHOLD = 0.8;

interface ContactedHomeowner {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  lastContactedAt: Date;
}

interface TeamMember {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  companyRole: string | null;
  status: string | null;
  lastLoginAt: string | null;
  inviteExpiresAt: string | null;
  createdAt: string | null;
  invoiceCount: number;
}

interface AdminInvoice {
  id: string;
  homeownerId: string | null;
  homeownerFirstName: string | null;
  homeownerLastName: string | null;
  jobId: string | null;
  fileName: string;
  fileUrl: string;
  notes: string | null;
  amount: string | null;
  invoiceDate: string | null;
  createdAt: string | null;
  uploaderFirstName: string | null;
  uploaderLastName: string | null;
  uploaderEmail: string | null;
}

function TechJobHistory({ memberId, memberName }: { memberId: string; memberName: string }) {
  const { data: invoices = [], isLoading } = useQuery<AdminInvoice[]>({
    queryKey: ['/api/contractor/invoices', 'tech', memberId],
    queryFn: async () => {
      const params = new URLSearchParams({ techId: memberId });
      const res = await fetch(`/api/contractor/invoices?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div style={{ padding: '10px 0 4px', color: '#94a3b8', fontSize: 12 }}>Loading job history…</div>
    );
  }

  if (!invoices.length) {
    return (
      <div style={{ padding: '10px 0 4px', color: '#94a3b8', fontSize: 12 }}>No invoices submitted yet.</div>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        Job History · {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {invoices.map(inv => {
          const homeownerName = [inv.homeownerFirstName, inv.homeownerLastName].filter(Boolean).join(' ') || 'Unknown homeowner';
          const dateStr = inv.invoiceDate
            ? format(new Date(inv.invoiceDate), 'MMM d, yyyy')
            : inv.createdAt
              ? format(new Date(inv.createdAt), 'MMM d, yyyy')
              : '—';
          const amountStr = inv.amount != null ? `$${parseFloat(inv.amount).toFixed(2)}` : '—';
          return (
            <div key={inv.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#f8fafc', borderRadius: 8, padding: '7px 10px',
              border: '1px solid #e2e8f0',
            }}>
              <FileText size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {homeownerName}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{dateStr}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0C3460', flexShrink: 0 }}>{amountStr}</div>
              <a
                href={inv.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#1560A2', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, flexShrink: 0, textDecoration: 'none' }}
                title="View invoice"
              >
                <ExternalLink size={12} />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AuditEntry {
  id: string;
  teamAction: 'suspended' | 'reactivated' | 'removed' | null;
  actorName: string | null;
  createdAt: string;
}

type AuditFilter = 'all' | 'suspended' | 'reactivated' | 'removed';

function MemberAuditHistory({ memberId }: { memberId: string }) {
  const [filter, setFilter] = React.useState<AuditFilter>('all');

  const { data: entries = [], isLoading } = useQuery<AuditEntry[]>({
    queryKey: ['/api/contractor/team', memberId, 'audit-log'],
    queryFn: async () => {
      const res = await fetch(`/api/contractor/team/${memberId}/audit-log`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch audit log');
      return res.json();
    },
  });

  if (isLoading) {
    return <div style={{ padding: '6px 0 2px', color: '#94a3b8', fontSize: 11 }}>Loading activity…</div>;
  }

  if (!entries.length) {
    return <div style={{ padding: '6px 0 2px', color: '#94a3b8', fontSize: 11 }}>No activity recorded yet.</div>;
  }

  const actionLabel: Record<string, { label: string; color: string }> = {
    suspended: { label: 'Suspended', color: '#dc2626' },
    reactivated: { label: 'Reactivated', color: '#09694a' },
    removed: { label: 'Removed', color: '#7c3aed' },
  };

  const counts: Record<string, number> = { suspended: 0, reactivated: 0, removed: 0 };
  for (const e of entries) {
    if (e.teamAction && e.teamAction in counts) counts[e.teamAction]++;
  }

  const filterPills: { key: AuditFilter; label: string; activeColor: string; count: number }[] = [
    { key: 'all', label: 'All', activeColor: '#334155', count: entries.length },
    { key: 'suspended', label: 'Suspended', activeColor: '#dc2626', count: counts.suspended },
    { key: 'reactivated', label: 'Reactivated', activeColor: '#09694a', count: counts.reactivated },
    { key: 'removed', label: 'Removed', activeColor: '#7c3aed', count: counts.removed },
  ];

  const visible = filter === 'all' ? entries : entries.filter(e => e.teamAction === filter);

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Activity · {visible.length} event{visible.length !== 1 ? 's' : ''}{filter !== 'all' ? ` (filtered)` : ''}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {filterPills.map(pill => {
            const active = filter === pill.key;
            const empty = pill.count === 0;
            return (
              <button
                key={pill.key}
                onClick={() => setFilter(pill.key)}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 999,
                  border: `1px solid ${active ? pill.activeColor : '#e2e8f0'}`,
                  background: active ? pill.activeColor : '#f8fafc',
                  color: active ? '#fff' : '#64748b',
                  cursor: empty && !active ? 'default' : 'pointer',
                  opacity: empty && !active ? 0.45 : 1,
                  transition: 'all 0.15s',
                  lineHeight: '16px',
                }}
              >
                {pill.label}{pill.key !== 'all' ? ` (${pill.count})` : ''}
              </button>
            );
          })}
        </div>
      </div>
      {visible.length === 0 ? (
        <div style={{ padding: '6px 0 2px', color: '#94a3b8', fontSize: 11 }}>No {filter} events recorded.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {visible.map(entry => {
            const meta = actionLabel[entry.teamAction ?? ''] ?? { label: entry.teamAction ?? 'Action', color: '#64748b' };
            const dateStr = format(new Date(entry.createdAt), 'MMM d, yyyy');
            const byLine = entry.actorName ? ` by ${entry.actorName}` : '';
            return (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#f8fafc', borderRadius: 8, padding: '6px 10px',
                border: '1px solid #e2e8f0',
              }}>
                <Clock size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12, color: '#374151' }}>
                  <span style={{ fontWeight: 600, color: meta.color }}>{meta.label}</span>
                  {byLine}
                  <span style={{ color: '#94a3b8', marginLeft: 4 }}>· {dateStr}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface CompanyAuditEntry {
  id: string;
  targetName: string | null;
  teamAction: 'suspended' | 'reactivated' | 'removed' | null;
  actorName: string | null;
  createdAt: string;
}

function TeamAuditLog() {
  const { data: entries = [], isLoading } = useQuery<CompanyAuditEntry[]>({
    queryKey: ['/api/contractor/team/audit-log'],
    queryFn: async () => {
      const res = await fetch('/api/contractor/team/audit-log', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch audit log');
      return res.json();
    },
  });

  const [nameSearch, setNameSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('');

  const actionMeta: Record<string, { label: string; color: string; bg: string }> = {
    suspended:   { label: 'Suspended',   color: '#dc2626', bg: '#fee2e2' },
    reactivated: { label: 'Reactivated', color: '#09694a', bg: '#f0faf4' },
    removed:     { label: 'Removed',     color: '#7c3aed', bg: '#ede9fe' },
  };

  const actionTypes = ['suspended', 'reactivated', 'removed'] as const;

  const filtered = entries.filter(entry => {
    const matchesName =
      !nameSearch.trim() ||
      (entry.targetName ?? '').toLowerCase().includes(nameSearch.trim().toLowerCase()) ||
      (entry.actorName ?? '').toLowerCase().includes(nameSearch.trim().toLowerCase());
    const matchesAction = !actionFilter || entry.teamAction === actionFilter;
    return matchesName && matchesAction;
  });

  if (isLoading) {
    return <div style={{ padding: '12px 0', color: '#94a3b8', fontSize: 12 }}>Loading audit log…</div>;
  }

  if (!entries.length) {
    return (
      <div style={{ padding: '16px 0', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
        No team actions recorded yet. Suspend, reactivate, or remove a member to see events here.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 160px', minWidth: 140 }}>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, pointerEvents: 'none' }}
          >
            <circle cx="6.5" cy="6.5" r="5" />
            <line x1="10.5" y1="10.5" x2="14" y2="14" />
          </svg>
          <input
            type="text"
            placeholder="Search by member name…"
            value={nameSearch}
            onChange={e => setNameSearch(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              paddingLeft: 28,
              paddingRight: 8,
              paddingTop: 6,
              paddingBottom: 6,
              fontSize: 12,
              border: '1px solid #e2e8f0',
              borderRadius: 7,
              outline: 'none',
              color: '#111827',
              background: '#fff',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <button
            onClick={() => setActionFilter('')}
            style={{
              fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
              border: '1px solid',
              borderColor: actionFilter === '' ? '#6366f1' : '#e2e8f0',
              background: actionFilter === '' ? '#eef2ff' : '#fff',
              color: actionFilter === '' ? '#4f46e5' : '#64748b',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            All
          </button>
          {actionTypes.map(type => {
            const m = actionMeta[type];
            const active = actionFilter === type;
            return (
              <button
                key={type}
                onClick={() => setActionFilter(active ? '' : type)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                  border: '1px solid',
                  borderColor: active ? m.color : '#e2e8f0',
                  background: active ? m.bg : '#fff',
                  color: active ? m.color : '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '14px 0', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
          No events match your search.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(entry => {
            const meta = actionMeta[entry.teamAction ?? ''] ?? { label: entry.teamAction ?? 'Action', color: '#64748b', bg: '#f1f5f9' };
            const dateStr = format(new Date(entry.createdAt), 'MMM d, yyyy');
            return (
              <div key={entry.id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto',
                alignItems: 'center',
                gap: 10,
                background: '#f8fafc',
                borderRadius: 8,
                padding: '8px 12px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.targetName ?? '—'}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  borderRadius: 5, padding: '2px 8px',
                  background: meta.bg, color: meta.color, whiteSpace: 'nowrap',
                }}>{meta.label}</span>
                <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
                  by {entry.actorName ?? '—'}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{dateStr}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const proposalFormSchema = z.object({
  contractorId: z.string().min(1),
  homeownerId: z.string().min(1, "Please select a customer"),
  title: z.string().min(1, "Title is required"),
  description: z.string().default(""),
  serviceType: z.string().min(1, "Service type is required"),
  estimatedCost: z.string().refine(val => !isNaN(parseFloat(val)), "Must be a valid number"),
  estimatedDuration: z.string().default(""),
  scope: z.string().default(""),
  materials: z.string().default(""),
  warrantyPeriod: z.string().optional().default(""),
  validUntil: z.string().default(""),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).default("draft"),
  customerNotes: z.string().optional().default(""),
  internalNotes: z.string().optional().default(""),
});

type ProposalFormData = z.infer<typeof proposalFormSchema>;

export default function ContractorDashboard() {
  const { user } = useAuth();
  const typedUser = user as UserType | undefined;
  const { toast } = useToast();
  const queryClientInstance = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'invoices'>(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return (tab === 'team' || tab === 'invoices') ? tab : 'overview';
  });
  const [teamSearch, setTeamSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [invoiceTechFilter, setInvoiceTechFilter] = useState('');
  const [invoiceStartDate, setInvoiceStartDate] = useState('');
  const [invoiceEndDate, setInvoiceEndDate] = useState('');
  const [invoiceHomeownerName, setInvoiceHomeownerName] = useState('');
  const [pendingRemoveMember, setPendingRemoveMember] = useState<TeamMember | null>(null);
  const [pendingSuspendMember, setPendingSuspendMember] = useState<TeamMember | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [pendingCancelInviteMember, setPendingCancelInviteMember] = useState<TeamMember | null>(null);
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteResult, setInviteResult] = useState<{ inviteUrl: string } | null>(null);
  const [copiedInviteUrl, setCopiedInviteUrl] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCompanyRole, setEditCompanyRole] = useState<'tech' | 'admin'>('tech');

  const isAdminRole = (typedUser as any)?.companyRole === 'owner' || (typedUser as any)?.companyRole === 'admin';
  const isOwner = (typedUser as any)?.companyRole === 'owner';

  const { data: teamData, isLoading: isLoadingTeam, refetch: refetchTeam } = useQuery<{ teamMembers: TeamMember[]; maxTechSeats: number; techCount: number; adminCount: number }>({
    queryKey: ['/api/contractor/team'],
    queryFn: async () => {
      const res = await fetch('/api/contractor/team', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch team');
      return res.json();
    },
    enabled: isAdminRole && !!typedUser,
  });

  const activeTeamCount = teamData?.teamMembers.filter(m => m.status === 'active').length ?? null;
  const pendingTeamCount = teamData?.teamMembers.filter(m => m.status !== 'active').length ?? 0;

  const { data: adminInvoices = [], isLoading: isLoadingInvoices } = useQuery<AdminInvoice[]>({
    queryKey: ['/api/contractor/invoices', invoiceTechFilter, invoiceStartDate, invoiceEndDate, invoiceHomeownerName],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (invoiceTechFilter) params.set('techId', invoiceTechFilter);
      if (invoiceStartDate) params.set('startDate', invoiceStartDate);
      if (invoiceEndDate) params.set('endDate', invoiceEndDate);
      if (invoiceHomeownerName) params.set('homeownerName', invoiceHomeownerName);
      const res = await fetch(`/api/contractor/invoices?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch invoices');
      return res.json();
    },
    enabled: isAdminRole && !!typedUser,
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, firstName, lastName }: { email: string; firstName?: string; lastName?: string }) => {
      const res = await fetch('/api/contractor/invite-tech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, firstName: firstName || undefined, lastName: lastName || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send invite');
      return data as { inviteUrl: string; message: string };
    },
    onSuccess: (data) => {
      refetchTeam();
      setInviteResult(data);
      toast({ title: "Invite sent", description: `Invitation email sent to ${inviteEmail}` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetInviteModal = () => {
    setInviteModalOpen(false);
    setInviteEmail('');
    setInviteFirstName('');
    setInviteLastName('');
    setInviteResult(null);
    setCopiedInviteUrl(false);
  };

  const copyInviteUrl = () => {
    if (inviteResult?.inviteUrl) {
      navigator.clipboard.writeText(inviteResult.inviteUrl);
      setCopiedInviteUrl(true);
      setTimeout(() => setCopiedInviteUrl(false), 2000);
    }
  };

  const teamActionMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'suspend' | 'reactivate' | 'remove' }) => {
      const method = action === 'remove' ? 'DELETE' : 'PATCH';
      const url = action === 'remove' ? `/api/contractor/team/${userId}` : `/api/contractor/team/${userId}/${action}`;
      const res = await fetch(url, { method, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Action failed');
      return data;
    },
    onSuccess: (_, { action }) => {
      refetchTeam();
      toast({ title: "Done", description: action === 'suspend' ? "Member suspended" : action === 'reactivate' ? "Member reactivated" : "Member removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ userId, firstName, lastName, companyRole, email }: { userId: string; firstName: string; lastName: string; companyRole: 'tech' | 'admin'; email?: string }) => {
      const res = await fetch(`/api/contractor/team/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ firstName: firstName.trim() || undefined, lastName: lastName.trim() || undefined, companyRole, email: email?.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      return data;
    },
    onSuccess: () => {
      refetchTeam();
      setEditingMemberId(null);
      toast({ title: "Saved", description: "Team member updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/contractor/team/${userId}/invite`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to cancel invite');
      return data;
    },
    onSuccess: () => {
      refetchTeam();
      setPendingCancelInviteMember(null);
      toast({ title: "Invite cancelled", description: "The invite link is no longer valid." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const startEditing = (member: TeamMember) => {
    setEditingMemberId(member.id);
    setEditFirstName(member.firstName ?? '');
    setEditLastName(member.lastName ?? '');
    setEditEmail(member.email ?? '');
    setEditCompanyRole((member.companyRole as 'tech' | 'admin') ?? 'tech');
  };


  const { needsSubscription, isInTrial, isLoading: subscriptionLoading } = useContractorSubscription();
  
  const form = useForm<ProposalFormData>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      contractorId: "",
      title: "",
      description: "",
      serviceType: "",
      estimatedCost: "0.00",
      estimatedDuration: "",
      scope: "",
      materials: "",
      warrantyPeriod: "",
      validUntil: "",
      status: "draft",
      customerNotes: "",
      internalNotes: "",
      homeownerId: "",
    },
  });

  useEffect(() => {
    if (typedUser?.id) {
      form.setValue("contractorId", typedUser.id);
    }
  }, [typedUser?.id, form]);

  const { data: referralData, isLoading: isLoadingReferral } = useQuery({
    queryKey: ['/api/user/referral-code'],
    enabled: !!typedUser,
  });
  
  const { data: proposals = [], isLoading: isLoadingProposals } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals", typedUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/proposals?contractorId=${typedUser?.id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch proposals');
      return response.json();
    },
    enabled: !!typedUser?.id,
  });

  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery<ContractorAppointment[]>({
    queryKey: ["/api/appointments", typedUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/appointments?contractorId=${typedUser?.id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch appointments');
      return response.json();
    },
    enabled: !!typedUser?.id,
  });

  const { data: contactedHomeowners = [], isLoading: isLoadingHomeowners } = useQuery<ContactedHomeowner[]>({
    queryKey: ["/api/contractors", typedUser?.id, "contacted-homeowners"],
    queryFn: async () => {
      const response = await fetch(`/api/contractors/${typedUser?.id}/contacted-homeowners`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch contacted homeowners');
      return response.json();
    },
    enabled: !!typedUser?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: ProposalFormData) => {
      if (!typedUser?.id) {
        throw new Error("Contractor ID is required");
      }
      const materialsArray = data.materials 
        ? data.materials.split(',').map(item => item.trim()).filter(item => item.length > 0) 
        : [];
      const payload = {
        contractorId: typedUser.id,
        homeownerId: data.homeownerId,
        title: data.title,
        description: data.description || null,
        serviceType: data.serviceType,
        estimatedCost: parseFloat(data.estimatedCost).toFixed(2),
        estimatedDuration: data.estimatedDuration || null,
        scope: data.scope || null,
        materials: materialsArray.length > 0 ? materialsArray : null,
        warrantyPeriod: data.warrantyPeriod || null,
        validUntil: data.validUntil || null,
        status: data.status,
        customerNotes: data.customerNotes || null,
        internalNotes: data.internalNotes || null,
      };
      return apiRequest("/api/proposals", "POST", payload);
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ["/api/proposals", typedUser?.id] });
      setIsCreateDialogOpen(false);
      form.reset({
        contractorId: typedUser?.id || "",
        title: "",
        description: "",
        serviceType: "",
        estimatedCost: "0.00",
        estimatedDuration: "",
        scope: "",
        materials: "",
        warrantyPeriod: "",
        validUntil: "",
        status: "draft",
        customerNotes: "",
        internalNotes: "",
        homeownerId: "",
      });
      toast({
        title: "Success",
        description: "Proposal created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create proposal",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProposalFormData) => {
    createMutation.mutate(data);
  };

  // Check subscription status AFTER all hooks are called (React hooks rule)
  if (needsSubscription && !subscriptionLoading) {
    return <ContractorTrialExpiredPaywall />;
  }

  // Enterprise tech role — show stripped dashboard (no CRM, billing, referrals, team)
  const companyRole = (typedUser as any)?.companyRole;
  const techStatus = (typedUser as any)?.status;
  if (companyRole === 'tech') {
    return <TechDashboard user={{ firstName: typedUser?.firstName, email: typedUser?.email, status: techStatus }} />;
  }
  
  const referralCount = (referralData as any)?.referralCount || 0;
  
  const subscriptionCost = 20;
  const referralsNeeded = subscriptionCost;
  const referralsRemaining = Math.max(0, referralsNeeded - referralCount);
  const progressPercentage = Math.min(100, (referralCount / referralsNeeded) * 100);

  const pendingProposals = proposals.filter(p => p.status === 'sent' || p.status === 'draft');
  const acceptedProposals = proposals.filter(p => p.status === 'accepted');

  const totalEarnings = acceptedProposals.reduce((sum, p) => sum + parseFloat(p.estimatedCost || '0'), 0);

  const upcomingAppointments = appointments
    .filter(a => new Date(a.scheduledDateTime) >= new Date())
    .sort((a, b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime());
  const nextAppointment = upcomingAppointments[0];
  
  if (!typedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#0C3460] mb-2">Loading...</div>
        </div>
      </div>
    );
  }

  const firstName = typedUser.firstName || typedUser.email?.split('@')[0] || 'Contractor';
  
  return (
    <div>

      {/* ── DASH HEADER ─────────────────────────── */}
      <div className="dash-header" style={{ background: 'linear-gradient(135deg, #0C3460 0%, #1560A2 100%)' }}>
        <span className="dash-eyebrow" style={{ color: '#AFD6F9' }}>CONTRACTOR</span>
        <div className="dash-title" data-testid="text-welcome-message">Welcome back, {firstName}</div>
        <div className="dash-subtitle">Manage your work and grow your client base</div>
        <div className="dash-chips" data-tour-id="contractor-stats">
          <div className="dash-chip">
            <div className={`dash-chip-num${totalEarnings > 0 ? ' good' : ''}`} data-testid="text-monthly-earnings">${totalEarnings.toLocaleString()}</div>
            <div className="dash-chip-label">This Month</div>
          </div>
          <div className="dash-chip">
            <div className={`dash-chip-num${acceptedProposals.length > 0 ? ' good' : ''}`} data-testid="text-active-jobs">{acceptedProposals.length}</div>
            <div className="dash-chip-label">Active Jobs</div>
          </div>
          <div className="dash-chip">
            <div className={`dash-chip-num${pendingProposals.length > 0 ? ' warn' : ''}`} data-testid="text-pending-proposals">{pendingProposals.length}</div>
            <div className="dash-chip-label">Proposals</div>
          </div>
          <div className="dash-chip">
            <div className={`dash-chip-num${referralCount > 0 ? ' good' : ''}`} data-testid="text-new-leads">{referralCount}</div>
            <div className="dash-chip-label">New Leads</div>
          </div>
        </div>
      </div>

      {isInTrial && <ContractorTrialBanner />}

      {/* ── Enterprise admin tab navigation ── */}
      {isAdminRole && (
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 16px' }}>
          {(['overview', 'team', 'invoices'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? '#1560A2' : '#64748b',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #1560A2' : '2px solid transparent',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'team' ? `Team (${teamData?.teamMembers.length ?? 0})` : tab === 'invoices' ? `Tech Invoices (${adminInvoices.length})` : 'Overview'}
            </button>
          ))}
        </div>
      )}

      {/* ── Team tab ── */}
      {isAdminRole && activeTab === 'team' && (
        <div className="dash-body">
          {/* Seat usage bar */}
          <div className="dash-light-card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0C3460' }}>
                {teamData?.techCount ?? 0} of {teamData?.maxTechSeats ?? 3} tech seats used
                {(teamData?.adminCount ?? 0) > 0 && (
                  <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                    · {teamData!.adminCount} {teamData!.adminCount === 1 ? 'admin' : 'admins'}
                  </span>
                )}
              </span>
              <button
                onClick={() => setInviteModalOpen(true)}
                title={(teamData?.techCount ?? 0) >= (teamData?.maxTechSeats ?? 3) ? `Seat limit (${teamData?.maxTechSeats ?? 3}) reached. Contact support to add more.` : undefined}
                disabled={(teamData?.techCount ?? 0) >= (teamData?.maxTechSeats ?? 3) || inviteMutation.isPending}
                style={{
                  background: (teamData?.techCount ?? 0) >= (teamData?.maxTechSeats ?? 3) ? '#e2e8f0' : '#1560A2',
                  color: (teamData?.techCount ?? 0) >= (teamData?.maxTechSeats ?? 3) ? '#94a3b8' : '#fff',
                  border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600,
                  cursor: (teamData?.techCount ?? 0) >= (teamData?.maxTechSeats ?? 3) ? 'not-allowed' : 'pointer',
                }}
              >
                + Invite Technician
              </button>
            </div>
            <div style={{ background: '#e2e8f0', borderRadius: 6, height: 6, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, ((teamData?.techCount ?? 0) / (teamData?.maxTechSeats ?? 3)) * 100)}%`,
                height: 6, borderRadius: 6, background: '#1560A2', transition: 'width 0.4s'
              }} />
            </div>
          </div>

          <input
            placeholder="Search by name or email…"
            value={teamSearch}
            onChange={e => setTeamSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#fff', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
          />

          {isLoadingTeam ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>Loading team…</div>
          ) : !teamData?.teamMembers.length ? (
            <div className="dash-light-card" style={{ textAlign: 'center', padding: '24px 14px' }}>
              <Users size={28} style={{ color: 'var(--gray-400)', margin: '0 auto 8px', display: 'block' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)' }}>No techs yet</div>
              <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>Invite your first technician above</div>
            </div>
          ) : (
            teamData.teamMembers
              .filter(m => {
                const q = teamSearch.toLowerCase();
                return !q || m.email?.toLowerCase().includes(q) || m.firstName?.toLowerCase().includes(q) || m.lastName?.toLowerCase().includes(q);
              })
              .map(member => {
                const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email || 'Unknown';
                const isSuspended = member.status === 'suspended';
                const isPending = member.status === 'pending_invite';
                const isAdmin = member.companyRole === 'admin';
                const avatarLetter = (member.firstName?.[0] || member.email?.[0] || '?').toUpperCase();
                const isExpanded = expandedMemberId === member.id;
                const hasInvoices = member.invoiceCount > 0;
                const isEditing = editingMemberId === member.id;
                const INACTIVE_THRESHOLD_MS = 90 * 24 * 60 * 60 * 1000;
                const isInactiveAdmin = isAdmin && (
                  !member.lastLoginAt ||
                  (Date.now() - new Date(member.lastLoginAt).getTime()) > INACTIVE_THRESHOLD_MS
                );
                return (
                  <div key={member.id} className="dash-light-card" style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: isAdmin ? 'linear-gradient(135deg, #7c3aed, #a78bfa)' : 'linear-gradient(135deg, #0C3460, #1560A2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 14, fontWeight: 700,
                      }}>{avatarLetter}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <button
                          onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
                          style={{
                            all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                            fontWeight: 600, fontSize: 13, color: '#111827',
                          }}
                        >
                          {isExpanded
                            ? <ChevronDown size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                            : <ChevronRight size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                          }
                          {fullName}
                        </button>
                        <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                          <Mail size={11} style={{ flexShrink: 0 }} />{member.email}
                        </div>
                        {isPending && member.inviteExpiresAt && (
                          <div style={{ fontSize: 11, color: '#d97706', marginTop: 2 }}>
                            Invite expires {format(new Date(member.inviteExpiresAt), 'MMM d, yyyy')}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {member.lastLoginAt
                            ? `Last active: ${formatDistanceToNow(new Date(member.lastLoginAt), { addSuffix: true })}`
                            : 'Never signed in'}
                        </div>
                        {hasInvoices && (
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                            {member.invoiceCount} invoice{member.invoiceCount !== 1 ? 's' : ''} submitted
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', borderRadius: 5, padding: '2px 8px',
                            background: isAdmin ? '#ede9fe' : '#f1f5f9',
                            color: isAdmin ? '#7c3aed' : '#475569',
                          }}>{isAdmin ? 'Admin' : 'Tech'}</span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', borderRadius: 5, padding: '2px 8px',
                            background: isSuspended ? '#fee2e2' : isPending ? '#fef3c7' : '#f0faf4',
                            color: isSuspended ? '#dc2626' : isPending ? '#d97706' : '#09694a',
                          }}>{isSuspended ? 'Suspended' : isPending ? 'Pending' : 'Active'}</span>
                          {isInactiveAdmin && (
                            <span
                              title="No sign-in in 90+ days — consider reviewing access"
                              style={{ display: 'flex', alignItems: 'center', cursor: 'default' }}
                            >
                              <AlertTriangle size={13} style={{ color: '#d97706' }} />
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => isEditing ? setEditingMemberId(null) : startEditing(member)}
                            style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: isEditing ? '#f1f5f9' : '#fff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                            title={isEditing ? 'Cancel edit' : 'Edit name or role'}
                          >{isEditing ? <X size={12} /> : <Pencil size={12} />}{isEditing ? 'Cancel' : 'Edit'}</button>
                          {(!isAdmin || isOwner) && (isSuspended ? (
                            <button
                              onClick={() => teamActionMutation.mutate({ userId: member.id, action: 'reactivate' })}
                              disabled={teamActionMutation.isPending}
                              style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #09694a', background: '#f0faf4', color: '#09694a', cursor: 'pointer' }}
                            >Reactivate</button>
                          ) : !isPending ? (
                            <button
                              onClick={() => setPendingSuspendMember(member)}
                              disabled={teamActionMutation.isPending}
                              style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                            ><PauseCircle size={12} />Suspend</button>
                          ) : null)}
                          {(!isAdmin || isOwner) && (isPending ? (
                            <button
                              onClick={() => setPendingCancelInviteMember(member)}
                              disabled={cancelInviteMutation.isPending}
                              style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #fee2e2', background: '#fff', color: '#dc2626', cursor: 'pointer' }}
                            >Cancel Invite</button>
                          ) : (
                            <button
                              onClick={() => setPendingRemoveMember(member)}
                              disabled={teamActionMutation.isPending}
                              style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #fee2e2', background: '#fff', color: '#dc2626', cursor: 'pointer' }}
                            >Remove</button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 10, paddingTop: 4 }}>
                        <TechJobHistory memberId={member.id} memberName={fullName} />
                        {(!isAdmin || isOwner) && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                            <MemberAuditHistory memberId={member.id} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inline edit panel */}
                    {isEditing && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 3 }}>First Name</label>
                            <input
                              type="text"
                              value={editFirstName}
                              onChange={e => setEditFirstName(e.target.value)}
                              placeholder="First name"
                              style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 12, boxSizing: 'border-box', outline: 'none' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 3 }}>Last Name</label>
                            <input
                              type="text"
                              value={editLastName}
                              onChange={e => setEditLastName(e.target.value)}
                              placeholder="Last name"
                              style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 12, boxSizing: 'border-box', outline: 'none' }}
                            />
                          </div>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 3 }}>
                            Email
                            {!isPending && <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>(read-only — account already activated)</span>}
                          </label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={e => setEditEmail(e.target.value)}
                            readOnly={!isPending}
                            placeholder="Email address"
                            style={{
                              width: '100%', padding: '7px 10px', borderRadius: 7,
                              border: '1px solid #e2e8f0', fontSize: 12, boxSizing: 'border-box', outline: 'none',
                              background: isPending ? '#fff' : '#f8fafc',
                              color: isPending ? '#111827' : '#94a3b8',
                              cursor: isPending ? 'text' : 'not-allowed',
                            }}
                          />
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 3 }}>Role</label>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {(['tech', 'admin'] as const).map(role => (
                              <button
                                key={role}
                                onClick={() => setEditCompanyRole(role)}
                                style={{
                                  flex: 1, padding: '7px 0', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                  border: editCompanyRole === role ? (role === 'admin' ? '2px solid #7c3aed' : '2px solid #1560A2') : '1px solid #e2e8f0',
                                  background: editCompanyRole === role ? (role === 'admin' ? '#ede9fe' : '#eff6ff') : '#fff',
                                  color: editCompanyRole === role ? (role === 'admin' ? '#7c3aed' : '#1560A2') : '#64748b',
                                }}
                              >{role === 'tech' ? 'Field Tech' : 'Admin'}</button>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => setEditingMemberId(null)}
                            style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: 12 }}
                          >Cancel</button>
                          <button
                            onClick={() => updateMemberMutation.mutate({ userId: member.id, firstName: editFirstName, lastName: editLastName, companyRole: editCompanyRole, email: isPending ? editEmail : undefined })}
                            disabled={updateMemberMutation.isPending}
                            style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: '#1560A2', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, opacity: updateMemberMutation.isPending ? 0.7 : 1 }}
                          >{updateMemberMutation.isPending ? 'Saving…' : 'Save Changes'}</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
          )}

          {/* Team Audit Log — owner only */}
          {isOwner && (
            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => setAuditLogOpen(o => !o)}
                style={{
                  all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  background: auditLogOpen ? '#eff6ff' : '#f8fafc',
                  border: `1px solid ${auditLogOpen ? '#bfdbfe' : '#e2e8f0'}`,
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                {auditLogOpen
                  ? <ChevronDown size={15} style={{ color: '#1560A2', flexShrink: 0 }} />
                  : <ChevronRight size={15} style={{ color: '#64748b', flexShrink: 0 }} />
                }
                <span style={{ fontSize: 13, fontWeight: 700, color: auditLogOpen ? '#1560A2' : '#374151', flex: 1, textAlign: 'left' }}>
                  Team Audit Log
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>suspend · reactivate · remove</span>
              </button>
              {auditLogOpen && (
                <div style={{ marginTop: 10 }}>
                  <TeamAuditLog />
                </div>
              )}
            </div>
          )}

          {/* Suspend team member confirm dialog */}
          <ConfirmDialog
            open={!!pendingSuspendMember}
            onOpenChange={(o) => { if (!o) setPendingSuspendMember(null); }}
            title="Suspend Team Member?"
            description={`${pendingSuspendMember?.firstName || pendingSuspendMember?.email} will no longer be able to access the company dashboard until reactivated.`}
            confirmText="Suspend"
            cancelText="Cancel"
            variant="destructive"
            onConfirm={() => { if (pendingSuspendMember) teamActionMutation.mutate({ userId: pendingSuspendMember.id, action: 'suspend' }); }}
          >
            {pendingSuspendMember?.companyRole === 'admin' && (() => {
              const lastLogin = pendingSuspendMember.lastLoginAt ? new Date(pendingSuspendMember.lastLoginAt) : null;
              const minutesAgo = lastLogin ? (Date.now() - lastLogin.getTime()) / 60000 : null;
              const isRecentlyActive = minutesAgo !== null && minutesAgo <= 30;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    <span style={{ fontWeight: 600 }}>Last active: </span>
                    {lastLogin
                      ? formatDistanceToNow(lastLogin, { addSuffix: true })
                      : 'Never signed in'}
                  </div>
                  {isRecentlyActive && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      background: '#fffbeb', border: '1px solid #fcd34d',
                      borderRadius: 8, padding: '10px 12px',
                    }}>
                      <AlertTriangle size={15} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 13, color: '#92400e', lineHeight: 1.4 }}>
                        This admin was recently active — are you sure?
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </ConfirmDialog>

          {/* Remove team member confirm dialog */}
          <ConfirmDialog
            open={!!pendingRemoveMember}
            onOpenChange={(o) => { if (!o) setPendingRemoveMember(null); }}
            title="Remove from Team?"
            description={`${[pendingRemoveMember?.firstName, pendingRemoveMember?.lastName].filter(Boolean).join(' ') || pendingRemoveMember?.email} will be unlinked from your company. Their invoice history will be preserved.`}
            confirmText="Remove"
            cancelText="Cancel"
            variant="destructive"
            onConfirm={() => { if (pendingRemoveMember) teamActionMutation.mutate({ userId: pendingRemoveMember.id, action: 'remove' }); }}
          />

          {/* Cancel invite confirm dialog */}
          <ConfirmDialog
            open={!!pendingCancelInviteMember}
            onOpenChange={(o) => { if (!o) setPendingCancelInviteMember(null); }}
            title="Cancel Invite?"
            description={`The invite sent to ${pendingCancelInviteMember?.email} will be revoked. The invite link will no longer work.`}
            confirmText="Cancel Invite"
            cancelText="Keep Invite"
            variant="destructive"
            onConfirm={() => { if (pendingCancelInviteMember) cancelInviteMutation.mutate(pendingCancelInviteMember.id); }}
          />

          {/* Invite modal */}
          {inviteModalOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420 }}>
                {inviteResult ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                      <CheckCircle size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>Invite sent to {inviteEmail}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Or share this invite link directly:</div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                      <input
                        readOnly
                        value={inviteResult.inviteUrl}
                        style={{ flex: 1, fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', background: '#f8fafc', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', outline: 'none' }}
                      />
                      <button
                        onClick={copyInviteUrl}
                        style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                        title="Copy invite link"
                      >
                        {copiedInviteUrl ? <Check size={15} style={{ color: '#16a34a' }} /> : <Copy size={15} />}
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={resetInviteModal} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1560A2', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Done</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#0C3460', marginBottom: 4 }}>Invite Field Technician</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>They'll receive an email with a link to set up their account. Invite links expire in 7 days.</div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                        Email Address <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="tech@example.com"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>First Name</label>
                        <input
                          type="text"
                          placeholder="Jane"
                          value={inviteFirstName}
                          onChange={e => setInviteFirstName(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Last Name</label>
                        <input
                          type="text"
                          placeholder="Smith"
                          value={inviteLastName}
                          onChange={e => setInviteLastName(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={resetInviteModal} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                      <button
                        onClick={() => inviteMutation.mutate({ email: inviteEmail, firstName: inviteFirstName, lastName: inviteLastName })}
                        disabled={!inviteEmail.includes('@') || inviteMutation.isPending}
                        style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1560A2', color: '#fff', cursor: inviteEmail.includes('@') ? 'pointer' : 'not-allowed', opacity: inviteEmail.includes('@') ? 1 : 0.6, fontSize: 13, fontWeight: 600 }}
                      >{inviteMutation.isPending ? 'Sending…' : 'Send Invite'}</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Invoices tab ── */}
      {isAdminRole && activeTab === 'invoices' && (
        <div className="dash-body">
          <span className="dash-section-label">Tech Invoices</span>
          <div className="dash-light-card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <select
                value={invoiceTechFilter}
                onChange={e => setInvoiceTechFilter(e.target.value)}
                style={{ flex: 1, minWidth: 150, padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#fff', outline: 'none' }}
              >
                <option value="">All Technicians</option>
                {teamData?.teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{[m.firstName, m.lastName].filter(Boolean).join(' ') || m.email}</option>
                ))}
              </select>
              <input
                type="text"
                value={invoiceHomeownerName}
                onChange={e => setInvoiceHomeownerName(e.target.value)}
                placeholder="Search homeowner…"
                style={{ flex: 1, minWidth: 150, padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
              />
              <input type="date" value={invoiceStartDate} onChange={e => setInvoiceStartDate(e.target.value)}
                style={{ flex: 1, minWidth: 130, padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
              />
              <input type="date" value={invoiceEndDate} onChange={e => setInvoiceEndDate(e.target.value)}
                style={{ flex: 1, minWidth: 130, padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
              />
            </div>
          </div>

          {isLoadingInvoices ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>Loading invoices…</div>
          ) : !adminInvoices.length ? (
            <div className="dash-light-card" style={{ textAlign: 'center', padding: '24px 14px' }}>
              <FileText size={28} style={{ color: 'var(--gray-400)', margin: '0 auto 8px', display: 'block' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)' }}>No invoices yet</div>
              <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>Invoices uploaded by your team will appear here</div>
            </div>
          ) : (
            adminInvoices.map(inv => (
              <div key={inv.id} className="dash-light-card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{inv.fileName}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                      By {[inv.uploaderFirstName, inv.uploaderLastName].filter(Boolean).join(' ') || inv.uploaderEmail || 'Unknown'}
                      {inv.invoiceDate && ` · ${inv.invoiceDate}`}
                    </div>
                    {(inv.homeownerFirstName || inv.homeownerLastName) && (
                      <div style={{ fontSize: 12, color: '#1560A2', marginTop: 2 }}>
                        Homeowner: {[inv.homeownerFirstName, inv.homeownerLastName].filter(Boolean).join(' ')}
                      </div>
                    )}
                    {inv.jobId && <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>Job: {inv.jobId}</div>}
                    {inv.notes && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{inv.notes}</div>}
                    {inv.amount && <div style={{ fontSize: 13, fontWeight: 600, color: '#09694a', marginTop: 4 }}>${parseFloat(inv.amount).toFixed(2)}</div>}
                  </div>
                  <a href={inv.fileUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, border: '1px solid #1560A2', color: '#1560A2', textDecoration: 'none', flexShrink: 0 }}
                  >View</a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Overview tab (always rendered, hidden when another tab is active) ── */}
      <div className="dash-body" style={{ display: isAdminRole && activeTab !== 'overview' ? 'none' : undefined }}>

        {/* AI Business Coach */}
        <Link href="/ai-contractor-help" className="ai-coach-card" data-tour-id="contractor-ai-coach" style={{ background: 'linear-gradient(135deg, #0C3460, #1560A2)' }}>
          <div className="ai-coach-icon"><Sparkles size={18} /></div>
          <div className="ai-coach-copy">
            <div className="ai-coach-eyebrow" style={{ color: '#AFD6F9' }}>AI Business Coach</div>
            <div className="ai-coach-title">Grow your contractor business</div>
            <div className="ai-coach-sub">Personalized tips for your trade</div>
          </div>
          <button className="ai-coach-btn" onClick={e => e.preventDefault()}>Ask AI →</button>
        </Link>

        {/* Quick Actions */}
        <span className="dash-section-label">Quick Actions</span>

        <button
          className="action-row"
          data-tour-id="contractor-quick-actions"
          style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'white', fontFamily: 'inherit' }}
          onClick={() => setIsCreateDialogOpen(true)}
          data-testid="button-create-proposal"
        >
          <div className="action-icon" style={{ background: '#EAF4FD', color: '#1560A2' }}><Plus size={18} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="action-title">Create Proposal</div>
            <div className="action-sub">Send a new proposal to a client</div>
          </div>
          <span className="action-cta" style={{ color: '#1560A2' }}>Create →</span>
        </button>

        <Link href="/crm" className="action-row" style={{ textDecoration: 'none' }} data-testid="button-open-crm">
          <div className="action-icon" style={{ background: '#EAF4FD', color: '#1560A2' }}><Briefcase size={18} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="action-title">Open CRM</div>
            <div className="action-sub">Manage clients and leads</div>
          </div>
          <span className="action-cta" style={{ color: '#1560A2' }}>Open →</span>
        </Link>

        <Link href="/messages" className="action-row" style={{ textDecoration: 'none' }} data-testid="button-message-client">
          <div className="action-icon" style={{ background: '#EAF4FD', color: '#1560A2' }}><MessageSquare size={18} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="action-title">Message Client</div>
            <div className="action-sub">Chat with homeowners</div>
          </div>
          <span className="action-cta" style={{ color: '#1560A2' }}>Go →</span>
        </Link>

        <Link href="/calendar" className="action-row" style={{ textDecoration: 'none' }} data-testid="button-schedule-visit">
          <div className="action-icon" style={{ background: '#EAF4FD', color: '#1560A2' }}><Calendar size={18} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="action-title">Schedule Visit</div>
            <div className="action-sub">
              {nextAppointment
                ? `Next: ${new Date(nextAppointment.scheduledDateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'No upcoming appointments'}
            </div>
          </div>
          <span className="action-cta" style={{ color: '#1560A2' }}>View →</span>
        </Link>

        <Link href="/service-records" className="action-row" style={{ textDecoration: 'none' }} data-testid="button-mark-complete">
          <div className="action-icon" style={{ background: '#F0FAF4', color: '#079669' }}><CheckCircle size={18} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="action-title">Mark Job Complete</div>
            <div className="action-sub">Log finished work to service records</div>
          </div>
          <span className="action-cta" style={{ color: '#079669' }}>Log →</span>
        </Link>

        {companyRole === 'owner' && (() => {
          const maxSeats = teamData?.maxTechSeats ?? null;
          const isFull = activeTeamCount !== null && maxSeats !== null && activeTeamCount >= maxSeats;
          const isNearlyFull = activeTeamCount !== null && maxSeats !== null && !isFull && activeTeamCount / maxSeats >= SEAT_WARN_THRESHOLD;
          const seatsLeft = maxSeats !== null && activeTeamCount !== null ? maxSeats - activeTeamCount : null;
          const pendingSuffix = pendingTeamCount > 0 ? ` · ${pendingTeamCount} pending` : '';
          const seatText = maxSeats !== null && activeTeamCount !== null
            ? `${activeTeamCount} of ${maxSeats} seats active`
            : activeTeamCount !== null
              ? `${activeTeamCount} active ${activeTeamCount === 1 ? 'technician' : 'technicians'}`
              : null;

          return (
            <Link href="/contractor-dashboard?tab=team" className="action-row" style={{ textDecoration: 'none' }} data-testid="button-manage-team">
              <div className="action-icon" style={{ background: isFull ? '#FEF3C7' : '#EAF4FD', color: isFull ? '#D97706' : '#1560A2' }}>
                {isFull ? <AlertTriangle size={18} /> : <UserCog size={18} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="action-title">Manage Team</div>
                <div className="action-sub" style={isFull ? { color: '#B45309' } : isNearlyFull ? { color: '#D97706' } : undefined}>
                  {isLoadingTeam
                    ? 'Loading team…'
                    : isFull
                      ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                          <AlertTriangle size={11} style={{ flexShrink: 0 }} />
                          <span>All {maxSeats} seats used{pendingSuffix}</span>
                          <span style={{ color: '#94a3b8' }}>·</span>
                          <a
                            href="/contractor-pricing"
                            onClick={e => e.stopPropagation()}
                            style={{ color: '#B45309', textDecoration: 'underline', fontWeight: 600 }}
                          >Upgrade plan</a>
                        </span>
                      )
                      : isNearlyFull
                        ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertTriangle size={11} style={{ flexShrink: 0 }} />
                            <span>{seatText}{pendingSuffix} — {seatsLeft === 1 ? '1 seat left' : `${seatsLeft} seats left`}</span>
                          </span>
                        )
                        : seatText !== null
                          ? `${seatText}${pendingSuffix}`
                          : 'Invite and manage field technicians'}
                </div>
              </div>
              <span className="action-cta" style={{ color: '#1560A2' }}>Manage →</span>
            </Link>
          );
        })()}

        {/* Homeowner Connection */}
        <span className="dash-section-label" style={{ marginTop: 8 }}>Homeowner Connection</span>
        <div className="dash-light-card" data-tour-id="contractor-connection">
          <ContractorCodeEntry />
        </div>

        {/* Referral Program */}
        <span className="dash-section-label" style={{ marginTop: 4 }}>Referral Program</span>
        <div className="dash-light-card" data-tour-id="contractor-referral">
          <div className="dash-light-card-row">
            <div className="dash-light-card-icon" style={{ background: '#F0FAF4', color: '#09694A' }}>
              <Gift size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="dash-light-card-title" data-testid="text-referrals-remaining">
                {referralsRemaining === 0 ? "You've earned a free subscription!" : `Just ${referralsRemaining} referral${referralsRemaining !== 1 ? 's' : ''} to go`}
              </div>
              <div className="dash-light-card-sub">Get your subscription FREE</div>
            </div>
            <Link href="/contractor-referral">
              <span className="dash-light-card-btn" style={{ background: '#F0FAF4', color: '#09694A' }}>Share →</span>
            </Link>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--gray-400)', marginBottom: 6 }}>
              <span>{referralCount} referrals</span>
              <span>{referralsNeeded} needed</span>
            </div>
            <div style={{ width: '100%', background: 'var(--gray-200)', borderRadius: 6, height: 6, overflow: 'hidden' }}>
              <div style={{ width: `${progressPercentage}%`, height: 6, borderRadius: 6, background: '#079669', transition: 'width 0.5s' }} data-testid="progress-referrals" />
            </div>
          </div>
        </div>

        {/* Proposals */}
        <span className="dash-section-label" style={{ marginTop: 4 }}>Proposals</span>
        <div className="dash-light-card" data-tour-id="contractor-proposals" style={{ marginBottom: 10 }}>
          <div className="dash-light-card-row">
            <div className="dash-light-card-icon" style={{ background: '#EAF4FD', color: '#1560A2' }}>
              <FileText size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="dash-light-card-title">
                {proposals.length === 0 ? 'No proposals yet' : `${pendingProposals.length} pending · ${acceptedProposals.length} accepted`}
              </div>
              <div className="dash-light-card-sub">
                {proposals.length === 0 ? 'Create your first proposal to get started' : `Earnings: $${totalEarnings.toLocaleString()}`}
              </div>
            </div>
            <button
              className="dash-light-card-btn"
              style={{ background: '#EAF4FD', color: '#1560A2' }}
              onClick={() => setIsCreateDialogOpen(true)}
              data-testid="button-new-proposal"
            >New →</button>
          </div>
          {proposals.length > 0 && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--gray-200)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {proposals.slice(0, 3).map(proposal => (
                <div key={proposal.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proposal.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 1 }}>${parseFloat(proposal.estimatedCost || '0').toLocaleString()}</div>
                  </div>
                  <span style={{
                    flexShrink: 0, fontSize: 10, fontWeight: 600, borderRadius: 5, padding: '2px 8px',
                    background: proposal.status === 'accepted' ? '#F0FAF4' : proposal.status === 'sent' ? '#EAF4FD' : proposal.status === 'rejected' ? '#FEE2E2' : '#F3F4F6',
                    color: proposal.status === 'accepted' ? '#09694A' : proposal.status === 'sent' ? '#1560A2' : proposal.status === 'rejected' ? '#DC2626' : '#6B7280',
                    textTransform: 'uppercase',
                  }}>{proposal.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendar */}
        <span className="dash-section-label" style={{ marginTop: 4 }}>Calendar</span>
        <div className="dash-light-card" data-tour-id="contractor-calendar" style={{ marginBottom: 10 }}>
          <div className="dash-light-card-row">
            <div className="dash-light-card-icon" style={{ background: '#EAF4FD', color: '#1560A2' }}>
              <Calendar size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="dash-light-card-title">
                {nextAppointment
                  ? `${new Date(nextAppointment.scheduledDateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${new Date(nextAppointment.scheduledDateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                  : 'No upcoming appointments'}
              </div>
              <div className="dash-light-card-sub">{upcomingAppointments.length} upcoming this week</div>
            </div>
            <Link href="/calendar">
              <span className="dash-light-card-btn" style={{ background: '#EAF4FD', color: '#1560A2' }} data-testid="button-view-calendar">View →</span>
            </Link>
          </div>
          {upcomingAppointments.length > 0 && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--gray-200)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingAppointments.slice(0, 2).map(appointment => (
                <div key={appointment.id} style={{ background: 'var(--gray-100)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{appointment.serviceType || 'Service appointment'}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>
                    {new Date(appointment.scheduledDateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {new Date(appointment.scheduledDateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {appointment.estimatedDuration || 2} hrs
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Jobs */}
        <span className="dash-section-label" style={{ marginTop: 4 }}>Active Jobs</span>
        {acceptedProposals.length > 0 ? (
          acceptedProposals.slice(0, 3).map(job => (
            <div key={job.id} className="dash-light-card" style={{ marginBottom: 10 }}>
              <div className="dash-light-card-row">
                <div className="dash-light-card-icon" style={{ background: '#F0FAF4', color: '#09694A' }}>
                  <CheckCircle size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="dash-light-card-title">{job.title}</div>
                  <div className="dash-light-card-sub">{job.estimatedDuration || 'TBD'} · ${parseFloat(job.estimatedCost || '0').toLocaleString()}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#079669', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <CheckCircle size={12} /> Scheduled
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="dash-light-card" style={{ textAlign: 'center', padding: '24px 14px', marginBottom: 10 }}>
            <Briefcase size={28} style={{ color: 'var(--gray-400)', margin: '0 auto 8px', display: 'block' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)' }}>No active jobs yet</div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>Create and send proposals to get started</div>
          </div>
        )}

        {/* Full Proposals Section */}
        <div style={{ marginBottom: 16 }}>
          <Proposals contractorId={typedUser.id} />
        </div>

      </div>

      {/* Create Proposal Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) {
          form.reset({
            contractorId: typedUser?.id || "",
            title: "",
            description: "",
            serviceType: "",
            estimatedCost: "0.00",
            estimatedDuration: "",
            scope: "",
            materials: "",
            warrantyPeriod: "",
            validUntil: "",
            status: "draft",
            customerNotes: "",
            internalNotes: "",
            homeownerId: "",
          });
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>
              Create New Proposal
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Select a customer who has messaged you and fill in the proposal details.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Customer Selection Field */}
              <FormField
                control={form.control}
                name="homeownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Customer *</FormLabel>
                    <FormControl>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-customer" className="bg-white border-slate-200">
                          <SelectValue placeholder="Select a customer who has messaged you" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingHomeowners ? (
                            <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                          ) : contactedHomeowners.length === 0 ? (
                            <SelectItem value="none" disabled>No customers have messaged you yet</SelectItem>
                          ) : (
                            contactedHomeowners.map((homeowner) => (
                              <SelectItem key={homeowner.id} value={homeowner.id}>
                                {homeowner.firstName || homeowner.lastName 
                                  ? `${homeowner.firstName || ''} ${homeowner.lastName || ''}`.trim()
                                  : homeowner.email || 'Unknown Customer'}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <p className="text-xs text-slate-500 mt-1">
                      Only customers who have messaged you through the platform are shown
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700">Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Kitchen renovation proposal"
                          {...field}
                          data-testid="input-proposal-title"
                          className="bg-white border-slate-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700">Service Type *</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger data-testid="select-service-type" className="bg-white border-slate-200">
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hvac">HVAC</SelectItem>
                            <SelectItem value="plumbing">Plumbing</SelectItem>
                            <SelectItem value="electrical">Electrical</SelectItem>
                            <SelectItem value="roofing">Roofing</SelectItem>
                            <SelectItem value="gutters">Gutters</SelectItem>
                            <SelectItem value="drywall">Drywall / Spackling</SelectItem>
                            <SelectItem value="custom-cabinetry">Custom Cabinetry</SelectItem>
                            <SelectItem value="flooring">Flooring</SelectItem>
                            <SelectItem value="painting">Painting</SelectItem>
                            <SelectItem value="landscaping">Landscaping</SelectItem>
                            <SelectItem value="christmas-light-hanging">Christmas Light Hanging</SelectItem>
                            <SelectItem value="snow-removal">Snow Removal</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief overview of the project"
                        {...field}
                        data-testid="textarea-proposal-description"
                        className="bg-white border-slate-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700">Scope of Work</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detailed scope of work including specific tasks, materials, and deliverables"
                        rows={4}
                        {...field}
                        data-testid="textarea-proposal-scope"
                        className="bg-white border-slate-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estimatedCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700">Estimated Cost ($) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          data-testid="input-estimated-cost"
                          className="bg-white border-slate-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estimatedDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700">Estimated Duration</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="2-3 days, 1 week, etc."
                          {...field}
                          data-testid="input-estimated-duration"
                          className="bg-white border-slate-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="materials"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700">Materials (comma-separated)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Pipes, fittings, sealant, labor"
                        {...field}
                        data-testid="input-materials"
                        className="bg-white border-slate-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="warrantyPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700">Warranty Period</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="1 year, 6 months, etc."
                          {...field}
                          value={field.value || ""}
                          data-testid="input-warranty-period"
                          className="bg-white border-slate-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="validUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700">Valid Until</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-valid-until"
                          className="bg-white border-slate-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="customerNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700">Customer Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notes visible to the customer"
                        {...field}
                        value={field.value || ""}
                        data-testid="textarea-customer-notes"
                        className="bg-white border-slate-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-proposal"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-gradient-to-r from-[#079669] to-[#07966f] text-white hover:opacity-90"
                  data-testid="button-submit-proposal"
                >
                  {createMutation.isPending ? "Creating..." : "Create Proposal"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
