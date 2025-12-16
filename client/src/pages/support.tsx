import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertSupportTicketSchema, type SupportTicket } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { HelpCircle, MessageCircle, CheckCircle, Clock, AlertCircle, Ticket } from "lucide-react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ticketFormSchema = insertSupportTicketSchema.extend({
  category: z.enum(['billing', 'technical', 'feature_request', 'account', 'contractor', 'general']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters").max(5000),
}).omit({ userId: true });

type TicketFormData = z.infer<typeof ticketFormSchema>;

const faqs = [
  // Payment & Billing
  {
    question: "How do I pay a contractor's invoice?",
    answer: "When a contractor sends you an invoice, you'll receive a payment link via email or can access it directly from your messages. Click the link to view the invoice details and pay securely with your credit card through Stripe. You'll receive a confirmation once payment is complete."
  },
  {
    question: "How do contractors receive payments?",
    answer: "Contractors connect their bank account through Stripe Connect in their profile settings. When you pay an invoice, the payment goes directly to their connected bank account. Contractors can track all payments in their CRM dashboard."
  },
  {
    question: "Are there any fees for using HomeBase payments?",
    answer: "HomeBase does not charge any platform fees on payments! Contractors keep 100% of what they charge. Only standard Stripe credit card processing fees apply, which are handled by Stripe directly."
  },
  {
    question: "What payment methods are accepted?",
    answer: "We accept all major credit and debit cards including Visa, Mastercard, American Express, and Discover. Payments are processed securely through Stripe, so your card information is never stored on our servers."
  },
  // Subscriptions
  {
    question: "How does the 14-day free trial work?",
    answer: "All new users get 14 days of free access to all features. After 14 days, you'll need to choose a subscription plan based on the number of properties you manage. You can cancel anytime during the trial with no charge."
  },
  {
    question: "What are the subscription plans?",
    answer: "We offer three homeowner plans: Base ($5/month for up to 2 homes), Premium ($20/month for 3-6 homes), and Premium Plus ($40/month for 7+ homes). Contractors have Basic ($20/month) and Pro ($40/month) plans. All plans include our referral rewards program."
  },
  {
    question: "How do referral rewards work?",
    answer: "Share your unique referral code with friends. For each person who signs up and maintains an active subscription, you earn $1/month credit toward your subscription. Earn enough referrals and your subscription becomes completely free! Your referral credit cap matches your plan price."
  },
  {
    question: "How do I cancel my subscription?",
    answer: "Go to Settings > Billing and click 'Cancel Subscription'. Your access will continue until the end of your current billing period. You can reactivate anytime to restore your data."
  },
  // Homeowner Features
  {
    question: "How do I add a new house to my account?",
    answer: "Go to the Houses page and click 'Add House'. Fill in your address, climate zone, and home details. Your house will be added to your dashboard where you can track maintenance tasks and service records."
  },
  {
    question: "How do I add multiple properties?",
    answer: "HomeBase supports multiple properties! Simply go to the Houses page and click 'Add House' for each property. You can switch between properties from your dashboard. Higher subscription tiers are recommended for managing more properties and unlock additional features."
  },
  {
    question: "What is the Home Health Score?",
    answer: "Your Home Health Score is a gamified metric (0-100) based on completed vs. missed maintenance tasks. Complete seasonal tasks to improve your score and unlock achievements. It helps you track how well you're maintaining your property."
  },
  {
    question: "How do I find contractors in my area?",
    answer: "Click 'Find Contractors' from your dashboard or any maintenance task. We'll show you verified contractors within 20 miles of your property who specialize in the service you need. You can view their profiles, ratings, and request quotes directly."
  },
  {
    question: "How does the connection code work?",
    answer: "Your unique 8-character Connection Code lets you securely share your home's service history with contractors. Give your code to a contractor, and they can access your records to provide more accurate quotes. You control who has access and can revoke it anytime."
  },
  // Contractor Features
  {
    question: "How do I set up payments to receive money?",
    answer: "Go to your Profile page and scroll down to 'Payment Settings', or access it through the CRM Billing & Payments tab. Click 'Connect with Stripe' to link your bank account. Once verified, you can accept credit card payments directly through your invoices."
  },
  {
    question: "What's included in the Contractor Pro plan?",
    answer: "The Pro plan ($40/month) includes full CRM access: client management, job scheduling, quotes and invoices, Stripe payment processing, team management, dashboard analytics, and external CRM imports. You also get double the referral credit cap compared to Basic."
  },
  {
    question: "How do I import leads from other CRMs?",
    answer: "In the CRM tab, go to Integrations and set up a webhook connection. We support imports from popular CRMs like Jobber, ServiceTitan, and Housecall Pro. Leads sync automatically once connected, so you never miss a potential customer."
  },
  {
    question: "How do I create and send invoices?",
    answer: "From the CRM Invoices tab, click 'Create Invoice'. Add line items, set the due date, and save. Then click 'Send' to email a payment link to your client. They can pay online with a credit card, and you'll be notified when payment is received."
  },
  // General
  {
    question: "Is my data secure?",
    answer: "Absolutely! We use enterprise-grade security including encrypted connections (HTTPS), secure session management, SQL injection and XSS prevention, and rate limiting. Your payment information is processed through Stripe's PCI-compliant system and never stored on our servers."
  },
  {
    question: "How do I contact support?",
    answer: "You can submit a support ticket right here on this page! Select your issue category, describe your problem, and we'll respond within 24-48 hours. For urgent issues, mark your ticket as high priority and we'll prioritize your request."
  },
  {
    question: "Can I transfer my house to a new owner?",
    answer: "Yes! If you're selling your home, you can transfer all service records and maintenance history to the new owner. Go to your house settings and select 'Transfer Ownership'. The new owner will receive a secure link to accept the transfer and claim the property history."
  },
  {
    question: "How does the DIY Savings Tracker work?",
    answer: "When you mark a maintenance task as DIY-completed, we estimate the professional cost based on your region and task type. Your total DIY savings show how much money you've saved by doing tasks yourself instead of hiring contractors."
  },
  {
    question: "Can I become a Real Estate Agent affiliate?",
    answer: "Yes! Sign up as a Real Estate Agent to get a unique referral code and shareable QR code. Earn $15 for each referral after they complete 4 consecutive months of paid subscription. Track your referrals and payouts in the Agent Dashboard."
  }
];

