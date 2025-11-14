import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Send, Clock, MessageCircle, CheckCircle, AlertCircle, Bot, Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assignedToAdminId: string | null;
  assignedToAdminEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TicketReply {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  isInternal: boolean;
  isAutomated: boolean;
  createdAt: string;
}

interface TicketWithReplies {
  ticket: SupportTicket;
  replies: TicketReply[];
}

const categoryLabels: Record<string, string> = {
  billing: "Billing & Payments",
  technical: "Technical Issue",
  feature_request: "Feature Request",
  account: "Account Management",
  contractor: "Contractor Services",
  general: "General Question"
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent"
};

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting_on_customer: "Waiting on Customer",
  resolved: "Resolved",
  closed: "Closed"
};

const statusIcons: Record<string, any> = {
  open: Clock,
  in_progress: MessageCircle,
  waiting_on_customer: AlertCircle,
  resolved: CheckCircle,
  closed: CheckCircle
};

const statusColors: Record<string, string> = {
  open: "bg-blue-500",
  in_progress: "bg-yellow-500",
  waiting_on_customer: "bg-orange-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500"
};

const priorityColors: Record<string, string> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
  urgent: "destructive"
};

export default function AdminSupportPage() {
  const { id } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Reply form
  const [replyContent, setReplyContent] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);

  // Ticket update form
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");

  // Fetch tickets list
  const { data: tickets = [], isLoading: ticketsLoading, refetch: refetchTickets } = useQuery<SupportTicket[]>({
    queryKey: ['/api/admin/support/tickets', statusFilter, categoryFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      
      const query = params.toString();
      const url = `/api/admin/support/tickets${query ? `?${query}` : ''}`;
      
      const res = await apiRequest(url, 'GET');
      return res.json();
    },
  });

  // Fetch ticket details if viewing a specific ticket
  const { data: ticketData, isLoading: ticketLoading } = useQuery<TicketWithReplies>({
    queryKey: ['/api/support/tickets', id],
    enabled: !!id,
  });

  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: async (data: { status?: string; priority?: string }) => {
      return await apiRequest(`/api/admin/support/tickets/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/tickets'] });
      toast({
        title: "Ticket updated",
        description: "The ticket has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update ticket",
        variant: "destructive",
      });
    },
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async ({ content, isInternal }: { content: string; isInternal: boolean }) => {
      return await apiRequest(`/api/admin/support/tickets/${id}/replies`, 'POST', { content, isInternal });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/tickets'] });
      setReplyContent("");
      setIsInternalNote(false);
      toast({
        title: "Reply sent",
        description: "Your reply has been added to the ticket.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reply",
        variant: "destructive",
      });
    },
  });

  const handleReply = () => {
    if (!replyContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter a reply",
        variant: "destructive",
      });
      return;
    }
    replyMutation.mutate({ content: replyContent, isInternal: isInternalNote });
  };

  const handleStatusUpdate = () => {
    if (selectedStatus) {
      updateTicketMutation.mutate({ status: selectedStatus });
    }
  };

  const handlePriorityUpdate = () => {
    if (selectedPriority) {
      updateTicketMutation.mutate({ priority: selectedPriority });
    }
  };

  // Ticket list view
  if (!id) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Support Tickets</h1>
            <p className="text-muted-foreground mt-2">Manage and respond to user support tickets</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/admin')}
            data-testid="button-back-to-admin"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Status</Label>
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
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger data-testid="select-filter-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
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
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {ticketsLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading tickets...
              </CardContent>
            </Card>
          ) : tickets.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No tickets found
              </CardContent>
            </Card>
          ) : (
            tickets.map((ticket) => {
              const StatusIcon = statusIcons[ticket.status as keyof typeof statusIcons] || Clock;
              const statusColor = statusColors[ticket.status as keyof typeof statusColors] || "bg-gray-500";
              
              return (
                <Link key={ticket.id} href={`/admin/support/${ticket.id}`} data-testid={`link-ticket-detail-${ticket.id}`}>
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid={`admin-ticket-card-${ticket.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                          <CardDescription className="mt-1">
                            {categoryLabels[ticket.category as keyof typeof categoryLabels]} • {priorityLabels[ticket.priority as keyof typeof priorityLabels]} priority
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${statusColor}`} />
                          <StatusIcon className="h-4 w-4" />
                          <Badge variant="outline">
                            {statusLabels[ticket.status as keyof typeof statusLabels]}
                          </Badge>
                          <Badge variant={priorityColors[ticket.priority as keyof typeof priorityColors] as any}>
                            {priorityLabels[ticket.priority as keyof typeof priorityLabels]}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {ticket.description}
                      </p>
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
                        {ticket.assignedToAdminEmail && <span>Assigned to {ticket.assignedToAdminEmail}</span>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Ticket detail view
  if (ticketLoading || !ticketData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {ticketLoading ? "Loading ticket..." : "Ticket not found"}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { ticket, replies } = ticketData;
  const StatusIcon = statusIcons[ticket.status as keyof typeof statusIcons];
  const statusColor = statusColors[ticket.status as keyof typeof statusColors];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/admin/support')}
        className="mb-4"
        data-testid="button-back-to-tickets"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to All Tickets
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <CardTitle className="text-2xl">{ticket.subject}</CardTitle>
                  <CardDescription className="mt-2">
                    Ticket #{ticket.id.slice(0, 8)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${statusColor}`} />
                  <StatusIcon className="h-4 w-4" />
                  <Badge variant="outline">{statusLabels[ticket.status as keyof typeof statusLabels]}</Badge>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4 flex-wrap">
                <Badge variant="secondary">{categoryLabels[ticket.category as keyof typeof categoryLabels]}</Badge>
                <Badge variant={priorityColors[ticket.priority as keyof typeof priorityColors] as any}>
                  {priorityLabels[ticket.priority as keyof typeof priorityLabels]} Priority
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
                </div>
                
                <Separator />
                
                <div className="text-sm text-muted-foreground">
                  Created {new Date(ticket.createdAt).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Conversation</h2>
            
            {replies.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No replies yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {replies.map((reply) => (
                  <Card key={reply.id} className={reply.isInternal ? "border-orange-200 bg-orange-50 dark:bg-orange-950" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        {reply.isAutomated ? (
                          <>
                            <Bot className="h-4 w-4 text-blue-500" />
                            <span className="font-semibold text-sm">Automated Response</span>
                            <Badge variant="secondary">Bot</Badge>
                          </>
                        ) : reply.isInternal ? (
                          <>
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            <span className="font-semibold text-sm">Internal Note</span>
                            <Badge variant="destructive">Staff Only</Badge>
                          </>
                        ) : reply.userId === ticket.userId ? (
                          <>
                            <MessageCircle className="h-4 w-4 text-blue-500" />
                            <span className="font-semibold text-sm">Customer</span>
                          </>
                        ) : (
                          <>
                            <MessageCircle className="h-4 w-4 text-green-500" />
                            <span className="font-semibold text-sm">Support Team</span>
                            <Badge variant="default">Staff</Badge>
                          </>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(reply.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Reply</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Type your response here..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[150px]"
                  data-testid="textarea-admin-reply"
                />
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="internal-note" 
                    checked={isInternalNote}
                    onCheckedChange={(checked) => setIsInternalNote(checked as boolean)}
                    data-testid="checkbox-internal-note"
                  />
                  <Label htmlFor="internal-note" className="text-sm cursor-pointer">
                    Internal note (not visible to customer)
                  </Label>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleReply}
                    disabled={replyMutation.isPending || !replyContent.trim()}
                    data-testid="button-send-admin-reply"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {replyMutation.isPending ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Current: {statusLabels[ticket.status as keyof typeof statusLabels]}</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger data-testid="select-update-status">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleStatusUpdate}
                disabled={!selectedStatus || updateTicketMutation.isPending}
                className="w-full"
                data-testid="button-update-status"
              >
                Update Status
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Update Priority</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Current: {priorityLabels[ticket.priority as keyof typeof priorityLabels]}</Label>
                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger data-testid="select-update-priority">
                    <SelectValue placeholder="Select new priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handlePriorityUpdate}
                disabled={!selectedPriority || updateTicketMutation.isPending}
                className="w-full"
                data-testid="button-update-priority"
              >
                Update Priority
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
