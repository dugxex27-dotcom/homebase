import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, apiFileUpload, queryClient, API_BASE } from "@/lib/queryClient";
import { 
  Plus, Phone, MessageCircle, Calendar, Search, Filter, Plug, Copy, Check, Trash2, 
  ExternalLink, Users, Briefcase, FileText, Receipt, LayoutDashboard, Crown, 
  Send, DollarSign, Clock, Edit, Eye, CheckCircle, XCircle, AlertTriangle, User, Home as HomeIcon,
  RefreshCw, KeyRound, Download
  , Upload
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Link } from "wouter";
import { fetchCrmLeads } from "@/lib/crm-leads-query";
import { ProFeatureGate, ProUpgradeBanner, ProBenefitsDialog } from "@/components/pro-feature-gate";
import { StripeConnectOnboarding } from "@/components/stripe-connect-onboarding";
import { CreditCard } from "lucide-react";
import "./home.css";
import { WorkspaceHeader, WorkspaceContent } from "@/components/workspace";

// Types
interface CrmLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  source: string;
  status: string;
  priority: string;
  projectType: string | null;
  estimatedValue: string | null;
  followUpDate: string | null;
  createdAt: string;
}

interface CrmIntegration {
  id: string;
  platform: string;
  platformName: string;
  webhookUrl: string;
  webhookSecret: string | null;
  isActive: boolean;
  createdAt: string;
}

interface CsvImportResult {
  success: boolean;
  message: string;
  totalRows: number;
  imported: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

interface CrmClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  secondaryPhone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  notes: string | null;
  tags: string[];
  preferredContactMethod: string;
  isActive: boolean;
  totalJobsCompleted: number;
  totalRevenue: string;
  lastServiceDate: string | null;
  createdAt: string;
}

interface CrmJob {
  id: string;
  clientId: string;
  client?: CrmClient;
  title: string;
  description: string | null;
  serviceType: string;
  status: string;
  priority: string;
  scheduledDate: string;
  scheduledEndDate: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  estimatedDuration: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  laborCost: string | null;
  materialsCost: string | null;
  totalCost: string | null;
  notes: string | null;
  createdAt: string;
}

interface QuoteLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface CrmQuote {
  id: string;
  clientId: string;
  client?: CrmClient;
  quoteNumber: string;
  title: string;
  description: string | null;
  serviceType: string;
  status: string;
  lineItems: QuoteLineItem[];
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  discount: string;
  total: string;
  validUntil: string | null;
  sentAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface CrmInvoice {
  id: string;
  clientId: string;
  client?: CrmClient;
  jobId: string | null;
  quoteId: string | null;
  invoiceNumber: string;
  title: string;
  description: string | null;
  status: string;
  lineItems: QuoteLineItem[];
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  discount: string;
  total: string;
  amountPaid: string;
  amountDue: string;
  dueDate: string | null;
  sentAt: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  paymentNotes: string | null;
  notes: string | null;
  createdAt: string;
}

async function fetchCrmInvoices(status?: string): Promise<CrmInvoice[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const query = params.toString();
  const response = await apiRequest(`/api/crm/invoices${query ? `?${query}` : ''}`);
  return response.json();
}

interface SentJobRecord {
  id: string;
  serviceType: string;
  serviceDescription: string | null;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  acceptedAt: string | null;
  homeownerFirstName: string | null;
  homeownerLastName: string | null;
}

type SentJobRecordStatusFilter = 'all' | SentJobRecord['status'];

interface DashboardStats {
  totalClients: number;
  activeJobs: number;
  pendingQuotes: number;
  outstandingInvoices: number;
  totalRevenue: string;
  monthlyRevenue: string;
  paidInvoices: number;
  overdueInvoices: number;
}

interface CurrentUser {
  id: string;
  isDemoAccount?: boolean | null;
}
const leadStatusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
  not_interested: "Not Interested"
};

const leadStatusColors: Record<string, string> = {
  new: "bg-blue-500",
  contacted: "bg-yellow-500",
  qualified: "bg-[var(--theme-accent)]",
  proposal_sent: "bg-orange-500",
  won: "bg-green-500",
  lost: "bg-red-500",
  not_interested: "bg-gray-500"
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  normal: "Normal",
  high: "High",
  urgent: "Urgent"
};

const priorityColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "secondary",
  medium: "default",
  normal: "default",
  high: "destructive",
  urgent: "destructive"
};

const sourceLabels: Record<string, string> = {
  referral: "Referral",
  website: "Website",
  advertisement: "Advertisement",
  social_media: "Social Media",
  repeat_customer: "Repeat Customer",
  other: "Other"
};

const jobStatusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  on_hold: "On Hold"
};

const jobStatusColors: Record<string, string> = {
  scheduled: "bg-blue-500",
  in_progress: "bg-yellow-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
  on_hold: "bg-gray-500"
};

const quoteStatusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired"
};

const quoteStatusColors: Record<string, string> = {
  draft: "bg-gray-500",
  sent: "bg-blue-500",
  viewed: "bg-[var(--theme-accent)]",
  accepted: "bg-green-500",
  declined: "bg-red-500",
  expired: "bg-orange-500"
};

const invoiceStatusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  paid: "Paid",
  partial: "Partial",
  overdue: "Overdue",
  cancelled: "Cancelled"
};

const invoiceStatusColors: Record<string, string> = {
  draft: "bg-gray-500",
  sent: "bg-blue-500",
  viewed: "bg-[var(--theme-accent)]",
  paid: "bg-green-500",
  partial: "bg-yellow-500",
  overdue: "bg-red-500",
  cancelled: "bg-gray-400"
};

// Form schemas
const createLeadSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  source: z.string().default("other"),
  status: z.string().default("new"),
  priority: z.string().default("medium"),
  projectType: z.string().optional(),
  estimatedValue: z.string().optional(),
  followUpDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  lostReason: z.string().optional(),
  shareWithCompany: z.boolean().optional(),
});

const createClientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  secondaryPhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
  preferredContactMethod: z.string().default("phone"),
});

const createJobSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  serviceType: z.string().min(1, "Service type is required"),
  status: z.string().default("scheduled"),
  priority: z.string().default("normal"),
  scheduledDate: z.string().min(1, "Scheduled date is required"),
  estimatedDuration: z.coerce.number().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  laborCost: z.string().optional(),
  materialsCost: z.string().optional(),
  notes: z.string().optional(),
});

const createQuoteSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  serviceType: z.string().min(1, "Service type is required"),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  taxRate: z.string().default("0"),
  discount: z.string().default("0"),
});

const createInvoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  jobId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  taxRate: z.string().default("0"),
  discount: z.string().default("0"),
});

type CreateLeadForm = z.infer<typeof createLeadSchema>;
type CreateClientForm = z.infer<typeof createClientSchema>;
type CreateJobForm = z.infer<typeof createJobSchema>;
type CreateQuoteForm = z.infer<typeof createQuoteSchema>;
type CreateInvoiceForm = z.infer<typeof createInvoiceSchema>;


