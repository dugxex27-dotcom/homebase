import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Phone, MessageCircle, Calendar, Search, Filter, Plug, Copy, Check, Trash2, ExternalLink } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCrmLeadSchema } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

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

interface WebhookLog {
  id: string;
  integrationId: string;
  payload: any;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

const statusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
  not_interested: "Not Interested"
};

const statusColors: Record<string, string> = {
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
  high: "High",
  urgent: "Urgent"
};

const priorityColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "secondary",
  medium: "default",
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

type CreateLeadForm = z.infer<typeof createLeadSchema>;

export default function ContractorCRMPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isAddIntegrationOpen, setIsAddIntegrationOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch leads
  const { data: leads, isLoading } = useQuery<CrmLead[]>({
    queryKey: ['/api/crm/leads', { status: statusFilter, priority: priorityFilter, source: sourceFilter, searchQuery }],
  });

  // Fetch integrations
  const { data: integrations, isLoading: isLoadingIntegrations } = useQuery<CrmIntegration[]>({
    queryKey: ['/api/crm/integrations'],
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (leadData: CreateLeadForm) => {
      return await apiRequest('/api/crm/leads', 'POST', leadData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/leads'] });
      setIsAddLeadOpen(false);
      toast({
        title: "Lead created",
        description: "New lead has been added successfully.",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lead",
        variant: "destructive",
      });
    },
  });

  const form = useForm<CreateLeadForm>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      source: "other",
      status: "new",
      priority: "medium",
      projectType: "",
      shareWithCompany: false,
    },
  });

  const handleSubmit = (data: CreateLeadForm) => {
    createLeadMutation.mutate(data);
  };

  // Create integration mutation
  const createIntegrationMutation = useMutation({
    mutationFn: async (data: { platform: string; platformName: string }) => {
      return await apiRequest('/api/crm/integrations', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/integrations'] });
      setIsAddIntegrationOpen(false);
      toast({
        title: "Integration created",
        description: "Your webhook integration has been set up successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create integration",
        variant: "destructive",
      });
    },
  });

  // Delete integration mutation
  const deleteIntegrationMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      return await apiRequest(`/api/crm/integrations/${integrationId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/integrations'] });
      toast({
        title: "Integration deleted",
        description: "The integration has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete integration",
        variant: "destructive",
      });
    },
  });

  const handleQuickAction = (action: string, lead: CrmLead) => {
    if (action === 'call' && lead.phone) {
      window.location.href = `tel:${lead.phone}`;
    } else if (action === 'message' && lead.email) {
      window.location.href = `mailto:${lead.email}`;
    } else if (action === 'schedule') {
      // Navigate to lead detail page
      window.location.href = `/crm/leads/${lead.id}`;
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "Copied!",
      description: `${fieldName} copied to clipboard`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">CRM - Lead Management</h1>
        <p className="text-muted-foreground mt-1">Manage your leads and track your sales pipeline</p>
      </div>

      <Tabs defaultValue="leads" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="leads" data-testid="tab-leads">Leads</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">
            <Plug className="h-4 w-4 mr-2" />
            Integrations
          </TabsTrigger>
        </TabsList>

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
              <DialogDescription>
                Enter the lead information below to add them to your CRM
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field}) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-state" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-postal-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="projectType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Type</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Roofing, Siding, Gutters" data-testid="input-project-type" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-source">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(sourceLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-priority">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(priorityLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddLeadOpen(false)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLeadMutation.isPending} data-testid="button-submit-lead">
                    {createLeadMutation.isPending ? "Creating..." : "Create Lead"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger data-testid="select-filter-priority">
                  <SelectValue />
                </SelectTrigger>
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
                <SelectTrigger data-testid="select-filter-source">
                  <SelectValue />
                </SelectTrigger>
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
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading leads...
            </CardContent>
          </Card>
        ) : leads && leads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No leads found</p>
              <Button onClick={() => setIsAddLeadOpen(true)} data-testid="button-add-first-lead">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Lead
              </Button>
            </CardContent>
          </Card>
        ) : (
          leads?.map((lead) => (
            <Card key={lead.id} className="hover:shadow-lg transition-shadow" data-testid={`lead-card-${lead.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl" data-testid={`lead-name-${lead.id}`}>
                      {lead.firstName} {lead.lastName}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {lead.projectType && <span className="mr-3">{lead.projectType}</span>}
                      {lead.phone && <span className="mr-3">{lead.phone}</span>}
                      {lead.email && <span>{lead.email}</span>}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <div className={`h-2 w-2 rounded-full ${statusColors[lead.status]}`} />
                      <Badge variant="outline" data-testid={`lead-status-${lead.id}`}>
                        {statusLabels[lead.status]}
                      </Badge>
                      <Badge variant={priorityColors[lead.priority]} data-testid={`lead-priority-${lead.id}`}>
                        {priorityLabels[lead.priority]}
                      </Badge>
                    </div>
                    {lead.followUpDate && (
                      <p className="text-sm text-muted-foreground">
                        Follow up: {format(new Date(lead.followUpDate), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {lead.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction('call', lead)}
                      data-testid={`button-call-${lead.id}`}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                  )}
                  {lead.email && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction('message', lead)}
                      data-testid={`button-message-${lead.id}`}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction('schedule', lead)}
                    data-testid={`button-schedule-${lead.id}`}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="flex justify-end mb-6">
            <Dialog open={isAddIntegrationOpen} onOpenChange={setIsAddIntegrationOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-integration">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Integration
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add CRM Integration</DialogTitle>
                  <DialogDescription>
                    Connect your external CRM platform to automatically sync leads to HomeBase
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Platform</label>
                    <Select onValueChange={(value) => {
                      const platformNames: Record<string, string> = {
                        servicetitan: "ServiceTitan",
                        jobber: "Jobber",
                        housecallpro: "HouseCall Pro",
                        hubspot: "HubSpot",
                        salesforce: "Salesforce",
                        other: "Other/Custom"
                      };
                      createIntegrationMutation.mutate({ 
                        platform: value, 
                        platformName: platformNames[value] || value 
                      });
                    }}>
                      <SelectTrigger data-testid="select-platform">
                        <SelectValue placeholder="Select your CRM platform" />
                      </SelectTrigger>
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
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading integrations...
              </CardContent>
            </Card>
          ) : integrations && integrations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Plug className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No integrations yet</h3>
                <p className="text-muted-foreground mb-4">
                  Connect your CRM platform to automatically sync leads to HomeBase
                </p>
                <Button onClick={() => setIsAddIntegrationOpen(true)} data-testid="button-add-first-integration">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Integration
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
                        <CardTitle className="flex items-center gap-2">
                          <Plug className="h-5 w-5" />
                          {integration.platformName}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Created {format(new Date(integration.createdAt), 'MMM d, yyyy')}
                        </CardDescription>
                      </div>
                      <Badge variant={integration.isActive ? "default" : "secondary"}>
                        {integration.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Webhook URL</label>
                      <div className="flex gap-2">
                        <Input
                          value={integration.webhookUrl}
                          readOnly
                          className="font-mono text-sm"
                          data-testid={`input-webhook-url-${integration.id}`}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(integration.webhookUrl, "Webhook URL")}
                          data-testid={`button-copy-webhook-url-${integration.id}`}
                        >
                          {copiedField === `webhook-url-${integration.id}` ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Webhook Secret</label>
                      <div className="flex gap-2">
                        <Input
                          value={integration.webhookSecret}
                          readOnly
                          type="password"
                          className="font-mono text-sm"
                          data-testid={`input-webhook-secret-${integration.id}`}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(integration.webhookSecret, "Webhook Secret")}
                          data-testid={`button-copy-webhook-secret-${integration.id}`}
                        >
                          {copiedField === `webhook-secret-${integration.id}` ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use this secret to verify webhook requests in your CRM platform
                      </p>
                    </div>

                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Setup Instructions
                      </h4>
                      <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                        <li>Copy the webhook URL above</li>
                        <li>Go to your {integration.platformName} webhook settings</li>
                        <li>Create a new webhook and paste the URL</li>
                        <li>Add the webhook secret for verification (if supported)</li>
                        <li>Configure to send lead creation events</li>
                      </ol>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete ${integration.platformName} integration?`)) {
                            deleteIntegrationMutation.mutate(integration.id);
                          }
                        }}
                        disabled={deleteIntegrationMutation.isPending}
                        data-testid={`button-delete-integration-${integration.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Integration
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
