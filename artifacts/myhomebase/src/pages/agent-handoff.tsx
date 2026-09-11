import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus, FileUp, Send, ChevronLeft, Loader2, Home, CheckCircle,
  FileText, Trash2, Edit2, Copy, ExternalLink, Package, ChevronRight
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface HandoffPackage {
  id: string;
  agentId: string;
  propertyAddress: string;
  buyerName: string;
  buyerEmail: string;
  status: "draft" | "sent" | "claimed";
  inviteToken: string | null;
  extractedData: ExtractedData | null;
  notes: string | null;
  sentAt: string | null;
  claimedAt: string | null;
  createdAt: string;
}

interface HandoffDocument {
  id: string;
  fileName: string;
  fileType: string;
  createdAt: string;
}

interface ExtractedData {
  systems: Array<{ name: string; brand?: string | null; model?: string | null; yearInstalled?: number | null; notes?: string | null }>;
  appliances: Array<{ name: string; make?: string | null; model?: string | null; serialNumber?: string | null; yearInstalled?: number | null; warrantyExpiration?: string | null; notes?: string | null }>;
  propertyDetails: { yearBuilt?: number | null; squareFootage?: number | null; roofType?: string | null; roofAge?: number | null; foundationType?: string | null; electricalPanelAmps?: number | null; heatingFuel?: string | null };
  warranties: Array<{ item: string; expiration?: string | null; notes?: string | null }>;
  generalNotes?: string | null;
}

interface PackageDetail extends HandoffPackage {
  documents: HandoffDocument[];
}

function statusBadge(status: string) {
  switch (status) {
    case "draft": return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">Draft</span>;
    case "sent": return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">Sent</span>;
    case "claimed": return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#F0FAF4] text-[#09694A] border border-[#D4EBDE]"><CheckCircle className="w-3 h-3 mr-1" />Claimed</span>;
    default: return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-800">{status}</span>;
  }
}

