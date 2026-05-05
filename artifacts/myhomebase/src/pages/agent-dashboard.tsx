import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { Users, DollarSign, TrendingUp, Copy, Share2, CheckCircle, Clock, XCircle, AlertCircle, ArrowRight, CreditCard, ExternalLink, Loader2 } from "lucide-react";
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
    <div className="min-h-screen" style={{ background: '#ffffff' }}>

      {/* ── DASH HEADER ─────────────────────────── */}
      <div className="dash-header" style={{ background: '#09694A' }}>
        <span className="dash-eyebrow" style={{ color: '#D4EBDE' }}>Real Estate Agent</span>
        <div className="dash-title">Agent Dashboard</div>
        <div className="dash-subtitle">Track your referrals and earnings</div>
        <div className="dash-chips">
          <div className="dash-chip">
            <div className={`dash-chip-num${(stats?.totalReferrals || 0) > 0 ? ' good' : ''}`}>{stats?.totalReferrals || 0}</div>
            <div className="dash-chip-label">Total Referrals</div>
          </div>
          <div className="dash-chip">
            <div className={`dash-chip-num${(stats?.activeReferrals || 0) > 0 ? ' good' : ''}`}>{stats?.activeReferrals || 0}</div>
            <div className="dash-chip-label">Active Subscribers</div>
          </div>
          <div className="dash-chip dash-chip-earnings">
            <div>
              <div className={`dash-chip-num${(stats?.totalEarnings || 0) > 0 ? ' good' : ''}`}>${(stats?.totalEarnings || 0).toFixed(2)}</div>
              <div className="dash-chip-label">Total Earnings</div>
            </div>
            <div className="dash-chip-divider" />
            <div>
              <div className={`dash-chip-num${(stats?.pendingEarnings || 0) > 0 ? ' warn' : ''}`}>${(stats?.pendingEarnings || 0).toFixed(2)}</div>
              <div className="dash-chip-label">Pending Earnings</div>
              {stats?.nextPayoutDate && (
                <div className="dash-chip-sublabel">
                  Est. {new Date(stats.nextPayoutDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Verification Status Banner */}
        {verificationStatus?.verificationStatus !== 'approved' && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Verification Required</AlertTitle>
            <AlertDescription className="text-yellow-700">
              {verificationStatus?.verificationStatus === 'pending_review' ? (
                <span>Your verification is under review. You'll be able to earn commissions once approved.</span>
              ) : verificationStatus?.verificationStatus === 'rejected' || verificationStatus?.verificationStatus === 'resubmit_required' ? (
                <span>Your verification was rejected. Please resubmit your information.</span>
              ) : (
                <span>You must verify your real estate license to start earning referral commissions.</span>
              )}
              <Link href="/agent-account">
                <Button variant="link" className="h-auto p-0 ml-2 text-yellow-800 hover:text-yellow-900">
                  {verificationStatus?.verificationStatus === 'pending_review' ? 'View Status' : 'Get Verified'}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Referral Link Section */}
        <Card className="mb-8 bg-white dark:bg-gray-800 shadow rounded-2xl">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Your Referral Link</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={referralUrl}
                  readOnly
                  className="flex-1 min-w-0 px-3 py-2 border border-input bg-background rounded-md text-sm"
                  data-testid="input-referral-link"
                />
                <div className="flex gap-2 flex-shrink-0">
                  <Button onClick={handleCopyLink} variant="outline" data-testid="button-copy-link">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button onClick={handleShareLink} variant="outline" data-testid="button-share-link">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={generateQRCode} variant="secondary" data-testid="button-generate-qr">
                  Generate QR Code
                </Button>
                {qrCodeUrl && (
                  <a
                    href={qrCodeUrl}
                    download={`homebase-referral-${typedUser.referralCode}.png`}
                    data-testid="link-download-qr"
                  >
                    <Button variant="outline">Download QR Code</Button>
                  </a>
                )}
              </div>

              {qrCodeUrl && (
                <div className="flex justify-center mt-4">
                  <img src={qrCodeUrl} alt="Referral QR Code" className="border rounded-lg p-4" />
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Your referral code: <span className="font-mono font-bold">{typedUser.referralCode}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Share this link with homeowners and contractors. You'll earn $15 after they maintain an active subscription for 4 consecutive months.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Home Handoffs Section */}
        <Card className="mb-8 bg-white dark:bg-gray-800 shadow rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-900 dark:text-white">
                <ArrowRight className="h-5 w-5 text-[#079669]" />
                Home Handoff Packages
              </span>
              <Link href="/agent-handoff">
                <Button size="sm" className="bg-[#079669] hover:bg-[#09694A] text-white">
                  Manage Handoffs <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Upload closing documents for new buyers and let AI extract home system and appliance data into a pre-filled home record. Send buyers a magic link to claim their record instantly.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-[#F0FAF4] dark:bg-emerald-900/20 rounded-lg">
                <div className="text-lg font-bold text-[#079669]">1</div>
                <div className="text-xs text-gray-500">Upload docs</div>
              </div>
              <div className="text-center p-3 bg-[#E6F1FB] dark:bg-blue-900/20 rounded-lg">
                <div className="text-lg font-bold text-[#1560A2]">2</div>
                <div className="text-xs text-gray-500">AI extracts data</div>
              </div>
              <div className="text-center p-3 bg-[#EEEDFE] rounded-lg">
                <div className="text-lg font-bold text-[#3C258E]">3</div>
                <div className="text-xs text-gray-500">Buyer claims record</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stripe Connect Section */}
        <Card className="mb-8 bg-white dark:bg-gray-800 shadow rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <CreditCard className="h-5 w-5" />
              Payout Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stripeStatus?.onboardingComplete ? (
              <div className="flex items-center gap-3 p-4 bg-[#F0FAF4] border border-[#A7D7B8] rounded-lg">
                <CheckCircle className="h-6 w-6 text-[#079669]" />
                <div>
                  <p className="font-medium text-[#09694A]">Bank Account Connected</p>
                  <p className="text-sm text-[#079669]">Your payouts will be automatically deposited to your connected bank account.</p>
                </div>
              </div>
            ) : stripeStatus?.connected && !stripeStatus?.onboardingComplete ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-800">Complete Your Setup</p>
                    <p className="text-sm text-yellow-600">You need to finish connecting your bank account to receive payouts.</p>
                  </div>
                </div>
                <Button 
                  onClick={() => connectStripeMutation.mutate()}
                  disabled={connectStripeMutation.isPending}
                  className="bg-[#079669] hover:bg-[#09694A]"
                  data-testid="button-complete-stripe-setup"
                >
                  {connectStripeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Complete Setup
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Connect your bank account to receive automatic $15 payouts when your referrals complete 4 months of paid subscription.
                </p>
                <Button 
                  onClick={() => connectStripeMutation.mutate()}
                  disabled={connectStripeMutation.isPending}
                  className="bg-[#079669] hover:bg-[#09694A]"
                  data-testid="button-connect-stripe"
                >
                  {connectStripeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Connect Bank Account
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payout History */}
        <Card className="mb-8 bg-white dark:bg-gray-800 shadow rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <DollarSign className="h-5 w-5" />
              Payout History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No payouts yet</p>
                <p className="text-sm mt-1">Payouts appear here once a referred user completes 4 months of paid subscription.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payouts.map((payout) => {
                  const isPaid = payout.status === 'paid';
                  const isPending = payout.status === 'pending';
                  const isProcessing = payout.status === 'processing';
                  const isFailed = payout.status === 'failed';

                  const dateLabel = isPaid && payout.paidAt
                    ? `Paid out ${new Date(payout.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : `Initiated ${new Date(payout.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

                  const pendingNote = isPending && !stripeStatus?.onboardingComplete
                    ? 'Awaiting bank account connection'
                    : isPending
                      ? 'Transfer in progress'
                      : null;

                  return (
                    <div
                      key={payout.id}
                      className={`flex items-start justify-between p-4 rounded-lg border ${
                        isPaid
                          ? 'bg-[#F0FAF4] border-[#A7D7B8] dark:bg-green-900/10 dark:border-green-900/30'
                          : isPending || isProcessing
                            ? 'bg-yellow-50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900/30'
                            : isFailed
                              ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30'
                              : 'bg-gray-50 border-gray-100 dark:bg-gray-700/20 dark:border-gray-700/40'
                      }`}
                      data-testid={`payout-${payout.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-full p-1.5 ${
                          isPaid ? 'bg-[#F0FAF4] dark:bg-green-800/40' :
                          isPending || isProcessing ? 'bg-yellow-100 dark:bg-yellow-800/40' :
                          isFailed ? 'bg-red-100 dark:bg-red-800/40' :
                          'bg-gray-100 dark:bg-gray-600/40'
                        }`}>
                          {isPaid ? (
                            <CheckCircle className="h-4 w-4 text-[#079669] dark:text-green-400" />
                          ) : isPending || isProcessing ? (
                            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                          ) : isFailed ? (
                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          ) : (
                            <DollarSign className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{payout.refereeName}</p>
                          <p className="text-sm text-muted-foreground">{dateLabel}</p>
                          {pendingNote && (
                            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">{pendingNote}</p>
                          )}
                          {isFailed && payout.errorMessage && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{payout.errorMessage}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className={`font-bold text-lg ${isPaid ? 'text-[#079669] dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          ${parseFloat(payout.amount).toFixed(2)}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isPaid
                            ? 'bg-[#F0FAF4] text-[#09694A] dark:bg-green-800/40 dark:text-green-300'
                            : isPending
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/40 dark:text-yellow-300'
                              : isProcessing
                                ? 'bg-[#E6F1FB] text-[#1560A2] dark:bg-blue-800/40 dark:text-blue-300'
                                : isFailed
                                  ? 'bg-red-100 text-red-800 dark:bg-red-800/40 dark:text-red-300'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-600/40 dark:text-gray-300'
                        }`}>
                          {isPaid ? 'Paid' :
                           isPending ? 'Pending' :
                           isProcessing ? 'Processing' :
                           isFailed ? 'Failed' : payout.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referrals List */}
        <Card className="bg-white dark:bg-gray-800 shadow rounded-2xl">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Your Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No referrals yet. Start sharing your link!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    data-testid={`referral-${referral.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold" data-testid={`text-referral-name-${referral.id}`}>
                          {referral.refereeName}
                        </h3>
                        {getStatusBadge(referral.status)}
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid={`text-referral-email-${referral.id}`}>
                        {referral.refereeEmail}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Signed up: {new Date(referral.signupDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {referral.consecutiveMonthsPaid} / 4 months
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {referral.consecutiveMonthsPaid >= 4 ? (
                          <span className="text-[#079669] font-medium">Eligible for payout</span>
                        ) : (
                          `${4 - referral.consecutiveMonthsPaid} months until payout`
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
