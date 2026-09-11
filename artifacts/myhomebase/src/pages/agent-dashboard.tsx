import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Users, CheckCircle, Clock, XCircle, AlertCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import type { User as UserType } from "@shared/schema";
import "./home.css";

interface AgentReferral {
  id: string;
  status: string;
  refereeName: string;
  refereeEmail: string;
}

export default function AgentDashboard() {
  const { user } = useAuth();
  const typedUser = user as UserType | undefined;
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const { data: referrals = [] } = useQuery<AgentReferral[]>({
    queryKey: ["/api/agent/referrals"],
    enabled: !!typedUser,
  });
  const { data: verificationStatus } = useQuery<{ verificationStatus: string; reviewNotes?: string }>({
    queryKey: ["/api/agent/verification-status"],
    enabled: !!typedUser,
  });

  if (!typedUser) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-2xl font-bold text-primary">Loading...</div></div>;
  const referralUrl = `${window.location.origin}/signin?ref=${typedUser.referralCode || ""}`;
  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    toast({ title: "Copied!", description: "Referral link copied to clipboard." });
  };
  const generateQRCode = async () => setQrCodeUrl(await QRCode.toDataURL(referralUrl, { width: 300, margin: 2, color: { dark: "#059669", light: "#ffffff" } }));
  const getStatusBadge = (status: string) => status === "active"
    ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F0FAF4] text-[#09694A]"><CheckCircle className="w-3 h-3 mr-1" />Active</span>
    : status === "trial"
      ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E6F1FB] text-[#1560A2]"><Clock className="w-3 h-3 mr-1" />Trial</span>
      : status === "voided"
        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Voided</span>
        : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;

  return <div>
    <div className="dash-header" style={{ background: "linear-gradient(135deg, #09694A 0%, #079669 100%)" }}>
      <span className="dash-eyebrow" style={{ color: "#D4EBDE" }}>REAL ESTATE AGENT</span>
      <div className="dash-title">Agent Dashboard</div>
      <div className="dash-subtitle">Build lasting client relationships with a free home record</div>
      <div className="dash-chips" data-tour-id="agent-stats">
        <div className="dash-chip"><div className={`dash-chip-num${referrals.length ? " good" : ""}`}>{referrals.length}</div><div className="dash-chip-label">Clients Referred</div></div>
        <div className="dash-chip"><div className={`dash-chip-num${referrals.filter(r => r.status === "active").length ? " good" : ""}`}>{referrals.filter(r => r.status === "active").length}</div><div className="dash-chip-label">Active Relationships</div></div>
      </div>
    </div>
    <div className="dash-body">
      {verificationStatus?.verificationStatus !== "approved" && <div style={{ background: "#FEF9C3", border: "0.5px solid #FCD34D", borderRadius: 12, padding: "12px 14px", marginBottom: 16, display: "flex", gap: 10 }}>
        <AlertCircle size={18} style={{ color: "#D97706" }} />
        <div><strong>License verification in progress</strong><div style={{ fontSize: 12, marginTop: 2 }}>Complete verification to unlock all agent tools.</div></div>
      </div>}
      <span className="dash-section-label">Share MyHomeBase with clients</span>
      <div className="dash-light-card" data-tour-id="agent-referral-link">
        <div className="dash-light-card-title">A thoughtful closing gift that keeps helping</div>
        <div className="dash-light-card-sub">Invite clients to create a free home record they can use for maintenance, listing prep, and every future move.</div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input readOnly value={referralUrl} className="flex-1 rounded border px-3 py-2 text-sm" />
          <button className="dash-btn dash-btn-outline" onClick={copyLink}>Copy link</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button className="dash-btn dash-btn-outline" onClick={generateQRCode}>Show QR code</button>
          {qrCodeUrl && <a className="dash-btn dash-btn-outline" href={qrCodeUrl} download="myhomebase-referral-qr.png">Download QR</a>}
        </div>
        {qrCodeUrl && <img src={qrCodeUrl} alt="Referral QR Code" style={{ width: 180, margin: "16px auto 0", border: "0.5px solid var(--gray-200)", borderRadius: 10, padding: 12 }} />}
        <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 10 }}>Referral code: <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--gray-600)" }}>{typedUser.referralCode}</span></div>
      </div>
      <span className="dash-section-label">Home Handoff Packages</span>
      <div className="dash-light-card" data-tour-id="agent-handoffs">
        <div className="dash-light-card-row"><div className="dash-light-card-icon" style={{ background: "#F0FAF4", color: "#09694A" }}><ArrowRight size={18} /></div><div style={{ flex: 1 }}><div className="dash-light-card-title">Home Handoff Packages</div><div className="dash-light-card-sub">Upload docs · AI extracts data · Buyer claims record</div></div><Link href="/agent-handoff"><span className="dash-light-card-btn" style={{ background: "#F0FAF4", color: "#09694A" }}>Manage →</span></Link></div>
      </div>
      <span className="dash-section-label" data-tour-id="agent-referrals">Your Client Relationships</span>
      {referrals.length === 0 ? <div className="dash-light-card" style={{ textAlign: "center", padding: "24px 14px" }}><Users size={28} style={{ color: "var(--gray-400)", margin: "0 auto 8px", display: "block" }} /><div style={{ fontSize: 13, fontWeight: 600 }}>No client relationships yet</div><div style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 4 }}>Start sharing your link.</div></div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{referrals.map(referral => <div key={referral.id} className="dash-light-card"><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><div style={{ fontSize: 13, fontWeight: 600 }}>{referral.refereeName} {getStatusBadge(referral.status)}</div><div style={{ fontSize: 11, color: "var(--gray-400)" }}>{referral.refereeEmail}</div></div><span style={{ fontSize: 11, color: "var(--gray-400)" }}>Relationship tracked</span></div></div>)}</div>}
    </div>
  </div>;
}