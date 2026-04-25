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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, Clock, MessageCircle, AlertCircle, Ticket, Mail, Home, Wrench, UserCheck, Search, Sparkles, ChevronDown } from "lucide-react";
import { Link, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import "./home.css";

/* ── schemas ─────────────────────────────────────────────── */
const ticketFormSchema = insertSupportTicketSchema.extend({
  category: z.enum(['billing', 'technical', 'feature_request', 'account', 'contractor', 'general']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters").max(5000),
}).omit({ userId: true });
type TicketFormData = z.infer<typeof ticketFormSchema>;

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  category: z.enum(['billing', 'technical', 'feature_request', 'account', 'contractor', 'general']),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});
type ContactFormData = z.infer<typeof contactFormSchema>;

/* ── role config ─────────────────────────────────────────── */
type RoleKey = 'homeowner' | 'contractor' | 'agent';

const ROLES: Record<RoleKey, {
  label: string;
  icon: React.ElementType;
  dark: string;
  mid: string;
  bright: string;
  light: string;
  tint: string;
  border: string;
  text: string;
  tag: string;
  greeting: string;
  sub: string;
  faqs: { q: string; a: string }[];
  contactCategories: { value: string; label: string }[];
}> = {
  homeowner: {
    label: 'Homeowner',
    icon: Home,
    dark:    '#2C0F5B',
    mid:     '#3C258E',
    bright:  '#3798EF',
    light:   '#B6A6F4',
    tint:    '#EEEDFE',
    border:  '#CECBF6',
    text:    '#3C3489',
    tag:     'My Home',
    greeting: 'How can we help you with your home?',
    sub:      'Search FAQs, open a ticket, or chat with our AI assistant.',
    faqs: [
      { q: "How is my Home Wellness Score™ calculated?", a: "Your Home Wellness Score™ starts at 1,000 points and depreciates based on the age of your home systems (HVAC, roof, plumbing, etc.), overdue maintenance tasks, and completed repairs. Staying on top of tasks keeps your score healthy." },
      { q: "How do I add a property to my account?", a: "Go to your Dashboard and tap 'Add Property.' Enter your address and your HIN™ (Home Identification Number) will be generated automatically. You can manage up to 2 properties on the Base Plan." },
      { q: "What is the DIY Savings Tracker?", a: "Every time you complete a maintenance task yourself instead of hiring a contractor, the estimated contractor cost is logged as savings. It's a running total of money you've kept in your pocket." },
      { q: "Can I share my home records with a buyer or agent?", a: "Yes. From your Records tab, tap 'Generate Report' to create a shareable Home Wellness Report. This is one of the most valuable features when selling your home." },
      { q: "How do I connect with a contractor through the app?", a: "Navigate to the Contractor Directory, filter by trade and distance, and tap 'Connect.' The contractor receives a notification and can respond through the platform." },
      { q: "What happens to my data if I cancel my subscription?", a: "Your home records are retained for 90 days after cancellation. You can export a full PDF report at any time from your Account settings before canceling." },
      { q: "What are the homeowner subscription plans?", a: "We offer three homeowner plans: Base ($5/month for up to 2 homes), Premium ($20/month for 3-6 homes), and Premium Plus ($40/month for 7+ homes). All plans include our referral rewards program and full maintenance tracking." },
      { q: "How do referral rewards work?", a: "Share your unique referral code with friends. For each person who signs up and maintains an active subscription, you earn $1/month credit toward your subscription. Earn enough referrals and your subscription becomes completely free!" },
      { q: "How do I cancel my subscription?", a: "Go to Settings > Billing and click 'Cancel Subscription'. Your access will continue until the end of your current billing period. You can reactivate anytime to restore your data." },
      { q: "How do I find contractors in my area?", a: "Click 'Find Contractors' from your dashboard or any maintenance task. We'll show you verified contractors within 20 miles of your property who specialize in the service you need. You can view their profiles, ratings, and request quotes directly." },
    ],
    contactCategories: [
      { value: 'general', label: 'General Inquiry' },
      { value: 'billing', label: 'Billing & Payments' },
      { value: 'technical', label: 'Technical Issue' },
      { value: 'account', label: 'Account Help' },
      { value: 'contractor', label: 'Contractor Services' },
      { value: 'feature_request', label: 'Feature Request' },
    ],
  },
  contractor: {
    label: 'Contractor',
    icon: Wrench,
    dark:    '#0C3460',
    mid:     '#1560A2',
    bright:  '#3798EF',
    light:   '#AFD6F9',
    tint:    '#E6F1FB',
    border:  '#B5D4F4',
    text:    '#0C447C',
    tag:     'Pro Portal',
    greeting: 'Contractor support, built for the trades.',
    sub:      'Get help with your Pro account, leads, and billing.',
    faqs: [
      { q: "How do homeowners find my profile in the directory?", a: "Your profile appears in the Contractor Directory filtered by trade category and geographic radius. Homeowners search by service type and location — keeping your profile complete and your response rate high improves your ranking." },
      { q: "How does the referral program work for contractors?", a: "Every homeowner you refer to MyHomeBase™ reduces your $20/month subscription by $1. Refer 20 homeowners and your subscription is completely free for as long as they remain paid subscribers." },
      { q: "How do I receive and respond to job requests?", a: "When a homeowner connects with you through the directory, you'll receive a push notification and in-app message. You can accept, decline, or send a quote directly through the platform." },
      { q: "Can I track my service history with homeowners?", a: "Yes. Every completed job logged through the platform is stored in both your Pro record and the homeowner's maintenance history. This builds your verified track record over time." },
      { q: "What does 'Verified Badge' mean and how do I get one?", a: "The Verified Badge indicates your license, insurance, and identity have been confirmed by MyHomeBase™. Submit your credentials in your Profile settings and our team reviews within 48 hours." },
      { q: "How do I update my service area and trade categories?", a: "Go to your Profile → Services & Coverage. You can set a radius in miles from your base location and select up to 10 trade categories." },
      { q: "How do I create and send invoices?", a: "From the CRM Invoices tab, click 'Create Invoice'. Add line items, set the due date, and save. Then click 'Send' to email a payment link to your client. They can pay online with a credit card, and you'll be notified when payment is received." },
      { q: "Are there any fees for using MyHomeBase™ payments?", a: "MyHomeBase™ does not charge any platform fees on payments! You keep 100% of what you charge. Only standard Stripe credit card processing fees apply, which are handled by Stripe directly." },
      { q: "How do I import leads from other CRMs?", a: "In the CRM tab, go to Integrations and set up a webhook connection. We support imports from popular CRMs like Jobber, ServiceTitan, and Housecall Pro. Leads sync automatically once connected." },
      { q: "How do I manage my team?", a: "Go to the Team tab in your CRM dashboard. You can invite team members by email, assign them roles, and control their access level. Team members can help manage jobs, customers, and scheduling under your account." },
    ],
    contactCategories: [
      { value: 'general', label: 'General Inquiry' },
      { value: 'billing', label: 'Billing & Payments' },
      { value: 'technical', label: 'Technical Issue' },
      { value: 'account', label: 'Account Help' },
      { value: 'contractor', label: 'CRM & Tools' },
      { value: 'feature_request', label: 'Feature Request' },
    ],
  },
  agent: {
    label: 'RE Agent',
    icon: UserCheck,
    dark:    '#09694A',
    mid:     '#079669',
    bright:  '#22C55E',
    light:   '#D4EBDE',
    tint:    '#F0FAF4',
    border:  '#A7D7B8',
    text:    '#065F46',
    tag:     'Agent Hub',
    greeting: 'Support for real estate professionals.',
    sub:      'Get help with listings, Home Wellness Reports, and your agent account.',
    faqs: [
      { q: "How do I access a home's Wellness Report for a listing?", a: "If the homeowner has shared their report with you, it appears under your Agent Hub → Shared Reports. You can also request access directly from a homeowner by sending them a report share request through the platform." },
      { q: "Can I use Home Wellness Reports in my listing marketing?", a: "Yes. A strong Home Wellness Score™ is a powerful differentiator in listings. You can embed the score badge and link to the shareable report in your MLS listings, property websites, and marketing materials." },
      { q: "How does MyHomeBase help with buyer confidence?", a: "Buyers can see a verified, time-stamped maintenance history for a property — similar to a Carfax report for a car. This reduces inspection anxiety and can accelerate time to close." },
      { q: "Can I recommend MyHomeBase to my seller clients?", a: "Absolutely — and we encourage it. Sellers who build a strong Home Wellness Score™ before listing typically command higher offers and smoother inspections. Share your agent referral link from your Agent Hub." },
      { q: "Is there a commission or referral fee for agents?", a: "Yes. When a homeowner signs up through your referral link and becomes a paid subscriber, you receive a referral credit. Details are in your Agent Hub under Referrals & Earnings." },
      { q: "How do I add multiple listings to track?", a: "From your Agent Hub dashboard, tap 'Add Listing' and enter the property address. If the homeowner is already on MyHomeBase™, you can request to link to their existing account." },
      { q: "How does the RE Agent referral program work?", a: "Sign up as a Real Estate Agent to get a unique referral code and shareable QR code. Share it with homeowners you work with. When they sign up and maintain an active subscription for 4 consecutive months, you earn a $15 referral payout." },
      { q: "When and how do I get paid?", a: "Referral payouts are processed monthly. Once a referred homeowner completes 4 consecutive months of paid subscription, your $15 commission is queued for payment. Payouts are sent to your registered payment method on the first business day of the following month." },
      { q: "Is there a limit to how much I can earn?", a: "There's no cap on your earnings! Every homeowner you refer who meets the 4-month threshold earns you $15. Refer 10 homeowners a month and earn $150/month in passive income — all from clients you're already working with." },
      { q: "Do I need to pay anything to be an RE Agent affiliate?", a: "No! Creating a Real Estate Agent account and participating in the referral program is completely free. You earn $15 for every qualified referral with no subscription required on your end." },
    ],
    contactCategories: [
      { value: 'general', label: 'General Inquiry' },
      { value: 'billing', label: 'Payouts & Earnings' },
      { value: 'technical', label: 'Technical Issue' },
      { value: 'account', label: 'Account Help' },
      { value: 'contractor', label: 'Referral Program' },
      { value: 'feature_request', label: 'Feature Request' },
    ],
  },
};

