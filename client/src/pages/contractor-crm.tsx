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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, Phone, MessageCircle, Calendar, Search, Filter, Plug, Copy, Check, Trash2, 
  ExternalLink, Users, Briefcase, FileText, Receipt, LayoutDashboard, Crown, 
  Send, DollarSign, Clock, Edit, Eye, CheckCircle, XCircle, AlertTriangle
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Link } from "wouter";

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
  webhookSecret: string;
  isActive: boolean;
  createdAt: string;
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
  notes: string | null;
  createdAt: string;
}

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

// Status labels and colors
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
  qualified: "bg-purple-500",
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
  viewed: "bg-purple-500",
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
  viewed: "bg-purple-500",
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

// Upgrade Prompt Component
function UpgradePrompt() {
  return (
    <Card className="border-2 border-dashed border-primary/50">
      <CardContent className="py-12 text-center">
        <Crown className="h-16 w-16 mx-auto mb-4 text-primary" />
        <h3 className="text-2xl font-bold mb-2">Upgrade to Pro</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Unlock powerful CRM features including client management, job scheduling, 
          quotes, invoices, and business analytics with Contractor Pro.
        </p>
        <Button asChild size="lg" data-testid="button-upgrade-to-pro">
          <Link href="/billing">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade Now
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

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

  const [isAddQuoteOpen, setIsAddQuoteOpen] = useState(false);
  const [quoteLineItems, setQuoteLineItems] = useState<QuoteLineItem[]>([]);
  const [quoteStatusFilter, setQuoteStatusFilter] = useState("all");

  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  const [invoiceLineItems, setInvoiceLineItems] = useState<QuoteLineItem[]>([]);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<CrmInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

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
    enabled: hasProAccess,
  });

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

  // Integration mutations
  const createIntegrationMutation = useMutation({
    mutationFn: async (data: { platform: string; platformName: string }) => {
      return await apiRequest('/api/crm/integrations', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/integrations'] });
      setIsAddIntegrationOpen(false);
      toast({ title: "Integration created", description: "Your webhook integration has been set up successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create integration", variant: "destructive" });
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
    mutationFn: async (quoteId: string) => {
      return await apiRequest(`/api/crm/quotes/${quoteId}/send`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/quotes'] });
      toast({ title: "Quote sent", description: "Quote has been marked as sent." });
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
      toast({ title: "Invoice created", description: "New invoice has been created successfully." });
      invoiceForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create invoice", variant: "destructive" });
    },
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return await apiRequest(`/api/crm/invoices/${invoiceId}/send`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/invoices'] });
      toast({ title: "Invoice sent", description: "Invoice has been marked as sent." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send invoice", variant: "destructive" });
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ invoiceId, amount, paymentMethod }: { invoiceId: string; amount: string; paymentMethod: string }) => {
      return await apiRequest(`/api/crm/invoices/${invoiceId}/payment`, 'POST', { amount, paymentMethod });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/dashboard'] });
      setIsPaymentDialogOpen(false);
      setPaymentInvoice(null);
      setPaymentAmount("");
      toast({ title: "Payment recorded", description: "Payment has been recorded successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to record payment", variant: "destructive" });
    },
  });

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
    const subtotal = invoiceLineItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (parseFloat(data.taxRate) / 100);
    const discount = parseFloat(data.discount) || 0;
    const total = subtotal + taxAmount - discount;

    createInvoiceMutation.mutate({
      ...data,
      lineItems: invoiceLineItems,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      amountDue: total.toFixed(2),
    });
  };

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
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">CRM - Business Management</h1>
        <p className="text-muted-foreground mt-1">Manage your leads, clients, jobs, quotes, and invoices</p>
      </div>

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
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  <DialogDescription>Connect your external CRM platform to automatically sync leads to HomeBase</DialogDescription>
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
                <p className="text-muted-foreground mb-4">Connect your CRM platform to automatically sync leads to HomeBase</p>
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
                      <div className="flex gap-2">
                        <Input value={integration.webhookSecret} readOnly type="password" className="font-mono text-sm" data-testid={`input-webhook-secret-${integration.id}`} />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(integration.webhookSecret, "Webhook Secret")} data-testid={`button-copy-webhook-secret-${integration.id}`}>
                          {copiedField === "Webhook Secret" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
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
        </TabsContent>

        {/* Clients Tab (Pro) */}
        <TabsContent value="clients">
          {!hasProAccess ? (
            <UpgradePrompt />
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search clients..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="pl-9" data-testid="input-search-clients" />
                </div>
                <Dialog open={isAddClientOpen || !!editingClient} onOpenChange={(open) => { if (!open) { setIsAddClientOpen(false); setEditingClient(null); clientForm.reset(); } else { setIsAddClientOpen(true); } }}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-client"><Plus className="h-4 w-4 mr-2" />Add Client</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                {isLoadingClients ? (
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
            </>
          )}
        </TabsContent>

        {/* Jobs Tab (Pro) */}
        <TabsContent value="jobs">
          {!hasProAccess ? (
            <UpgradePrompt />
          ) : (
            <>
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
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            </>
          )}
        </TabsContent>

        {/* Quotes Tab (Pro) */}
        <TabsContent value="quotes">
          {!hasProAccess ? (
            <UpgradePrompt />
          ) : (
            <>
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
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                              <Button variant="outline" size="sm" onClick={() => sendQuoteMutation.mutate(quote.id)} disabled={sendQuoteMutation.isPending} data-testid={`button-send-quote-${quote.id}`}>
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
            </>
          )}
        </TabsContent>

        {/* Invoices Tab (Pro) */}
        <TabsContent value="invoices">
          {!hasProAccess ? (
            <UpgradePrompt />
          ) : (
            <>
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
                <Dialog open={isAddInvoiceOpen} onOpenChange={(open) => { setIsAddInvoiceOpen(open); if (!open) { setInvoiceLineItems([]); invoiceForm.reset(); } }}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-invoice"><Plus className="h-4 w-4 mr-2" />Create Invoice</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-invoice-job"><SelectValue placeholder="Select a job" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">None</SelectItem>
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

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => { setIsAddInvoiceOpen(false); setInvoiceLineItems([]); invoiceForm.reset(); }} data-testid="button-cancel-invoice">Cancel</Button>
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
                            {invoice.status === 'draft' && (
                              <Button variant="outline" size="sm" onClick={() => sendInvoiceMutation.mutate(invoice.id)} disabled={sendInvoiceMutation.isPending} data-testid={`button-send-invoice-${invoice.id}`}>
                                <Send className="h-4 w-4 mr-2" />Send Invoice
                              </Button>
                            )}
                            {['sent', 'viewed', 'partial'].includes(invoice.status) && (
                              <Button variant="outline" size="sm" onClick={() => { setPaymentInvoice(invoice); setPaymentAmount(invoice.amountDue); setIsPaymentDialogOpen(true); }} data-testid={`button-record-payment-${invoice.id}`}>
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
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)} data-testid="button-cancel-payment">Cancel</Button>
                    <Button onClick={handleRecordPayment} disabled={recordPaymentMutation.isPending} data-testid="button-submit-payment">
                      {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </TabsContent>

        {/* Dashboard Tab (Pro) */}
        <TabsContent value="dashboard">
          {!hasProAccess ? (
            <UpgradePrompt />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card data-testid="dashboard-card-clients">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-clients">
                      {isLoadingDashboard ? "..." : dashboardStats?.totalClients || 0}
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
                      {isLoadingDashboard ? "..." : dashboardStats?.activeJobs || 0}
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
                      {isLoadingDashboard ? "..." : dashboardStats?.pendingQuotes || 0}
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
                      {isLoadingDashboard ? "..." : dashboardStats?.outstandingInvoices || 0}
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
                          ${isLoadingDashboard ? "..." : parseFloat(dashboardStats?.totalRevenue || "0").toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Monthly Revenue</span>
                        <span className="text-xl font-semibold" data-testid="stat-monthly-revenue">
                          ${isLoadingDashboard ? "..." : parseFloat(dashboardStats?.monthlyRevenue || "0").toFixed(2)}
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
                          {isLoadingDashboard ? "..." : dashboardStats?.paidInvoices || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          Overdue Invoices
                        </span>
                        <span className="font-semibold" data-testid="stat-overdue-invoices">
                          {isLoadingDashboard ? "..." : dashboardStats?.overdueInvoices || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialogs */}
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
    </div>
  );
}
