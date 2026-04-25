import { useState, useRef, useEffect, lazy, Suspense } from "react";
const DisclosuresContent = lazy(() => import("./disclosures"));
import { InsurancePrepTab } from "./insurance-prep-tab";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Upload, Download, Trash2, FolderOpen, Shield, AlertTriangle,
  CheckCircle, Clock, Info, Eye, Home, Pencil, X, Star, AlertCircle, Search, ChevronUp
} from "lucide-react";
import logoHomeowner from "@assets/my-homebase-logo-tm-howner-white-final_1776538414393.png";
import "./home.css";
import type { House, HomeDocument } from "@shared/schema";

const CATEGORIES = [
  { value: "inspection_report", label: "Inspection Reports", icon: Search },
  { value: "insurance", label: "Insurance Documents", icon: Shield },
  { value: "warranty", label: "Warranties", icon: Star },
  { value: "permit", label: "Permits & Approvals", icon: CheckCircle },
  { value: "mortgage", label: "Mortgage Documents", icon: Home },
  { value: "hoa", label: "HOA Documents", icon: FolderOpen },
  { value: "other", label: "Other", icon: FileText },
];

function categoryLabel(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.label || cat;
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface InspectionExtractionData {
  propertyAddress?: string | null;
  inspectionDate?: string | null;
  inspectorName?: string | null;
  inspectorLicense?: string | null;
  roofAge?: string | null;
  roofCondition?: string | null;
  hvacAge?: string | null;
  hvacCondition?: string | null;
  hvacType?: string | null;
  electricalPanelType?: string | null;
  electricalPanelCondition?: string | null;
  plumbingCondition?: string | null;
  foundationCondition?: string | null;
  waterHeaterAge?: string | null;
  waterHeaterCondition?: string | null;
  deficiencies?: { description: string; severity: string; area: string }[];
  generalSummary?: string | null;
}

export default function Documents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inspectionInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editDocId, setEditDocId] = useState<string | null>(null);

  const [uploadForm, setUploadForm] = useState({ category: "other", notes: "", fileName: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspectionFile, setInspectionFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<InspectionExtractionData>({});
  const [pendingDocId, setPendingDocId] = useState<string | null>(null);
  const [editDoc, setEditDoc] = useState<{ fileName: string; notes: string; category: string } | null>(null);
  const [editingHouseId, setEditingHouseId] = useState<string | null>(null);
  const [topSection, setTopSection] = useState<"documents" | "disclosures" | "insurance">("documents");

  const { data: documents = [], isLoading } = useQuery<HomeDocument[]>({
    queryKey: ["/api/home-documents"],
    enabled: !!(user as any)?.id,
  });

  const { data: houses = [] } = useQuery<House[]>({
    queryKey: ["/api/houses"],
    enabled: !!(user as any)?.id,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, category, notes, fileName }: { file: File; category: string; notes: string; fileName: string }) => {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("category", category);
      formData.append("notes", notes);
      formData.append("fileName", fileName || file.name);
      const res = await fetch("/api/home-documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/home-documents"] });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadForm({ category: "other", notes: "", fileName: "" });
      toast({ title: "Document uploaded successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const inspectionUploadMutation = useMutation({
    mutationFn: async ({ file, houseId }: { file: File; houseId: string }) => {
      const formData = new FormData();
      formData.append("document", file);
      if (houseId) formData.append("houseId", houseId);
      const res = await fetch("/api/home-documents/upload-inspection", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setExtractedData(data.extractedData || {});
      setPendingDocId(data.document?.id);
      setInspectionDialogOpen(false);
      setReviewDialogOpen(true);
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const confirmInspectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InspectionExtractionData }) => {
      return apiRequest("POST", `/api/home-documents/inspection/${id}/confirm`, { extractedData: data });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/home-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/homeowner/inspection-summary"] });
      setReviewDialogOpen(false);
      const tasksCreated = data?.tasksCreated || 0;
      toast({
        title: "Inspection report saved!",
        description: tasksCreated > 0
          ? `${tasksCreated} maintenance task${tasksCreated > 1 ? "s" : ""} created from flagged items.`
          : "Your home profile has been updated.",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/home-documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/home-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/homeowner/inspection-summary"] });
      setDeleteConfirmId(null);
      toast({ title: "Document deleted" });
    },
    onError: () => toast({ title: "Failed to delete document", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { fileName?: string; notes?: string; category?: string } }) =>
      apiRequest("PUT", `/api/home-documents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/home-documents"] });
      setEditDocId(null);
      setEditDoc(null);
      toast({ title: "Document updated" });
    },
    onError: () => toast({ title: "Failed to update document", variant: "destructive" }),
  });

  const filteredDocs = activeTab === "all"
    ? documents
    : documents.filter(d => d.category === activeTab);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadForm.fileName) setUploadForm(f => ({ ...f, fileName: file.name }));
    }
  }

  function handleInspectionFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setInspectionFile(file);
  }

  function handleDownload(doc: HomeDocument) {
    window.open(`/api/home-documents/${doc.id}/download`, "_blank");
  }

  function openEditDialog(doc: HomeDocument) {
    setEditDocId(doc.id);
    setEditDoc({ fileName: doc.fileName, notes: doc.notes || "", category: doc.category });
  }

  const deficiencies = Array.isArray(extractedData.deficiencies) ? extractedData.deficiencies : [];
  const criticalCount = deficiencies.filter(d => d.severity === "critical").length;
  const monitorCount = deficiencies.filter(d => d.severity === "monitor").length;

  return (
    <div className="min-h-screen pb-20 lg:pb-0" style={{ background: '#ffffff' }} data-tour-id="documents">

      {/* ── PAGE HEADER ─────────────────────────── */}
      <div className="dash-header">
        <div className="dash-header-top">
          {topSection === "documents" && (
            <div className="dash-header-actions">
              <button
                onClick={() => setInspectionDialogOpen(true)}
                className="dash-icon-btn"
                style={{ width: 'auto', padding: '0 10px', fontSize: 11, fontWeight: 700, gap: 4 }}
              >
                + Inspection
              </button>
              <button
                onClick={() => setUploadDialogOpen(true)}
                className="dash-icon-btn"
                style={{ width: 'auto', padding: '0 10px', fontSize: 11, fontWeight: 700, gap: 4 }}
              >
                + Upload
              </button>
            </div>
          )}
        </div>
        <span className="dash-eyebrow">Secure Storage</span>
        <div className="dash-title">Documents & Disclosures</div>
        <div className="dash-subtitle">All your home records and disclosure forms in one place</div>
        <div className="dash-chips">
          <div className="dash-chip">
            <div className={`dash-chip-num${documents.length > 0 ? ' good' : ''}`}>{documents.length}</div>
            <div className="dash-chip-label">Documents</div>
          </div>
          <div className="dash-chip">
            <div className="dash-chip-num">{CATEGORIES.length}</div>
            <div className="dash-chip-label">Categories</div>
          </div>
          <div className="dash-chip">
            <div className={`dash-chip-num${houses.length > 0 ? ' good' : ''}`}>{houses.length}</div>
            <div className="dash-chip-label">Properties</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-4 pb-6">
        {/* Top-level section switcher */}
        <div className="flex gap-1 mb-6 overflow-x-auto" style={{ borderBottom: '1px solid #ede9f8' }}>
          <button
            onClick={() => setTopSection("documents")}
            className="px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap"
            style={topSection === "documents" ? { borderColor: '#2c0f5b', color: '#2c0f5b' } : { borderColor: 'transparent', color: '#7c6fa0' }}
            data-testid="tab-documents"
          >
            Documents
          </button>
          <button
            onClick={() => setTopSection("disclosures")}
            className="px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap"
            style={topSection === "disclosures" ? { borderColor: '#2c0f5b', color: '#2c0f5b' } : { borderColor: 'transparent', color: '#7c6fa0' }}
            data-testid="tab-disclosures"
          >
            Disclosures
          </button>
          <button
            onClick={() => setTopSection("insurance")}
            className="px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap"
            style={topSection === "insurance" ? { borderColor: '#2c0f5b', color: '#2c0f5b' } : { borderColor: 'transparent', color: '#7c6fa0' }}
            data-testid="tab-insurance-prep"
          >
            Insurance Prep
          </button>
        </div>

        {topSection === "disclosures" ? (
          <Suspense fallback={<div className="py-12 text-center text-gray-400">Loading disclosures…</div>}>
            <DisclosuresContent embedded />
          </Suspense>
        ) : topSection === "insurance" ? (
          <InsurancePrepTab houses={houses} />
        ) : (
        <>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1" style={{ backgroundColor: '#f0ebfa' }}>
            <TabsTrigger value="all" className="text-xs sm:text-sm">All ({documents.length})</TabsTrigger>
            {CATEGORIES.map(cat => {
              const count = documents.filter(d => d.category === cat.value).length;
              if (count === 0 && activeTab !== cat.value) return null;
              return (
                <TabsTrigger key={cat.value} value={cat.value} className="text-xs sm:text-sm">
                  {cat.label} {count > 0 && `(${count})`}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="text-center py-12" style={{ color: '#b6a6f4' }}>Loading documents...</div>
            ) : filteredDocs.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 mx-auto mb-3" style={{ color: '#b6a6f4' }} />
                <p className="font-medium" style={{ color: '#4a3670' }}>No documents yet</p>
                <p className="text-sm mt-1" style={{ color: '#7c6fa0' }}>Upload your first document to get started</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredDocs.map(doc => (
                  <Card key={doc.id} className="transition-colors" style={{ border: '1px solid #ede9f8', boxShadow: '0 1px 4px rgba(44,15,91,0.05)' }}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">{doc.fileName}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {categoryLabel(doc.category)}
                                </Badge>
                                {doc.isInspectionReport && doc.extractionConfirmed && (
                                  <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    AI Extracted
                                  </Badge>
                                )}
                                {doc.isInspectionReport && !doc.extractionConfirmed && (
                                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Pending Review
                                  </Badge>
                                )}
                                {doc.flaggedItemCount != null && doc.flaggedItemCount > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    {doc.flaggedItemCount} flagged
                                  </Badge>
                                )}
                                {doc.fileSize && (
                                  <span className="text-xs text-gray-400">{formatBytes(doc.fileSize)}</span>
                                )}
                                <span className="text-xs text-gray-400">
                                  {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ""}
                                </span>
                              </div>
                              {doc.notes && (
                                <p className="text-sm text-gray-500 mt-1 line-clamp-1">{doc.notes}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {doc.isInspectionReport && !doc.extractionConfirmed && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                                  onClick={() => {
                                    setExtractedData((doc.extractedData as InspectionExtractionData) || {});
                                    setPendingDocId(doc.id);
                                    setReviewDialogOpen(true);
                                  }}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Review
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => openEditDialog(doc)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDownload(doc)}>
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => setDeleteConfirmId(doc.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        </>
        )}
      </div>

      {/* Upload General Document Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Add a document to your Home Documents vault</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document</Label>
              <div
                className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="text-sm">
                    <FileText className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                    <p className="font-medium text-gray-700">{selectedFile.name}</p>
                    <p className="text-gray-400">{formatBytes(selectedFile.size)}</p>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    <Upload className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p>Click to select a file</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 50MB</p>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileSelect} />
            </div>
            <div>
              <Label htmlFor="fileName">Document Name</Label>
              <Input
                id="fileName"
                value={uploadForm.fileName}
                onChange={e => setUploadForm(f => ({ ...f, fileName: e.target.value }))}
                placeholder="e.g. Home Insurance 2024"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={uploadForm.category} onValueChange={v => setUploadForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={uploadForm.notes}
                onChange={e => setUploadForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Add any notes about this document..."
                className="mt-1 h-20"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={!selectedFile || uploadMutation.isPending}
                onClick={() => {
                  if (!selectedFile) return;
                  uploadMutation.mutate({
                    file: selectedFile,
                    category: uploadForm.category,
                    notes: uploadForm.notes,
                    fileName: uploadForm.fileName,
                  });
                }}
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Inspection Report Dialog */}
      <Dialog open={inspectionDialogOpen} onOpenChange={setInspectionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Inspection Report</DialogTitle>
            <DialogDescription>
              Our AI will automatically extract key information from your inspection report including conditions, deficiencies, and system ages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
              <Info className="w-4 h-4 inline mr-2" />
              Upload a PDF or image of your home inspection report. You'll be able to review and edit the extracted information before saving.
            </div>
            <div>
              <Label>Inspection Report</Label>
              <div
                className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 transition-colors"
                onClick={() => inspectionInputRef.current?.click()}
              >
                {inspectionFile ? (
                  <div className="text-sm">
                    <FileText className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                    <p className="font-medium text-gray-700">{inspectionFile.name}</p>
                    <p className="text-gray-400">{formatBytes(inspectionFile.size)}</p>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    <Upload className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p>Click to select inspection report</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 50MB</p>
                  </div>
                )}
              </div>
              <input ref={inspectionInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleInspectionFileSelect} />
            </div>
            {houses.length > 0 && (
              <div>
                <Label>Link to Property</Label>
                <Select value={editingHouseId || ""} onValueChange={v => setEditingHouseId(v || null)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a property (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No specific property</SelectItem>
                    {houses.map(h => (
                      <SelectItem key={h.id} value={h.id}>{h.address || `Property ${h.id.slice(0, 6)}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setInspectionDialogOpen(false)}>Cancel</Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={!inspectionFile || inspectionUploadMutation.isPending}
                onClick={() => {
                  if (!inspectionFile) return;
                  inspectionUploadMutation.mutate({ file: inspectionFile, houseId: editingHouseId || "" });
                }}
              >
                {inspectionUploadMutation.isPending ? "Analyzing..." : "Upload & Analyze"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inspection Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Extracted Information</DialogTitle>
            <DialogDescription>
              Review what was found in your inspection report. Edit any fields that look incorrect and confirm to save.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Deficiency summary */}
            {deficiencies.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-amber-800 dark:text-amber-300">
                    {deficiencies.length} Flagged Item{deficiencies.length > 1 ? "s" : ""} Found
                  </span>
                </div>
                {criticalCount > 0 && (
                  <p className="text-sm text-red-700 dark:text-red-400">• {criticalCount} critical item{criticalCount > 1 ? "s" : ""} needing immediate attention</p>
                )}
                {monitorCount > 0 && (
                  <p className="text-sm text-amber-700 dark:text-amber-400">• {monitorCount} item{monitorCount > 1 ? "s" : ""} to monitor</p>
                )}
                <p className="text-xs text-gray-500 mt-2">These will be added as maintenance tasks in your task list.</p>
              </div>
            )}

            {/* Basic Info */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Basic Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Property Address", key: "propertyAddress" },
                  { label: "Inspection Date", key: "inspectionDate" },
                  { label: "Inspector Name", key: "inspectorName" },
                  { label: "Inspector License", key: "inspectorLicense" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <Label className="text-xs text-gray-500 flex items-center gap-1">
                      {label}
                      {!(extractedData as any)[key] && (
                        <span className="text-amber-500 text-xs">(not found)</span>
                      )}
                    </Label>
                    <Input
                      className={`mt-1 text-sm ${!(extractedData as any)[key] ? "border-amber-300 bg-amber-50" : ""}`}
                      value={(extractedData as any)[key] || ""}
                      onChange={e => setExtractedData(d => ({ ...d, [key]: e.target.value || null }))}
                      placeholder={`Enter ${label.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Systems */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Home Systems</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Roof Age", key: "roofAge" },
                  { label: "Roof Condition", key: "roofCondition" },
                  { label: "HVAC Age", key: "hvacAge" },
                  { label: "HVAC Condition", key: "hvacCondition" },
                  { label: "HVAC Type", key: "hvacType" },
                  { label: "Electrical Panel", key: "electricalPanelType" },
                  { label: "Electrical Condition", key: "electricalPanelCondition" },
                  { label: "Plumbing Condition", key: "plumbingCondition" },
                  { label: "Foundation Condition", key: "foundationCondition" },
                  { label: "Water Heater Age", key: "waterHeaterAge" },
                  { label: "Water Heater Condition", key: "waterHeaterCondition" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <Label className="text-xs text-gray-500 flex items-center gap-1">
                      {label}
                      {!(extractedData as any)[key] && (
                        <span className="text-amber-500 text-xs">(not found)</span>
                      )}
                    </Label>
                    <Input
                      className={`mt-1 text-sm ${!(extractedData as any)[key] ? "border-amber-300 bg-amber-50" : ""}`}
                      value={(extractedData as any)[key] || ""}
                      onChange={e => setExtractedData(d => ({ ...d, [key]: e.target.value || null }))}
                      placeholder={`Enter ${label.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Deficiencies */}
            {deficiencies.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Flagged Items</h3>
                <div className="space-y-2">
                  {deficiencies.map((d, i) => (
                    <div key={i} className={`p-3 rounded-lg border text-sm ${
                      d.severity === "critical"
                        ? "bg-red-50 border-red-200 text-red-800"
                        : d.severity === "monitor"
                        ? "bg-amber-50 border-amber-200 text-amber-800"
                        : "bg-gray-50 border-gray-200 text-gray-700"
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={`text-xs ${
                          d.severity === "critical" ? "border-red-400 text-red-700" :
                          d.severity === "monitor" ? "border-amber-400 text-amber-700" :
                          "border-gray-300 text-gray-600"
                        }`}>
                          {d.severity === "critical" ? "Critical" : d.severity === "monitor" ? "Monitor" : "Info"}
                        </Badge>
                        <span className="text-xs font-medium">{d.area}</span>
                      </div>
                      <p>{d.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General Summary */}
            {extractedData.generalSummary && (
              <div>
                <Label className="text-xs text-gray-500">General Summary</Label>
                <Textarea
                  className="mt-1 text-sm h-24"
                  value={extractedData.generalSummary || ""}
                  onChange={e => setExtractedData(d => ({ ...d, generalSummary: e.target.value }))}
                />
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={!pendingDocId || confirmInspectionMutation.isPending}
                onClick={() => {
                  if (!pendingDocId) return;
                  confirmInspectionMutation.mutate({ id: pendingDocId, data: extractedData });
                }}
              >
                {confirmInspectionMutation.isPending ? "Saving..." : "Confirm & Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={!!editDocId} onOpenChange={open => { if (!open) { setEditDocId(null); setEditDoc(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>
          {editDoc && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName">Document Name</Label>
                <Input
                  id="editName"
                  value={editDoc.fileName}
                  onChange={e => setEditDoc(d => d ? { ...d, fileName: e.target.value } : d)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={editDoc.category} onValueChange={v => setEditDoc(d => d ? { ...d, category: v } : d)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editNotes">Notes</Label>
                <Textarea
                  id="editNotes"
                  value={editDoc.notes}
                  onChange={e => setEditDoc(d => d ? { ...d, notes: e.target.value } : d)}
                  className="mt-1 h-20"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setEditDocId(null); setEditDoc(null); }}>Cancel</Button>
                <Button
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={updateMutation.isPending}
                  onClick={() => {
                    if (!editDocId || !editDoc) return;
                    updateMutation.mutate({ id: editDocId, data: editDoc });
                  }}
                >
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={open => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>This action cannot be undone. The document will be permanently deleted.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => { if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId); }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
