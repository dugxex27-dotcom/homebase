import { useState } from "react";
import "./home.css";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  category: z.enum(['billing', 'technical', 'feature_request', 'account', 'contractor', 'general']),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function Contact() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: user ? `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() : '',
      email: (user as any)?.email || '',
      category: 'general',
      subject: '',
      message: '',
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      if (isAuthenticated) {
        const response = await apiRequest('/api/support/tickets', 'POST', {
          category: data.category,
          priority: 'medium',
          subject: data.subject,
          description: `From: ${data.name} (${data.email})\n\n${data.message}`,
        });
        return response.json();
      } else {
        const response = await apiRequest('/api/contact', 'POST', data);
        return response.json();
      }
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Message Sent!",
        description: "We've received your message and will get back to you soon.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContactFormData) => {
    submitMutation.mutate(data);
  };

  if (submitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--page-background)' }}>
        <div className="dash-header">
          <div className="dash-header-top" style={{ marginBottom: 0 }}>
            <span className="dash-eyebrow">Support</span>
          </div>
          <p className="dash-title">Contact Us</p>
          <p className="dash-subtitle">We're here to help.</p>
        </div>
        <div style={{ flex: 1, padding: '24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            border: '0.5px solid var(--gray-200, #E5E7EB)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            padding: '40px 28px',
            width: '100%',
            maxWidth: 520,
            textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#F0FAF4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <CheckCircle size={28} color="var(--green, #079669)" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--purple-deep, #2C0F5B)', marginBottom: 8 }}>
              Message Sent!
            </h2>
            <p style={{ fontSize: 14, color: 'var(--gray-600, #4B5563)', marginBottom: 24, lineHeight: 1.5 }}>
              Thank you for reaching out. We'll review your message and get back to you within 24–48 hours.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                background: 'linear-gradient(135deg, var(--hw-primary, #2C0F5B), var(--hw-accent, #3C258E))',
                color: '#fff', border: 'none', borderRadius: 12,
                padding: '11px 28px', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--page-background)' }}>
      {/* ── Gradient header ── */}
      <div className="dash-header">
        <div className="dash-header-top" style={{ marginBottom: 0 }}>
          <span className="dash-eyebrow">Support</span>
        </div>
        <p className="dash-title">Contact Us</p>
        <p className="dash-subtitle">Have a question or need help? Send us a message.</p>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, padding: '20px 20px 32px' }}>
        <div style={{
          background: '#fff',
          borderRadius: 16,
          border: '0.5px solid var(--gray-200, #E5E7EB)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          maxWidth: 640,
          margin: '0 auto',
        }}>
          {/* Card header */}
          <div style={{
            padding: '18px 22px 14px',
            borderBottom: '1px solid var(--gray-200, #E5E7EB)',
          }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--purple-deep, #2C0F5B)', margin: 0 }}>
              Send a Message
            </p>
            <p style={{ fontSize: 13, color: 'var(--gray-600, #4B5563)', margin: '4px 0 0' }}>
              Fill out the form below and our team will respond within 24–48 hours.
            </p>
          </div>

          {/* Form */}
          <div style={{ padding: '20px 22px 24px' }}>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple-deep, #2C0F5B)' }}>Your Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} data-testid="input-contact-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple-deep, #2C0F5B)' }}>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} data-testid="input-contact-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple-deep, #2C0F5B)' }}>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-contact-category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">General Inquiry</SelectItem>
                          <SelectItem value="billing">Billing &amp; Payments</SelectItem>
                          <SelectItem value="technical">Technical Issue</SelectItem>
                          <SelectItem value="account">Account Help</SelectItem>
                          <SelectItem value="contractor">Contractor Services</SelectItem>
                          <SelectItem value="feature_request">Feature Request</SelectItem>
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
                      <FormLabel style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple-deep, #2C0F5B)' }}>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of your inquiry" {...field} data-testid="input-contact-subject" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple-deep, #2C0F5B)' }}>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please describe your question or issue in detail..."
                          style={{ minHeight: 140 }}
                          {...field}
                          data-testid="textarea-contact-message"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <button
                  type="submit"
                  disabled={submitMutation.isPending}
                  data-testid="button-contact-submit"
                  style={{
                    background: submitMutation.isPending
                      ? '#9090b0'
                      : 'linear-gradient(135deg, var(--hw-primary, #2C0F5B), var(--hw-accent, #3C258E))',
                    color: '#fff', border: 'none', borderRadius: 12,
                    padding: '12px', fontSize: 14, fontWeight: 600,
                    cursor: submitMutation.isPending ? 'not-allowed' : 'pointer',
                    width: '100%', fontFamily: 'inherit',
                    transition: 'opacity .15s',
                  }}
                >
                  {submitMutation.isPending ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            </Form>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--gray-600, #4B5563)', marginTop: 20 }}>
          Already have an account?{' '}
          <a href="/support" style={{ color: 'var(--purple, #3C258E)', fontWeight: 600, textDecoration: 'none' }}>
            Visit the Help Center
          </a>
        </p>
      </div>
    </div>
  );
}
