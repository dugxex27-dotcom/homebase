import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Users, DollarSign, TrendingUp, CheckCircle, Clock, XCircle, AlertCircle, ArrowRight, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import QRCode from "qrcode";
import type { User as UserType } from "@shared/schema";
import "./home.css";

interface AgentProfile {
  id: string;
  userId: string;
  commissionRate: number;
  stripeAccountId: string | null;
  stripeConnectAccountId: string | null;
  stripeOnboardingComplete: boolean;
}

interface StripeConnectStatus {
  connected: boolean;
  accountId?: string;
  onboardingComplete: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted?: boolean;
}

interface AgentPayout {
  id: string;
  affiliateReferralId: string;
  agentId: string;
  amount: string;
  status: string;
  stripeTransferId: string | null;
  errorMessage: string | null;
  paidAt: string | null;
  createdAt: string;
  refereeName: string;
}

interface AgentReferral {
  id: string;
  agentId: string;
  referredUserId: string;
  status: string;
  consecutiveMonthsPaid: number;
  signupDate: string;
  trialEndDate: string;
  refereeName: string;
  refereeEmail: string;
}

interface AgentStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  nextPayoutDate: string | null;
}

export default function AgentDashboard() {
  const { user } = useAuth();
  const typedUser = user as UserType | undefined;
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [location] = useLocation();

  // Check for Stripe success/refresh query params
  useEffect(() => {
    if (location.includes('stripe_success=true')) {
      toast({
        title: "Stripe Connected!",
        description: "Your bank account has been successfully connected. You're ready to receive payouts!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/stripe-connect/status"] });
    } else if (location.includes('stripe_refresh=true')) {
      toast({
        title: "Continue Setup",
        description: "Please complete your Stripe Connect onboarding to receive payouts.",
        variant: "destructive",
      });
    }
  }, [location, toast]);

  const { data: profile } = useQuery<AgentProfile>({
    queryKey: ["/api/agent/profile"],
    enabled: !!typedUser,
  });

  const { data: referrals = [] } = useQuery<AgentReferral[]>({
    queryKey: ["/api/agent/referrals"],
    enabled: !!typedUser,
  });

  const { data: stats } = useQuery<AgentStats>({
    queryKey: ["/api/agent/stats"],
    enabled: !!typedUser,
  });

  const { data: verificationStatus } = useQuery<{ verificationStatus: string; reviewNotes?: string }>({
    queryKey: ["/api/agent/verification-status"],
    enabled: !!typedUser,
  });

  const { data: stripeStatus } = useQuery<StripeConnectStatus>({
    queryKey: ["/api/agent/stripe-connect/status"],
    enabled: !!typedUser,
  });

  const { data: payouts = [] } = useQuery<AgentPayout[]>({
    queryKey: ["/api/agent/payouts"],
    enabled: !!typedUser,
  });

  const connectStripeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/agent/stripe-connect/create-account", "POST");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to start Stripe Connect onboarding",
        variant: "destructive",
      });
    },
  });

  if (!typedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary mb-2">Loading...</div>
        </div>
      </div>
    );
  }

  const referralUrl = `${window.location.origin}/signin?ref=${typedUser.referralCode || ''}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
  };

  const handleShareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join MyHomeBase™",
          text: "Use my referral code to join MyHomeBase™!",
          url: referralUrl,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      handleCopyLink();
    }
  };

  const generateQRCode = async () => {
    try {
      const url = await QRCode.toDataURL(referralUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#059669',
          light: '#ffffff',
        },
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F0FAF4] text-[#09694A]">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'trial':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E6F1FB] text-[#1560A2]">
            <Clock className="w-3 h-3 mr-1" />
            Trial
          </span>
        );
      case 'voided':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Voided
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div>

      {/* ── DASH HEADER ─────────────────────────── */}
      <div className="dash-header" style={{ background: 'linear-gradient(135deg, #09694A 0%, #079669 100%)' }}>
        <span className="dash-eyebrow" style={{ color: '#D4EBDE' }}>REAL ESTATE AGENT</span>
        <div className="dash-title">Agent Dashboard</div>
        <div className="dash-subtitle">Track your referrals and earnings</div>
        <div className="dash-chips">
          <div className="dash-chip">
            <div className={`dash-chip-num${(stats?.totalReferrals || 0) > 0 ? ' good' : ''}`}>{stats?.totalReferrals || 0}</div>
            <div className="dash-chip-label">Total Referrals</div>
          </div>
          <div className="dash-chip">
            <div className={`dash-chip-num${(stats?.activeReferrals || 0) > 0 ? ' good' : ''}`}>{stats?.activeReferrals || 0}</div>
            <div className="dash-chip-label">Active</div>
          </div>
          <div className="dash-chip">
            <div className={`dash-chip-num${(stats?.totalEarnings || 0) > 0 ? ' good' : ''}`}>${(stats?.totalEarnings || 0).toFixed(0)}</div>
            <div className="dash-chip-label">Total Earned</div>
          </div>
          <div className="dash-chip">
            <div className={`dash-chip-num${(stats?.pendingEarnings || 0) > 0 ? ' warn' : ''}`}>${(stats?.pendingEarnings || 0).toFixed(0)}</div>
            <div className="dash-chip-label">Pending</div>
          </div>
        </div>
      </div>

      <div className="dash-body">

        {/* Verification Banner */}
        {verificationStatus?.verificationStatus !== 'approved' && (
          <div style={{ background: '#FEF9C3', border: '0.5px solid #FCD34D', borderRadius: 12, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <AlertCircle size={18} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>Verification Required</div>
              <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
                {verificationStatus?.verificationStatus === 'pending_review'
                  ? 'Your verification is under review. You\'ll be able to earn commissions once approved.'
                  : verificationStatus?.verificationStatus === 'rejected' || verificationStatus?.verificationStatus === 'resubmit_required'
                    ? 'Your verification was rejected. Please resubmit your information.'
                    : 'Verify your real estate license to start earning referral commissions.'}
              </div>
            </div>
            <Link href="/agent-account">
              <span style={{ fontSize: 12, fontWeight: 600, color: '#09694A', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {verificationStatus?.verificationStatus === 'pending_review' ? 'View Status →' : 'Get Verified →'}
              </span>
            </Link>
          </div>
        )}

        {/* Referral Hero Card */}
        <Link href="/agent-referral" className="ai-coach-card" style={{ background: 'linear-gradient(135deg, #09694A, #079669)' }}>
          <div className="ai-coach-icon"><TrendingUp size={18} /></div>
          <div className="ai-coach-copy">
            <div className="ai-coach-eyebrow" style={{ color: '#D4EBDE' }}>Referral Program</div>
            <div className="ai-coach-title">Grow your referral income</div>
            <div className="ai-coach-sub">Share your link and earn $15/referral</div>
          </div>
          <button className="ai-coach-btn" onClick={e => e.preventDefault()}>Share →</button>
        </Link>

        {/* Referral Link */}
        <span className="dash-section-label">Your Referral Link</span>
        <div className="dash-light-card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <input
              type="text"
              value={referralUrl}
              readOnly
              style={{ flex: 1, minWidth: 0, padding: '8px 12px', border: '0.5px solid var(--gray-200)', borderRadius: 8, fontSize: 12, background: 'var(--gray-100)', color: 'var(--gray-600)', fontFamily: 'inherit' }}
              data-testid="input-referral-link"
            />
            <button
              onClick={handleCopyLink}
              style={{ flexShrink: 0, background: '#F0FAF4', color: '#09694A', border: '0.5px solid #A7D7B8', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              data-testid="button-copy-link"
            >Copy</button>
            <button
              onClick={handleShareLink}
              style={{ flexShrink: 0, background: '#F0FAF4', color: '#09694A', border: '0.5px solid #A7D7B8', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              data-testid="button-share-link"
            >Share</button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={generateQRCode}
              style={{ background: '#F0FAF4', color: '#09694A', border: '0.5px solid #A7D7B8', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              data-testid="button-generate-qr"
            >Generate QR Code</button>
            {qrCodeUrl && (
              <a
                href={qrCodeUrl}
                download={`homebase-referral-${typedUser.referralCode}.png`}
                style={{ background: '#F0FAF4', color: '#09694A', border: '0.5px solid #A7D7B8', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}
                data-testid="link-download-qr"
              >Download QR</a>
            )}
          </div>
          {qrCodeUrl && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <img src={qrCodeUrl} alt="Referral QR Code" style={{ border: '0.5px solid var(--gray-200)', borderRadius: 10, padding: 12 }} />
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 10 }}>
            Referral code: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--gray-600)' }}>{typedUser.referralCode}</span> · Earn $15 after 4 months of paid subscription
          </div>
        </div>

        {/* Home Handoffs */}
        <span className="dash-section-label">Home Handoff Packages</span>
        <div className="dash-light-card">
          <div className="dash-light-card-row">
            <div className="dash-light-card-icon" style={{ background: '#F0FAF4', color: '#09694A' }}>
              <ArrowRight size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="dash-light-card-title">Home Handoff Packages</div>
              <div className="dash-light-card-sub">Upload docs · AI extracts data · Buyer claims record</div>
            </div>
            <Link href="/agent-handoff">
              <span className="dash-light-card-btn" style={{ background: '#F0FAF4', color: '#09694A' }}>Manage →</span>
            </Link>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {[
              { num: '1', label: 'Upload docs', bg: '#F0FAF4', color: '#079669' },
              { num: '2', label: 'AI extracts', bg: '#EAF4FD', color: '#1560A2' },
              { num: '3', label: 'Buyer claims', bg: '#EEEDFE', color: '#3C258E' },
            ].map(step => (
              <div key={step.num} style={{ flex: 1, textAlign: 'center', background: step.bg, borderRadius: 8, padding: '10px 4px' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: step.color }}>{step.num}</div>
                <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 2 }}>{step.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Payout Settings */}
        <span className="dash-section-label" style={{ marginTop: 8 }}>Payout Settings</span>
        <div className="dash-light-card">
          {stripeStatus?.onboardingComplete ? (
            <div className="dash-light-card-row">
              <div className="dash-light-card-icon" style={{ background: '#F0FAF4', color: '#09694A' }}>
                <CheckCircle size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="dash-light-card-title" style={{ color: '#09694A' }}>Bank Account Connected</div>
                <div className="dash-light-card-sub">Payouts automatically deposited</div>
              </div>
            </div>
          ) : stripeStatus?.connected && !stripeStatus?.onboardingComplete ? (
            <div className="dash-light-card-row">
              <div className="dash-light-card-icon" style={{ background: '#FEF9C3', color: '#D97706' }}>
                <AlertCircle size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="dash-light-card-title">Complete Your Setup</div>
                <div className="dash-light-card-sub">Finish connecting your bank account to receive payouts</div>
              </div>
              <button
                onClick={() => connectStripeMutation.mutate()}
                disabled={connectStripeMutation.isPending}
                className="dash-light-card-btn"
                style={{ background: '#F0FAF4', color: '#09694A' }}
                data-testid="button-complete-stripe-setup"
              >{connectStripeMutation.isPending ? '...' : 'Complete →'}</button>
            </div>
          ) : (
            <div className="dash-light-card-row">
              <div className="dash-light-card-icon" style={{ background: '#EAF4FD', color: '#1560A2' }}>
                <CreditCard size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="dash-light-card-title">Connect Bank Account</div>
                <div className="dash-light-card-sub">Receive $15 payouts after 4 months per referral</div>
              </div>
              <button
                onClick={() => connectStripeMutation.mutate()}
                disabled={connectStripeMutation.isPending}
                className="dash-light-card-btn"
                style={{ background: '#F0FAF4', color: '#09694A' }}
                data-testid="button-connect-stripe"
              >{connectStripeMutation.isPending ? '...' : 'Connect →'}</button>
            </div>
          )}
        </div>

        {/* Payout History */}
        <span className="dash-section-label" style={{ marginTop: 8 }}>Payout History</span>
        {payouts.length === 0 ? (
          <div className="dash-light-card" style={{ textAlign: 'center', padding: '24px 14px' }}>
            <DollarSign size={28} style={{ color: 'var(--gray-400)', margin: '0 auto 8px', display: 'block' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)' }}>No payouts yet</div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>Payouts appear after 4 months of paid subscription per referral</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {payouts.map(payout => {
              const isPaid = payout.status === 'paid';
              const isPending = payout.status === 'pending';
              const isProcessing = payout.status === 'processing';
              const isFailed = payout.status === 'failed';
              const dateLabel = isPaid && payout.paidAt
                ? `Paid ${new Date(payout.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : `Initiated ${new Date(payout.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
              const pendingNote = isPending && !stripeStatus?.onboardingComplete
                ? 'Awaiting bank account connection'
                : isPending ? 'Transfer in progress' : null;
              return (
                <div key={payout.id} className="dash-light-card" style={{ marginBottom: 0 }} data-testid={`payout-${payout.id}`}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: isPaid ? '#F0FAF4' : isPending || isProcessing ? '#FEF9C3' : isFailed ? '#FEE2E2' : 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isPaid ? <CheckCircle size={18} style={{ color: '#079669' }} />
                          : isPending || isProcessing ? <Clock size={18} style={{ color: '#D97706' }} />
                            : isFailed ? <XCircle size={18} style={{ color: '#DC2626' }} />
                              : <DollarSign size={18} style={{ color: 'var(--gray-400)' }} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{payout.refereeName}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 1 }}>{dateLabel}</div>
                        {pendingNote && <div style={{ fontSize: 11, color: '#D97706', marginTop: 1 }}>{pendingNote}</div>}
                        {isFailed && payout.errorMessage && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 1 }}>{payout.errorMessage}</div>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: isPaid ? '#079669' : 'var(--gray-600)' }}>${parseFloat(payout.amount).toFixed(2)}</div>
                      <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 5, padding: '1px 6px', background: isPaid ? '#F0FAF4' : isPending ? '#FEF9C3' : isProcessing ? '#EAF4FD' : isFailed ? '#FEE2E2' : 'var(--gray-100)', color: isPaid ? '#09694A' : isPending ? '#92400E' : isProcessing ? '#1560A2' : isFailed ? '#DC2626' : 'var(--gray-600)', textTransform: 'uppercase' }}>
                        {isPaid ? 'Paid' : isPending ? 'Pending' : isProcessing ? 'Processing' : isFailed ? 'Failed' : payout.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Referrals List */}
        <span className="dash-section-label" style={{ marginTop: 4 }}>Your Referrals</span>
        {referrals.length === 0 ? (
          <div className="dash-light-card" style={{ textAlign: 'center', padding: '24px 14px' }}>
            <Users size={28} style={{ color: 'var(--gray-400)', margin: '0 auto 8px', display: 'block' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)' }}>No referrals yet</div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>Start sharing your link!</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {referrals.map(referral => (
              <div key={referral.id} className="dash-light-card" style={{ marginBottom: 0 }} data-testid={`referral-${referral.id}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }} data-testid={`text-referral-name-${referral.id}`}>{referral.refereeName}</span>
                      {getStatusBadge(referral.status)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)' }} data-testid={`text-referral-email-${referral.id}`}>{referral.refereeEmail}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{referral.consecutiveMonthsPaid} / 4 months</div>
                    <div style={{ fontSize: 10, color: referral.consecutiveMonthsPaid >= 4 ? '#079669' : 'var(--gray-400)', marginTop: 1 }}>
                      {referral.consecutiveMonthsPaid >= 4 ? 'Eligible for payout' : `${4 - referral.consecutiveMonthsPaid}mo until payout`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
