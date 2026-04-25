import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus, FileUp, Send, ChevronLeft, Loader2, Home, CheckCircle,
  FileText, Trash2, Edit2, Copy, ExternalLink, Package
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import "./home.css";

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
    case "draft": return <Badge variant="secondary">Draft</Badge>;
    case "sent": return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Sent</Badge>;
    case "claimed": return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1 inline" />Claimed</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function AgentHandoff() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ propertyAddress: "", buyerName: "", buyerEmail: "", notes: "" });
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [editingData, setEditingData] = useState<ExtractedData | null>(null);
  const [editMode, setEditMode] = useState(false);

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
    <div className="min-h-screen" style={{ background: '#ffffff' }}>
      <div className="dash-header" style={{ background: '#09694A' }}>
        <span className="dash-eyebrow" style={{ color: '#D4EBDE' }}>Real Estate Agent</span>
        <div className="dash-title">Home Handoffs</div>
        <div className="dash-subtitle">
          {view === "list" ? "Create packages to hand off home data to new buyers" :
           view === "create" ? "Create a new handoff package" :
           "Package detail"}
        </div>
        {view !== "list" && (
          <button
            onClick={() => { setView("list"); setSelectedId(null); }}
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 9, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', marginTop: 8, alignSelf: 'flex-start' }}
          >← Back</button>
        )}
      </div>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <div>
            <p className="text-gray-500 mt-1">
              {view === "list" ? "" :
               view === "create" ? "Fill in the details below" :
               "Package detail"}
            </p>
          </div>
          {view === "list" && (
            <Button className="ml-auto bg-white text-emerald-700 hover:bg-emerald-50" onClick={() => { setForm({ propertyAddress: "", buyerName: "", buyerEmail: "", notes: "" }); setView("create"); }}>
              <Plus className="w-4 h-4 mr-2" /> New Handoff
            </Button>
          )}
        </div>

        {/* LIST VIEW */}
        {view === "list" && (
          <div className="space-y-4">
            {isLoading && (
              <Card className="shadow rounded-2xl bg-white"><CardContent className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" /></CardContent></Card>
            )}
            {!isLoading && packages.length === 0 && (
              <Card className="bg-white shadow rounded-2xl">
                <CardContent className="py-16 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-emerald-300" />
                  <p className="text-gray-500 font-medium mb-2">No handoff packages yet</p>
                  <p className="text-gray-400 text-sm mb-6">Create a package to send pre-filled home data to a buyer</p>
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setView("create")}>
                    <Plus className="w-4 h-4 mr-2" /> Create First Package
                  </Button>
                </CardContent>
              </Card>
            )}
            {packages.map(pkg => (
              <Card key={pkg.id} className="bg-white shadow hover:shadow-md transition-shadow cursor-pointer rounded-2xl" onClick={() => openDetail(pkg.id)}>
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Home className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{pkg.propertyAddress}</p>
                      <p className="text-sm text-gray-600">{pkg.buyerName} · {pkg.buyerEmail}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(pkg.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {statusBadge(pkg.status)}
                    <ChevronLeft className="w-4 h-4 text-gray-400 rotate-180" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* CREATE VIEW */}
        {view === "create" && (
          <Card className="bg-white shadow rounded-2xl">
            <CardHeader>
              <CardTitle>New Handoff Package</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Property Address</Label>
                <Input placeholder="123 Main St, Springfield, IL 62701" value={form.propertyAddress} onChange={e => setForm(f => ({ ...f, propertyAddress: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Buyer Name</Label>
                  <Input placeholder="Jane Smith" value={form.buyerName} onChange={e => setForm(f => ({ ...f, buyerName: e.target.value }))} />
                </div>
                <div>
                  <Label>Buyer Email</Label>
                  <Input type="email" placeholder="jane@example.com" value={form.buyerEmail} onChange={e => setForm(f => ({ ...f, buyerEmail: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea placeholder="Any notes for the buyer..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.propertyAddress || !form.buyerName || !form.buyerEmail}>
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create Package
                </Button>
                <Button variant="outline" onClick={() => setView("list")}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* DETAIL VIEW */}
        {view === "detail" && detail && (
          <div className="space-y-6">
            {/* Package header */}
            <Card className="bg-white shadow rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-bold text-gray-900">{detail.propertyAddress}</h2>
                      {statusBadge(detail.status)}
                    </div>
                    <p className="text-gray-600">Buyer: <strong>{detail.buyerName}</strong> ({detail.buyerEmail})</p>
                    {detail.notes && <p className="text-sm text-gray-500 mt-1">{detail.notes}</p>}
                    {detail.sentAt && <p className="text-xs text-gray-400 mt-1">Sent {new Date(detail.sentAt).toLocaleDateString()}</p>}
                    {detail.claimedAt && <p className="text-xs text-green-600 mt-1">Claimed {new Date(detail.claimedAt).toLocaleDateString()}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {claimUrl && (
                      <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(claimUrl); toast({ title: "Copied", description: "Claim link copied to clipboard" }); }}>
                        <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Link
                      </Button>
                    )}
                    {claimUrl && (
                      <a href={claimUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm"><ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Preview</Button>
                      </a>
                    )}
                    {detail.status !== "claimed" && (
                      <Button className="bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={() => sendMutation.mutate(detail.id)} disabled={sendMutation.isPending}>
                        {sendMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                        {detail.status === "sent" ? "Resend to Buyer" : "Send to Buyer"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Upload */}
            {detail.status !== "claimed" && (
              <Card className="bg-white shadow rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-600" /> Upload Documents</CardTitle>
                  <p className="text-sm text-gray-500">Upload closing documents, inspection reports, or disclosure forms. AI will automatically extract home system and appliance data.</p>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-emerald-200 rounded-xl p-8 text-center bg-emerald-50/40">
                    {uploadingDoc ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                        <p className="text-emerald-700 font-medium">Processing document with AI...</p>
                        <p className="text-sm text-gray-500">Extracting home systems and appliances</p>
                      </div>
                    ) : (
                      <>
                        <FileUp className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
                        <p className="font-medium text-gray-700 mb-1">Drop a file or click to browse</p>
                        <p className="text-sm text-gray-400 mb-4">PDF, JPG, PNG, WebP — up to 10MB</p>
                        <label>
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff" className="hidden" onChange={handleUpload} />
                          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                            <span><FileUp className="w-4 h-4 mr-2" /> Choose File</span>
                          </Button>
                        </label>
                      </>
                    )}
                  </div>

                  {detail.documents.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-gray-700">Uploaded Documents</p>
                      {detail.documents.map(doc => (
                        <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-700 flex-1 truncate">{doc.fileName}</span>
                          <span className="text-xs text-gray-400">{new Date(doc.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Extracted Data */}
            <Card className="bg-white shadow rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Home className="w-4 h-4 text-emerald-600" /> Extracted Home Data</CardTitle>
                  {detail.status !== "claimed" && !editMode && (
                    <Button variant="outline" size="sm" onClick={startEdit}><Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit</Button>
                  )}
                  {editMode && (
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={saveEdit} disabled={updateDataMutation.isPending}>
                        {updateDataMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditMode(false); setEditingData(null); }}>Cancel</Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!detail.extractedData && !editMode ? (
                  <div className="text-center py-10 text-gray-400">
                    <Home className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No data extracted yet</p>
                    <p className="text-sm">Upload documents above to auto-populate home information</p>
                  </div>
                ) : editMode && editingData ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3">Home Systems ({editingData.systems.length})</h3>
                      <div className="space-y-3">
                        {editingData.systems.map((sys, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <Input placeholder="System name" value={sys.name} onChange={e => { const s = [...editingData.systems]; s[idx] = { ...s[idx], name: e.target.value }; setEditingData({ ...editingData, systems: s }); }} />
                              <Input placeholder="Brand" value={sys.brand || ""} onChange={e => { const s = [...editingData.systems]; s[idx] = { ...s[idx], brand: e.target.value || null }; setEditingData({ ...editingData, systems: s }); }} />
                              <Input placeholder="Model" value={sys.model || ""} onChange={e => { const s = [...editingData.systems]; s[idx] = { ...s[idx], model: e.target.value || null }; setEditingData({ ...editingData, systems: s }); }} />
                              <Input placeholder="Year installed" type="number" value={sys.yearInstalled || ""} onChange={e => { const s = [...editingData.systems]; s[idx] = { ...s[idx], yearInstalled: e.target.value ? parseInt(e.target.value) : null }; setEditingData({ ...editingData, systems: s }); }} />
                            </div>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 mt-1" onClick={() => removeSystem(idx)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => setEditingData({ ...editingData, systems: [...editingData.systems, { name: "", brand: null, model: null, yearInstalled: null, notes: null }] })}>
                          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add System
                        </Button>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3">Appliances ({editingData.appliances.length})</h3>
                      <div className="space-y-3">
                        {editingData.appliances.map((app, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <Input placeholder="Appliance name" value={app.name} onChange={e => { const a = [...editingData.appliances]; a[idx] = { ...a[idx], name: e.target.value }; setEditingData({ ...editingData, appliances: a }); }} />
                              <Input placeholder="Make / Brand" value={app.make || ""} onChange={e => { const a = [...editingData.appliances]; a[idx] = { ...a[idx], make: e.target.value || null }; setEditingData({ ...editingData, appliances: a }); }} />
                              <Input placeholder="Model" value={app.model || ""} onChange={e => { const a = [...editingData.appliances]; a[idx] = { ...a[idx], model: e.target.value || null }; setEditingData({ ...editingData, appliances: a }); }} />
                              <Input placeholder="Year installed" type="number" value={app.yearInstalled || ""} onChange={e => { const a = [...editingData.appliances]; a[idx] = { ...a[idx], yearInstalled: e.target.value ? parseInt(e.target.value) : null }; setEditingData({ ...editingData, appliances: a }); }} />
                            </div>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 mt-1" onClick={() => removeAppliance(idx)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => setEditingData({ ...editingData, appliances: [...editingData.appliances, { name: "", make: null, model: null, yearInstalled: null, serialNumber: null, warrantyExpiration: null, notes: null }] })}>
                          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Appliance
                        </Button>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3">Property Details</h3>
                      <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Year Built</Label>
                          <Input type="number" placeholder="e.g. 1998" value={editingData.propertyDetails.yearBuilt ?? ""} onChange={e => setEditingData({ ...editingData, propertyDetails: { ...editingData.propertyDetails, yearBuilt: e.target.value ? parseInt(e.target.value) : null } })} />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Square Footage</Label>
                          <Input type="number" placeholder="e.g. 2400" value={editingData.propertyDetails.squareFootage ?? ""} onChange={e => setEditingData({ ...editingData, propertyDetails: { ...editingData.propertyDetails, squareFootage: e.target.value ? parseInt(e.target.value) : null } })} />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Roof Type</Label>
                          <Input placeholder="e.g. Asphalt shingle" value={editingData.propertyDetails.roofType ?? ""} onChange={e => setEditingData({ ...editingData, propertyDetails: { ...editingData.propertyDetails, roofType: e.target.value || null } })} />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Roof Age (years)</Label>
                          <Input type="number" placeholder="e.g. 5" value={editingData.propertyDetails.roofAge ?? ""} onChange={e => setEditingData({ ...editingData, propertyDetails: { ...editingData.propertyDetails, roofAge: e.target.value ? parseInt(e.target.value) : null } })} />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Foundation Type</Label>
                          <Input placeholder="e.g. Poured concrete" value={editingData.propertyDetails.foundationType ?? ""} onChange={e => setEditingData({ ...editingData, propertyDetails: { ...editingData.propertyDetails, foundationType: e.target.value || null } })} />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Electrical Panel (amps)</Label>
                          <Input type="number" placeholder="e.g. 200" value={editingData.propertyDetails.electricalPanelAmps ?? ""} onChange={e => setEditingData({ ...editingData, propertyDetails: { ...editingData.propertyDetails, electricalPanelAmps: e.target.value ? parseInt(e.target.value) : null } })} />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Heating Fuel</Label>
                          <Input placeholder="e.g. Natural gas" value={editingData.propertyDetails.heatingFuel ?? ""} onChange={e => setEditingData({ ...editingData, propertyDetails: { ...editingData.propertyDetails, heatingFuel: e.target.value || null } })} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3">Warranties ({editingData.warranties.length})</h3>
                      <div className="space-y-3">
                        {editingData.warranties.map((w, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <Input placeholder="Item (e.g. Roof)" value={w.item} onChange={e => { const ws = [...editingData.warranties]; ws[idx] = { ...ws[idx], item: e.target.value }; setEditingData({ ...editingData, warranties: ws }); }} />
                              <Input placeholder="Expiration date" value={w.expiration ?? ""} onChange={e => { const ws = [...editingData.warranties]; ws[idx] = { ...ws[idx], expiration: e.target.value || null }; setEditingData({ ...editingData, warranties: ws }); }} />
                              <Input className="col-span-2" placeholder="Notes" value={w.notes ?? ""} onChange={e => { const ws = [...editingData.warranties]; ws[idx] = { ...ws[idx], notes: e.target.value || null }; setEditingData({ ...editingData, warranties: ws }); }} />
                            </div>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 mt-1" onClick={() => setEditingData({ ...editingData, warranties: editingData.warranties.filter((_, i) => i !== idx) })}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => setEditingData({ ...editingData, warranties: [...editingData.warranties, { item: "", expiration: null, notes: null }] })}>
                          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Warranty
                        </Button>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">General Notes</h3>
                      <Textarea
                        placeholder="Any additional notes about this property..."
                        value={editingData.generalNotes ?? ""}
                        onChange={e => setEditingData({ ...editingData, generalNotes: e.target.value || null })}
                        rows={3}
                      />
                    </div>
                  </div>
                ) : detail.extractedData ? (
                  <ExtractedDataView data={detail.extractedData} />
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function ExtractedDataView({ data }: { data: ExtractedData }) {
  const { systems = [], appliances = [], propertyDetails = {}, warranties = [], generalNotes } = data;

  return (
    <div className="space-y-6">
      {Object.keys(propertyDetails).some(k => Boolean((propertyDetails as Record<string, unknown>)[k])) && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide text-gray-500">Property Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {propertyDetails.yearBuilt && <InfoChip label="Year Built" value={String(propertyDetails.yearBuilt)} />}
            {propertyDetails.squareFootage && <InfoChip label="Sq Ft" value={String(propertyDetails.squareFootage)} />}
            {propertyDetails.roofType && <InfoChip label="Roof" value={propertyDetails.roofType} />}
            {propertyDetails.roofAge && <InfoChip label="Roof Age" value={`${propertyDetails.roofAge} yrs`} />}
            {propertyDetails.foundationType && <InfoChip label="Foundation" value={propertyDetails.foundationType} />}
            {propertyDetails.electricalPanelAmps && <InfoChip label="Electrical" value={`${propertyDetails.electricalPanelAmps}A`} />}
            {propertyDetails.heatingFuel && <InfoChip label="Heat Fuel" value={propertyDetails.heatingFuel} />}
          </div>
        </div>
      )}

      {systems.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-3">Home Systems ({systems.length})</h3>
          <div className="space-y-2">
            {systems.map((sys, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{sys.name}</p>
                  <p className="text-sm text-gray-500">
                    {[sys.brand, sys.model].filter(Boolean).join(" · ")}
                    {sys.yearInstalled ? ` · Installed ${sys.yearInstalled}` : ""}
                  </p>
                  {sys.notes && <p className="text-xs text-gray-400 mt-0.5">{sys.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {appliances.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-3">Appliances ({appliances.length})</h3>
          <div className="space-y-2">
            {appliances.map((app, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{app.name}</p>
                  <p className="text-sm text-gray-500">
                    {[app.make, app.model].filter(Boolean).join(" · ")}
                    {app.yearInstalled ? ` · ${app.yearInstalled}` : ""}
                  </p>
                  {app.warrantyExpiration && <p className="text-xs text-emerald-600 mt-0.5">Warranty: {app.warrantyExpiration}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {warranties.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-3">Warranties ({warranties.length})</h3>
          <div className="space-y-2">
            {warranties.map((w, i) => (
              <div key={i} className="p-3 rounded-lg bg-green-50 border border-green-100">
                <p className="font-medium text-gray-900">{w.item}</p>
                {w.expiration && <p className="text-sm text-gray-500">Expires: {w.expiration}</p>}
                {w.notes && <p className="text-xs text-gray-400 mt-0.5">{w.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {generalNotes && (
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 mb-2">Notes</h3>
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{generalNotes}</p>
        </div>
      )}

      {systems.length === 0 && appliances.length === 0 && warranties.length === 0 && !generalNotes && (
        <p className="text-center text-gray-400 py-6">No data extracted yet. Upload documents to populate this section.</p>
      )}
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}
