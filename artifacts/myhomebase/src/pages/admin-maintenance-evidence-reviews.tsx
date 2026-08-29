import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, CheckCircle, AlertTriangle, FileText, Image as ImageIcon, MapPin, Clock, Copy, XCircle, Info, ChevronDown, Check, X, MessageSquare, ShieldAlert, Search } from "lucide-react";
import { Link } from "wouter";

import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

interface MaintenanceEvidenceReviewItem {
  id: string;
  sourceType: 'maintenance' | 'invoice';
  sourceId: string;
  homeowner: { id: string; name: string; email: string | null };
  property: { id: string; address: string | null };
  claimedTask: { title: string; category: string | null; serviceDate: string | null; completionMethod: string | null };
  createdAt: string | null;
  sourceSummary: {
    hasMaintenanceLog: boolean;
    hasTaskCompletion: boolean;
    hasInvoiceAnalysis: boolean;
    isPreConfirmation: boolean;
  };
  evidence: {
    beforePhotos: string[];
    afterPhotos: string[];
    documents: string[];
    aiNotes: string[];
    reasonCodes: string[];
    integrity: {
      locationFlag: boolean;
      timestampFlag: boolean;
      distanceFromPropertyMiles: string | null;
      timestampDeltaHours: string | null;
    };
    duplicateSummary: {
      count: number;
      currentSubmissionMatches: number;
      priorEvidenceMatches: number;
      priorRecordIds: string[];
    };
  };
  history: Array<{
    id: string;
    reviewerId: string;
    reviewerEmail: string;
    decision: 'approve' | 'reject' | 'request_more_info';
    notes: string | null;
    createdAt: string | null;
    resultingAiVerificationStatus: string | null;
    resultingVerificationTier: string | null;
  }>;
  technical: {
    maintenanceLogId: string | null;
    taskCompletionId: string | null;
    invoiceAnalysisId: string | null;
    beforePhotoHashes: string[];
    afterPhotoHashes: string[];
    invoiceHash: string | null;
    maintenanceAiResponse: any;
    taskCompletionAiResponse: any;
    invoiceAiResponse: any;
    rawInvoiceExtraction: any;
  };
}

const REASON_LABELS: Record<string, string> = {
  evidence_missing: "Required evidence is missing",
  location_missing: "Photo location is unavailable",
  property_coordinates_missing: "Property location is unavailable",
  distance_from_property_exceeded: "Photo was taken too far from the property",
  timestamp_missing: "Photo timestamp is unavailable",
  timestamp_invalid: "Photo timestamp could not be read",
  timestamp_delta_exceeded: "Photo timestamp is outside the allowed window",
  ai_ambiguous: "AI confidence was too low",
  ai_mismatch: "Photos may not match the claimed task",
  ai_fraud_risk: "AI detected a possible integrity risk",
  duplicate_photo_hash: "Photo may have been used before",
  homeowner_resubmitted_evidence: "Homeowner submitted additional evidence",
  review_needed: "Human review is required",
};