export default function ContractorCRMPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("leads");
  
  // Lead state
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isAddIntegrationOpen, setIsAddIntegrationOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deleteIntegrationConfirmOpen, setDeleteIntegrationConfirmOpen] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState<CrmIntegration | null>(null);
  // Secrets are only ever real/copyable immediately after create or regenerate, in this
  // client-side map — every other render shows the server's masked value. Once the user
  // navigates away and comes back, the real value is gone for good (by design).
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [regenerateSecretConfirmOpen, setRegenerateSecretConfirmOpen] = useState(false);
  const [integrationToRegenerate, setIntegrationToRegenerate] = useState<CrmIntegration | null>(null);
  const [csvImportType, setCsvImportType] = useState<"leads" | "clients">("leads");
  const [csvImportResult, setCsvImportResult] = useState<CsvImportResult | null>(null);
  const [exportingType, setExportingType] = useState<"leads" | "clients" | "quotes" | "invoices" | null>(null);
  const [resetDemoConfirmOpen, setResetDemoConfirmOpen] = useState(false);

  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ['/api/user'],
  });

  // Pro tier state
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<CrmClient | null>(null);
  const [deleteClientConfirmOpen, setDeleteClientConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<CrmClient | null>(null);
  const [clientSearch, setClientSearch] = useState("");

  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<CrmJob | null>(null);
  const [deleteJobConfirmOpen, setDeleteJobConfirmOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<CrmJob | null>(null);
  const [jobStatusFilter, setJobStatusFilter] = useState("all");
  const [sentRecordStatusFilter, setSentRecordStatusFilter] = useState<SentJobRecordStatusFilter>('all');

  const [isAddQuoteOpen, setIsAddQuoteOpen] = useState(false);
  const [quoteLineItems, setQuoteLineItems] = useState<QuoteLineItem[]>([]);
  const [quoteStatusFilter, setQuoteStatusFilter] = useState("all");

  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  const [invoiceLineItems, setInvoiceLineItems] = useState<QuoteLineItem[]>([]);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");
  const [invoiceConnectionCode, setInvoiceConnectionCode] = useState('');
  const [invoiceLinkedHomeowner, setInvoiceLinkedHomeowner] = useState<{
    id: string; name: string; email: string;
    houses: Array<{ id: string; name: string; address: string }>;
  } | null>(null);
  const [isValidatingInvoice, setIsValidatingInvoice] = useState(false);
  const [invoiceLinkedHouseId, setInvoiceLinkedHouseId] = useState('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<CrmInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  
  // Pro benefits dialog state
  const [showProBenefitsDialog, setShowProBenefitsDialog] = useState(false);

  // Send dialog state for quotes/invoices/jobs
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendDialogType, setSendDialogType] = useState<'quote' | 'invoice' | 'job'>('quote');
  const [sendDialogItemId, setSendDialogItemId] = useState<string>('');
  const [sendMethod, setSendMethod] = useState<'email' | 'sms' | 'both'>('email');

  // Send-to-homeowner state
  const [sendToHomeownerOpen, setSendToHomeownerOpen] = useState(false);
  const [sendToHomeownerJob, setSendToHomeownerJob] = useState<CrmJob | null>(null);
  const [sthConnectionCode, setSthConnectionCode] = useState('');
  const [sthLinkedHomeowner, setSthLinkedHomeowner] = useState<{
    id: string; name: string; email: string;
    houses: Array<{ id: string; name: string; address: string }>;
  } | null>(null);
  const [isValidatingSth, setIsValidatingSth] = useState(false);
  const [sthSelectedHouseId, setSthSelectedHouseId] = useState('');
  const [sthEquipment, setSthEquipment] = useState<Array<{ name: string; brand: string; model: string; serialNumber: string; installedYear: string }>>([]);
  const [sthNextServiceDate, setSthNextServiceDate] = useState('');
  const [sthNotes, setSthNotes] = useState('');
  const [invoiceUploadJob, setInvoiceUploadJob] = useState<CrmJob | null>(null);
  const [invoiceUploadOpen, setInvoiceUploadOpen] = useState(false);
  const [invoiceUploadCode, setInvoiceUploadCode] = useState('');
  const [invoiceUploadHomeowner, setInvoiceUploadHomeowner] = useState<{
    id: string; name: string; email: string;
    houses: Array<{ id: string; name: string; address: string }>;
  } | null>(null);
  const [invoiceUploadHouseId, setInvoiceUploadHouseId] = useState('');
  const [invoiceUploadFile, setInvoiceUploadFile] = useState<File | null>(null);
  const [isValidatingUploadCode, setIsValidatingUploadCode] = useState(false);

  // Check Pro tier access
  const { data: proAccessData, error: proAccessError, isLoading: isCheckingProAccess } = useQuery<CrmClient[]>({
    queryKey: ['/api/crm/clients'],
    retry: false,
  });

  const hasProAccess = !proAccessError || !(proAccessError as any)?.upgradeRequired;
  const needsUpgrade = (proAccessError as any)?.upgradeRequired === true;

  // Fetch leads
  const { data: leads, isLoading: isLoadingLeads } = useQuery<CrmLead[]>({
    queryKey: ['/api/crm/leads', { status: statusFilter, priority: priorityFilter, source: sourceFilter, searchQuery }],
    queryFn: () => fetchCrmLeads<CrmLead>({
      status: statusFilter,
      priority: priorityFilter,
      source: sourceFilter,
      searchQuery,
    }),
  });

  // Fetch integrations
  const { data: integrations, isLoading: isLoadingIntegrations } = useQuery<CrmIntegration[]>({
    queryKey: ['/api/crm/integrations'],
  });

  // Fetch clients (Pro tier)
  const { data: clients, isLoading: isLoadingClients } = useQuery<CrmClient[]>({
    queryKey: ['/api/crm/clients', { search: clientSearch }],
    enabled: hasProAccess,
  });

  // Fetch jobs (Pro tier)
  const { data: jobs, isLoading: isLoadingJobs } = useQuery<CrmJob[]>({
    queryKey: ['/api/crm/jobs', { status: jobStatusFilter !== 'all' ? jobStatusFilter : undefined }],
    enabled: hasProAccess,
  });

  // Fetch quotes (Pro tier)
  const { data: quotes, isLoading: isLoadingQuotes } = useQuery<CrmQuote[]>({
    queryKey: ['/api/crm/quotes', { status: quoteStatusFilter !== 'all' ? quoteStatusFilter : undefined }],
    enabled: hasProAccess,
  });

  // Fetch invoices (Pro tier)
  const { data: invoices, isLoading: isLoadingInvoices } = useQuery<CrmInvoice[]>({
    queryKey: ['/api/crm/invoices', { status: invoiceStatusFilter !== 'all' ? invoiceStatusFilter : undefined }],
    queryFn: () => fetchCrmInvoices(invoiceStatusFilter !== 'all' ? invoiceStatusFilter : undefined),
    enabled: hasProAccess,
  });

  // Keep the overdue summary independent from the list filter so it stays
  // visible until every overdue invoice has actually been resolved.
  const { data: overdueInvoices } = useQuery<CrmInvoice[]>({
    queryKey: ['/api/crm/invoices', { status: 'overdue' }],
    queryFn: () => fetchCrmInvoices('overdue'),
    enabled: hasProAccess,
  });
  const overdueInvoiceCount = overdueInvoices?.length ?? 0;
  const overdueAmountDue = overdueInvoices?.reduce((sum, invoice) => {
    const amountDue = Number.parseFloat(invoice.amountDue);
    return sum + (Number.isFinite(amountDue) ? amountDue : 0);
  }, 0) ?? 0;

  // Fetch sent job records (contractor feedback loop)
  const { data: sentJobRecords, isLoading: isLoadingSentRecords } = useQuery<SentJobRecord[]>({
    queryKey: ['/api/crm/sent-job-records'],
    enabled: hasProAccess,
  });
  const pendingSentRecordCount = sentJobRecords?.filter((record) => record.status === 'pending').length ?? 0;
  const filteredSentJobRecords = sentJobRecords?.filter(
    (record) => sentRecordStatusFilter === 'all' || record.status === sentRecordStatusFilter,
  ) ?? [];

  // Fetch dashboard stats (Pro tier)
  const { data: dashboardStats, isLoading: isLoadingDashboard } = useQuery<DashboardStats>({
    queryKey: ['/api/crm/dashboard'],
    enabled: hasProAccess && activeTab === 'dashboard',
  });

  // Lead mutations
  const createLeadMutation = useMutation({
    mutationFn: async (leadData: CreateLeadForm) => {
      return await apiRequest('/api/crm/leads', 'POST', leadData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/leads'] });
      setIsAddLeadOpen(false);
      toast({ title: "Lead created", description: "New lead has been added successfully." });
      leadForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create lead", variant: "destructive" });
    },
  });

  const resetDemoMutation = useMutation({
    mutationFn: async () => apiRequest('/api/demo/contractor/reset', 'POST'),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/crm/leads'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/crm/clients'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/crm/jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/crm/quotes'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/crm/invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/crm/dashboard'] }),
      ]);
      toast({
        title: "Demo data reset",
        description: "Leads, clients, jobs, quotes, and invoices are back to their original demo state.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reset failed",
        description: error.message || "Failed to reset demo data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Integration mutations
  const createIntegrationMutation = useMutation({
    mutationFn: async (data: { platform: string; platformName: string }): Promise<CrmIntegration> => {
      const res = await apiRequest('/api/crm/integrations', 'POST', data);
      return await res.json();
    },
    onSuccess: (data: CrmIntegration) => {
      // The create response is the only other place (besides regenerate) the real secret is
      // ever returned unmasked — capture it now, before the list refetch overwrites it with
      // the masked value from the server.
      const secret = data?.webhookSecret;
      if (data?.id && secret) {
        setRevealedSecrets(prev => ({ ...prev, [data.id]: secret }));
      }
      queryClient.invalidateQueries({ queryKey: ['/api/crm/integrations'] });
      setIsAddIntegrationOpen(false);
      toast({ title: "Integration created", description: "Copy your webhook secret now — you won't be able to view it again." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create integration", variant: "destructive" });
    },
  });

  const regenerateSecretMutation = useMutation({
    mutationFn: async (integrationId: string): Promise<CrmIntegration> => {
      const res = await apiRequest(`/api/crm/integrations/${integrationId}/regenerate-secret`, 'POST');
      return await res.json();
    },
    onSuccess: (data: CrmIntegration) => {
      const secret = data?.webhookSecret;
      if (data?.id && secret) {
        setRevealedSecrets(prev => ({ ...prev, [data.id]: secret }));
      }
      queryClient.invalidateQueries({ queryKey: ['/api/crm/integrations'] });
      toast({ title: "Secret regenerated", description: "Copy your new webhook secret now — the old one no longer works and this one won't be shown again." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to regenerate secret", variant: "destructive" });
    },
  });

  const csvImportMutation = useMutation({
    mutationFn: async ({ type, file }: { type: "leads" | "clients"; file: File }): Promise<CsvImportResult> => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFileUpload(`/api/crm/${type}/import`, formData);
      return await res.json();
    },
    onSuccess: (data: CsvImportResult, variables) => {
      setCsvImportResult(data);
      queryClient.invalidateQueries({ queryKey: [`/api/crm/${variables.type}`] });
      toast({
        title: data.failed > 0 ? "Import completed with errors" : "Import complete",
        description: data.message,
        variant: data.failed > 0 && data.imported === 0 ? "destructive" : "default",
      });
    },
    onError: (error: any) => {
      setCsvImportResult(null);
      toast({ title: "Error", description: error.message || "Failed to import CSV", variant: "destructive" });
    },
  });

  const deleteIntegrationMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      return await apiRequest(`/api/crm/integrations/${integrationId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/integrations'] });
      toast({ title: "Integration deleted", description: "The integration has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete integration", variant: "destructive" });
    },
  });

  // Client mutations
  const createClientMutation = useMutation({
    mutationFn: async (clientData: CreateClientForm) => {
      return await apiRequest('/api/crm/clients', 'POST', clientData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/clients'] });
      setIsAddClientOpen(false);
      setEditingClient(null);
      toast({ title: "Client created", description: "New client has been added successfully." });
      clientForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create client", variant: "destructive" });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateClientForm> }) => {
      return await apiRequest(`/api/crm/clients/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/clients'] });
      setEditingClient(null);
      toast({ title: "Client updated", description: "Client has been updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update client", variant: "destructive" });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      return await apiRequest(`/api/crm/clients/${clientId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/clients'] });
      toast({ title: "Client deleted", description: "Client has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete client", variant: "destructive" });
    },
  });

  // Job mutations
  const createJobMutation = useMutation({
    mutationFn: async (jobData: CreateJobForm) => {
      return await apiRequest('/api/crm/jobs', 'POST', jobData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/jobs'] });
      setIsAddJobOpen(false);
      toast({ title: "Job created", description: "New job has been scheduled successfully." });
      jobForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create job", variant: "destructive" });
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/crm/jobs/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/jobs'] });
      setEditingJob(null);
      toast({ title: "Job updated", description: "Job has been updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update job", variant: "destructive" });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return await apiRequest(`/api/crm/jobs/${jobId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/jobs'] });
      toast({ title: "Job deleted", description: "Job has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete job", variant: "destructive" });
    },
  });

  // Quote mutations
  const createQuoteMutation = useMutation({
    mutationFn: async (quoteData: any) => {
      return await apiRequest('/api/crm/quotes', 'POST', quoteData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/quotes'] });
      setIsAddQuoteOpen(false);
      setQuoteLineItems([]);
      toast({ title: "Quote created", description: "New quote has been created successfully." });
      quoteForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create quote", variant: "destructive" });
    },
  });

  const sendQuoteMutation = useMutation({
    mutationFn: async ({ quoteId, method }: { quoteId: string; method: string }) => {
      return await apiRequest(`/api/crm/quotes/${quoteId}/send`, 'POST', { method });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/quotes'] });
      const sentVia = [];
      if (data.emailSent) sentVia.push('email');
      if (data.smsSent) sentVia.push('SMS');
      toast({ title: "Quote sent", description: sentVia.length > 0 ? `Quote sent via ${sentVia.join(' and ')}.` : "Quote has been marked as sent." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send quote", variant: "destructive" });
    },
  });

  // Invoice mutations
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      return await apiRequest('/api/crm/invoices', 'POST', invoiceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/invoices'] });
      setIsAddInvoiceOpen(false);
      setInvoiceLineItems([]);
      setInvoiceConnectionCode('');
      setInvoiceLinkedHomeowner(null);
      setInvoiceLinkedHouseId('');
      toast({ title: "Invoice created", description: "New invoice has been created successfully." });
      invoiceForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create invoice", variant: "destructive" });
    },
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, method }: { invoiceId: string; method: string }) => {
      return await apiRequest(`/api/crm/invoices/${invoiceId}/send`, 'POST', { method });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/invoices'] });
      const sentVia = [];
      if (data.emailSent) sentVia.push('email');
      if (data.smsSent) sentVia.push('SMS');
      toast({ title: "Invoice sent", description: sentVia.length > 0 ? `Invoice sent via ${sentVia.join(' and ')}.` : "Invoice has been marked as sent." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send invoice", variant: "destructive" });
    },
  });

  const downloadInvoicePdf = async (invoice: CrmInvoice) => {
    try {
      const response = await apiRequest(`/api/crm/invoices/${invoice.id}/pdf`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message || "Failed to download invoice PDF",
        variant: "destructive",
      });
    }
  };

  const sendJobNotificationMutation = useMutation({
    mutationFn: async ({ jobId, method }: { jobId: string; method: string }) => {
      return await apiRequest(`/api/crm/jobs/${jobId}/notify`, 'POST', { method });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/jobs'] });
      const sentVia = [];
      if (data.emailSent) sentVia.push('email');
      if (data.smsSent) sentVia.push('SMS');
      toast({ title: "Notification sent", description: sentVia.length > 0 ? `Job notification sent via ${sentVia.join(' and ')}.` : "Job notification has been sent." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send notification", variant: "destructive" });
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ invoiceId, amount, paymentMethod, paymentNotes }: { invoiceId: string; amount: string; paymentMethod: string; paymentNotes?: string }) => {
      return await apiRequest(`/api/crm/invoices/${invoiceId}/payment`, 'POST', {
        amount,
        paymentMethod,
        paymentNotes: paymentNotes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/dashboard'] });
      setIsPaymentDialogOpen(false);
      setPaymentInvoice(null);
      setPaymentAmount("");
      setPaymentMethod("cash");
      setPaymentNotes("");
      toast({ title: "Payment recorded", description: "Payment has been recorded successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to record payment", variant: "destructive" });
    },
  });

  const sendToHomeownerMutation = useMutation({
    mutationFn: async () => {
      if (!sendToHomeownerJob || !sthLinkedHomeowner) throw new Error("Missing data");
      const houseId = sthSelectedHouseId || (sthLinkedHomeowner.houses.length === 1 ? sthLinkedHomeowner.houses[0].id : undefined);
      return await apiRequest(`/api/crm/jobs/${sendToHomeownerJob.id}/send-to-homeowner`, 'POST', {
        homeownerId: sthLinkedHomeowner.id,
        houseId,
        serviceDescription: sthNotes || null,
        equipmentInfo: sthEquipment.filter(e => e.name.trim()),
        nextServiceDate: sthNextServiceDate || null,
      });
    },
    onSuccess: () => {
      setSendToHomeownerOpen(false);
      setSendToHomeownerJob(null);
      setSthConnectionCode('');
      setSthLinkedHomeowner(null);
      setSthSelectedHouseId('');
      setSthEquipment([]);
      setSthNextServiceDate('');
      setSthNotes('');
      queryClient.invalidateQueries({ queryKey: ['/api/crm/sent-job-records'] });
      toast({ title: "Record sent!", description: "The homeowner will see this in their MyHomeBase dashboard and can accept it to save to their home history." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send record", variant: "destructive" });
    },
  });

  const validateSthConnectionCode = async () => {
    if (!sthConnectionCode || sthConnectionCode.length !== 8) {
      toast({ title: "Invalid Code", description: "Please enter an 8-character connection code.", variant: "destructive" });
      return;
    }
    setIsValidatingSth(true);
    try {
      const response = await fetch('/api/permanent-connection-code/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: sthConnectionCode.toUpperCase() }),
      });
      if (!response.ok) throw new Error('Invalid connection code');
      const data = await response.json();
      setSthLinkedHomeowner({ id: data.homeownerId, name: data.homeownerName, email: data.homeownerEmail, houses: data.houses || [] });
      setSthSelectedHouseId(data.houses?.length === 1 ? data.houses[0].id : '');
      toast({ title: "Homeowner found", description: `Linked to ${data.homeownerName}'s account.` });
    } catch {
      toast({ title: "Invalid code", description: "No homeowner found with that code. Ask them to share their 8-character code from the MyHomeBase app.", variant: "destructive" });
    } finally {
      setIsValidatingSth(false);
    }
  };

  // Forms
  const leadForm = useForm<CreateLeadForm>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "", phone: "", address: "", city: "", state: "",
      postalCode: "", source: "other", status: "new", priority: "medium", projectType: "", shareWithCompany: false,
    },
  });

  const clientForm = useForm<CreateClientForm>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "", phone: "", secondaryPhone: "",
      address: "", city: "", state: "", postalCode: "", notes: "", preferredContactMethod: "phone",
    },
  });

  const jobForm = useForm<CreateJobForm>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      clientId: "", title: "", description: "", serviceType: "", status: "scheduled",
      priority: "normal", scheduledDate: "", estimatedDuration: undefined, address: "",
      city: "", state: "", postalCode: "", laborCost: "", materialsCost: "", notes: "",
    },
  });

  const quoteForm = useForm<CreateQuoteForm>({
    resolver: zodResolver(createQuoteSchema),
    defaultValues: {
      clientId: "", title: "", description: "", serviceType: "", validUntil: "", notes: "", taxRate: "0", discount: "0",
    },
  });

  const invoiceForm = useForm<CreateInvoiceForm>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      clientId: "", jobId: "", title: "", description: "", dueDate: "", notes: "", taxRate: "0", discount: "0",
    },
  });

  // Reset client form when editing
  useEffect(() => {
    if (editingClient) {
      clientForm.reset({
        firstName: editingClient.firstName,
        lastName: editingClient.lastName,
        email: editingClient.email || "",
        phone: editingClient.phone || "",
        secondaryPhone: editingClient.secondaryPhone || "",
        address: editingClient.address || "",
        city: editingClient.city || "",
        state: editingClient.state || "",
        postalCode: editingClient.postalCode || "",
        notes: editingClient.notes || "",
        preferredContactMethod: editingClient.preferredContactMethod || "phone",
      });
    }
  }, [editingClient]);

  // Handlers
  const handleQuickAction = (action: string, lead: CrmLead) => {
    if (action === 'call' && lead.phone) {
      window.location.href = `tel:${lead.phone}`;
    } else if (action === 'message' && lead.email) {
      window.location.href = `mailto:${lead.email}`;
    } else if (action === 'schedule') {
      window.location.href = `/crm/leads/${lead.id}`;
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copied!", description: `${fieldName} copied to clipboard` });
  };

  const handleSubmitClient = (data: CreateClientForm) => {
    if (editingClient) {
      updateClientMutation.mutate({ id: editingClient.id, data });
    } else {
      createClientMutation.mutate(data);
    }
  };

  const handleSubmitJob = (data: CreateJobForm) => {
    createJobMutation.mutate(data);
  };

  const handleSubmitQuote = (data: CreateQuoteForm) => {
    const subtotal = quoteLineItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (parseFloat(data.taxRate) / 100);
    const discount = parseFloat(data.discount) || 0;
    const total = subtotal + taxAmount - discount;

    createQuoteMutation.mutate({
      ...data,
      lineItems: quoteLineItems,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
    });
  };

  const handleSubmitInvoice = (data: CreateInvoiceForm) => {
    // If linked to a homeowner with multiple houses, require explicit selection
    if (invoiceLinkedHomeowner && invoiceLinkedHomeowner.houses.length > 1 && !invoiceLinkedHouseId) {
      toast({
        title: "Select a Property",
        description: "Please choose which property this invoice is for before submitting.",
        variant: "destructive",
      });
      return;
    }

    const subtotal = invoiceLineItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (parseFloat(data.taxRate) / 100);
    const discount = parseFloat(data.discount) || 0;
    const total = subtotal + taxAmount - discount;

    // Determine houseId: use explicit selection, or the single house if only one, or undefined
    const linkedHouseId = invoiceLinkedHomeowner
      ? (invoiceLinkedHouseId || (invoiceLinkedHomeowner.houses.length === 1 ? invoiceLinkedHomeowner.houses[0].id : undefined))
      : undefined;

    createInvoiceMutation.mutate({
      ...data,
      idempotencyKey: crypto.randomUUID(),
      lineItems: invoiceLineItems,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      amountDue: total.toFixed(2),
      ...(invoiceLinkedHomeowner ? {
        connectionCode: invoiceConnectionCode.toUpperCase(),
        houseId: linkedHouseId,
      } : {}),
    });
  };

  const validateInvoiceConnectionCode = async () => {
    if (!invoiceConnectionCode || invoiceConnectionCode.length !== 8) {
      toast({ title: "Invalid Code", description: "Please enter an 8-character connection code.", variant: "destructive" });
      return;
    }
    setIsValidatingInvoice(true);
    try {
      const response = await fetch('/api/permanent-connection-code/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: invoiceConnectionCode.toUpperCase() }),
      });
      if (!response.ok) throw new Error('Invalid connection code');
      const data = await response.json();
      setInvoiceLinkedHomeowner({ id: data.homeownerId, name: data.homeownerName, email: data.homeownerEmail, houses: data.houses || [] });
      setInvoiceLinkedHouseId(data.houses?.length === 1 ? data.houses[0].id : '');
      toast({ title: "Connection Successful", description: `Linked to ${data.homeownerName}'s account.` });
    } catch {
      toast({ title: "Validation Failed", description: "Invalid connection code. Please check and try again.", variant: "destructive" });
    } finally {
      setIsValidatingInvoice(false);
    }
  };

  const validateUploadConnectionCode = async () => {
    setIsValidatingUploadCode(true);
    try {
      const response = await fetch('/api/permanent-connection-code/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: invoiceUploadCode.toUpperCase() }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setInvoiceUploadHomeowner({ id: data.homeownerId, name: data.homeownerName, email: data.homeownerEmail, houses: data.houses || [] });
      setInvoiceUploadHouseId(data.houses?.length === 1 ? data.houses[0].id : '');
    } catch {
      toast({ title: "Validation Failed", description: "Invalid connection code. Please check and try again.", variant: "destructive" });
    } finally {
      setIsValidatingUploadCode(false);
    }
  };

  const uploadInvoiceAnalysisMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceUploadJob || !invoiceUploadHomeowner || !invoiceUploadHouseId || !invoiceUploadFile) {
        throw new Error("Choose a homeowner, property, and invoice file.");
      }
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read the invoice file."));
        reader.readAsDataURL(invoiceUploadFile);
      });
      return apiRequest('/api/invoice-analyses/analyze', 'POST', {
        homeownerId: invoiceUploadHomeowner.id,
        houseId: invoiceUploadHouseId,
        crmJobId: invoiceUploadJob.id,
        connectionCode: invoiceUploadCode,
        completionMethod: 'contractor',
        invoiceFiles: [{ fileData, fileName: invoiceUploadFile.name, fileType: invoiceUploadFile.type }],
      });
    },
    onSuccess: () => {
      toast({ title: "Invoice uploaded", description: "The homeowner was notified and can now review the invoice." });
      setInvoiceUploadOpen(false);
      setInvoiceUploadJob(null);
      setInvoiceUploadHomeowner(null);
      setInvoiceUploadFile(null);
      setInvoiceUploadCode('');
      setInvoiceUploadHouseId('');
    },
    onError: (error: Error) => toast({ title: "Upload failed", description: error.message, variant: "destructive" }),
  });

  const addLineItem = (setter: typeof setQuoteLineItems) => {
    setter(prev => [...prev, { description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const updateLineItem = (setter: typeof setQuoteLineItems, index: number, field: keyof QuoteLineItem, value: any) => {
    setter(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        updated[index].total = updated[index].quantity * updated[index].unitPrice;
      }
      return updated;
    });
  };

  const removeLineItem = (setter: typeof setQuoteLineItems, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const handleRecordPayment = () => {
    if (paymentInvoice && paymentAmount) {
      recordPaymentMutation.mutate({
        invoiceId: paymentInvoice.id,
        amount: paymentAmount,
        paymentMethod,
        paymentNotes: paymentNotes.trim(),
      });
    }
  };

  const openSendDialog = (type: 'quote' | 'invoice' | 'job', itemId: string) => {
    setSendDialogType(type);
    setSendDialogItemId(itemId);
    setSendMethod('email');
    setSendDialogOpen(true);
  };

  const handleSendItem = () => {
    if (sendDialogType === 'quote') {
      sendQuoteMutation.mutate({ quoteId: sendDialogItemId, method: sendMethod });
    } else if (sendDialogType === 'invoice') {
      sendInvoiceMutation.mutate({ invoiceId: sendDialogItemId, method: sendMethod });
    } else if (sendDialogType === 'job') {
      sendJobNotificationMutation.mutate({ jobId: sendDialogItemId, method: sendMethod });
    }
    setSendDialogOpen(false);
  };

  const activeJobs    = jobs?.filter(j => j.status === 'scheduled' || j.status === 'in_progress').length ?? 0;
  const openInvoices  = invoices?.filter(i => i.status === 'sent' || i.status === 'overdue').length ?? 0;

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>

      {/* ── DASH HEADER ─────────────────────────── */}
      <WorkspaceHeader
        title="CRM & Clients"
        subtitle="Leads, jobs, quotes and invoices in one place"
        action={
          currentUser?.isDemoAccount === true ? (
            <Button
              type="button"
              variant="outline"
              className="border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              onClick={() => setResetDemoConfirmOpen(true)}
              disabled={resetDemoMutation.isPending}
              data-testid="button-reset-demo-data"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${resetDemoMutation.isPending ? 'animate-spin' : ''}`} />
              {resetDemoMutation.isPending ? "Resetting Demo…" : "Reset Demo Data"}
            </Button>
          ) : undefined
        }
      />

    <WorkspaceContent>

      {/* Pro Upgrade Banner for non-Pro users */}
      {needsUpgrade && (
        <ProUpgradeBanner onShowBenefits={() => setShowProBenefitsDialog(true)} />
      )}

      {/* Pro Benefits Dialog */}
      <ProBenefitsDialog open={showProBenefitsDialog} onOpenChange={setShowProBenefitsDialog} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="leads" data-testid="tab-leads">Leads</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">
            <Plug className="h-4 w-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="clients" data-testid="tab-clients" className="relative">
            <Users className="h-4 w-4 mr-2" />
            Clients
            {!hasProAccess && <Crown className="h-3 w-3 ml-1 text-yellow-500" />}
          </TabsTrigger>
          <TabsTrigger value="jobs" data-testid="tab-jobs" className="relative">
            <Briefcase className="h-4 w-4 mr-2" />
            Jobs
            {!hasProAccess && <Crown className="h-3 w-3 ml-1 text-yellow-500" />}
          </TabsTrigger>
          <TabsTrigger value="quotes" data-testid="tab-quotes" className="relative">
            <FileText className="h-4 w-4 mr-2" />
            Quotes
            {!hasProAccess && <Crown className="h-3 w-3 ml-1 text-yellow-500" />}
          </TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices" className="relative">
            <Receipt className="h-4 w-4 mr-2" />
            Invoices
            {!hasProAccess && <Crown className="h-3 w-3 ml-1 text-yellow-500" />}
          </TabsTrigger>
          <TabsTrigger value="dashboard" data-testid="tab-dashboard" className="relative">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
            {!hasProAccess && <Crown className="h-3 w-3 ml-1 text-yellow-500" />}
          </TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing" className="relative">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing & Payments
            {!hasProAccess && <Crown className="h-3 w-3 ml-1 text-yellow-500" />}
          </TabsTrigger>
        </TabsList>

        {/* Leads Tab */}
        <TabsContent value="leads">
          <div className="flex justify-end mb-6">
            <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-lead">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Lead</DialogTitle>
                  <DialogDescription>Enter the lead information below to add them to your CRM</DialogDescription>
                </DialogHeader>
                <Form {...leadForm}>
                  <form onSubmit={leadForm.handleSubmit((data) => createLeadMutation.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={leadForm.control} name="firstName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl><Input {...field} data-testid="input-lead-first-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={leadForm.control} name="lastName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl><Input {...field} data-testid="input-lead-last-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={leadForm.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input {...field} type="email" data-testid="input-lead-email" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={leadForm.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl><Input {...field} data-testid="input-lead-phone" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={leadForm.control} name="projectType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Type</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g., Roofing, Siding, Gutters" data-testid="input-lead-project-type" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={leadForm.control} name="source" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-lead-source"><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(sourceLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={leadForm.control} name="priority" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-lead-priority"><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(priorityLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={leadForm.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-lead-status"><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(leadStatusLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddLeadOpen(false)} data-testid="button-cancel-lead">Cancel</Button>
                      <Button type="submit" disabled={createLeadMutation.isPending} data-testid="button-submit-lead">
                        {createLeadMutation.isPending ? "Creating..." : "Create Lead"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Lead Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />Filters & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search leads..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" data-testid="input-search-leads" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-filter-lead-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {Object.entries(leadStatusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger data-testid="select-filter-lead-priority"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Source</label>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger data-testid="select-filter-lead-source"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      {Object.entries(sourceLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leads List */}
          <div className="space-y-4">
            {isLoadingLeads ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Loading leads...</CardContent></Card>
            ) : leads && leads.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No leads found</p>
                  <Button onClick={() => setIsAddLeadOpen(true)} data-testid="button-add-first-lead">
                    <Plus className="h-4 w-4 mr-2" />Add Your First Lead
                  </Button>
                </CardContent>
              </Card>
            ) : (
              leads?.map((lead) => (
                <Card key={lead.id} className="hover:shadow-lg transition-shadow" data-testid={`lead-card-${lead.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl" data-testid={`lead-name-${lead.id}`}>{lead.firstName} {lead.lastName}</CardTitle>
                        <CardDescription className="mt-1">
                          {lead.projectType && <span className="mr-3">{lead.projectType}</span>}
                          {lead.phone && <span className="mr-3">{lead.phone}</span>}
                          {lead.email && <span>{lead.email}</span>}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                          <div className={`h-2 w-2 rounded-full ${leadStatusColors[lead.status]}`} />
                          <Badge variant="outline" data-testid={`lead-status-${lead.id}`}>{leadStatusLabels[lead.status]}</Badge>
                          <Badge variant={priorityColors[lead.priority]} data-testid={`lead-priority-${lead.id}`}>{priorityLabels[lead.priority]}</Badge>
                        </div>
                        {lead.followUpDate && (
                          <p className="text-sm text-muted-foreground">Follow up: {format(new Date(lead.followUpDate), 'MMM d, yyyy')}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {lead.phone && (
                        <Button variant="outline" size="sm" onClick={() => handleQuickAction('call', lead)} data-testid={`button-call-${lead.id}`}>
                          <Phone className="h-4 w-4 mr-2" />Call
                        </Button>
                      )}
                      {lead.email && (
                        <Button variant="outline" size="sm" onClick={() => handleQuickAction('message', lead)} data-testid={`button-message-${lead.id}`}>
                          <MessageCircle className="h-4 w-4 mr-2" />Message
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleQuickAction('schedule', lead)} data-testid={`button-view-lead-${lead.id}`}>
                        <Calendar className="h-4 w-4 mr-2" />View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <div className="flex justify-end mb-6">
            <Dialog open={isAddIntegrationOpen} onOpenChange={setIsAddIntegrationOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-integration"><Plus className="h-4 w-4 mr-2" />Add Integration</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add CRM Integration</DialogTitle>
                  <DialogDescription>Connect your external CRM platform to automatically sync leads to MyHomeBase™</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Platform</label>
                    <Select onValueChange={(value) => {
                      const platformNames: Record<string, string> = {
                        servicetitan: "ServiceTitan", jobber: "Jobber", housecallpro: "HouseCall Pro",
                        hubspot: "HubSpot", salesforce: "Salesforce", other: "Other/Custom"
                      };
                      createIntegrationMutation.mutate({ platform: value, platformName: platformNames[value] || value });
                    }}>
                      <SelectTrigger data-testid="select-platform"><SelectValue placeholder="Select your CRM platform" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="servicetitan">ServiceTitan</SelectItem>
                        <SelectItem value="jobber">Jobber</SelectItem>
                        <SelectItem value="housecallpro">HouseCall Pro</SelectItem>
                        <SelectItem value="hubspot">HubSpot</SelectItem>
                        <SelectItem value="salesforce">Salesforce</SelectItem>
                        <SelectItem value="other">Other/Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoadingIntegrations ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Loading integrations...</CardContent></Card>
          ) : integrations && integrations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Plug className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No integrations yet</h3>
                <p className="text-muted-foreground mb-4">Connect your CRM platform to automatically sync leads to MyHomeBase™</p>
                <Button onClick={() => setIsAddIntegrationOpen(true)} data-testid="button-add-first-integration">
                  <Plus className="h-4 w-4 mr-2" />Add Your First Integration
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {integrations?.map((integration) => (
                <Card key={integration.id} data-testid={`integration-card-${integration.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><Plug className="h-5 w-5" />{integration.platformName}</CardTitle>
                        <CardDescription className="mt-1">Created {format(new Date(integration.createdAt), 'MMM d, yyyy')}</CardDescription>
                      </div>
                      <Badge variant={integration.isActive ? "default" : "secondary"}>{integration.isActive ? "Active" : "Inactive"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Webhook URL</label>
                      <div className="flex gap-2">
                        <Input value={integration.webhookUrl} readOnly className="font-mono text-sm" data-testid={`input-webhook-url-${integration.id}`} />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(integration.webhookUrl, "Webhook URL")} data-testid={`button-copy-webhook-url-${integration.id}`}>
                          {copiedField === "Webhook URL" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Webhook Secret</label>
                      {revealedSecrets[integration.id] ? (
                        <>
                          <div className="flex gap-2">
                            <Input value={revealedSecrets[integration.id]} readOnly className="font-mono text-sm" data-testid={`input-webhook-secret-${integration.id}`} />
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(revealedSecrets[integration.id], "Webhook Secret")} data-testid={`button-copy-webhook-secret-${integration.id}`}>
                              {copiedField === "Webhook Secret" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1.5 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Copy this now — it won't be shown again after you leave this page.
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <Input value={integration.webhookSecret ?? "No secret configured"} readOnly className="font-mono text-sm text-muted-foreground" data-testid={`input-webhook-secret-${integration.id}`} />
                            <Button
                              variant="outline"
                              onClick={() => { setIntegrationToRegenerate(integration); setRegenerateSecretConfirmOpen(true); }}
                              disabled={regenerateSecretMutation.isPending}
                              data-testid={`button-regenerate-secret-${integration.id}`}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />Regenerate
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                            <KeyRound className="h-3 w-3" />
                            This is hidden for security — regenerate to get a new secret you can copy.
                          </p>
                        </>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button variant="destructive" size="sm" onClick={() => { setIntegrationToDelete(integration); setDeleteIntegrationConfirmOpen(true); }}
                        disabled={deleteIntegrationMutation.isPending} data-testid={`button-delete-integration-${integration.id}`}>
                        <Trash2 className="h-4 w-4 mr-2" />Delete Integration
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Import Data Section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Import Data from Another CRM
              </CardTitle>
              <CardDescription>
                Migrate your existing clients, jobs, quotes, and invoices from another CRM system using a JSON file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Step 1: Download Template</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Get a sample JSON template showing the expected format for your data
                  </p>
                  <Button variant="outline" onClick={async () => {
                    try {
                      const response = await fetch('/api/crm/import/template', { credentials: 'include' });
                      const template = await response.json();
                      const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'crm-import-template.json';
                      a.click();
                      URL.revokeObjectURL(url);
                      toast({ title: "Template downloaded", description: "Check your downloads folder" });
                    } catch (error) {
                      toast({ title: "Error", description: "Failed to download template", variant: "destructive" });
                    }
                  }} data-testid="button-download-template">
                    <ExternalLink className="h-4 w-4 mr-2" />Download Template
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Step 2: Upload Your Data</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Format your data according to the template and upload the JSON file
                  </p>
                  <input
                    type="file"
                    accept=".json"
                    id="crm-import-file"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      try {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        
                        const response = await fetch('/api/crm/import', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify(data),
                        });
                        
                        const result = await response.json();
                        
                        if (response.ok) {
                          toast({ 
                            title: "Import Complete", 
                            description: result.message,
                          });
                          queryClient.invalidateQueries({ queryKey: ['/api/crm/clients'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/crm/jobs'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/crm/quotes'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/crm/invoices'] });
                        } else {
                          toast({ 
                            title: "Import Failed", 
                            description: result.message || "Please check your file format",
                            variant: "destructive"
                          });
                        }
                      } catch (error) {
                        toast({ 
                          title: "Error", 
                          description: "Invalid JSON file. Please check the format.",
                          variant: "destructive"
                        });
                      }
                      
                      e.target.value = '';
                    }}
                  />
                  <Button onClick={() => document.getElementById('crm-import-file')?.click()} data-testid="button-upload-import">
                    <Plus className="h-4 w-4 mr-2" />Upload JSON File
                  </Button>
                </div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Supported Data Types</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Clients</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <span>Jobs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>Quotes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    <span>Invoices</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CSV Import Section — leads and clients only. Jobs/quotes/invoices stay on
              the JSON importer above since they need nested line items and client
              relationship resolution that don't map onto a flat spreadsheet row. */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Import Leads or Clients from CSV
              </CardTitle>
              <CardDescription>
                Upload a spreadsheet export from another CRM. Column headers like "First Name", "first_name", or "Email Address" are matched automatically — each row is imported independently, so a few bad rows won't block the rest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Import as</label>
                  <Select value={csvImportType} onValueChange={(v) => { setCsvImportType(v as "leads" | "clients"); setCsvImportResult(null); }}>
                    <SelectTrigger className="w-40" data-testid="select-csv-import-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leads">Leads</SelectItem>
                      <SelectItem value="clients">Clients</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  id="crm-csv-import-file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setCsvImportResult(null);
                    csvImportMutation.mutate({ type: csvImportType, file });
                    e.target.value = '';
                  }}
                />
                <Button
                  onClick={() => document.getElementById('crm-csv-import-file')?.click()}
                  disabled={csvImportMutation.isPending}
                  data-testid="button-upload-csv-import"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {csvImportMutation.isPending ? "Importing..." : `Upload ${csvImportType === "leads" ? "Leads" : "Clients"} CSV`}
                </Button>
              </div>

              {csvImportResult && (
                <div className="border rounded-lg p-4 space-y-3" data-testid="csv-import-result">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-green-600 dark:text-green-500 font-medium">
                      <CheckCircle className="h-4 w-4" />{csvImportResult.imported} imported
                    </span>
                    {csvImportResult.failed > 0 && (
                      <span className="flex items-center gap-1.5 text-red-600 dark:text-red-500 font-medium">
                        <XCircle className="h-4 w-4" />{csvImportResult.failed} failed
                      </span>
                    )}
                    <span className="text-muted-foreground">of {csvImportResult.totalRows} rows</span>
                  </div>
                  {csvImportResult.errors.length > 0 && (
                    <div className="max-h-56 overflow-y-auto space-y-1 border-t pt-3">
                      {csvImportResult.errors.map((e, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground flex gap-2" data-testid={`csv-import-error-${idx}`}>
                          <span className="font-mono font-medium shrink-0">Row {e.row}:</span>
                          <span>{e.error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Section — baseline "download my data" only, no outbound webhook/push. */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Export Your Data
              </CardTitle>
              <CardDescription>
                Download a CSV of your own leads, clients, quotes, or invoices — useful for backups or moving to another tool. Only your data is included.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {([
                  { type: "leads" as const, label: "Leads", icon: Users },
                  { type: "clients" as const, label: "Clients", icon: Users },
                  { type: "quotes" as const, label: "Quotes", icon: FileText },
                  { type: "invoices" as const, label: "Invoices", icon: Receipt },
                ]).map(({ type, label, icon: Icon }) => (
                  <Button
                    key={type}
                    variant="outline"
                    disabled={exportingType === type}
                    data-testid={`button-export-${type}`}
                    onClick={async () => {
                      setExportingType(type);
                      try {
                        const response = await fetch(`${API_BASE}/api/crm/export/${type}`, { credentials: 'include' });
                        if (!response.ok) {
                          const body = await response.json().catch(() => ({ message: `Failed to export ${type}` }));
                          throw new Error(body.message || `Failed to export ${type}`);
                        }
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${type}-export.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast({ title: "Export ready", description: `Your ${label.toLowerCase()} CSV has been downloaded.` });
                      } catch (error: any) {
                        toast({ title: "Error", description: error.message || `Failed to export ${type}`, variant: "destructive" });
                      } finally {
                        setExportingType(null);
                      }
                    }}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {exportingType === type ? "Exporting..." : `Export ${label}`}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients Tab (Pro) */}
        <TabsContent value="clients">
          <ProFeatureGate featureName="Client Management" featureIcon={Users} needsUpgrade={needsUpgrade}>
            <div className="flex justify-between items-center mb-6">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search clients..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="pl-9" data-testid="input-search-clients" />
              </div>
              <Dialog open={isAddClientOpen || !!editingClient} onOpenChange={(open) => { if (!open) { setIsAddClientOpen(false); setEditingClient(null); clientForm.reset(); } else { setIsAddClientOpen(true); } }}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-client"><Plus className="h-4 w-4 mr-2" />Add Client</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
                    <DialogDescription>{editingClient ? "Update client information" : "Enter the client information below"}</DialogDescription>
                  </DialogHeader>
                  <Form {...clientForm}>
                    <form onSubmit={clientForm.handleSubmit(handleSubmitClient)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={clientForm.control} name="firstName" render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl><Input {...field} data-testid="input-client-first-name" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={clientForm.control} name="lastName" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl><Input {...field} data-testid="input-client-last-name" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={clientForm.control} name="email" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl><Input {...field} type="email" data-testid="input-client-email" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={clientForm.control} name="phone" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl><Input {...field} data-testid="input-client-phone" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <FormField control={clientForm.control} name="address" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl><Input {...field} data-testid="input-client-address" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-3 gap-4">
                        <FormField control={clientForm.control} name="city" render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl><Input {...field} data-testid="input-client-city" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={clientForm.control} name="state" render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl><Input {...field} data-testid="input-client-state" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={clientForm.control} name="postalCode" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl><Input {...field} data-testid="input-client-postal-code" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <FormField control={clientForm.control} name="notes" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl><Textarea {...field} data-testid="input-client-notes" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={clientForm.control} name="preferredContactMethod" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Contact Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-client-contact-method"><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="text">Text</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => { setIsAddClientOpen(false); setEditingClient(null); clientForm.reset(); }} data-testid="button-cancel-client">Cancel</Button>
                        <Button type="submit" disabled={createClientMutation.isPending || updateClientMutation.isPending} data-testid="button-submit-client">
                          {(createClientMutation.isPending || updateClientMutation.isPending) ? "Saving..." : editingClient ? "Update Client" : "Create Client"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {needsUpgrade ? (
                <>
                  {/* Demo preview content for non-Pro users */}
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">John Smith</CardTitle>
                          <CardDescription className="mt-1">
                            <span className="mr-3">(555) 123-4567</span>
                            <span>john.smith@email.com</span>
                          </CardDescription>
                        </div>
                        <Badge>Active</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Jobs: 12</span>
                          <span>Revenue: $8,450.00</span>
                          <span>Last service: Nov 15, 2025</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-2" />Edit</Button>
                          <Button variant="outline" size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">Sarah Johnson</CardTitle>
                          <CardDescription className="mt-1">
                            <span className="mr-3">(555) 987-6543</span>
                            <span>sarah.j@email.com</span>
                          </CardDescription>
                        </div>
                        <Badge>Active</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Jobs: 8</span>
                          <span>Revenue: $5,200.00</span>
                          <span>Last service: Nov 10, 2025</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-2" />Edit</Button>
                          <Button variant="outline" size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : isLoadingClients ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">Loading clients...</CardContent></Card>
              ) : clients && clients.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">No clients found</p>
                    <Button onClick={() => setIsAddClientOpen(true)} data-testid="button-add-first-client">
                      <Plus className="h-4 w-4 mr-2" />Add Your First Client
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                clients?.map((client) => (
                  <Card key={client.id} className="hover:shadow-lg transition-shadow" data-testid={`client-card-${client.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl" data-testid={`client-name-${client.id}`}>{client.firstName} {client.lastName}</CardTitle>
                          <CardDescription className="mt-1">
                            {client.phone && <span className="mr-3">{client.phone}</span>}
                            {client.email && <span>{client.email}</span>}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={client.isActive ? "default" : "secondary"}>{client.isActive ? "Active" : "Inactive"}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Jobs: {client.totalJobsCompleted}</span>
                          <span>Revenue: ${parseFloat(client.totalRevenue || "0").toFixed(2)}</span>
                          {client.lastServiceDate && <span>Last service: {format(new Date(client.lastServiceDate), 'MMM d, yyyy')}</span>}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingClient(client)} data-testid={`button-edit-client-${client.id}`}>
                            <Edit className="h-4 w-4 mr-2" />Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setClientToDelete(client); setDeleteClientConfirmOpen(true); }} data-testid={`button-delete-client-${client.id}`}>
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ProFeatureGate>
        </TabsContent>

        {/* Jobs Tab (Pro) */}
        <TabsContent value="jobs">
          <ProFeatureGate featureName="Job Scheduling" featureIcon={Briefcase} needsUpgrade={needsUpgrade}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
                  <SelectTrigger className="w-48" data-testid="select-filter-job-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(jobStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Dialog open={isAddJobOpen} onOpenChange={setIsAddJobOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-job"><Plus className="h-4 w-4 mr-2" />Add Job</Button>
                </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Schedule New Job</DialogTitle>
                      <DialogDescription>Enter the job details to schedule it for a client</DialogDescription>
                    </DialogHeader>
                    <Form {...jobForm}>
                      <form onSubmit={jobForm.handleSubmit(handleSubmitJob)} className="space-y-4">
                        <FormField control={jobForm.control} name="clientId" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-job-client"><SelectValue placeholder="Select a client" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clients?.map((client) => (
                                  <SelectItem key={client.id} value={client.id}>{client.firstName} {client.lastName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={jobForm.control} name="title" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title *</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g., HVAC Maintenance" data-testid="input-job-title" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={jobForm.control} name="description" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl><Textarea {...field} data-testid="input-job-description" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={jobForm.control} name="serviceType" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Service Type *</FormLabel>
                              <FormControl><Input {...field} placeholder="e.g., Maintenance, Repair" data-testid="input-job-service-type" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={jobForm.control} name="priority" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Priority</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-job-priority"><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(priorityLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={jobForm.control} name="scheduledDate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Scheduled Date *</FormLabel>
                              <FormControl><Input {...field} type="datetime-local" data-testid="input-job-scheduled-date" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={jobForm.control} name="estimatedDuration" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estimated Duration (minutes)</FormLabel>
                              <FormControl><Input {...field} type="number" data-testid="input-job-duration" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={jobForm.control} name="notes" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl><Textarea {...field} data-testid="input-job-notes" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsAddJobOpen(false)} data-testid="button-cancel-job">Cancel</Button>
                          <Button type="submit" disabled={createJobMutation.isPending} data-testid="button-submit-job">
                            {createJobMutation.isPending ? "Scheduling..." : "Schedule Job"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-4">
                {isLoadingJobs ? (
                  <Card><CardContent className="py-8 text-center text-muted-foreground">Loading jobs...</CardContent></Card>
                ) : jobs && jobs.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">No jobs found</p>
                      <Button onClick={() => setIsAddJobOpen(true)} data-testid="button-add-first-job">
                        <Plus className="h-4 w-4 mr-2" />Schedule Your First Job
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  jobs?.map((job) => (
                    <Card key={job.id} className="hover:shadow-lg transition-shadow" data-testid={`job-card-${job.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl" data-testid={`job-title-${job.id}`}>{job.title}</CardTitle>
                            <CardDescription className="mt-1">
                              <span className="mr-3">{job.serviceType}</span>
                              <span>{format(new Date(job.scheduledDate), 'MMM d, yyyy h:mm a')}</span>
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <div className={`h-2 w-2 rounded-full ${jobStatusColors[job.status]}`} />
                            <Badge variant="outline" data-testid={`job-status-${job.id}`}>{jobStatusLabels[job.status]}</Badge>
                            <Badge variant={priorityColors[job.priority]}>{priorityLabels[job.priority]}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            {job.estimatedDuration && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{job.estimatedDuration} min</span>}
                            {job.totalCost && <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" />${parseFloat(job.totalCost).toFixed(2)}</span>}
                          </div>
                          <div className="flex gap-2">
                            <Select value={job.status} onValueChange={(value) => updateJobMutation.mutate({ id: job.id, data: { status: value } })}>
                              <SelectTrigger className="w-36" data-testid={`select-job-status-${job.id}`}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(jobStatusLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={() => openSendDialog('job', job.id)} disabled={sendJobNotificationMutation.isPending} data-testid={`button-notify-job-${job.id}`}>
                              <Send className="h-4 w-4 mr-2" />Notify
                            </Button>
                            {job.status === 'completed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setInvoiceUploadJob(job); setInvoiceUploadOpen(true); }}
                                data-testid={`button-upload-invoice-${job.id}`}
                              >
                                <Upload className="h-4 w-4 mr-2" />Upload Invoice & Notify Homeowner
                              </Button>
                            )}
                            {job.status === 'completed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-green-300 text-green-700 hover:bg-green-50"
                                onClick={() => { setSendToHomeownerJob(job); setSendToHomeownerOpen(true); setSthConnectionCode(''); setSthLinkedHomeowner(null); setSthSelectedHouseId(''); setSthEquipment([]); setSthNextServiceDate(''); setSthNotes(''); }}
                                data-testid={`button-send-to-homeowner-${job.id}`}
                              >
                                <HomeIcon className="h-4 w-4 mr-2" />Send to Homeowner
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => { setJobToDelete(job); setDeleteJobConfirmOpen(true); }} data-testid={`button-delete-job-${job.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Sent Records Panel */}
              <div className="mt-8">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <HomeIcon className="h-5 w-5 text-green-600" />
                    Sent Records
                    {pendingSentRecordCount > 0 && (
                      <Badge variant="secondary" data-testid="sent-records-pending-count">
                        {pendingSentRecordCount} pending
                      </Badge>
                    )}
                  </h3>
                  <Select
                    value={sentRecordStatusFilter}
                    onValueChange={(value) => setSentRecordStatusFilter(value as SentJobRecordStatusFilter)}
                  >
                    <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-sent-record-status">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isLoadingSentRecords ? (
                  <Card><CardContent className="py-8 text-center text-muted-foreground">Loading sent records...</CardContent></Card>
                ) : !sentJobRecords || sentJobRecords.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <HomeIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>No records sent yet. Use "Send to Homeowner" on a completed job to push it to a homeowner's dashboard.</p>
                    </CardContent>
                  </Card>
                ) : filteredSentJobRecords.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground" data-testid="sent-records-filter-empty">
                      No {sentRecordStatusFilter} sent records.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {filteredSentJobRecords.map((record) => {
                      const homeownerName = [record.homeownerFirstName, record.homeownerLastName].filter(Boolean).join(' ') || 'Homeowner';
                      const statusBadge = record.status === 'accepted'
                        ? <Badge className="bg-green-100 text-green-800 border-green-200" data-testid={`sent-record-status-${record.id}`}><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>
                        : record.status === 'declined'
                        ? <Badge className="bg-red-100 text-red-800 border-red-200" data-testid={`sent-record-status-${record.id}`}><XCircle className="h-3 w-3 mr-1" />Declined</Badge>
                        : <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200" data-testid={`sent-record-status-${record.id}`}><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
                      return (
                        <Card key={record.id} data-testid={`sent-record-${record.id}`}>
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{record.serviceType}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <User className="h-3 w-3" />
                                  {homeownerName}
                                  <span className="mx-1">·</span>
                                  {format(new Date(record.createdAt), 'MMM d, yyyy')}
                                </div>
                                {record.serviceDescription && (
                                  <div className="text-sm text-muted-foreground mt-1 truncate">{record.serviceDescription}</div>
                                )}
                              </div>
                              <div className="shrink-0">{statusBadge}</div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
          </ProFeatureGate>
        </TabsContent>

        {/* Quotes Tab (Pro) */}
        <TabsContent value="quotes">
          <ProFeatureGate featureName="Professional Quotes" featureIcon={FileText} needsUpgrade={needsUpgrade}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <Select value={quoteStatusFilter} onValueChange={setQuoteStatusFilter}>
                  <SelectTrigger className="w-48" data-testid="select-filter-quote-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {Object.entries(quoteStatusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Dialog open={isAddQuoteOpen} onOpenChange={(open) => { setIsAddQuoteOpen(open); if (!open) { setQuoteLineItems([]); quoteForm.reset(); } }}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-quote"><Plus className="h-4 w-4 mr-2" />Create Quote</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Quote</DialogTitle>
                      <DialogDescription>Create a quote for your client with line items</DialogDescription>
                    </DialogHeader>
                    <Form {...quoteForm}>
                      <form onSubmit={quoteForm.handleSubmit(handleSubmitQuote)} className="space-y-4">
                        <FormField control={quoteForm.control} name="clientId" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-quote-client"><SelectValue placeholder="Select a client" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clients?.map((client) => (
                                  <SelectItem key={client.id} value={client.id}>{client.firstName} {client.lastName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={quoteForm.control} name="title" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title *</FormLabel>
                              <FormControl><Input {...field} data-testid="input-quote-title" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={quoteForm.control} name="serviceType" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Service Type *</FormLabel>
                              <FormControl><Input {...field} data-testid="input-quote-service-type" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={quoteForm.control} name="description" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl><Textarea {...field} data-testid="input-quote-description" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-medium">Line Items</label>
                            <Button type="button" variant="outline" size="sm" onClick={() => addLineItem(setQuoteLineItems)} data-testid="button-add-line-item">
                              <Plus className="h-4 w-4 mr-2" />Add Item
                            </Button>
                          </div>
                          {quoteLineItems.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-center">
                              <Input className="col-span-5" placeholder="Description" value={item.description}
                                onChange={(e) => updateLineItem(setQuoteLineItems, index, 'description', e.target.value)} data-testid={`input-line-item-description-${index}`} />
                              <Input className="col-span-2" type="number" placeholder="Qty" value={item.quantity}
                                onChange={(e) => updateLineItem(setQuoteLineItems, index, 'quantity', parseInt(e.target.value) || 0)} data-testid={`input-line-item-qty-${index}`} />
                              <Input className="col-span-2" type="number" placeholder="Price" value={item.unitPrice}
                                onChange={(e) => updateLineItem(setQuoteLineItems, index, 'unitPrice', parseFloat(e.target.value) || 0)} data-testid={`input-line-item-price-${index}`} />
                              <div className="col-span-2 text-right">${item.total.toFixed(2)}</div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(setQuoteLineItems, index)} data-testid={`button-remove-line-item-${index}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {quoteLineItems.length > 0 && (
                            <div className="text-right font-semibold pt-2 border-t">
                              Subtotal: ${quoteLineItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={quoteForm.control} name="taxRate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax Rate (%)</FormLabel>
                              <FormControl><Input {...field} type="number" step="0.01" data-testid="input-quote-tax-rate" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={quoteForm.control} name="discount" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount ($)</FormLabel>
                              <FormControl><Input {...field} type="number" step="0.01" data-testid="input-quote-discount" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <FormField control={quoteForm.control} name="validUntil" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valid Until</FormLabel>
                            <FormControl><Input {...field} type="date" data-testid="input-quote-valid-until" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => { setIsAddQuoteOpen(false); setQuoteLineItems([]); quoteForm.reset(); }} data-testid="button-cancel-quote">Cancel</Button>
                          <Button type="submit" disabled={createQuoteMutation.isPending || quoteLineItems.length === 0} data-testid="button-submit-quote">
                            {createQuoteMutation.isPending ? "Creating..." : "Create Quote"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-4">
                {isLoadingQuotes ? (
                  <Card><CardContent className="py-8 text-center text-muted-foreground">Loading quotes...</CardContent></Card>
                ) : quotes && quotes.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">No quotes found</p>
                      <Button onClick={() => setIsAddQuoteOpen(true)} data-testid="button-add-first-quote">
                        <Plus className="h-4 w-4 mr-2" />Create Your First Quote
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  quotes?.map((quote) => (
                    <Card key={quote.id} className="hover:shadow-lg transition-shadow" data-testid={`quote-card-${quote.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl" data-testid={`quote-title-${quote.id}`}>{quote.title}</CardTitle>
                            <CardDescription className="mt-1">
                              <span className="mr-3">#{quote.quoteNumber}</span>
                              <span className="mr-3">{quote.serviceType}</span>
                              <span>{format(new Date(quote.createdAt), 'MMM d, yyyy')}</span>
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <div className={`h-2 w-2 rounded-full ${quoteStatusColors[quote.status]}`} />
                            <Badge variant="outline" data-testid={`quote-status-${quote.id}`}>{quoteStatusLabels[quote.status]}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4 text-sm">
                            <span className="font-semibold text-lg">${parseFloat(quote.total).toFixed(2)}</span>
                            {quote.validUntil && <span className="text-muted-foreground">Valid until: {format(new Date(quote.validUntil), 'MMM d, yyyy')}</span>}
                          </div>
                          <div className="flex gap-2">
                            {quote.status === 'draft' && (
                              <Button variant="outline" size="sm" onClick={() => openSendDialog('quote', quote.id)} disabled={sendQuoteMutation.isPending} data-testid={`button-send-quote-${quote.id}`}>
                                <Send className="h-4 w-4 mr-2" />Send Quote
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
          </ProFeatureGate>
        </TabsContent>

        {/* Invoices Tab (Pro) */}
        <TabsContent value="invoices">
          <ProFeatureGate featureName="Invoice Management" featureIcon={Receipt} needsUpgrade={needsUpgrade}>
            {overdueInvoiceCount > 0 && (
              <button
                type="button"
                onClick={() => setInvoiceStatusFilter('overdue')}
                className="mb-6 flex w-full items-center justify-between gap-4 rounded-lg border border-red-300 bg-red-50 p-4 text-left text-red-950 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                data-testid="button-filter-overdue-invoices"
              >
                <span className="flex items-center gap-3">
                  <span className="rounded-full bg-red-100 p-2" aria-hidden="true">
                    <AlertTriangle className="h-5 w-5 text-red-700" />
                  </span>
                  <span>
                    <span className="block font-semibold">
                      {overdueInvoiceCount} {overdueInvoiceCount === 1 ? 'invoice' : 'invoices'} overdue
                    </span>
                    <span className="block text-sm text-red-800">Click to show overdue invoices only</span>
                  </span>
                </span>
                <span className="shrink-0 font-semibold" data-testid="overdue-invoice-total">
                  ${overdueAmountDue.toFixed(2)} total due
                </span>
              </button>
            )}
            <div className="flex justify-between items-center mb-6">
              <div>
                <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                  <SelectTrigger className="w-48" data-testid="select-filter-invoice-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {Object.entries(invoiceStatusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Dialog open={isAddInvoiceOpen} onOpenChange={(open) => { setIsAddInvoiceOpen(open); if (!open) { setInvoiceLineItems([]); invoiceForm.reset(); setInvoiceConnectionCode(''); setInvoiceLinkedHomeowner(null); setInvoiceLinkedHouseId(''); } }}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-invoice"><Plus className="h-4 w-4 mr-2" />Create Invoice</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Invoice</DialogTitle>
                      <DialogDescription>Create an invoice for your client</DialogDescription>
                    </DialogHeader>
                    <Form {...invoiceForm}>
                      <form onSubmit={invoiceForm.handleSubmit(handleSubmitInvoice)} className="space-y-4">
                        <FormField control={invoiceForm.control} name="clientId" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-invoice-client"><SelectValue placeholder="Select a client" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clients?.map((client) => (
                                  <SelectItem key={client.id} value={client.id}>{client.firstName} {client.lastName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={invoiceForm.control} name="jobId" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Related Job (Optional)</FormLabel>
                            <Select onValueChange={v => field.onChange(v === "none" ? "" : v)} value={field.value || "none"}>
                              <FormControl>
                                <SelectTrigger data-testid="select-invoice-job"><SelectValue placeholder="Select a job" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {jobs?.filter(job => job.status === 'completed').map((job) => (
                                  <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={invoiceForm.control} name="title" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title *</FormLabel>
                            <FormControl><Input {...field} data-testid="input-invoice-title" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={invoiceForm.control} name="description" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl><Textarea {...field} data-testid="input-invoice-description" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-medium">Line Items</label>
                            <Button type="button" variant="outline" size="sm" onClick={() => addLineItem(setInvoiceLineItems)} data-testid="button-add-invoice-line-item">
                              <Plus className="h-4 w-4 mr-2" />Add Item
                            </Button>
                          </div>
                          {invoiceLineItems.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-center">
                              <Input className="col-span-5" placeholder="Description" value={item.description}
                                onChange={(e) => updateLineItem(setInvoiceLineItems, index, 'description', e.target.value)} data-testid={`input-invoice-line-item-description-${index}`} />
                              <Input className="col-span-2" type="number" placeholder="Qty" value={item.quantity}
                                onChange={(e) => updateLineItem(setInvoiceLineItems, index, 'quantity', parseInt(e.target.value) || 0)} data-testid={`input-invoice-line-item-qty-${index}`} />
                              <Input className="col-span-2" type="number" placeholder="Price" value={item.unitPrice}
                                onChange={(e) => updateLineItem(setInvoiceLineItems, index, 'unitPrice', parseFloat(e.target.value) || 0)} data-testid={`input-invoice-line-item-price-${index}`} />
                              <div className="col-span-2 text-right">${item.total.toFixed(2)}</div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(setInvoiceLineItems, index)} data-testid={`button-remove-invoice-line-item-${index}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {invoiceLineItems.length > 0 && (
                            <div className="text-right font-semibold pt-2 border-t">
                              Subtotal: ${invoiceLineItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={invoiceForm.control} name="taxRate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax Rate (%)</FormLabel>
                              <FormControl><Input {...field} type="number" step="0.01" data-testid="input-invoice-tax-rate" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={invoiceForm.control} name="discount" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount ($)</FormLabel>
                              <FormControl><Input {...field} type="number" step="0.01" data-testid="input-invoice-discount" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <FormField control={invoiceForm.control} name="dueDate" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <FormControl><Input {...field} type="date" data-testid="input-invoice-due-date" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Link to Homeowner Account via connection code */}
                        <Card style={{ backgroundColor: '#f2f2f2', border: '2px solid #1560a2' }}>
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base" style={{ color: '#1560a2' }}>
                              <User className="w-4 h-4" style={{ color: '#1560a2' }} />
                              Link to Homeowner Account (Optional)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {!invoiceLinkedHomeowner ? (
                              <>
                                <p className="text-sm text-gray-600">
                                  If the homeowner is on MyHomeBase, enter their 8-character connection code so this invoice appears in their home history.
                                </p>
                                <div className="flex gap-2">
                                  <Input
                                    value={invoiceConnectionCode}
                                    onChange={(e) => setInvoiceConnectionCode(e.target.value.toUpperCase())}
                                    placeholder="ABC12345"
                                    maxLength={8}
                                    style={{ backgroundColor: '#ffffff' }}
                                    data-testid="input-invoice-connection-code"
                                  />
                                  <Button
                                    type="button"
                                    onClick={validateInvoiceConnectionCode}
                                    disabled={isValidatingInvoice || invoiceConnectionCode.length !== 8}
                                    style={{ backgroundColor: '#1560a2', color: 'white' }}
                                    className="hover:opacity-90 shrink-0"
                                    data-testid="button-validate-invoice-code"
                                  >
                                    {isValidatingInvoice ? 'Linking...' : 'Link Account'}
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-full">
                                      <User className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-green-900">{invoiceLinkedHomeowner.name}</p>
                                      <p className="text-sm text-green-700">{invoiceLinkedHomeowner.email}</p>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { setInvoiceLinkedHomeowner(null); setInvoiceConnectionCode(''); setInvoiceLinkedHouseId(''); }}
                                    data-testid="button-unlink-invoice"
                                  >
                                    Unlink
                                  </Button>
                                </div>
                                {invoiceLinkedHomeowner.houses.length > 1 && (
                                  <div>
                                    <label className="text-sm font-medium mb-1 block" style={{ color: '#1560a2' }}>Select Property</label>
                                    <Select value={invoiceLinkedHouseId} onValueChange={setInvoiceLinkedHouseId}>
                                      <SelectTrigger data-testid="select-invoice-linked-house">
                                        <SelectValue placeholder="Choose a property" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {invoiceLinkedHomeowner.houses.map(h => (
                                          <SelectItem key={h.id} value={h.id}>{h.name || h.address}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                                {invoiceLinkedHomeowner.houses.length === 1 && (
                                  <p className="text-sm text-green-700">Property: {invoiceLinkedHomeowner.houses[0].name || invoiceLinkedHomeowner.houses[0].address}</p>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => { setIsAddInvoiceOpen(false); setInvoiceLineItems([]); invoiceForm.reset(); setInvoiceConnectionCode(''); setInvoiceLinkedHomeowner(null); setInvoiceLinkedHouseId(''); }} data-testid="button-cancel-invoice">Cancel</Button>
                          <Button type="submit" disabled={createInvoiceMutation.isPending || invoiceLineItems.length === 0} data-testid="button-submit-invoice">
                            {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-4">
                {isLoadingInvoices ? (
                  <Card><CardContent className="py-8 text-center text-muted-foreground">Loading invoices...</CardContent></Card>
                ) : invoices && invoices.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">No invoices found</p>
                      <Button onClick={() => setIsAddInvoiceOpen(true)} data-testid="button-add-first-invoice">
                        <Plus className="h-4 w-4 mr-2" />Create Your First Invoice
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  invoices?.map((invoice) => (
                    <Card key={invoice.id} className="hover:shadow-lg transition-shadow" data-testid={`invoice-card-${invoice.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl" data-testid={`invoice-title-${invoice.id}`}>{invoice.title}</CardTitle>
                            <CardDescription className="mt-1">
                              <span className="mr-3">#{invoice.invoiceNumber}</span>
                              <span>{format(new Date(invoice.createdAt), 'MMM d, yyyy')}</span>
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <div className={`h-2 w-2 rounded-full ${invoiceStatusColors[invoice.status]}`} />
                            <Badge variant="outline" data-testid={`invoice-status-${invoice.id}`}>{invoiceStatusLabels[invoice.status]}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4 text-sm">
                            <span className="font-semibold text-lg">${parseFloat(invoice.total).toFixed(2)}</span>
                            <span className="text-muted-foreground">Paid: ${parseFloat(invoice.amountPaid || "0").toFixed(2)}</span>
                            <span className="text-muted-foreground">Due: ${parseFloat(invoice.amountDue).toFixed(2)}</span>
                            {invoice.dueDate && <span className="text-muted-foreground">Due: {format(new Date(invoice.dueDate), 'MMM d, yyyy')}</span>}
                          </div>
                          <div className="flex gap-2">
                            {invoice.status !== 'draft' && (
                              <Button variant="outline" size="sm" onClick={() => downloadInvoicePdf(invoice)} data-testid={`button-download-invoice-pdf-${invoice.id}`}>
                                <Download className="h-4 w-4 mr-2" />Download PDF
                              </Button>
                            )}
                            {invoice.status === 'draft' && (
                              <Button variant="outline" size="sm" onClick={() => openSendDialog('invoice', invoice.id)} disabled={sendInvoiceMutation.isPending} data-testid={`button-send-invoice-${invoice.id}`}>
                                <Send className="h-4 w-4 mr-2" />Send Invoice
                              </Button>
                            )}
                            {['sent', 'viewed', 'overdue', 'partial'].includes(invoice.status) && (
                              <Button variant="outline" size="sm" onClick={() => { setPaymentInvoice(invoice); setPaymentAmount(invoice.amountDue); setPaymentMethod("cash"); setPaymentNotes(""); setIsPaymentDialogOpen(true); }} data-testid={`button-record-payment-${invoice.id}`}>
                                <DollarSign className="h-4 w-4 mr-2" />Record Payment
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Payment Dialog */}
              <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                      Recording payment for invoice #{paymentInvoice?.invoiceNumber}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Amount</label>
                      <Input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} data-testid="input-payment-amount" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Payment Method</label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger data-testid="select-payment-method"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="credit_card">Card</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
                      <Textarea
                        value={paymentNotes}
                        onChange={(event) => setPaymentNotes(event.target.value)}
                        placeholder="Check number or other payment details"
                        maxLength={1000}
                        data-testid="textarea-payment-notes"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)} data-testid="button-cancel-payment">Cancel</Button>
                    <Button
                      onClick={handleRecordPayment}
                      disabled={
                        recordPaymentMutation.isPending
                        || !paymentAmount
                        || Number(paymentAmount) <= 0
                        || Number(paymentAmount) > Number(paymentInvoice?.amountDue ?? 0)
                      }
                      data-testid="button-submit-payment"
                    >
                      {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
          </ProFeatureGate>
        </TabsContent>

        {/* Dashboard Tab (Pro) */}
        <TabsContent value="dashboard">
          <ProFeatureGate featureName="Business Dashboard" featureIcon={LayoutDashboard} needsUpgrade={needsUpgrade}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card data-testid="dashboard-card-clients">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-clients">
                      {needsUpgrade ? "24" : isLoadingDashboard ? "..." : dashboardStats?.totalClients || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card data-testid="dashboard-card-active-jobs">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-active-jobs">
                      {needsUpgrade ? "8" : isLoadingDashboard ? "..." : dashboardStats?.activeJobs || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card data-testid="dashboard-card-pending-quotes">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-pending-quotes">
                      {needsUpgrade ? "5" : isLoadingDashboard ? "..." : dashboardStats?.pendingQuotes || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card data-testid="dashboard-card-outstanding-invoices">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Outstanding Invoices</CardTitle>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-outstanding-invoices">
                      {needsUpgrade ? "3" : isLoadingDashboard ? "..." : dashboardStats?.outstandingInvoices || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card data-testid="dashboard-card-revenue">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Revenue Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Revenue</span>
                        <span className="text-2xl font-bold" data-testid="stat-total-revenue">
                          ${needsUpgrade ? "87,450.00" : isLoadingDashboard ? "..." : parseFloat(dashboardStats?.totalRevenue || "0").toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Monthly Revenue</span>
                        <span className="text-xl font-semibold" data-testid="stat-monthly-revenue">
                          ${needsUpgrade ? "12,350.00" : isLoadingDashboard ? "..." : parseFloat(dashboardStats?.monthlyRevenue || "0").toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card data-testid="dashboard-card-invoice-stats">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      Invoice Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Paid Invoices
                        </span>
                        <span className="font-semibold" data-testid="stat-paid-invoices">
                          {needsUpgrade ? "42" : isLoadingDashboard ? "..." : dashboardStats?.paidInvoices || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          Overdue Invoices
                        </span>
                        <span className="font-semibold" data-testid="stat-overdue-invoices">
                          {needsUpgrade ? "2" : isLoadingDashboard ? "..." : dashboardStats?.overdueInvoices || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </ProFeatureGate>
        </TabsContent>

        {/* Billing & Payments Tab */}
        <TabsContent value="billing">
          <ProFeatureGate featureName="Billing & Payments" featureIcon={CreditCard}>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Billing & Payments</h2>
                  <p className="text-muted-foreground">Accept payments and manage your Stripe account</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StripeConnectOnboarding />
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Payment Overview
                    </CardTitle>
                    <CardDescription>Your payment collection summary</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        When customers pay invoices through MyHomeBase™, payments go directly to your connected Stripe account.
                      </p>
                      <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                        <p className="text-sm text-green-700 font-medium">No MyHomeBase™ fees on payments!</p>
                        <p className="text-xs text-green-600 mt-1">You keep 100% of what you charge (standard Stripe processing applies)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>How it Works</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--theme-fill)' }}>
                        <span className="font-bold" style={{ color: 'var(--theme-accent)' }}>1</span>
                      </div>
                      <h4 className="font-medium mb-1">Create Invoice</h4>
                      <p className="text-sm text-muted-foreground">Create an invoice in the Invoices tab</p>
                    </div>
                    <div className="text-center p-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--theme-fill)' }}>
                        <span className="font-bold" style={{ color: 'var(--theme-accent)' }}>2</span>
                      </div>
                      <h4 className="font-medium mb-1">Send Payment Link</h4>
                      <p className="text-sm text-muted-foreground">Share the payment link with your customer</p>
                    </div>
                    <div className="text-center p-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--theme-fill)' }}>
                        <span className="font-bold" style={{ color: 'var(--theme-accent)' }}>3</span>
                      </div>
                      <h4 className="font-medium mb-1">Customer Pays</h4>
                      <p className="text-sm text-muted-foreground">Customer pays securely via Stripe</p>
                    </div>
                    <div className="text-center p-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--theme-fill)' }}>
                        <span className="font-bold" style={{ color: 'var(--theme-accent)' }}>4</span>
                      </div>
                      <h4 className="font-medium mb-1">Get Paid</h4>
                      <p className="text-sm text-muted-foreground">Funds deposited to your bank</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ProFeatureGate>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={resetDemoConfirmOpen}
        onOpenChange={setResetDemoConfirmOpen}
        title="Reset all demo CRM data?"
        description="This removes changes made during the demo and restores the original leads, clients, jobs, quotes, and invoices. You can safely reset again later."
        confirmText="Reset Demo Data"
        cancelText="Keep Changes"
        onConfirm={() => {
          setResetDemoConfirmOpen(false);
          resetDemoMutation.mutate();
        }}
        variant="destructive"
      />

      <ConfirmDialog
        open={deleteIntegrationConfirmOpen}
        onOpenChange={setDeleteIntegrationConfirmOpen}
        title="Delete Integration?"
        description={`Are you sure you want to delete the ${integrationToDelete?.platformName} integration? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => { if (integrationToDelete) deleteIntegrationMutation.mutate(integrationToDelete.id); setDeleteIntegrationConfirmOpen(false); setIntegrationToDelete(null); }}
        variant="destructive"
      />

      <ConfirmDialog
        open={regenerateSecretConfirmOpen}
        onOpenChange={setRegenerateSecretConfirmOpen}
        title="Regenerate Webhook Secret?"
        description={`This will immediately invalidate the current webhook secret for the ${integrationToRegenerate?.platformName} integration. Any external system still using the old secret will start getting rejected until you update it with the new one.`}
        confirmText="Regenerate"
        cancelText="Cancel"
        onConfirm={() => { if (integrationToRegenerate) regenerateSecretMutation.mutate(integrationToRegenerate.id); setRegenerateSecretConfirmOpen(false); setIntegrationToRegenerate(null); }}
        variant="destructive"
      />

      <ConfirmDialog
        open={deleteClientConfirmOpen}
        onOpenChange={setDeleteClientConfirmOpen}
        title="Delete Client?"
        description={`Are you sure you want to delete ${clientToDelete?.firstName} ${clientToDelete?.lastName}? This will also remove their associated jobs and invoices.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => { if (clientToDelete) deleteClientMutation.mutate(clientToDelete.id); setDeleteClientConfirmOpen(false); setClientToDelete(null); }}
        variant="destructive"
      />

      <ConfirmDialog
        open={deleteJobConfirmOpen}
        onOpenChange={setDeleteJobConfirmOpen}
        title="Delete Job?"
        description={`Are you sure you want to delete the job "${jobToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => { if (jobToDelete) deleteJobMutation.mutate(jobToDelete.id); setDeleteJobConfirmOpen(false); setJobToDelete(null); }}
        variant="destructive"
      />

      {/* Send Dialog for Quotes/Invoices/Jobs */}
      <Dialog open={invoiceUploadOpen} onOpenChange={setInvoiceUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Invoice & Notify Homeowner</DialogTitle>
            <DialogDescription>
              Scan the invoice for {invoiceUploadJob?.title}. The homeowner will review it before it is added to their records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!invoiceUploadHomeowner ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Homeowner connection code</label>
                <div className="flex gap-2">
                  <Input value={invoiceUploadCode} onChange={(event) => setInvoiceUploadCode(event.target.value.toUpperCase())} maxLength={8} placeholder="8-character code" />
                  <Button type="button" onClick={validateUploadConnectionCode} disabled={invoiceUploadCode.length !== 8 || isValidatingUploadCode}>
                    {isValidatingUploadCode ? "Checking…" : "Connect"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                Connected to <strong>{invoiceUploadHomeowner.name}</strong>
              </div>
            )}
            {invoiceUploadHomeowner && invoiceUploadHomeowner.houses.length > 1 && (
              <Select value={invoiceUploadHouseId} onValueChange={setInvoiceUploadHouseId}>
                <SelectTrigger><SelectValue placeholder="Select the property" /></SelectTrigger>
                <SelectContent>
                  {invoiceUploadHomeowner.houses.map((house) => <SelectItem key={house.id} value={house.id}>{house.name || house.address}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {invoiceUploadHomeowner && (
              <Input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setInvoiceUploadFile(event.target.files?.[0] || null)} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceUploadOpen(false)}>Cancel</Button>
            <Button
              onClick={() => uploadInvoiceAnalysisMutation.mutate()}
              disabled={!invoiceUploadFile || !invoiceUploadHouseId || uploadInvoiceAnalysisMutation.isPending}
            >
              {uploadInvoiceAnalysisMutation.isPending ? "Analyzing…" : "Upload & Notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Dialog for Quotes/Invoices/Jobs */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {sendDialogType === 'quote' && 'Send Quote'}
              {sendDialogType === 'invoice' && 'Send Invoice'}
              {sendDialogType === 'job' && 'Send Job Notification'}
            </DialogTitle>
            <DialogDescription>
              Choose how you'd like to send this {sendDialogType} to your client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-3 block">Delivery Method</label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant={sendMethod === 'email' ? 'default' : 'outline'}
                  onClick={() => setSendMethod('email')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  data-testid="button-send-method-email"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>Email</span>
                </Button>
                <Button
                  type="button"
                  variant={sendMethod === 'sms' ? 'default' : 'outline'}
                  onClick={() => setSendMethod('sms')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  data-testid="button-send-method-sms"
                >
                  <Phone className="h-5 w-5" />
                  <span>SMS</span>
                </Button>
                <Button
                  type="button"
                  variant={sendMethod === 'both' ? 'default' : 'outline'}
                  onClick={() => setSendMethod('both')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  data-testid="button-send-method-both"
                >
                  <Send className="h-5 w-5" />
                  <span>Both</span>
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSendDialogOpen(false)} data-testid="button-cancel-send">
              Cancel
            </Button>
            <Button 
              onClick={handleSendItem} 
              disabled={
                (sendDialogType === 'quote' && sendQuoteMutation.isPending) ||
                (sendDialogType === 'invoice' && sendInvoiceMutation.isPending) ||
                (sendDialogType === 'job' && sendJobNotificationMutation.isPending)
              }
              data-testid="button-confirm-send"
            >
              {(sendDialogType === 'quote' && sendQuoteMutation.isPending) ||
               (sendDialogType === 'invoice' && sendInvoiceMutation.isPending) ||
               (sendDialogType === 'job' && sendJobNotificationMutation.isPending) ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Send to Homeowner Modal */}
      <Dialog open={sendToHomeownerOpen} onOpenChange={(open) => { if (!open) { setSendToHomeownerOpen(false); setSendToHomeownerJob(null); setSthConnectionCode(''); setSthLinkedHomeowner(null); setSthEquipment([]); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HomeIcon className="h-5 w-5 text-green-600" />
              Send Job Record to Homeowner
            </DialogTitle>
            <DialogDescription>
              Push this completed job record directly to the homeowner's MyHomeBase dashboard. They'll see it immediately and can accept it to save to their home history.
              {sendToHomeownerJob && <span className="block mt-1 font-medium text-foreground">{sendToHomeownerJob.title} · {sendToHomeownerJob.serviceType}</span>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Step 1: Homeowner connection code */}
            {!sthLinkedHomeowner ? (
              <div className="space-y-2">
                <label className="text-sm font-semibold">Homeowner's Connection Code</label>
                <p className="text-xs text-muted-foreground">Ask your client to share their 8-character code from the MyHomeBase app (Settings → Connection Code).</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="8-character code"
                    value={sthConnectionCode}
                    onChange={e => setSthConnectionCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="font-mono tracking-wider text-center"
                    data-testid="input-sth-connection-code"
                  />
                  <Button onClick={validateSthConnectionCode} disabled={isValidatingSth || sthConnectionCode.length !== 8} data-testid="button-validate-sth-code">
                    {isValidatingSth ? "Checking…" : "Connect"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-800">{sthLinkedHomeowner.name}</p>
                  <p className="text-xs text-green-600">{sthLinkedHomeowner.email}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSthLinkedHomeowner(null); setSthConnectionCode(''); setSthSelectedHouseId(''); }} className="text-xs text-muted-foreground">
                  Change
                </Button>
              </div>
            )}

            {/* Property picker if multiple */}
            {sthLinkedHomeowner && sthLinkedHomeowner.houses.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-semibold">Which property?</label>
                <Select value={sthSelectedHouseId} onValueChange={setSthSelectedHouseId}>
                  <SelectTrigger data-testid="select-sth-house"><SelectValue placeholder="Select a property" /></SelectTrigger>
                  <SelectContent>
                    {sthLinkedHomeowner.houses.map(h => (
                      <SelectItem key={h.id} value={h.id}>{h.name || h.address}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            {sthLinkedHomeowner && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Work summary / notes <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <Textarea
                    placeholder="Describe the work performed, materials used, etc."
                    value={sthNotes}
                    onChange={e => setSthNotes(e.target.value)}
                    rows={3}
                    data-testid="textarea-sth-notes"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Next service date <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <Input
                    type="date"
                    value={sthNextServiceDate}
                    onChange={e => setSthNextServiceDate(e.target.value)}
                    data-testid="input-sth-next-service-date"
                  />
                </div>

                {/* Equipment */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold">Equipment installed / serviced <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSthEquipment(prev => [...prev, { name: '', brand: '', model: '', serialNumber: '', installedYear: '' }])}
                      data-testid="button-sth-add-equipment"
                    >
                      <Plus className="h-3 w-3 mr-1" />Add
                    </Button>
                  </div>
                  {sthEquipment.map((eq, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                      <div className="flex gap-2">
                        <Input placeholder="Name (e.g. Furnace)" value={eq.name} onChange={e => { const u = [...sthEquipment]; u[i].name = e.target.value; setSthEquipment(u); }} className="flex-1" />
                        <Button variant="ghost" size="sm" onClick={() => setSthEquipment(prev => prev.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 px-2">×</Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Brand" value={eq.brand} onChange={e => { const u = [...sthEquipment]; u[i].brand = e.target.value; setSthEquipment(u); }} />
                        <Input placeholder="Model" value={eq.model} onChange={e => { const u = [...sthEquipment]; u[i].model = e.target.value; setSthEquipment(u); }} />
                        <Input placeholder="Serial #" value={eq.serialNumber} onChange={e => { const u = [...sthEquipment]; u[i].serialNumber = e.target.value; setSthEquipment(u); }} />
                        <Input placeholder="Install year" value={eq.installedYear} onChange={e => { const u = [...sthEquipment]; u[i].installedYear = e.target.value; setSthEquipment(u); }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendToHomeownerOpen(false)} data-testid="button-sth-cancel">Cancel</Button>
            <Button
              onClick={() => sendToHomeownerMutation.mutate()}
              disabled={
                !sthLinkedHomeowner ||
                (sthLinkedHomeowner.houses.length > 1 && !sthSelectedHouseId) ||
                sendToHomeownerMutation.isPending
              }
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-sth-submit"
            >
              {sendToHomeownerMutation.isPending ? "Sending…" : "Send Record →"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceContent>
    </div>
  );
}
