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
import { CheckCircle, Clock, MessageCircle, AlertCircle, Ticket, Mail, Home, Wrench, UserCheck, ChevronRight, Search, Sparkles } from "lucide-react";
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

const ROLE_PALETTE: Record<RoleKey, { bg: string; eyebrow: string; tileBg: string }> = {
  homeowner: { bg: '#2d1f6e', eyebrow: '#CECBF6', tileBg: '#534AB7' },
  contractor: { bg: '#0c2461', eyebrow: '#93c5fd', tileBg: '#185FA5' },
  agent:      { bg: '#064e3b', eyebrow: '#6ee7b7', tileBg: '#3B6D11' },
};

const roleConfig: Record<RoleKey, {
  label: string;
  icon: React.ElementType;
  faqs: { question: string; answer: string }[];
  contactCategories: { value: string; label: string }[];
}> = {
  homeowner: {
    label: 'Homeowner',
    icon: Home,
    faqs: [
      { question: "How do I pay a contractor's invoice?", answer: "When a contractor sends you an invoice, you'll receive a payment link via email or can access it directly from your messages. Click the link to view the invoice details and pay securely with your credit card through Stripe. You'll receive a confirmation once payment is complete." },
      { question: "What payment methods are accepted?", answer: "We accept all major credit and debit cards including Visa, Mastercard, American Express, and Discover. Payments are processed securely through Stripe, so your card information is never stored on our servers." },
      { question: "How does the 14-day free trial work?", answer: "All new users get 14 days of free access to all features. After 14 days, you'll need to choose a subscription plan based on the number of properties you manage. You can cancel anytime during the trial with no charge." },
      { question: "What are the homeowner subscription plans?", answer: "We offer three homeowner plans: Base ($5/month for up to 2 homes), Premium ($20/month for 3-6 homes), and Premium Plus ($40/month for 7+ homes). All plans include our referral rewards program and full maintenance tracking." },
      { question: "How do referral rewards work?", answer: "Share your unique referral code with friends. For each person who signs up and maintains an active subscription, you earn $1/month credit toward your subscription. Earn enough referrals and your subscription becomes completely free!" },
      { question: "How do I cancel my subscription?", answer: "Go to Settings > Billing and click 'Cancel Subscription'. Your access will continue until the end of your current billing period. You can reactivate anytime to restore your data." },
      { question: "How do I add a new house to my account?", answer: "Go to the Houses page and click 'Add House'. Fill in your address, climate zone, and home details. Your house will be added to your dashboard where you can track maintenance tasks and service records." },
      { question: "How do I add multiple properties?", answer: "MyHomeBase™ supports multiple properties! Simply go to the Houses page and click 'Add House' for each property. You can switch between properties from your dashboard. Higher subscription tiers support more properties." },
      { question: "What is the Home Wellness Score™?", answer: "Your Home Wellness Score™ is a gamified metric (0-100) based on completed vs. missed maintenance tasks. Complete seasonal tasks to improve your score and unlock achievements. It helps you track how well you're maintaining your property." },
      { question: "How do I find contractors in my area?", answer: "Click 'Find Contractors' from your dashboard or any maintenance task. We'll show you verified contractors within 20 miles of your property who specialize in the service you need. You can view their profiles, ratings, and request quotes directly." },
      { question: "How does the connection code work?", answer: "Your unique 8-character Connection Code lets you securely share your home's service history with contractors. Give your code to a contractor, and they can access your records to provide more accurate quotes. You control who has access and can revoke it anytime." },
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
    faqs: [
      { question: "How do I set up payments to receive money?", answer: "Go to your Profile page and scroll down to 'Payment Settings', or access it through the CRM Billing & Payments tab. Click 'Connect with Stripe' to link your bank account. Once verified, you can accept credit card payments directly through your invoices." },
      { question: "Are there any fees for using MyHomeBase™ payments?", answer: "MyHomeBase™ does not charge any platform fees on payments! You keep 100% of what you charge. Only standard Stripe credit card processing fees apply, which are handled by Stripe directly." },
      { question: "How do contractors receive payments?", answer: "Contractors connect their bank account through Stripe Connect in their profile settings. When a homeowner pays an invoice, the payment goes directly to your connected bank account. You can track all payments in your CRM dashboard." },
      { question: "What's included in the Contractor Basic plan?", answer: "The Basic plan ($20/month) gives you access to your contractor profile, the ability to connect with homeowners, send invoices, and earn referral credits. It's ideal for independent contractors who want a simple, professional presence." },
      { question: "What's included in the Contractor Pro plan?", answer: "The Pro plan ($40/month) includes full CRM access: client management, job scheduling, quotes and invoices, Stripe payment processing, team management, dashboard analytics, and external CRM imports. You also get double the referral credit cap compared to Basic." },
      { question: "How do I import leads from other CRMs?", answer: "In the CRM tab, go to Integrations and set up a webhook connection. We support imports from popular CRMs like Jobber, ServiceTitan, and Housecall Pro. Leads sync automatically once connected, so you never miss a potential customer." },
      { question: "How do I create and send invoices?", answer: "From the CRM Invoices tab, click 'Create Invoice'. Add line items, set the due date, and save. Then click 'Send' to email a payment link to your client. They can pay online with a credit card, and you'll be notified when payment is received." },
      { question: "How do I manage my team?", answer: "Go to the Team tab in your CRM dashboard. You can invite team members by email, assign them roles, and control their access level. Team members can help manage jobs, customers, and scheduling under your account." },
      { question: "How do referral rewards work for contractors?", answer: "Share your unique referral code with homeowners or other contractors. For each person who signs up and maintains an active subscription, you earn $1/month credit. Pro plan contractors earn up to $40/month in credits — enough to make your plan free!" },
      { question: "How do I connect with homeowners?", answer: "Homeowners search for contractors by location and specialty. Keep your profile complete with your services, coverage area, and photos to appear in more searches. You can also receive leads directly when a homeowner uses your connection code." },
      { question: "Is my business data secure?", answer: "Absolutely. All customer data, invoices, and payment details are encrypted and stored securely. Payment processing is handled by Stripe's PCI-compliant system. We never share your business data with third parties." },
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
    faqs: [
      { question: "How does the RE Agent referral program work?", answer: "Sign up as a Real Estate Agent to get a unique referral code and shareable QR code. Share it with homeowners you work with. When they sign up and maintain an active subscription for 4 consecutive months, you earn a $15 referral payout." },
      { question: "When and how do I get paid?", answer: "Referral payouts are processed monthly. Once a referred homeowner completes 4 consecutive months of paid subscription, your $15 commission is queued for payment. Payouts are sent to your registered payment method on the first business day of the following month." },
      { question: "How do I track my referrals?", answer: "Your Agent Dashboard shows all your referrals in real time — pending, active, and paid. You can see each referral's status, how many months they've been subscribed, and your cumulative earnings all in one place." },
      { question: "Is there a limit to how much I can earn?", answer: "There's no cap on your earnings! Every homeowner you refer who meets the 4-month threshold earns you $15. Refer 10 homeowners a month and earn $150/month in passive income — all from clients you're already working with." },
      { question: "How do I share my referral code?", answer: "In your Agent Dashboard, go to the Referrals tab to find your unique code and a downloadable QR code. You can share the code verbally, via email, or print the QR code on business cards and flyers for easy sharing at open houses." },
      { question: "Can I refer other real estate agents?", answer: "The program is currently designed for referring homeowners. If you'd like to refer other agents, reach out to our support team — we'd love to explore partnership opportunities with active agents." },
      { question: "What value does MyHomeBase™ provide to my clients?", answer: "MyHomeBase™ gives homeowners a complete digital record of their home — maintenance history, service records, contractor contacts, and documents. This is a powerful tool for resale: a well-documented home history can increase buyer confidence and transaction value." },
      { question: "How does the home handoff feature work?", answer: "When one of your clients sells, MyHomeBase™ generates a shareable link so the seller can transfer their full home history to the new buyer. This creates a seamless, professional experience at closing and is a great selling point for your listings." },
      { question: "Do I need to pay anything to be an RE Agent affiliate?", answer: "No! Creating a Real Estate Agent account and participating in the referral program is completely free. You earn $15 for every qualified referral with no subscription required on your end." },
      { question: "Is my client data protected?", answer: "Yes. We only collect information directly from homeowners who sign up — we never share your clients' personal data. Your referral dashboard shows only anonymized status information to protect everyone's privacy." },
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

const categoryLabels = {
  billing: "Billing & Payments",
  technical: "Technical Issue",
  feature_request: "Feature Request",
  account: "Account Management",
  contractor: "Contractor Services",
  general: "General Question"
};

const priorityLabels = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };

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

/* ── component ───────────────────────────────────────────── */
export default function SupportPage() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const search = useSearch();
  const initialTab = new URLSearchParams(search).get('tab') || 'faq';

  const userRole = (user as any)?.role as RoleKey | undefined;
  const safeUserRole: RoleKey = userRole && roleConfig[userRole] ? userRole : 'homeowner';

  const [selectedRole, setSelectedRole] = useState<RoleKey>(safeUserRole);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showAllFaqs, setShowAllFaqs] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const palette = ROLE_PALETTE[selectedRole];
  const currentRole = roleConfig[selectedRole];

  const filteredFaqs = searchQuery
    ? currentRole.faqs.filter(
        faq =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentRole.faqs;
  const displayedFaqs = showAllFaqs ? filteredFaqs : filteredFaqs.slice(0, 5);

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<SupportTicket[]>({
    queryKey: ['/api/support/tickets'],
    enabled: isAuthenticated,
  });

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
      setShowTicketForm(false);
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
      toast({ title: "Message Sent!", description: "We'll get back to you within 24-48 hours." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send message.", variant: "destructive" });
    },
  });

  /* ── tile config ── */
  const roleTiles: { key: RoleKey; label: string; icon: React.ElementType }[] = [
    { key: 'homeowner', label: 'Homeowner', icon: Home },
    { key: 'contractor', label: 'Contractor', icon: Wrench },
    { key: 'agent',     label: 'RE Agent',   icon: UserCheck },
  ];

  /* ── render ──────────────────────────────────────────────── */
  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>

      {/* ── HEADER ── */}
      <div className="dash-header" style={{ background: palette.bg }}>
        <span className="dash-eyebrow" style={{ color: palette.eyebrow }}>Help &amp; support</span>
        <div className="dash-title">Support Center</div>
        <div className="dash-subtitle">Get answers or open a ticket with our team</div>

        <div className="dash-chips">
          <div className="dash-chip">
            <div className="dash-chip-num">{currentRole.faqs.length}</div>
            <div className="dash-chip-label">FAQs</div>
          </div>
          <div className="dash-chip">
            <div className="dash-chip-num">{tickets.length}</div>
            <div className="dash-chip-label">My Tickets</div>
          </div>
          <div className="dash-chip">
            <div className="dash-chip-num good">24h</div>
            <div className="dash-chip-label">Response</div>
          </div>
        </div>

        {/* Role tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '7px', marginTop: '4px', paddingBottom: '10px' }}>
          {roleTiles.map(({ key, label, icon: Icon }) => {
            const isActive = selectedRole === key;
            return (
              <button
                key={key}
                onClick={() => { setSelectedRole(key); setShowAllFaqs(false); setExpandedFaq(null); setSearchQuery(''); }}
                data-testid={`role-btn-${key}`}
                style={{
                  background: ROLE_PALETTE[key].tileBg,
                  border: isActive ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
                  borderRadius: '13px',
                  padding: '11px 8px 15px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '7px',
                  cursor: 'pointer',
                  opacity: isActive ? 1 : 0.75,
                  transition: 'opacity 0.15s, border-color 0.15s',
                }}
              >
                <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon style={{ width: 15, height: 15, color: '#fff' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.2, textAlign: 'center' }}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: 600, margin: '0 auto' }}>

        {/* Search */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(83,74,183,0.12)' }}>
          <Search style={{ width: 14, height: 14, color: '#9b97c4', flexShrink: 0 }} />
          <input
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowAllFaqs(true); setExpandedFaq(null); }}
            placeholder="Search FAQs..."
            style={{ background: 'transparent', border: 'none', outline: 'none', flex: 1, fontSize: 13, fontWeight: 500, color: '#2d1f6e' }}
          />
        </div>

        {/* Tab row */}
        <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 12, padding: 3, gap: 2 }}>
          {[
            { key: 'faq',     label: 'FAQs' },
            { key: 'tickets', label: `Tickets (${tickets.length})` },
            { key: 'contact', label: 'Contact' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              data-testid={`tab-${tab.key}`}
              style={{
                flex: 1,
                padding: '8px 6px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
                textAlign: 'center',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === tab.key ? '#fff' : 'transparent',
                color: activeTab === tab.key ? palette.bg : '#9b97c4',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── FAQ TAB ── */}
        {activeTab === 'faq' && (
          <>
            {/* AI assistant card */}
            <div style={{ background: palette.tileBg, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles style={{ width: 16, height: 16, color: '#fff' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: palette.eyebrow, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>AI assistant</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Ask anything about your home</div>
                <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>Instant answers, no waiting</div>
              </div>
              <Link href="/ai-help">
                <button style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 9, padding: '7px 10px', fontSize: 11, fontWeight: 700, color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Ask AI →
                </button>
              </Link>
            </div>

            {/* Section label */}
            <div style={{ fontSize: 10, fontWeight: 700, color: palette.tileBg, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Frequently asked
            </div>

            {/* FAQ card */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(83,74,183,0.1)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(83,74,183,0.08)' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: palette.bg }}>Frequently asked questions</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: palette.tileBg, marginTop: 2, opacity: 0.7 }}>
                  Quick answers about MyHomeBase™ · {currentRole.label}
                </div>
              </div>

              {filteredFaqs.length === 0 ? (
                <div style={{ padding: '20px 14px', textAlign: 'center', color: '#9b97c4', fontSize: 13 }}>
                  No FAQs match your search.
                </div>
              ) : (
                displayedFaqs.map((faq, idx) => (
                  <div key={idx} style={{ borderBottom: idx < displayedFaqs.length - 1 ? '1px solid rgba(83,74,183,0.06)' : 'none' }}>
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                      data-testid={`faq-question-${idx}`}
                      style={{ width: '100%', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color: palette.bg, flex: 1, marginRight: 10, lineHeight: 1.4 }}>{faq.question}</span>
                      <ChevronRight
                        style={{ width: 14, height: 14, color: '#9b97c4', flexShrink: 0, transform: expandedFaq === idx ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                      />
                    </button>
                    {expandedFaq === idx && (
                      <div
                        data-testid={`faq-answer-${idx}`}
                        style={{ padding: '0 14px 14px', fontSize: 12, lineHeight: 1.6, color: palette.bg, opacity: 0.8, background: 'transparent' }}
                      >
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))
              )}

              {filteredFaqs.length > 5 && (
                <div style={{ padding: '10px 14px', textAlign: 'center', borderTop: '1px solid rgba(83,74,183,0.07)' }}>
                  <button
                    onClick={() => { setShowAllFaqs(!showAllFaqs); setExpandedFaq(null); }}
                    style={{ fontSize: 11, fontWeight: 700, color: palette.tileBg, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {showAllFaqs ? `Show fewer FAQs ↑` : `View all ${filteredFaqs.length} FAQs →`}
                  </button>
                </div>
              )}
            </div>

            {/* Still need help? */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(83,74,183,0.08)', padding: 14, textAlign: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: palette.bg, marginBottom: 4 }}>Still need help?</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: palette.tileBg, opacity: 0.7, marginBottom: 12 }}>Our team responds within 24 hours</div>
              <button
                onClick={() => { setActiveTab('tickets'); setShowTicketForm(true); }}
                data-testid="button-create-ticket-from-faq"
                style={{ background: palette.tileBg, borderRadius: 11, padding: '10px 20px', fontSize: 12, fontWeight: 700, color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Open a support ticket
              </button>
            </div>
          </>
        )}

        {/* ── TICKETS TAB ── */}
        {activeTab === 'tickets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!showTicketForm && (
              <button
                onClick={() => setShowTicketForm(true)}
                data-testid="button-create-ticket"
                style={{ background: palette.tileBg, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <MessageCircle style={{ width: 16, height: 16 }} />
                Create New Ticket
              </button>
            )}

            {showTicketForm && (
              <Card style={{ border: '1px solid rgba(83,74,183,0.12)' }}>
                <CardHeader>
                  <CardTitle style={{ color: palette.bg }}>Create Support Ticket</CardTitle>
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
                              {currentRole.contactCategories.map(cat => (
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

                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => { setShowTicketForm(false); form.reset(); }} data-testid="button-cancel">Cancel</Button>
                        <Button type="submit" disabled={createTicketMutation.isPending} style={{ background: palette.tileBg }} data-testid="button-submit-ticket">
                          {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {ticketsLoading ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#9b97c4', fontSize: 13 }}>Loading tickets…</div>
            ) : tickets.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(83,74,183,0.1)', padding: '32px 16px', textAlign: 'center' }}>
                <Ticket style={{ width: 36, height: 36, margin: '0 auto 12px', color: '#c4c1e0' }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: palette.bg, marginBottom: 4 }}>No tickets yet</div>
                <div style={{ fontSize: 12, color: '#9b97c4' }}>Create a ticket to get help from our team</div>
              </div>
            ) : (
              tickets.map(ticket => {
                const StatusIcon = statusIcons[ticket.status as keyof typeof statusIcons] || Clock;
                const statusColor = statusColors[ticket.status as keyof typeof statusColors] || "bg-gray-500";
                return (
                  <Link key={ticket.id} href={`/support/${ticket.id}`}>
                    <div
                      data-testid={`ticket-card-${ticket.id}`}
                      style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(83,74,183,0.1)', padding: '14px', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                        <div data-testid={`ticket-subject-${ticket.id}`} style={{ fontSize: 13, fontWeight: 700, color: '#2d1f6e', flex: 1 }}>{ticket.subject}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <div className={`h-2 w-2 rounded-full ${statusColor}`} />
                          <StatusIcon style={{ width: 13, height: 13, color: '#9b97c4' }} />
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: '#9b97c4' }}>
                        {categoryLabels[ticket.category as keyof typeof categoryLabels]} · {priorityLabels[ticket.priority as keyof typeof priorityLabels]} priority
                      </div>
                      <div style={{ fontSize: 11, color: '#c4c1e0', marginTop: 4 }}>
                        {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ''}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}

        {/* ── CONTACT TAB ── */}
        {activeTab === 'contact' && (
          contactSubmitted ? (
            <Card style={{ border: '1px solid rgba(83,74,183,0.12)' }}>
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: '#f0fdf4' }}>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: palette.bg }}>Message Sent!</h2>
                <p className="mb-6" style={{ color: '#4a3670' }}>We'll review your message and get back to you within 24-48 hours.</p>
                <Button onClick={() => { setContactSubmitted(false); contactForm.reset(); }} style={{ background: palette.tileBg, color: '#fff' }}>
                  Send Another Message
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card style={{ border: '1px solid rgba(83,74,183,0.12)' }}>
              <CardHeader>
                <CardTitle style={{ color: palette.bg }} className="flex items-center gap-2">
                  <Mail className="w-5 h-5" /> Send Us a Message
                </CardTitle>
                <CardDescription>Our team responds within 24-48 hours.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...contactForm}>
                  <form onSubmit={contactForm.handleSubmit(d => contactMutation.mutate(d))} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={contactForm.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Name</FormLabel>
                          <FormControl><Input placeholder="John Smith" {...field} data-testid="input-contact-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={contactForm.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl><Input type="email" placeholder="you@example.com" {...field} data-testid="input-contact-email" /></FormControl>
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
                            {currentRole.contactCategories.map(cat => (
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
                          <Textarea placeholder="Please describe your question or issue in detail..." className="min-h-[150px]" {...field} data-testid="textarea-contact-message" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <Button type="submit" className="w-full text-white" style={{ background: palette.tileBg }} disabled={contactMutation.isPending} data-testid="button-contact-submit">
                      {contactMutation.isPending ? 'Sending…' : 'Send Message'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )
        )}

      </div>
    </div>
  );
}
