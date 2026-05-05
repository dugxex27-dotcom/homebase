import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Proposals } from "@/components/proposals";
import { ContractorCodeEntry } from "@/components/ConnectionCodes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  Plus,
  Sparkles
} from "lucide-react";
import type { User as UserType, Proposal, ContractorAppointment } from "@shared/schema";
import { Link } from "wouter";
import "./home.css";

interface ContactedHomeowner {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  lastContactedAt: Date;
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
        <div className="dash-chips">
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

      <div className="dash-body">

        {/* AI Business Coach */}
        <Link href="/ai-contractor-help" className="ai-coach-card" style={{ background: 'linear-gradient(135deg, #0C3460, #1560A2)' }}>
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

        {/* Homeowner Connection */}
        <span className="dash-section-label" style={{ marginTop: 8 }}>Homeowner Connection</span>
        <div className="dash-light-card">
          <ContractorCodeEntry />
        </div>

        {/* Referral Program */}
        <span className="dash-section-label" style={{ marginTop: 4 }}>Referral Program</span>
        <div className="dash-light-card">
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
        <div className="dash-light-card" style={{ marginBottom: 10 }}>
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
        <div className="dash-light-card" style={{ marginBottom: 10 }}>
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