export default function AgentHandoff() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const searchParams = new URLSearchParams(window.location.search);
  const initialView = searchParams.get("new") === "true" ? "create" : searchParams.get("id") ? "detail" : "list";
  const initialId = searchParams.get("id");

  const [view, setView] = useState<"list" | "create" | "detail">(initialView);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [form, setForm] = useState({ propertyAddress: "", buyerName: "", buyerEmail: "", notes: "" });
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [editingData, setEditingData] = useState<ExtractedData | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Sync state if URL changes (like browser back button)
  useEffect(() => {
    const handlePopState = () => {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("new") === "true") {
        setView("create");
        setSelectedId(null);
      } else if (sp.get("id")) {
        setSelectedId(sp.get("id"));
        setView("detail");
      } else {
        setView("list");
        setSelectedId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const { data: packages = [], isLoading } = useQuery<HandoffPackage[]>({
    queryKey: ["/api/agent/handoff-packages"],
    enabled: !!user,
  });

  const { data: detail, refetch: refetchDetail } = useQuery<PackageDetail>({
    queryKey: ["/api/agent/handoff-packages", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const res = await fetch(`/api/agent/handoff-packages/${selectedId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load package");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/agent/handoff-packages", "POST", form);
      return res.json();
    },
    onSuccess: (pkg) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/handoff-packages"] });
      setSelectedId(pkg.id);
      setView("detail");
      window.history.pushState({}, '', `/agent-handoff?id=${pkg.id}`);
      toast({ title: "Package created", description: "Now upload closing documents to extract home data." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(`/api/agent/handoff-packages/${id}/send`, "POST");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/handoff-packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/handoff-packages", selectedId] });
      refetchDetail();
      if (data.claimUrl) {
        navigator.clipboard.writeText(data.claimUrl).catch(() => {});
      }
      toast({
        title: data.emailSent ? "Email sent!" : "Link generated",
        description: data.emailSent
          ? `Home handoff email sent to ${detail?.buyerEmail}`
          : `Copy this link to share: ${data.claimUrl}`,
      });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateDataMutation = useMutation({
    mutationFn: async ({ id, extractedData }: { id: string; extractedData: ExtractedData }) => {
      const res = await apiRequest(`/api/agent/handoff-packages/${id}`, "PATCH", { extractedData });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/handoff-packages", selectedId] });
      refetchDetail();
      setEditMode(false);
      toast({ title: "Saved", description: "Extracted data updated." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length || !selectedId) return;
    const file = e.target.files[0];
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("document", file);
      const res = await fetch(`/api/agent/handoff-packages/${selectedId}/documents`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/agent/handoff-packages", selectedId] });
      refetchDetail();
      const count = (data.extractedData?.systems?.length || 0) + (data.extractedData?.appliances?.length || 0);
      toast({
        title: "Document processed",
        description: count > 0 ? `AI extracted ${count} items from this document.` : "Document uploaded. No home data was extracted.",
      });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  }

  function openDetail(id: string) {
    setSelectedId(id);
    setEditMode(false);
    setEditingData(null);
    setView("detail");
    window.history.pushState({}, '', `/agent-handoff?id=${id}`);
  }

  function startEdit() {
    if (detail?.extractedData) {
      setEditingData(JSON.parse(JSON.stringify(detail.extractedData)));
    } else {
      setEditingData({ systems: [], appliances: [], propertyDetails: {}, warranties: [], generalNotes: null });
    }
    setEditMode(true);
  }

  function saveEdit() {
    if (!selectedId || !editingData) return;
    updateDataMutation.mutate({ id: selectedId, extractedData: editingData });
  }

  function removeSystem(idx: number) {
    if (!editingData) return;
    setEditingData({ ...editingData, systems: editingData.systems.filter((_, i) => i !== idx) });
  }

  function removeAppliance(idx: number) {
    if (!editingData) return;
    setEditingData({ ...editingData, appliances: editingData.appliances.filter((_, i) => i !== idx) });
  }

  const claimUrl = detail?.inviteToken
    ? `${window.location.origin}/handoff/${detail.inviteToken}`
    : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6 flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {view !== "list" && (
                  <button
                    onClick={() => { setView("list"); setSelectedId(null); window.history.pushState({}, '', '/agent-handoff'); }}
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] sm:w-8 sm:h-8 sm:min-h-0 sm:min-w-0 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors mr-1 sm:mr-2"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>
                )}
                <span className="text-[10px] font-bold text-[#09694A] uppercase tracking-wider">Real Estate Agent</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                {view === "list" ? "Home Handoffs" : view === "create" ? "New Package" : detail?.propertyAddress || "Package Detail"}
              </h1>
            </div>

            {view === "list" && (
              <button
                className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl bg-[#09694A] text-white text-sm font-semibold hover:bg-[#079669] transition-colors shadow-sm w-full sm:w-auto"
                onClick={() => { setForm({ propertyAddress: "", buyerName: "", buyerEmail: "", notes: "" }); setView("create"); window.history.pushState({}, '', '/agent-handoff?new=true'); }}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Handoff
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

        {/* LIST VIEW */}
        {view === "list" && (
          <div className="space-y-4">
            {isLoading && (
              <div className="animate-pulse bg-white rounded-2xl border border-gray-200 h-32"></div>
            )}
            {!isLoading && packages.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 text-center shadow-sm">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-base font-semibold text-gray-900">No handoff packages yet</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-6 max-w-md mx-auto">Create a package to send pre-filled home data to a buyer.</p>
                  <button
                    className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl bg-[#09694A] text-white text-sm font-semibold hover:bg-[#079669] transition-colors shadow-sm"
                    onClick={() => { setView("create"); window.history.pushState({}, '', '/agent-handoff?new=true'); }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Package
                  </button>
              </div>
            )}
            {!isLoading && packages.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {/* Desktop View */}
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
                      {packages.map(pkg => (
                        <tr key={pkg.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => openDetail(pkg.id)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#F0FAF4] flex items-center justify-center flex-shrink-0">
                                <Home className="w-4 h-4 text-[#09694A]" />
                              </div>
                              <div className="font-semibold text-gray-900">{pkg.propertyAddress}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-900 font-medium">{pkg.buyerName}</div>
                            <div className="text-gray-500 text-xs mt-0.5">{pkg.buyerEmail}</div>
                          </td>
                          <td className="px-6 py-4">
                            {statusBadge(pkg.status)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-xs font-semibold text-[#09694A] bg-[#F0FAF4] group-hover:bg-[#D4EBDE] transition-colors">
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="sm:hidden divide-y divide-gray-100">
                  {packages.map(pkg => (
                    <div key={pkg.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer group" onClick={() => openDetail(pkg.id)}>
                      <div className="w-12 h-12 rounded-xl bg-[#F0FAF4] flex items-center justify-center flex-shrink-0">
                        <Home className="w-6 h-6 text-[#09694A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{pkg.propertyAddress}</h3>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{pkg.buyerName}</p>
                        <div className="mt-2">{statusBadge(pkg.status)}</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CREATE VIEW */}
        {view === "create" && (
          <div className="bg-white shadow-sm border border-gray-200 rounded-2xl p-5 sm:p-8 max-w-2xl mx-auto sm:mx-0">
            <h2 className="text-lg font-bold text-gray-900 mb-6 hidden sm:block">Create Handoff Package</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Property Address</label>
                <input
                  type="text"
                  className="w-full min-h-[44px] px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#09694A] focus:border-transparent transition-all text-sm outline-none"
                  placeholder="123 Main St, Springfield, IL"
                  value={form.propertyAddress}
                  onChange={e => setForm(f => ({ ...f, propertyAddress: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Buyer Name</label>
                  <input
                    type="text"
                    className="w-full min-h-[44px] px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#09694A] focus:border-transparent transition-all text-sm outline-none"
                    placeholder="Jane Smith"
                    value={form.buyerName}
                    onChange={e => setForm(f => ({ ...f, buyerName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Buyer Email</label>
                  <input
                    type="email"
                    className="w-full min-h-[44px] px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#09694A] focus:border-transparent transition-all text-sm outline-none"
                    placeholder="jane@example.com"
                    value={form.buyerEmail}
                    onChange={e => setForm(f => ({ ...f, buyerEmail: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes (optional)</label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#09694A] focus:border-transparent transition-all text-sm outline-none resize-none"
                  placeholder="Any notes for the buyer..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
                <button
                  className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl bg-[#09694A] text-white text-sm font-semibold hover:bg-[#079669] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !form.propertyAddress || !form.buyerName || !form.buyerEmail}
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create Package
                </button>
                <button
                  className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors w-full sm:w-auto"
                  onClick={() => { setView("list"); window.history.pushState({}, '', '/agent-handoff'); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DETAIL VIEW */}
        {view === "detail" && detail && (
          <div className="space-y-6 max-w-4xl">
            {/* Package header */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">{detail.propertyAddress}</h2>
                    {statusBadge(detail.status)}
                  </div>
                  <p className="text-sm text-gray-600">Buyer: <span className="font-semibold text-gray-900">{detail.buyerName}</span> ({detail.buyerEmail})</p>
                  {detail.notes && <p className="text-sm text-gray-500 mt-3 bg-gray-50 p-3 rounded-xl border border-gray-100">{detail.notes}</p>}
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {detail.sentAt && <span>Sent {new Date(detail.sentAt).toLocaleDateString()}</span>}
                    {detail.claimedAt && <span className="text-[#09694A]">Claimed {new Date(detail.claimedAt).toLocaleDateString()}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  {claimUrl && (
                    <button
                      className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors flex-1 sm:flex-none"
                      onClick={() => { navigator.clipboard.writeText(claimUrl); toast({ title: "Copied", description: "Claim link copied to clipboard" }); }}
                    >
                      <Copy className="w-4 h-4 mr-2" /> Copy Link
                    </button>
                  )}
                  {claimUrl && (
                    <a href={claimUrl} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
                      <span className="w-full inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors">
                        <ExternalLink className="w-4 h-4 mr-2" /> Preview
                      </span>
                    </a>
                  )}
                  {detail.status !== "claimed" && (
                    <button
                      className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-[#09694A] text-white text-sm font-semibold hover:bg-[#079669] transition-colors shadow-sm w-full sm:w-auto"
                      onClick={() => sendMutation.mutate(detail.id)}
                      disabled={sendMutation.isPending}
                    >
                      {sendMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      {detail.status === "sent" ? "Resend to Buyer" : "Send to Buyer"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Document Upload */}
            {detail.status !== "claimed" && (
              <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#09694A]" /> Upload Documents
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Upload closing documents, inspection reports, or disclosure forms. AI will automatically extract home system and appliance data.</p>
                </div>
                <div className="p-5 sm:p-6">
                  <div className="border-2 border-dashed border-[#A7D7B8] rounded-2xl p-8 sm:p-10 text-center bg-[#F0FAF4]/40 hover:bg-[#F0FAF4] transition-colors relative group">
                    {uploadingDoc ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-[#09694A]" />
                        <p className="text-[#09694A] font-semibold text-sm">Processing document with AI...</p>
                        <p className="text-xs text-[#079669]">Extracting home systems and appliances</p>
                      </div>
                    ) : (
                      <>
                        <FileUp className="w-12 h-12 mx-auto mb-3 text-[#079669] group-hover:scale-110 transition-transform" />
                        <p className="font-bold text-gray-900 mb-1">Drop a file or click to browse</p>
                        <p className="text-xs font-medium text-gray-500 mb-6">PDF, JPG, PNG, WebP — up to 10MB</p>
                        <label className="cursor-pointer">
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff" className="hidden" onChange={handleUpload} />
                          <span className="inline-flex items-center justify-center min-h-[44px] px-8 rounded-xl bg-[#09694A] text-white text-sm font-semibold shadow-sm hover:bg-[#079669] transition-colors">
                            <FileUp className="w-4 h-4 mr-2" /> Choose File
                          </span>
                        </label>
                      </>
                    )}
                  </div>

                  {detail.documents.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Uploaded Documents</p>
                      {detail.documents.map(doc => (
                        <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                          <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-gray-400" />
                          </div>
                          <span className="text-sm font-semibold text-gray-700 flex-1 truncate">{doc.fileName}</span>
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{new Date(doc.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Extracted Data */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Home className="w-4 h-4 text-[#09694A]" /> Extracted Home Data
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Information extracted from documents and available for the buyer.</p>
                </div>
                {detail.status !== "claimed" && !editMode && (
                  <button
                    className="inline-flex items-center justify-center min-h-[44px] sm:min-h-[44px] px-5 sm:px-4 rounded-xl sm:rounded-lg bg-white border border-gray-200 text-gray-700 text-sm sm:text-xs font-semibold hover:bg-gray-50 transition-colors shadow-sm w-full sm:w-auto"
                    onClick={startEdit}
                  >
                    <Edit2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-2 sm:mr-1.5" /> Edit Data
                  </button>
                )}
                {editMode && (
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button
                      className="flex-1 sm:flex-none inline-flex items-center justify-center min-h-[44px] sm:min-h-[44px] px-5 sm:px-4 rounded-xl sm:rounded-lg bg-white border border-gray-200 text-gray-700 text-sm sm:text-xs font-semibold hover:bg-gray-50 transition-colors"
                      onClick={() => { setEditMode(false); setEditingData(null); }}
                    >
                      Cancel
                    </button>
                    <button
                      className="flex-1 sm:flex-none inline-flex items-center justify-center min-h-[44px] sm:min-h-[44px] px-6 sm:px-5 rounded-xl sm:rounded-lg bg-[#09694A] text-white text-sm sm:text-xs font-semibold hover:bg-[#079669] transition-colors shadow-sm"
                      onClick={saveEdit}
                      disabled={updateDataMutation.isPending}
                    >
                      {updateDataMutation.isPending ? <Loader2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-2 sm:mr-1.5 animate-spin" /> : <CheckCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-2 sm:mr-1.5" />}
                      Save
                    </button>
                  </div>
                )}
              </div>
              <div className="p-5 sm:p-6">
                {!detail.extractedData && !editMode ? (
                  <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-2xl border-dashed">
                    <Home className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="font-bold text-gray-900">No data extracted yet</p>
                    <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">Upload documents above to auto-populate home information, or click Edit Data to enter it manually.</p>
                  </div>
                ) : editMode && editingData ? (
                  <div className="space-y-10">
                    {/* SYSTEMS */}
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center justify-between">
                        Home Systems
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[10px]">{editingData.systems.length}</span>
                      </h4>
                      <div className="space-y-4">
                        {editingData.systems.map((sys, idx) => (
                          <div key={idx} className="p-5 bg-white border border-gray-200 rounded-2xl relative group shadow-sm">
                            <button
                              className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white border border-gray-200 text-red-500 flex items-center justify-center shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                              onClick={() => removeSystem(idx)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">System Name</label>
                                <input className="w-full min-h-[44px] px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm outline-none focus:border-[#09694A] focus:ring-2 focus:ring-[#09694A] focus:border-transparent transition-all" placeholder="e.g. HVAC" value={sys.name} onChange={e => { const s = [...editingData.systems]; s[idx] = { ...s[idx], name: e.target.value }; setEditingData({ ...editingData, systems: s }); }} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Brand</label>
                                <input className="w-full min-h-[44px] px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm outline-none focus:border-[#09694A] focus:ring-2 focus:ring-[#09694A] focus:border-transparent transition-all" placeholder="e.g. Carrier" value={sys.brand || ""} onChange={e => { const s = [...editingData.systems]; s[idx] = { ...s[idx], brand: e.target.value || null }; setEditingData({ ...editingData, systems: s }); }} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Model</label>
                                <input className="w-full min-h-[44px] px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm outline-none focus:border-[#09694A] focus:ring-2 focus:ring-[#09694A] focus:border-transparent transition-all" placeholder="Model number" value={sys.model || ""} onChange={e => { const s = [...editingData.systems]; s[idx] = { ...s[idx], model: e.target.value || null }; setEditingData({ ...editingData, systems: s }); }} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Year</label>
                                <input type="number" className="w-full min-h-[44px] px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm outline-none focus:border-[#09694A] focus:ring-2 focus:ring-[#09694A] focus:border-transparent transition-all" placeholder="YYYY" value={sys.yearInstalled || ""} onChange={e => { const s = [...editingData.systems]; s[idx] = { ...s[idx], yearInstalled: e.target.value ? parseInt(e.target.value) : null }; setEditingData({ ...editingData, systems: s }); }} />
                              </div>
                            </div>
                          </div>
                        ))}
                        <button
                          className="w-full inline-flex items-center justify-center min-h-[44px] rounded-xl border border-dashed border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors bg-white shadow-sm"
                          onClick={() => setEditingData({ ...editingData, systems: [...editingData.systems, { name: "", brand: null, model: null, yearInstalled: null, notes: null }] })}
                        >
                          <Plus className="w-4 h-4 mr-2" /> Add System
                        </button>
                      </div>
                    </div>

                    {/* APPLIANCES */}
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center justify-between">
                        Appliances
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[10px]">{editingData.appliances.length}</span>
                      </h4>
                      <div className="space-y-4">
                        {editingData.appliances.map((app, idx) => (
                          <div key={idx} className="p-5 bg-white border border-gray-200 rounded-2xl relative group shadow-sm">
                            <button
                              className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white border border-gray-200 text-red-500 flex items-center justify-center shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                              onClick={() => removeAppliance(idx)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Appliance Name</label>
                                <input className="w-full min-h-[44px] px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm outline-none focus:border-[#09694A] focus:ring-2 focus:ring-[#09694A] focus:border-transparent transition-all" placeholder="e.g. Refrigerator" value={app.name} onChange={e => { const a = [...editingData.appliances]; a[idx] = { ...a[idx], name: e.target.value }; setEditingData({ ...editingData, appliances: a }); }} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Make/Brand</label>
                                <input className="w-full min-h-[44px] px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm outline-none focus:border-[#09694A] focus:ring-2 focus:ring-[#09694A] focus:border-transparent transition-all" placeholder="e.g. Samsung" value={app.make || ""} onChange={e => { const a = [...editingData.appliances]; a[idx] = { ...a[idx], make: e.target.value || null }; setEditingData({ ...editingData, appliances: a }); }} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Model</label>
                                <input className="w-full min-h-[44px] px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm outline-none focus:border-[#09694A] focus:ring-2 focus:ring-[#09694A] focus:border-transparent transition-all" placeholder="Model number" value={app.model || ""} onChange={e => { const a = [...editingData.appliances]; a[idx] = { ...a[idx], model: e.target.value || null }; setEditingData({ ...editingData, appliances: a }); }} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Year</label>
                                <input type="number" className="w-full min-h-[44px] px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm outline-none focus:border-[#09694A] focus:ring-2 focus:ring-[#09694A] focus:border-transparent transition-all" placeholder="YYYY" value={app.yearInstalled || ""} onChange={e => { const a = [...editingData.appliances]; a[idx] = { ...a[idx], yearInstalled: e.target.value ? parseInt(e.target.value) : null }; setEditingData({ ...editingData, appliances: a }); }} />
                              </div>
                            </div>
                          </div>
                        ))}
                        <button
                          className="w-full inline-flex items-center justify-center min-h-[44px] rounded-xl border border-dashed border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors bg-white shadow-sm"
                          onClick={() => setEditingData({ ...editingData, appliances: [...editingData.appliances, { name: "", make: null, model: null, yearInstalled: null, serialNumber: null, warrantyExpiration: null, notes: null }] })}
                        >
                          <Plus className="w-4 h-4 mr-2" /> Add Appliance
                        </button>
                      </div>
                    </div>

                    {/* PROPERTY DETAILS */}
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider mb-4">Property Details</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 p-6 bg-white shadow-sm border border-gray-200 rounded-2xl">
                        {[
                          { label: "Year Built", type: "number", placeholder: "e.g. 1998", val: editingData.propertyDetails.yearBuilt, key: "yearBuilt" },
                          { label: "Square Footage", type: "number", placeholder: "e.g. 2400", val: editingData.propertyDetails.squareFootage, key: "squareFootage" },
                          { label: "Roof Type", type: "text", placeholder: "e.g. Asphalt shingle", val: editingData.propertyDetails.roofType, key: "roofType" },
                          { label: "Roof Age (years)", type: "number", placeholder: "e.g. 5", val: editingData.propertyDetails.roofAge, key: "roofAge" },
                          { label: "Foundation Type", type: "text", placeholder: "e.g. Poured concrete", val: editingData.propertyDetails.foundationType, key: "foundationType" },
                          { label: "Electrical Panel (amps)", type: "number", placeholder: "e.g. 200", val: editingData.propertyDetails.electricalPanelAmps, key: "electricalPanelAmps" },
                          { label: "Heating Fuel", type: "text", placeholder: "e.g. Natural gas", val: editingData.propertyDetails.heatingFuel, key: "heatingFuel" },
                        ].map((f, i) => (
                          <div key={i}>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{f.label}</label>
                            <input
                              type={f.type}
                              className="w-full min-h-[44px] px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm outline-none focus:border-[#09694A] focus:ring-2 focus:ring-[#09694A] focus:border-transparent transition-all"
                              placeholder={f.placeholder}
                              value={f.val ?? ""}
                              onChange={e => setEditingData({ ...editingData, propertyDetails: { ...editingData.propertyDetails, [f.key]: f.type === "number" ? (e.target.value ? parseInt(e.target.value) : null) : (e.target.value || null) } })}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Read-only Data View */}
                    {detail.extractedData && (
                      <>
                        {detail.extractedData.systems && detail.extractedData.systems.length > 0 && (
                          <div>
                            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Systems</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {detail.extractedData.systems.map((s, i) => (
                                <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                                  <div className="font-bold text-gray-900 mb-2">{s.name}</div>
                                  <div className="text-xs text-gray-600 space-y-1">
                                    {s.brand && <div><span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px] mr-1">Brand:</span> {s.brand}</div>}
                                    {s.model && <div><span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px] mr-1">Model:</span> {s.model}</div>}
                                    {s.yearInstalled && <div><span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px] mr-1">Year:</span> {s.yearInstalled}</div>}
                                    {!s.brand && !s.model && !s.yearInstalled && <div className="italic text-gray-400">No details extracted</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {detail.extractedData.appliances && detail.extractedData.appliances.length > 0 && (
                          <div>
                            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Appliances</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {detail.extractedData.appliances.map((a, i) => (
                                <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                                  <div className="font-bold text-gray-900 mb-2">{a.name}</div>
                                  <div className="text-xs text-gray-600 space-y-1">
                                    {a.make && <div><span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px] mr-1">Make:</span> {a.make}</div>}
                                    {a.model && <div><span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px] mr-1">Model:</span> {a.model}</div>}
                                    {a.yearInstalled && <div><span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px] mr-1">Year:</span> {a.yearInstalled}</div>}
                                    {!a.make && !a.model && !a.yearInstalled && <div className="italic text-gray-400">No details extracted</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {detail.extractedData.propertyDetails && Object.keys(detail.extractedData.propertyDetails).length > 0 && (
                          <div>
                            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Property Details</h4>
                            <div className="p-5 bg-gray-50 border border-gray-100 rounded-xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                              {Object.entries(detail.extractedData.propertyDetails).map(([k, v]) => v && (
                                <div key={k}>
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                                  <div className="text-sm font-semibold text-gray-900">{v}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