const priorityLabels = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
const categoryLabels = {
  billing: "Billing & Payments",
  technical: "Technical Issue",
  feature_request: "Feature Request",
  account: "Account Management",
  contractor: "Contractor Services",
  general: "General Question"
};
const statusIcons = {
  open: Clock,
  in_progress: MessageCircle,
  waiting_on_customer: AlertCircle,
  resolved: CheckCircle,
  closed: CheckCircle
};
const statusColors = {
  open: "#3798EF",
  in_progress: "#f59e0b",
  waiting_on_customer: "#f97316",
  resolved: "#22c55e",
  closed: "#9ca3af"
};

/* ── FAQ item ─────────────────────────────────────────────── */
function FaqItem({ q, a, r, index }: { q: string; a: string; r: typeof ROLES[RoleKey]; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      data-testid={`faq-question-${index}`}
      style={{
        borderRadius: 12, overflow: 'hidden',
        border: `0.5px solid ${open ? r.border : 'rgba(0,0,0,0.08)'}`,
        background: open ? r.tint : '#fff',
        transition: 'all 0.2s',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '14px 16px', background: 'transparent',
          border: 'none', cursor: 'pointer', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', gap: 12,
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a2e', lineHeight: 1.4 }}>{q}</span>
        <span style={{
          color: r.mid, flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s',
          display: 'flex',
        }}>
          <ChevronDown style={{ width: 14, height: 14 }} />
        </span>
      </button>
      {open && (
        <div
          data-testid={`faq-answer-${index}`}
          style={{ padding: '0 16px 14px', fontSize: 13, color: '#4a5568', lineHeight: 1.7 }}
        >
          {a}
        </div>
      )}
    </div>
  );
}

/* ── component ───────────────────────────────────────────── */
export default function SupportPage() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const userRole = (user as any)?.role as RoleKey | undefined;
  const selectedRole: RoleKey = userRole && ROLES[userRole] ? userRole : 'homeowner';

  const [activeTab, setActiveTab] = useState('faqs');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const r = ROLES[selectedRole];

  const filteredFaqs = r.faqs.filter(f =>
    f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<SupportTicket[]>({
    queryKey: ['/api/support/tickets'],
    enabled: isAuthenticated,
  });

  const handleAsk = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    try {
      const res = await fetch('/api/support/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: aiInput, role: selectedRole }),
      });
      const data = await res.json();
      setAiResponse(data.answer || "I couldn't find an answer. Please open a support ticket and our team will help you shortly.");
    } catch {
      setAiResponse("Something went wrong. Please try again or open a support ticket.");
    } finally {
      setAiLoading(false);
    }
  };

  /* ── ticket form ── */
  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: { category: 'general', priority: 'medium', subject: '', description: '' },
  });

  const createTicketMutation = useMutation({
    mutationFn: (data: TicketFormData) => apiRequest('/api/support/tickets', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets'] });
      toast({ title: "Ticket created", description: "Our team will respond shortly." });
      form.reset();
      setActiveTab('tickets');
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create ticket", variant: "destructive" });
    },
  });

  /* ── contact form ── */
  const contactForm = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: user ? `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() : '',
      email: (user as any)?.email || '',
      category: 'general',
      subject: '',
      message: '',
    },
  });

  const contactMutation = useMutation({
    mutationFn: (data: ContactFormData) => {
      if (isAuthenticated) {
        return apiRequest('/api/support/tickets', 'POST', {
          category: data.category,
          priority: 'medium',
          subject: data.subject,
          description: `From: ${data.name} (${data.email})\n\n${data.message}`,
        });
      }
      return apiRequest('/api/contact', 'POST', data);
    },
    onSuccess: () => {
      setContactSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send message.", variant: "destructive" });
    },
  });

  const tabs = ['faqs', 'tickets', 'contact'] as const;
  const tabLabels: Record<string, string> = {
    faqs: 'FAQs',
    tickets: `Tickets${tickets.length > 0 ? ` (${tickets.length})` : ''}`,
    contact: 'Contact',
  };

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>

      {/* ── HEADER ── */}
      <div style={{
        background: `linear-gradient(160deg, ${r.dark} 0%, ${r.mid} 100%)`,
        padding: '16px 18px 0',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 160, height: 160, borderRadius: '50%',
          background: `radial-gradient(circle, ${r.bright}30 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: r.light, marginBottom: 5 }}>Help &amp; Support</span>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px', lineHeight: 1.15, marginBottom: 4 }}>Support Center</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 18 }}>{r.greeting}</div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 8, paddingBottom: 18 }}>
          {[
            { val: r.faqs.length, label: 'FAQs' },
            { val: tickets.length, label: 'My Tickets' },
            { val: '24h', label: 'Response', accent: true },
          ].map(({ val, label, accent }) => (
            <div key={label} style={{
              flex: 1, background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 13, padding: '10px 14px',
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: accent ? r.light : '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 0 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
            <Search style={{ width: 16, height: 16 }} />
          </span>
          <input
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setActiveTab('faqs'); }}
            placeholder="Search FAQs..."
            style={{
              width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px 12px 0 0',
              border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.12)',
              color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: '0 18px 32px', maxWidth: 600, margin: '0 auto' }}>

        {/* AI Assistant */}
        <div style={{
          background: `linear-gradient(135deg, ${r.dark}, ${r.mid})`,
          borderRadius: '0 0 14px 14px', padding: '14px 16px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ color: r.light, display: 'flex' }}><Sparkles style={{ width: 16, height: 16 }} /></span>
            <div>
              <p style={{ fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: r.light, margin: 0 }}>AI Assistant</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#fff', margin: 0 }}>Ask anything about your {r.label.toLowerCase()} account</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
              placeholder="Type your question..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.15)',
                color: '#fff', fontSize: 13, outline: 'none',
              }}
            />
            <button
              onClick={handleAsk}
              style={{
                padding: '10px 16px', borderRadius: 8, border: 'none',
                background: r.light, color: r.dark, fontSize: 13,
                fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              }}
            >
              {aiLoading ? '...' : 'Ask →'}
            </button>
          </div>
          {aiResponse && (
            <div style={{
              marginTop: 12, padding: 12, borderRadius: 8,
              background: 'rgba(255,255,255,0.12)', fontSize: 13,
              color: 'rgba(255,255,255,0.9)', lineHeight: 1.6,
            }}>
              {aiResponse}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: '#fff', borderRadius: 10,
          padding: 3, marginBottom: 16, border: `0.5px solid ${r.border}`,
        }}>
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              data-testid={`tab-${t}`}
              style={{
                flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: activeTab === t ? r.mid : 'transparent',
                color: activeTab === t ? '#fff' : '#6b7280',
                fontSize: 12, fontWeight: activeTab === t ? 600 : 400,
                transition: 'all 0.2s',
              }}
            >
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {/* ── FAQs TAB ── */}
        {activeTab === 'faqs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 6px' }}>
              {searchQuery
                ? `${filteredFaqs.length} result${filteredFaqs.length !== 1 ? 's' : ''} for "${searchQuery}"`
                : 'Frequently Asked'}
            </p>
            {filteredFaqs.length > 0
              ? filteredFaqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} r={r} index={i} />)
              : (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  No FAQs match your search.{' '}
                  <button
                    onClick={() => setActiveTab('tickets')}
                    style={{ color: r.mid, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Open a ticket →
                  </button>
                </div>
              )
            }

            {/* Still need help */}
            <div style={{
              marginTop: 8, background: '#fff', borderRadius: 14,
              border: `0.5px solid ${r.border}`, padding: '16px 14px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: r.dark, marginBottom: 4 }}>Still need help?</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>Our team responds within 24 hours</div>
              <button
                onClick={() => setActiveTab('tickets')}
                data-testid="button-create-ticket-from-faq"
                style={{
                  background: `linear-gradient(135deg, ${r.dark}, ${r.mid})`,
                  borderRadius: 10, padding: '10px 20px', fontSize: 12, fontWeight: 700,
                  color: '#fff', border: 'none', cursor: 'pointer',
                }}
              >
                Open a support ticket
              </button>
            </div>
          </div>
        )}

        {/* ── TICKETS TAB ── */}
        {activeTab === 'tickets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Card style={{ border: `0.5px solid ${r.border}` }}>
              <CardHeader>
                <CardTitle style={{ color: r.dark }}>Create Support Ticket</CardTitle>
                <CardDescription>Describe your issue and our support team will help you shortly</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(d => createTicketMutation.mutate(d))} className="space-y-4">
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category"><SelectValue placeholder="Select a category" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {r.contactCategories.map(cat => (
                              <SelectItem key={cat.value} value={cat.value} data-testid={`category-${cat.value}`}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="priority" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-priority"><SelectValue placeholder="Select priority" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(priorityLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value} data-testid={`priority-${value}`}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="subject" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Brief description of your issue" data-testid="input-subject" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Please provide as much detail as possible..." className="min-h-[120px]" data-testid="textarea-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <Button
                      type="submit"
                      className="w-full text-white"
                      disabled={createTicketMutation.isPending}
                      style={{ background: `linear-gradient(135deg, ${r.dark}, ${r.mid})` }}
                      data-testid="button-submit-ticket"
                    >
                      {createTicketMutation.isPending ? "Creating..." : "Submit Ticket →"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Existing tickets */}
            {ticketsLoading ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: r.light, fontSize: 13 }}>Loading tickets…</div>
            ) : tickets.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 14, border: `0.5px solid ${r.border}`, padding: '32px 16px', textAlign: 'center' }}>
                <Ticket style={{ width: 36, height: 36, margin: '0 auto 12px', color: r.border }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: r.dark, marginBottom: 4 }}>No tickets yet</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>Submit a ticket above to get help from our team</div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: '#9ca3af', margin: '4px 0 8px' }}>Your Tickets</p>
                {tickets.map(ticket => {
                  const StatusIcon = statusIcons[ticket.status as keyof typeof statusIcons] || Clock;
                  const statusColor = statusColors[ticket.status as keyof typeof statusColors] || '#9ca3af';
                  return (
                    <Link key={ticket.id} href={`/support/${ticket.id}`}>
                      <div
                        data-testid={`ticket-card-${ticket.id}`}
                        style={{
                          background: '#fff', borderRadius: 12, border: `0.5px solid ${r.border}`,
                          padding: 14, cursor: 'pointer', marginBottom: 8,
                          transition: 'border-color 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                          <div data-testid={`ticket-subject-${ticket.id}`} style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', flex: 1 }}>{ticket.subject}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
                            <StatusIcon style={{ width: 13, height: 13, color: '#9ca3af' }} />
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>
                          {categoryLabels[ticket.category as keyof typeof categoryLabels]} · {priorityLabels[ticket.priority as keyof typeof priorityLabels]} priority
                        </div>
                        <div style={{ fontSize: 11, color: '#d1d5db', marginTop: 4 }}>
                          {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ''}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CONTACT TAB ── */}
        {activeTab === 'contact' && (
          contactSubmitted ? (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              background: r.tint, borderRadius: 16, border: `0.5px solid ${r.border}`,
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: r.text, margin: '0 0 6px' }}>Message sent!</p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>We'll respond within 24–48 hours.</p>
              <button
                onClick={() => { setContactSubmitted(false); contactForm.reset(); }}
                style={{
                  background: `linear-gradient(135deg, ${r.dark}, ${r.mid})`,
                  color: '#fff', border: 'none', borderRadius: 10,
                  padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <Card style={{ border: `0.5px solid ${r.border}` }}>
              <CardHeader>
                <CardTitle style={{ color: r.dark }} className="flex items-center gap-2">
                  <Mail className="w-5 h-5" /> Send Us a Message
                </CardTitle>
                <CardDescription>Our team responds within 24–48 hours.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...contactForm}>
                  <form onSubmit={contactForm.handleSubmit(d => contactMutation.mutate(d))} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={contactForm.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Name</FormLabel>
                          <FormControl><Input placeholder="Jane Smith" {...field} data-testid="input-contact-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={contactForm.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl><Input type="email" placeholder="jane@email.com" {...field} data-testid="input-contact-email" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={contactForm.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-contact-category"><SelectValue placeholder="Select a category" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {r.contactCategories.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={contactForm.control} name="subject" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl><Input placeholder="Brief description of your inquiry" {...field} data-testid="input-contact-subject" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={contactForm.control} name="message" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe your question or issue..." className="min-h-[130px]" {...field} data-testid="textarea-contact-message" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <Button
                      type="submit"
                      className="w-full text-white"
                      style={{ background: `linear-gradient(135deg, ${r.dark}, ${r.mid})` }}
                      disabled={contactMutation.isPending}
                      data-testid="button-contact-submit"
                    >
                      {contactMutation.isPending ? 'Sending…' : 'Send Message →'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )
        )}

        {/* Contact info strip */}
        {activeTab === 'contact' && !contactSubmitted && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {[
              { icon: '📧', label: 'Email Support', val: 'gotohomebase2025@gmail.com', sub: 'Response within 24 hours' },
              { icon: '💬', label: 'Live Chat', val: 'Available 9am–6pm EST', sub: 'Mon–Fri' },
            ].map(({ icon, label, val, sub }) => (
              <div key={label} style={{
                background: '#fff', borderRadius: 12, border: `0.5px solid ${r.border}`,
                padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: r.dark, margin: 0 }}>{label}</p>
                  <p style={{ fontSize: 11, color: r.mid, margin: '2px 0 0' }}>{val}</p>
                  <p style={{ fontSize: 10, color: '#9ca3af', margin: '2px 0 0' }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
