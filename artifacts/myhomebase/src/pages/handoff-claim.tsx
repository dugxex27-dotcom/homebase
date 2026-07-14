import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Home, Loader2, Lock, Wrench, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface HandoffPreview {
  id: string;
  propertyAddress: string;
  buyerName: string;
  status: "draft" | "sent" | "claimed";
  systemCount: number;
  applianceCount: number;
  hasWarranties: boolean;
  propertyDetails: {
    yearBuilt?: number | null;
    squareFootage?: number | null;
    roofType?: string | null;
  };
  generalNotes?: string | null;
  extractedData?: Record<string, unknown>;
}

interface AuthUser {
  role?: string;
  firstName?: string;
  lastName?: string;
}

export default function HandoffClaim() {
  const { token } = useParams<{ token: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [claimed, setClaimed] = useState(false);

  // Persist the handoff token in sessionStorage so it survives sign-in redirects
  useEffect(() => {
    if (token) {
      sessionStorage.setItem("pendingHandoffToken", token);
    }
  }, [token]);

  const { data: preview, isLoading, error } = useQuery<HandoffPreview>({
    queryKey: ["/api/handoff", token],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(`/api/handoff/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Package not found");
      }
      return res.json();
    },
    retry: false,
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/handoff/${token}/claim`, "POST");
      return res.json();
    },
    onSuccess: (data) => {
      sessionStorage.removeItem("pendingHandoffToken");
      setClaimed(true);
      toast({
        title: data.mergedExisting ? "Home record updated!" : "Home record created!",
        description: data.message,
      });
      setTimeout(() => navigate("/my-home"), 2500);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Could not claim", description: message, variant: "destructive" });
    },
  });

  const typedUser = user as AuthUser | undefined;
  const isHomeowner = typedUser?.role === "homeowner";

  // Redirect non-homeowners who are authenticated
  if (!authLoading && isAuthenticated && !isHomeowner) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-bold mb-2">Homeowner Account Required</h2>
            <p className="text-gray-500 mb-6">This link is for the homebuyer. Please sign in with a homeowner account to claim this home record.</p>
            <Link href="/signin/homeowner">
              <Button className="bg-emerald-600 hover:bg-emerald-700">Sign in as Homeowner</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <Home className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-bold mb-2">Link Not Found</h2>
            <p className="text-gray-500 mb-6">This home handoff link is invalid or has expired. Please contact your real estate agent for a new link.</p>
            <Link href="/"><Button variant="outline">Go to Homepage</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (preview.status === "claimed" && !claimed) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
            <h2 className="text-xl font-bold mb-2">Already Claimed</h2>
            <p className="text-gray-500 mb-6">This home record has already been claimed. If you believe this is an error, contact your real estate agent.</p>
            {isAuthenticated && <Link href="/my-home"><Button className="bg-emerald-600 hover:bg-emerald-700">View My Homes</Button></Link>}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (claimed) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Welcome Home!</h2>
            <p className="text-gray-500 mb-2">Your home record for</p>
            <p className="font-semibold text-gray-800 mb-4">{preview.propertyAddress}</p>
            <p className="text-gray-500 mb-6">has been created. Redirecting you to your dashboard...</p>
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const signInUrl = `/signin/homeowner?handoff_token=${token}`;
  const signUpUrl = `/signin/homeowner?handoff_token=${token}`;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(to bottom, #059669 0%, #10b981 40%, #ecfdf5 100%)" }}>
      <div className="max-w-2xl mx-auto px-4 pt-12 pb-16">

        {/* Top header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <Home className="w-9 h-9 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Your Home Record is Ready</h1>
          <p className="text-emerald-100">Your agent has prepared a digital record for your new home</p>
        </div>

        {/* Address card */}
        <Card className="mb-6 bg-white shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Home className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">New Property</p>
                <h2 className="text-xl font-bold text-gray-900">{preview.propertyAddress}</h2>
                {preview.buyerName && <p className="text-gray-500 mt-1">Prepared for: <strong>{preview.buyerName}</strong></p>}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{preview.systemCount}</div>
                <div className="text-xs text-gray-500">Home System{preview.systemCount !== 1 ? "s" : ""}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--purple)' }}>{preview.applianceCount}</div>
                <div className="text-xs text-gray-500">Appliance{preview.applianceCount !== 1 ? "s" : ""}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{preview.hasWarranties ? "✓" : "—"}</div>
                <div className="text-xs text-gray-500">Warranties</div>
              </div>
            </div>

            {/* Property details */}
            {preview.propertyDetails && Object.values(preview.propertyDetails).some(Boolean) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {preview.propertyDetails.yearBuilt && <Badge variant="secondary">Built {preview.propertyDetails.yearBuilt}</Badge>}
                {preview.propertyDetails.squareFootage && <Badge variant="secondary">{preview.propertyDetails.squareFootage.toLocaleString()} sq ft</Badge>}
                {preview.propertyDetails.roofType && <Badge variant="secondary">{preview.propertyDetails.roofType} Roof</Badge>}
              </div>
            )}

            {preview.generalNotes && (
              <p className="text-sm text-gray-500 mt-4 bg-gray-50 rounded-lg p-3">{preview.generalNotes}</p>
            )}
          </CardContent>
        </Card>

        {/* What's included */}
        <Card className="mb-6 bg-white shadow-lg border-0">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">What's included in your record</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Home Systems Tracking</p>
                  <p className="text-sm text-gray-500">HVAC, plumbing, electrical and more — with ages and brands</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--purple-tint)' }}>
                  <Home className="w-4 h-4" style={{ color: 'var(--purple)' }} />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Appliance Records</p>
                  <p className="text-sm text-gray-500">Make, model, and serial numbers for all major appliances</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Maintenance Calendar</p>
                  <p className="text-sm text-gray-500">Smart reminders based on your home's specific systems</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="bg-white shadow-lg border-0">
          <CardContent className="p-6">
            {isAuthenticated && isHomeowner ? (
              <div className="text-center">
                <p className="text-gray-600 mb-4">You're signed in as {typedUser?.firstName || "a homeowner"}. Ready to claim your home record?</p>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-base font-semibold"
                  onClick={() => claimMutation.mutate()}
                  disabled={claimMutation.isPending}
                >
                  {claimMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating your home record...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4 mr-2" /> Claim My Home Record</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="font-semibold text-gray-900 mb-1">Ready to claim your home record?</p>
                <p className="text-gray-500 text-sm mb-5">Create a free account or sign in to access your pre-filled home data.</p>
                <div className="space-y-3">
                  <Link href={signUpUrl}>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-base font-semibold">
                      Create Free Account <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link href={signInUrl}>
                    <Button variant="outline" className="w-full py-3 text-base">
                      I already have an account — Sign In
                    </Button>
                  </Link>
                </div>
                <p className="text-xs text-gray-400 mt-4">Try free for 14 days · Card required, not charged until trial ends</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