const categoryLabels = {
  billing: "Billing & Payments",
  technical: "Technical Issue",
  feature_request: "Feature Request",
  account: "Account Management",
  contractor: "Contractor Services",
  general: "General Question"
};

const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent"
};

const statusIcons = {
  open: Clock,
  in_progress: MessageCircle,
  waiting_on_customer: AlertCircle,
  resolved: CheckCircle,
  closed: CheckCircle
};

const statusColors = {
  open: "bg-blue-500",
  in_progress: "bg-yellow-500",
  waiting_on_customer: "bg-orange-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500"
};

export default function SupportPage() {
  const { toast } = useToast();
  const [showTicketForm, setShowTicketForm] = useState(false);

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<SupportTicket[]>({
    queryKey: ['/api/support/tickets'],
  });

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      category: 'general',
      priority: 'medium',
      subject: '',
      description: '',
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: TicketFormData) => {
      return await apiRequest('/api/support/tickets', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets'] });
      toast({
        title: "Ticket created",
        description: "Your support ticket has been submitted. Our team will respond shortly.",
      });
      form.reset();
      setShowTicketForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ticket",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TicketFormData) => {
    createTicketMutation.mutate(data);
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-5xl">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <HelpCircle className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Support Center</h1>
      </div>

      <Tabs defaultValue="faq" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="faq" data-testid="tab-faq" className="text-xs sm:text-sm py-2 sm:py-2.5">
            <HelpCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Frequently Asked Questions</span>
            <span className="sm:hidden">FAQs</span>
          </TabsTrigger>
          <TabsTrigger value="tickets" data-testid="tab-tickets" className="text-xs sm:text-sm py-2 sm:py-2.5">
            <Ticket className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">My Tickets ({tickets.length})</span>
            <span className="sm:hidden">Tickets ({tickets.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Find quick answers to common questions about HomeBase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger data-testid={`faq-question-${index}`}>
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent data-testid={`faq-answer-${index}`}>
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <div className="mt-8 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Can't find what you're looking for?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => setShowTicketForm(true)}
                    data-testid="button-create-ticket-from-faq"
                  >
                    Create a support ticket
                  </Button>
                  {" "}and our team will help you.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="mt-6 space-y-6">
          {!showTicketForm && (
            <Button
              onClick={() => setShowTicketForm(true)}
              data-testid="button-create-ticket"
              className="w-full sm:w-auto"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Create New Ticket
            </Button>
          )}

          {showTicketForm && (
            <Card>
              <CardHeader>
                <CardTitle>Create Support Ticket</CardTitle>
                <CardDescription>
                  Describe your issue and our support team will help you as soon as possible
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(categoryLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value} data-testid={`category-${value}`}>
                                  {label}
                                </SelectItem>
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
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(priorityLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value} data-testid={`priority-${value}`}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Brief description of your issue"
                              data-testid="input-subject"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Please provide as much detail as possible..."
                              className="min-h-[150px]"
                              data-testid="textarea-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowTicketForm(false);
                          form.reset();
                        }}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createTicketMutation.isPending}
                        data-testid="button-submit-ticket"
                      >
                        {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

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
                  <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No support tickets yet</p>
                  <p className="text-sm mt-2">Create a ticket to get help from our support team</p>
                </CardContent>
              </Card>
            ) : (
              tickets.map((ticket) => {
                const StatusIcon = statusIcons[ticket.status as keyof typeof statusIcons] || Clock;
                const statusColor = statusColors[ticket.status as keyof typeof statusColors] || "bg-gray-500";
                
                return (
                  <Link key={ticket.id} href={`/support/${ticket.id}`}>
                    <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid={`ticket-card-${ticket.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-lg" data-testid={`ticket-subject-${ticket.id}`}>
                              {ticket.subject}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {categoryLabels[ticket.category as keyof typeof categoryLabels]} • {priorityLabels[ticket.priority as keyof typeof priorityLabels]} priority
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${statusColor}`} />
                            <StatusIcon className="h-4 w-4" />
                            <Badge variant="outline" data-testid={`ticket-status-${ticket.id}`}>
                              {ticket.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {ticket.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Created {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
