import { WorkspaceHeader, WorkspaceContent } from "@/components/workspace";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Users, CheckCircle, Clock, XCircle, AlertCircle, Plus, Home, ChevronRight, Package, Copy, QrCode, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import type { User as UserType } from "@shared/schema";

interface AgentReferral {
  id: string;
  status: string;
  refereeName: string;
  refereeEmail: string;
}

interface HandoffPackage {
  id: string;
  agentId: string;
  propertyAddress: string;
  buyerName: string;
  buyerEmail: string;
  status: "draft" | "sent" | "claimed";
  createdAt: string;
}

export default function AgentDashboard() {
  const { user } = useAuth();
  const typedUser = user as UserType | undefined;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const { data: referrals = [] } = useQuery<AgentReferral[]>({
    queryKey: ["/api/agent/referrals"],
    enabled: !!typedUser,
  });

  const { data: verificationStatus } = useQuery<{ verificationStatus: string; reviewNotes?: string }>({
    queryKey: ["/api/agent/verification-status"],
    enabled: !!typedUser,
  });

  const { data: packages = [], isLoading: loadingPackages } = useQuery<HandoffPackage[]>({
    queryKey: ["/api/agent/handoff-packages"],
    enabled: !!typedUser,
  });

  if (!typedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#09694A] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const referralUrl = `${window.location.origin}/signin?ref=${typedUser.referralCode || ""}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    toast({ title: "Copied!", description: "Referral link copied to clipboard." });
  };

  const generateQRCode = async () => {
    setQrCodeUrl(await QRCode.toDataURL(referralUrl, { width: 300, margin: 2, color: { dark: "#09694A", light: "#ffffff" } }));
  };

  const getReferralStatusBadge = (status: string) => {
    if (status === "active") return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#F0FAF4] text-[#09694A]"><CheckCircle className="w-3 h-3 mr-1" />Active</span>;
    if (status === "trial") return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700"><Clock className="w-3 h-3 mr-1" />Trial</span>;
    if (status === "voided") return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700"><XCircle className="w-3 h-3 mr-1" />Voided</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-800">{status}</span>;
  };

  const getPackageStatusBadge = (status: string) => {
    switch (status) {
      case "draft": return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">Draft</span>;
      case "sent": return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">Sent</span>;
      case "claimed": return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#F0FAF4] text-[#09694A] border border-[#D4EBDE]"><CheckCircle className="w-3 h-3 mr-1" />Claimed</span>;
      default: return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const activePackages = packages.filter(p => p.status !== "claimed").slice(0, 5); // Show recent active

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col pb-24 lg:pb-0">
      <WorkspaceHeader
        title="Agent Dashboard"
        subtitle="Manage your closing packages and client relationships"
        action={
          <button
            onClick={() => setLocation("/agent-handoff?new=true")}
            className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl bg-[#09694A] text-white text-sm font-semibold hover:bg-[#079669] transition-colors shadow-sm"
            data-testid="button-create-package"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create closing package
          </button>
        }
      />
      <WorkspaceContent>

        {/* Verification Banner */}
        {verificationStatus?.verificationStatus !== "approved" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-yellow-800">License verification in progress</h3>
              <p className="text-xs text-yellow-700 mt-1 leading-relaxed">Complete verification to unlock all agent tools.</p>
            </div>
          </div>
        )}

        {/* Active Handoffs */}
        <section data-tour-id="agent-handoffs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Active Handoffs</h2>
            {packages.length > 0 && (
              <Link href="/agent-handoff">
                <span className="text-sm font-medium text-[#09694A] hover:underline cursor-pointer min-h-[44px] inline-flex items-center">View all</span>
              </Link>
            )}
          </div>

          {loadingPackages ? (
            <div className="animate-pulse bg-white rounded-2xl border border-gray-200 h-32"></div>
          ) : packages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 text-center shadow-sm">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-gray-900">No closing packages yet</h3>
              <p className="text-sm text-gray-500 mt-1 mb-6 max-w-md mx-auto">Create your first handoff package to share organized home data with your buyers.</p>
              <button
                onClick={() => setLocation("/agent-handoff?new=true")}
                className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl bg-[#F0FAF4] text-[#09694A] text-sm font-semibold hover:bg-[#D4EBDE] transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Package
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                    <tr>
                      <th className="px-6 py-4">Property</th>
                      <th className="px-6 py-4">Client</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(activePackages.length > 0 ? activePackages : packages.slice(0, 5)).map(pkg => (
                      <tr key={pkg.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{pkg.propertyAddress}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900 font-medium">{pkg.buyerName}</div>
                          <div className="text-gray-500 text-xs mt-0.5">{pkg.buyerEmail}</div>
                        </td>
                        <td className="px-6 py-4">
                          {getPackageStatusBadge(pkg.status)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/agent-handoff?id=${pkg.id}`}>
                            <span className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-xs font-semibold text-[#09694A] bg-[#F0FAF4] hover:bg-[#D4EBDE] transition-colors" data-testid={`button-manage-${pkg.id}`}>
                              Manage
                            </span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden divide-y divide-gray-100">
                {(activePackages.length > 0 ? activePackages : packages.slice(0, 5)).map(pkg => (
                  <Link key={pkg.id} href={`/agent-handoff?id=${pkg.id}`}>
                    <div className="p-4 flex items-center gap-4 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer group">
                      <div className="w-12 h-12 rounded-xl bg-[#F0FAF4] flex items-center justify-center flex-shrink-0">
                        <Home className="w-6 h-6 text-[#09694A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{pkg.propertyAddress}</h3>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{pkg.buyerName}</p>
                        <div className="mt-2">{getPackageStatusBadge(pkg.status)}</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Referral Link Secondary */}
          <section data-tour-id="agent-referral-link">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Share MyHomeBase</h2>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900">A thoughtful closing gift</h3>
              <p className="text-xs text-gray-500 mt-1.5 mb-5 leading-relaxed">Invite clients to create a free home record they can use for maintenance, listing prep, and every future move.</p>

              <div className="flex gap-2 mb-4">
                <input
                  readOnly
                  value={referralUrl}
                  className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#09694A] focus:border-transparent"
                />
                <button
                  onClick={copyLink}
                  className="inline-flex items-center justify-center min-h-[44px] w-[44px] sm:w-auto sm:px-4 rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-sm font-semibold shadow-sm flex-shrink-0 transition-colors"
                  data-testid="button-copy-referral"
                >
                  <Copy className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Copy link</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={generateQRCode}
                  className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl text-[#09694A] bg-[#F0FAF4] hover:bg-[#D4EBDE] text-sm font-semibold transition-colors flex-1"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Show QR Code
                </button>
                {qrCodeUrl && (
                  <a
                    href={qrCodeUrl}
                    download="myhomebase-referral-qr.png"
                    className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold transition-colors flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </a>
                )}
              </div>

              {qrCodeUrl && (
                <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                  <div className="p-3 border border-gray-100 rounded-2xl shadow-sm bg-white">
                    <img src={qrCodeUrl} alt="Referral QR Code" className="w-32 h-32" />
                  </div>
                  <p className="text-xs text-gray-500 mt-4">Referral code: <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-md ml-1">{typedUser.referralCode}</span></p>
                </div>
              )}
            </div>
          </section>

          {/* Client Relationships */}
          <section data-tour-id="agent-referrals">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Client Relationships</h2>
              <div data-tour-id="agent-stats" className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                {referrals.length} Total
              </div>
            </div>

            {referrals.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center h-[calc(100%-2.5rem)] min-h-[200px] flex flex-col items-center justify-center shadow-sm">
                <Users className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-base font-semibold text-gray-900">No relationships yet</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-[200px] mx-auto">Start sharing your link to build your network.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col max-h-[400px]">
                <div className="overflow-y-auto divide-y divide-gray-100 p-2">
                  {referrals.map(referral => (
                    <div key={referral.id} className="p-3 flex items-center justify-between gap-4 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{referral.refereeName}</h3>
                          {getReferralStatusBadge(referral.status)}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{referral.refereeEmail}</p>
                      </div>
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

      </WorkspaceContent>
    </div>
  );
}
