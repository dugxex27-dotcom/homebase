import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Send, Clock, MessageCircle, CheckCircle, AlertCircle, Bot } from "lucide-react";

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
  ticket: {
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
  };
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

export default function SupportTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [replyContent, setReplyContent] = useState("");

  const { data, isLoading } = useQuery<TicketWithReplies>({
    queryKey: ['/api/support/tickets', id],
    enabled: !!id,
  });

  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest(`/api/support/tickets/${id}/replies`, 'POST', { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets'] });
      setReplyContent("");
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
    replyMutation.mutate(replyContent);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading ticket...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Ticket not found
          </CardContent>
        </Card>
      </div>
    );
  }

  const { ticket, replies } = data;
  const StatusIcon = statusIcons[ticket.status];
  const statusColor = statusColors[ticket.status];
  const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/support')}
        className="mb-4"
        data-testid="button-back-to-support"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Support
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1">
              <CardTitle className="text-2xl" data-testid="ticket-subject">
                {ticket.subject}
              </CardTitle>
              <CardDescription className="mt-2">
                Ticket #{ticket.id.slice(0, 8)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${statusColor}`} />
              <StatusIcon className="h-4 w-4" />
              <Badge variant="outline" data-testid="ticket-status">
                {ticket.status.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4 flex-wrap">
            <Badge variant="secondary" data-testid="ticket-category">
              {categoryLabels[ticket.category]}
            </Badge>
            <Badge variant={priorityColors[ticket.priority] as any} data-testid="ticket-priority">
              {priorityLabels[ticket.priority]} Priority
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap" data-testid="ticket-description">
                {ticket.description}
              </p>
            </div>
            
            <Separator />
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Created {new Date(ticket.createdAt).toLocaleString()}</span>
              {ticket.assignedToAdminEmail && (
                <span>Assigned to {ticket.assignedToAdminEmail}</span>
              )}
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
              <p className="text-sm mt-2">Our support team will respond soon</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {replies.map((reply) => (
              <Card key={reply.id} data-testid={`reply-${reply.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    {reply.isAutomated ? (
                      <>
                        <Bot className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold text-sm">Automated Response</span>
                        <Badge variant="secondary">Bot</Badge>
                      </>
                    ) : reply.userId === 'system' || reply.userId !== ticket.userId ? (
                      <>
                        <MessageCircle className="h-4 w-4 text-green-500" />
                        <span className="font-semibold text-sm">Support Team</span>
                        <Badge variant="default">Staff</Badge>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold text-sm">You</span>
                      </>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(reply.createdAt).toLocaleString()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap" data-testid={`reply-content-${reply.id}`}>
                    {reply.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isResolved && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add a Reply</CardTitle>
              <CardDescription>
                Continue the conversation with our support team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Type your message here..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[120px]"
                data-testid="textarea-reply"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleReply}
                  disabled={replyMutation.isPending || !replyContent.trim()}
                  data-testid="button-send-reply"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {replyMutation.isPending ? "Sending..." : "Send Reply"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isResolved && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CardContent className="py-6 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
              <p className="font-semibold text-green-900 dark:text-green-100">
                This ticket has been {ticket.status}
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                If you need further assistance, please create a new support ticket
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