function formatMetric(value: string | null, unit: string): string {
  if (value == null) return "Unknown";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)} ${unit}` : "Unknown";
}

function formatReviewDate(value: string | null, pattern: string): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : format(date, pattern);
}

function formatReviewAge(value: string | null): string {
  if (!value) return "Unknown age";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown age"
    : formatDistanceToNow(date, { addSuffix: true });
}

export default function AdminMaintenanceEvidenceReviews() {
  const { toast } = useToast();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<'approve' | 'reject' | 'request_more_info' | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "maintenance" | "invoice">("all");

  const { data: queue = [], isLoading: isQueueLoading } = useQuery<MaintenanceEvidenceReviewItem[]>({
    queryKey: ["/api/admin/maintenance-evidence-reviews"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const selectedItem = queue.find(item => item.id === selectedItemId);
  const filteredQueue = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return queue.filter((item) => {
      if (sourceFilter !== "all" && item.sourceType !== sourceFilter) return false;
      if (!normalizedSearch) return true;
      return [
        item.claimedTask.title,
        item.claimedTask.category,
        item.homeowner.name,
        item.homeowner.email,
        item.property.address,
      ].some((value) => value?.toLowerCase().includes(normalizedSearch));
    });
  }, [queue, searchQuery, sourceFilter]);

  const { data: fullItemDetails, isLoading: isItemLoading } = useQuery<MaintenanceEvidenceReviewItem>({
    queryKey: ["/api/admin/maintenance-evidence-reviews", selectedItem?.sourceType, selectedItem?.sourceId],
    enabled: !!selectedItem,
    staleTime: 0,
  });

  const activeItem = fullItemDetails || selectedItem;

  const decisionMutation = useMutation({
    mutationFn: async ({ decision, notes }: { decision: 'approve' | 'reject' | 'request_more_info'; notes?: string }) => {
      if (!activeItem) throw new Error("No item selected");
      const res = await apiRequest(
        `/api/admin/maintenance-evidence-reviews/${activeItem.sourceType}/${activeItem.sourceId}/decisions`,
        "POST",
        { decision, notes: notes || null }
      );
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/maintenance-evidence-reviews"] });
      
      if (variables.decision === 'approve' || variables.decision === 'reject') {
        setSelectedItemId(null);
        toast({
          title: "Decision recorded",
          description: `Item has been ${variables.decision === 'approve' ? 'approved' : 'rejected'} and removed from the queue.`,
        });
      } else {
        // Request more info leaves it in the queue, refresh its details
        queryClient.invalidateQueries({ 
          queryKey: ["/api/admin/maintenance-evidence-reviews", activeItem?.sourceType, activeItem?.sourceId] 
        });
        toast({
          title: "More information requested",
          description: "The request has been recorded and the item remains in the queue.",
        });
      }
      
      setIsNotesDialogOpen(false);
      setActionNotes("");
      setPendingDecision(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error saving decision",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  });

  const handleAction = (decision: 'approve' | 'reject' | 'request_more_info') => {
    setPendingDecision(decision);
    if (decision === 'request_more_info') {
      // Force dialog for request more info
      setActionNotes("");
      setIsNotesDialogOpen(true);
    } else {
      // Optional notes for approve/reject, open dialog empty for now
      setActionNotes("");
      setIsNotesDialogOpen(true);
    }
  };

  const confirmAction = () => {
    if (pendingDecision === 'request_more_info' && !actionNotes.trim()) {
      toast({
        title: "Notes required",
        description: "Please provide a reason or note for requesting more information.",
        variant: "destructive",
      });
      return;
    }
    
    if (pendingDecision) {
      decisionMutation.mutate({ decision: pendingDecision, notes: actionNotes });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Top Header */}
      <header className="flex-shrink-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-indigo-600" />
              Maintenance Evidence Reviews
            </h1>
            <p className="text-sm text-gray-500">Review ambiguous maintenance photos and documents.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-3 py-1 font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
            {queue.length} {queue.length === 1 ? 'item' : 'items'} in queue
          </Badge>
        </div>
      </header>

      {/* Main Content Area - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Queue */}
        <div className={`w-full md:w-1/3 md:min-w-[320px] md:max-w-[420px] border-r bg-gray-50 flex-col z-0 ${selectedItemId ? 'hidden md:flex' : 'flex'}`}>
          <div className="px-4 py-3 border-b bg-white space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Review Queue</h2>
              <span className="text-xs text-gray-500" data-testid="text-filtered-review-count">
                {filteredQueue.length} shown
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search task, property, or homeowner"
                className="pl-8"
                data-testid="input-review-search"
              />
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1">
              {(["all", "maintenance", "invoice"] as const).map((filter) => (
                <Button
                  key={filter}
                  type="button"
                  size="sm"
                  variant={sourceFilter === filter ? "secondary" : "ghost"}
                  className="h-7 px-2 text-xs capitalize"
                  onClick={() => setSourceFilter(filter)}
                  data-testid={`button-source-filter-${filter}`}
                >
                  {filter === "all" ? "All" : filter === "maintenance" ? "Records" : "Pre-confirm"}
                </Button>
              ))}
            </div>
          </div>

          
          <ScrollArea className="flex-1">
            {isQueueLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white p-4 rounded-lg border shadow-sm space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            ) : queue.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center h-64 text-gray-500">
                <CheckCircle className="h-10 w-10 text-green-500 mb-3 opacity-20" />
                <p className="font-medium text-gray-900">All caught up!</p>
                <p className="text-sm mt-1">There are no pending reviews at this time.</p>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500" data-testid="text-no-filtered-reviews">
                No reviews match these filters.
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {filteredQueue.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`block w-full p-3 rounded-lg border cursor-pointer text-left transition-all duration-200 ${
                      selectedItemId === item.id 
                        ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-500 ring-offset-0' 
                        : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-gray-50 hover:shadow-sm'
                    }`}
                    data-testid={`queue-item-${item.id}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-sm font-semibold text-gray-900 truncate pr-2" title={item.claimedTask.title}>
                        {item.claimedTask.title}
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap bg-gray-100 px-1.5 py-0.5 rounded">
                        {formatReviewAge(item.createdAt)}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-600 mb-2 truncate">
                      {item.homeowner.name} • {(item.property.address || "Unknown property").split(",")[0]}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.evidence.integrity.locationFlag || item.evidence.integrity.timestampFlag ? (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-amber-300 bg-amber-50 text-amber-700 font-medium rounded-sm">
                          <AlertTriangle className="h-3 w-3 mr-1 inline" /> Flags
                        </Badge>
                      ) : null}
                      {item.evidence.duplicateSummary.count > 0 ? (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-red-300 bg-red-50 text-red-700 font-medium rounded-sm">
                          <Copy className="h-3 w-3 mr-1 inline" /> Duplicate
                        </Badge>
                      ) : null}
                      {item.evidence.reasonCodes.slice(0, 2).map((code, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] px-1 py-0 h-4 font-medium rounded-sm bg-gray-100 text-gray-700 border-none">
                          {REASON_LABELS[code] || code.replace(/_/g, " ")}
                        </Badge>
                      ))}
                      {item.evidence.reasonCodes.length > 2 && (
                        <span className="text-[10px] text-gray-500">+{item.evidence.reasonCodes.length - 2} more</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Sidebar - Details */}
        <div className={`flex-1 flex-col bg-white overflow-hidden relative border-l border-gray-200 ${selectedItemId ? 'flex' : 'hidden md:flex'}`}>
          {selectedItemId && activeItem ? (
            <>
              {isItemLoading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                </div>
              )}
              
              <ScrollArea className="flex-1 p-4 md:p-6">
                <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-24">
                  {/* Mobile Back Button */}
                  <div className="md:hidden mb-4">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedItemId(null)} className="pl-0 text-gray-500 hover:text-gray-900">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Queue
                    </Button>
                  </div>

                  {/* Header / Context */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-1" data-testid="detail-title">
                        {activeItem.claimedTask.title}
                      </h2>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                         <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {activeItem.property.address || "Unknown property"}</span>
                        <span className="text-gray-300">•</span>
                         <span>{activeItem.homeowner.name}{activeItem.homeowner.email ? ` (${activeItem.homeowner.email})` : ""}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Submitted:</span> 
                         {formatReviewDate(activeItem.createdAt, "MMM d, yyyy h:mm a")}
                      </div>
                      <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">
                        {activeItem.sourceType} • {activeItem.claimedTask.completionMethod}
                      </Badge>
                    </div>
                  </div>

                  {/* Integrity & Duplicates Critical Section */}
                  {(activeItem.evidence.integrity.locationFlag || 
                    activeItem.evidence.integrity.timestampFlag || 
                    activeItem.evidence.duplicateSummary.count > 0) && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4" data-testid="detail-integrity-flags">
                      <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Integrity Flags
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeItem.evidence.integrity.locationFlag && (
                          <div className="flex gap-2">
                            <MapPin className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Location Mismatch</p>
                               <p className="text-xs text-gray-600">Photo location is {formatMetric(activeItem.evidence.integrity.distanceFromPropertyMiles, "miles")} away from the property address.</p>
                            </div>
                          </div>
                        )}
                        {activeItem.evidence.integrity.timestampFlag && (
                          <div className="flex gap-2">
                            <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Timestamp Mismatch</p>
                               <p className="text-xs text-gray-600">Photo timestamp differs from service date by {formatMetric(activeItem.evidence.integrity.timestampDeltaHours, "hours")}.</p>
                            </div>
                          </div>
                        )}
                        {activeItem.evidence.duplicateSummary.count > 0 && (
                          <div className="flex gap-2">
                            <Copy className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900 text-red-900">Duplicate Evidence Found</p>
                              <p className="text-xs text-red-700">
                                Matched {activeItem.evidence.duplicateSummary.currentSubmissionMatches} in current sub, {activeItem.evidence.duplicateSummary.priorEvidenceMatches} in prior records.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Analysis */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">AI Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Reason Codes</h4>
                        <div className="flex flex-wrap gap-2">
                          {activeItem.evidence.reasonCodes.length > 0 ? (
                            activeItem.evidence.reasonCodes.map((code, idx) => (
                              <Badge key={idx} variant="secondary" className="bg-gray-100 text-gray-800">
                                 {REASON_LABELS[code] || code.replace(/_/g, " ")}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500 italic">No reason codes provided</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">AI Notes</h4>
                        {activeItem.evidence.aiNotes.length > 0 ? (
                          <ul className="space-y-2">
                            {activeItem.evidence.aiNotes.map((note, idx) => (
                              <li key={idx} className="text-sm text-gray-700 flex gap-2 items-start bg-blue-50/50 p-2 rounded-md border border-blue-100">
                                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                <span>{note}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-sm text-gray-500 italic">No AI notes available</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Visual Evidence */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">Evidence Gallery</h3>
                    
                    {activeItem.evidence.beforePhotos.length === 0 && activeItem.evidence.afterPhotos.length === 0 && activeItem.evidence.documents.length === 0 ? (
                      <div className="p-8 border-2 border-dashed rounded-xl text-center text-gray-500 bg-gray-50">
                        <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No photos or documents attached</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {activeItem.evidence.beforePhotos.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Before Photos</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                              {activeItem.evidence.beforePhotos.map((photo, idx) => (
                                <a key={idx} href={photo} target="_blank" rel="noopener noreferrer" className="block group relative aspect-square rounded-lg overflow-hidden border shadow-sm">
                                  <img src={photo} alt={`Before ${idx+1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <span className="opacity-0 group-hover:opacity-100 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">View full</span>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {activeItem.evidence.afterPhotos.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-3">After Photos</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                              {activeItem.evidence.afterPhotos.map((photo, idx) => (
                                <a key={idx} href={photo} target="_blank" rel="noopener noreferrer" className="block group relative aspect-square rounded-lg overflow-hidden border shadow-sm">
                                  <img src={photo} alt={`After ${idx+1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <span className="opacity-0 group-hover:opacity-100 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">View full</span>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {activeItem.evidence.documents.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Documents</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {activeItem.evidence.documents.map((doc, idx) => (
                                <a key={idx} href={doc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors shadow-sm bg-white group">
                                  <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                                    <FileText className="h-5 w-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">Document {idx + 1}</p>
                                    <p className="text-xs text-gray-500">View file</p>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Audit History */}
                  {activeItem.history.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">Review History</h3>
                      <div className="space-y-3">
                        {activeItem.history.map((hist) => (
                          <div key={hist.id} className="bg-gray-50 border rounded-lg p-4 text-sm">
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-medium text-gray-900 flex items-center gap-2">
                                {hist.decision === 'approve' && <CheckCircle className="h-4 w-4 text-green-600" />}
                                {hist.decision === 'reject' && <XCircle className="h-4 w-4 text-red-600" />}
                                {hist.decision === 'request_more_info' && <MessageSquare className="h-4 w-4 text-amber-600" />}
                                <span className="capitalize">{hist.decision.replace(/_/g, ' ')}</span>
                                <span className="text-gray-400 font-normal ml-1">by</span>
                                <span>{hist.reviewerEmail}</span>
                              </div>
                               <span className="text-gray-500 text-xs">{formatReviewDate(hist.createdAt, "MMM d, yyyy h:mm a")}</span>
                            </div>
                            {hist.notes && (
                              <div className="text-gray-700 bg-white p-3 border rounded mt-2">
                                "{hist.notes}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Technical Collapsible */}
                  <Collapsible className="border rounded-xl bg-gray-50/50">
                    <CollapsibleTrigger className="flex w-full items-center justify-between p-4 font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>Technical Details & Raw Hashes</span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4 pt-2 border-t text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                        <div className="bg-white p-3 border rounded">
                          <p className="font-bold text-gray-500 mb-1">IDs</p>
                          <p>MaintLog: {activeItem.technical.maintenanceLogId || 'null'}</p>
                          <p>TaskComp: {activeItem.technical.taskCompletionId || 'null'}</p>
                          <p>InvAnlys: {activeItem.technical.invoiceAnalysisId || 'null'}</p>
                        </div>
                        <div className="bg-white p-3 border rounded overflow-hidden">
                          <p className="font-bold text-gray-500 mb-1">Photo Hashes</p>
                          <p className="truncate">Before: {activeItem.technical.beforePhotoHashes.join(', ') || 'none'}</p>
                          <p className="truncate">After: {activeItem.technical.afterPhotoHashes.join(', ') || 'none'}</p>
                          <p className="truncate">Invoice: {activeItem.technical.invoiceHash || 'none'}</p>
                        </div>
                        <div className="col-span-1 md:col-span-2 bg-white p-3 border rounded">
                          <p className="font-bold text-gray-500 mb-1">Raw AI Responses</p>
                          <Collapsible>
                            <CollapsibleTrigger className="text-indigo-600 hover:underline">View JSON payloads</CollapsibleTrigger>
                            <CollapsibleContent className="mt-2 space-y-2">
                              {activeItem.technical.maintenanceAiResponse && (
                                <details><summary className="cursor-pointer text-gray-700 font-medium">Maintenance AI</summary>
                                <pre className="p-2 bg-gray-100 rounded mt-1 overflow-x-auto max-h-48 text-[10px]">{JSON.stringify(activeItem.technical.maintenanceAiResponse, null, 2)}</pre></details>
                              )}
                              {activeItem.technical.taskCompletionAiResponse && (
                                <details><summary className="cursor-pointer text-gray-700 font-medium">Task Completion AI</summary>
                                <pre className="p-2 bg-gray-100 rounded mt-1 overflow-x-auto max-h-48 text-[10px]">{JSON.stringify(activeItem.technical.taskCompletionAiResponse, null, 2)}</pre></details>
                              )}
                              {activeItem.technical.invoiceAiResponse && (
                                <details><summary className="cursor-pointer text-gray-700 font-medium">Invoice Analysis</summary>
                                <pre className="p-2 bg-gray-100 rounded mt-1 overflow-x-auto max-h-48 text-[10px]">{JSON.stringify(activeItem.technical.invoiceAiResponse, null, 2)}</pre></details>
                              )}
                               {activeItem.technical.rawInvoiceExtraction && (
                                 <details><summary className="cursor-pointer text-gray-700 font-medium">Raw Invoice Extraction</summary>
                                 <pre className="p-2 bg-gray-100 rounded mt-1 overflow-x-auto max-h-48 text-[10px]">{JSON.stringify(activeItem.technical.rawInvoiceExtraction, null, 2)}</pre></details>
                               )}
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </ScrollArea>
              
              {/* Floating Action Bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-4 px-6 flex justify-between items-center shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)] z-10">
                <div className="text-sm text-gray-500 hidden sm:block">
                  Select an action to conclude this review.
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    className="flex-1 sm:flex-none border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    onClick={() => handleAction('reject')}
                    data-testid="button-reject"
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Reject
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 sm:flex-none border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                    onClick={() => handleAction('request_more_info')}
                    data-testid="button-request-info"
                  >
                    <MessageSquare className="h-4 w-4 mr-1.5" />
                    <span className="hidden sm:inline">Request More Info</span>
                    <span className="sm:hidden">Request</span>
                  </Button>
                  <Button 
                    className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white border-transparent"
                    onClick={() => handleAction('approve')}
                    data-testid="button-approve"
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Approve
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
              <ShieldAlert className="h-16 w-16 mb-4 opacity-20 text-indigo-500" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No item selected</h3>
              <p className="text-sm text-center max-w-sm">
                Select an item from the review queue on the left to inspect its evidence and take action.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingDecision === 'approve' && 'Confirm Approval'}
              {pendingDecision === 'reject' && 'Confirm Rejection'}
              {pendingDecision === 'request_more_info' && 'Request More Information'}
            </DialogTitle>
            <DialogDescription>
              {pendingDecision === 'request_more_info' 
                ? 'Provide details about what additional information is required from the homeowner.'
                : 'Add optional notes for the audit log before completing this review.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="action-notes">
                Notes {pendingDecision === 'request_more_info' ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(Optional)</span>}
              </Label>
              <Textarea 
                id="action-notes" 
                placeholder={pendingDecision === 'request_more_info' ? "E.g., Please upload a clearer photo of the unit's serial number." : "Audit notes..."}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-action-notes"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNotesDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={confirmAction}
              disabled={decisionMutation.isPending || (pendingDecision === 'request_more_info' && !actionNotes.trim())}
              className={
                pendingDecision === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' :
                pendingDecision === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' :
                'bg-amber-600 hover:bg-amber-700 text-white'
              }
              data-testid="button-confirm-action"
            >
              {decisionMutation.isPending ? "Saving..." : "Confirm Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
