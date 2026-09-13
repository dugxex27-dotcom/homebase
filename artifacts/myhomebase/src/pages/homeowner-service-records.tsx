import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { insertMaintenanceLogSchema } from "@shared/schema";
import type { MaintenanceLog, House, InvoiceAnalysis } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { FreeUserUpgradePrompt, HomeownerTrialBanner } from "@/components/homeowner-feature-gate";
import { ActivatingPlanBanner } from "@/components/activating-plan-banner";
import { useHomeownerSubscription } from "@/hooks/useHomeownerSubscription";
import { MaintenanceVerificationStatus } from "@/components/maintenance-verification-status";
import logoHomeowner from "@assets/my-homebase-logo-tm-final-white_1777417516350.png";
import "./home.css";
import { apiRequest, notifyInvoiceBadgeChanged } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  FileText,
  Calendar,
  MapPin,
  User,
  DollarSign,
  Clock,
  Edit,
  Trash2,
  Building2,
  Wrench,
  Plus,
  ChevronDown,
  Download,
  Scan,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  X,
  ChevronUp
} from "lucide-react";

const SERVICE_TYPES = [
  { value: "maintenance", label: "Routine Maintenance" },
  { value: "repair", label: "Repair" },
  { value: "installation", label: "Installation" },
  { value: "replacement", label: "Replacement" },
  { value: "inspection", label: "Inspection" },
  { value: "cleaning", label: "Professional Cleaning" },
  { value: "upgrade", label: "Upgrade/Improvement" },
  { value: "emergency", label: "Emergency Service" },
  { value: "other", label: "Other" }
];

const HOME_AREAS = [
  { value: "hvac", label: "HVAC System" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "roof", label: "Roof" },
  { value: "foundation", label: "Foundation" },
  { value: "siding", label: "Siding/Exterior" },
  { value: "windows", label: "Windows" },
  { value: "doors", label: "Doors" },
  { value: "flooring", label: "Flooring" },
  { value: "kitchen", label: "Kitchen" },
  { value: "bathroom", label: "Bathroom" },
  { value: "basement", label: "Basement" },
  { value: "attic", label: "Attic" },
  { value: "garage", label: "Garage" },
  { value: "landscaping", label: "Landscaping/Yard" },
  { value: "driveway", label: "Driveway/Walkways" },
  { value: "gutters", label: "Gutters" },
  { value: "chimney", label: "Chimney" },
  { value: "septic", label: "Septic System" },
  { value: "well", label: "Well/Water System" },
  { value: "other", label: "Other" }
];

const maintenanceLogFormSchema = insertMaintenanceLogSchema.extend({
  homeownerId: z.string().min(1, "Homeowner ID is required"),
  homeArea: z.string().optional(),
  serviceDescription: z.string().optional(),
});

type MaintenanceLogFormData = z.infer<typeof maintenanceLogFormSchema>;

type ScoreHistoryFilter = "all" | "scoring" | "historical";

class MaintenanceLogRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "MaintenanceLogRequestError";
  }
}

async function maintenanceLogRequestError(response: Response, fallbackMessage: string) {
  const body = await response.json().catch(() => null) as { message?: unknown; code?: unknown } | null;
  return new MaintenanceLogRequestError(
    typeof body?.message === "string" && body.message.trim() ? body.message : fallbackMessage,
    response.status,
    typeof body?.code === "string" ? body.code : undefined,
  );
}

function isServiceDateError(error: unknown) {
  if (!(error instanceof MaintenanceLogRequestError) || error.status !== 400) return false;
  return error.code === "SERVICE_DATE_TOO_OLD"
    || /service\s*date|serviceDate|12 months|too far in the past/i.test(error.message);
}

export default function HomeownerServiceRecords() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const homeownerId = (user as any)?.id || "";

  useEffect(() => {
    if (!homeownerId) return;

    void fetch("/api/homeowner/linked-invoices/mark-all-viewed", {
      method: "POST",
    }).then((response) => {
      if (!response.ok) return;
      queryClient.setQueryData(
        ["/api/homeowner/linked-invoices/unclaimed-count"],
        { count: 0 },
      );
      notifyInvoiceBadgeChanged();
    }).finally(() => {
      queryClient.invalidateQueries({
        queryKey: ["/api/homeowner/linked-invoices/unclaimed-count"],
      });
    });
  }, [homeownerId, queryClient]);

  const { isFreeUser, isLoading: subscriptionLoading } = useHomeownerSubscription();

  if (isFreeUser && !subscriptionLoading) {
    return <FreeUserUpgradePrompt />;
  }

  const [isMaintenanceLogDialogOpen, setIsMaintenanceLogDialogOpen] = useState(false);
  const [editingMaintenanceLog, setEditingMaintenanceLog] = useState<MaintenanceLog | null>(null);
  const [lockedDeleteRecordId, setLockedDeleteRecordId] = useState<string | null>(null);
  const [homeAreaFilter, setHomeAreaFilter] = useState<string>("all");
  const [serviceRecordsHouseFilter, setServiceRecordsHouseFilter] = useState<string>("all");
  const [scoreHistoryFilter, setScoreHistoryFilter] = useState<ScoreHistoryFilter>("all");
  const [showAllRecords, setShowAllRecords] = useState<boolean>(false);
  const [isInvoiceHistoryOpen, setIsInvoiceHistoryOpen] = useState(false);

  // File upload state
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [beforePhotoFiles, setBeforePhotoFiles] = useState<File[]>([]);
  const [afterPhotoFiles, setAfterPhotoFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // AI Invoice Analysis state
  const [aiInvoiceOpen, setAiInvoiceOpen] = useState(false);
  const [aiStep, setAiStep] = useState<"upload" | "diy-verify" | "review" | "done" | "duplicate">("upload");
  const [aiDuplicateAnalysisId, setAiDuplicateAnalysisId] = useState<string | null>(null);
  const [aiDuplicateCreatedAt, setAiDuplicateCreatedAt] = useState<string | null>(null);
  const [aiDiyVerifyFiles, setAiDiyVerifyFiles] = useState<{ before: File[]; after: File[]; receipt: File[] }>({ before: [], after: [], receipt: [] });
  const [aiDiyVerifying, setAiDiyVerifying] = useState(false);
  const [aiDiyVerifyResult, setAiDiyVerifyResult] = useState<{ diyVerified: boolean; verificationNotes: string | null } | null>(null);
  const [aiCompletionMethod, setAiCompletionMethod] = useState<"contractor" | "diy">("contractor");
  const [aiInvoiceFiles, setAiInvoiceFiles] = useState<File[]>([]);
  const [aiReceiptFiles, setAiReceiptFiles] = useState<File[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<InvoiceAnalysis | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiConfirming, setAiConfirming] = useState(false);
  const [aiOutsideScoringWindow, setAiOutsideScoringWindow] = useState(false);
  // Editable review form
  const [aiEditDescription, setAiEditDescription] = useState("");
  const [aiEditDate, setAiEditDate] = useState("");
  const [aiEditAmount, setAiEditAmount] = useState("");
  const [aiEditContractorName, setAiEditContractorName] = useState("");
  const [aiEditContractorCompany, setAiEditContractorCompany] = useState("");
  const [aiEditHomeArea, setAiEditHomeArea] = useState("");
  const [aiEditServiceType, setAiEditServiceType] = useState("");
  const [aiSelectedHouseId, setAiSelectedHouseId] = useState("");
  const [highlightedLogId, setHighlightedLogId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [evidenceReviewSource, setEvidenceReviewSource] = useState<{ sourceType: "maintenance" | "invoice"; sourceId: string } | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<{ before: File[]; after: File[]; receipt: File[] }>({ before: [], after: [], receipt: [] });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sourceType = params.get("sourceType");
    const sourceId = params.get("sourceId");
    if (params.get("evidenceReview") === "1" && (sourceType === "maintenance" || sourceType === "invoice") && sourceId) {
      setEvidenceReviewSource({ sourceType, sourceId });
    }
  }, []);

  const clearEvidenceReviewUrl = () => {
    window.history.replaceState(null, "", window.location.pathname);
    setEvidenceReviewSource(null);
    setEvidenceFiles({ before: [], after: [], receipt: [] });
  };
  const { data: evidenceReviewContext, isError: evidenceReviewContextError } = useQuery<{
    title: string; note: string; evidenceCounts: { beforePhotos: number; afterPhotos: number; receipts: number };
  }>({
    queryKey: ["/api/homeowner/maintenance-evidence", evidenceReviewSource?.sourceType, evidenceReviewSource?.sourceId, "context"],
    enabled: !!evidenceReviewSource,
    queryFn: async () => {
      const response = await fetch(`/api/homeowner/maintenance-evidence/${evidenceReviewSource!.sourceType}/${evidenceReviewSource!.sourceId}/context`);
      if (!response.ok) throw new Error("This evidence request is no longer available.");
      return response.json();
    },
  });
  const resubmitEvidenceMutation = useMutation({
    mutationFn: async () => {
      if (!evidenceReviewSource) throw new Error("No evidence request selected.");
      const files = async (items: File[]) => Promise.all(items.map(async (file) => ({
        fileData: await fileToBase64Uri(file), fileName: file.name, fileType: file.type,
      })));
      const response = await apiRequest(`/api/homeowner/maintenance-evidence/${evidenceReviewSource.sourceType}/${evidenceReviewSource.sourceId}/resubmit`, "POST", {
        beforePhotoFiles: await files(evidenceFiles.before),
        afterPhotoFiles: await files(evidenceFiles.after),
        receiptFiles: await files(evidenceFiles.receipt),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-analyses"] });
      toast({ title: "Evidence submitted", description: "Your additional evidence has been sent for review." });
      clearEvidenceReviewUrl();
    },
    onError: (error: Error) => toast({ title: "Could not submit evidence", description: error.message || "Please try again.", variant: "destructive" }),
  });


  // Load houses
  const { data: houses = [] } = useQuery<House[]>({
    queryKey: ['/api/houses'],
  });

  // Load every invoice scan for both the history section and maintenance-record highlight flow.
  const { data: invoiceAnalyses = [], isLoading: invoiceAnalysesLoading, isError: invoiceAnalysesError } = useQuery<InvoiceAnalysis[]>({
    queryKey: ['/api/invoice-analyses'],
    queryFn: async () => {
      const pageSize = 50;
      const allAnalyses: InvoiceAnalysis[] = [];
      let offset = 0;
      while (true) {
        const res = await fetch(`/api/invoice-analyses?offset=${offset}`);
        if (!res.ok) throw new Error('Failed to fetch invoice scan history');
        const page: InvoiceAnalysis[] = await res.json();
        allAnalyses.push(...page);
        if (page.length < pageSize) return allAnalyses;
        offset += pageSize;
      }
    },
  });
  // Read highlightAnalysis query param set by the Maintenance page "View existing record" button.
  // Resolves the analysisId → maintenanceLogId and triggers the scroll/highlight effect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const analysisId = params.get("highlightAnalysis");
    if (!analysisId) return;
    window.history.replaceState(null, "", window.location.pathname);
    const match = invoiceAnalyses.find((a) => a.id === analysisId);
    if (match?.maintenanceLogId) {
      setHighlightedLogId(match.maintenanceLogId);
    }
  }, [invoiceAnalyses]);

  // Load maintenance logs (service records)
  const { data: maintenanceLogs, isLoading: maintenanceLogsLoading } = useQuery<MaintenanceLog[]>({
    queryKey: ['/api/maintenance-logs', { homeownerId, houseId: serviceRecordsHouseFilter === 'all' ? undefined : serviceRecordsHouseFilter }],
    queryFn: async () => {
      const url = serviceRecordsHouseFilter === 'all'
        ? '/api/maintenance-logs'
        : `/api/maintenance-logs?houseId=${serviceRecordsHouseFilter}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch maintenance logs');
      return response.json();
    },
  });

  // Maintenance log form
  const maintenanceLogForm = useForm<MaintenanceLogFormData>({
    resolver: zodResolver(maintenanceLogFormSchema as any),
    defaultValues: {
      homeownerId,
      houseId: "",
      serviceType: "maintenance",
      serviceDate: new Date().toISOString().split('T')[0],
      homeArea: "",
      serviceDescription: "",
      cost: undefined,
      contractorName: "",
      contractorCompany: "",
      contractorId: "",
      notes: "",
      warrantyPeriod: "",
      nextServiceDue: "",
    },
  });

  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };
  const evidenceObjectUrl = (url: string) =>
    url.startsWith("/objects/maintenance-evidence/")
      ? `/api/maintenance-evidence/objects?path=${encodeURIComponent(url)}`
      : url;

  // Upload files to object storage
  const uploadFiles = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];

    const filesData = await Promise.all(
      files.map(async (file) => ({
        fileData: await fileToBase64(file),
        fileName: file.name,
        fileType: file.type,
      }))
    );

    const response = await fetch('/api/upload/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: filesData }),
    });

    if (!response.ok) throw new Error('Failed to upload files');
    const result = await response.json();
    return result.urls || [];
  };

  const createMaintenanceLogMutation = useMutation({
    mutationFn: async (data: MaintenanceLogFormData & { receiptUrls?: string[], beforePhotoUrls?: string[], afterPhotoUrls?: string[] }) => {
      const response = await fetch('/api/maintenance-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw await maintenanceLogRequestError(response, 'Failed to create maintenance log');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-logs'] });
      setIsMaintenanceLogDialogOpen(false);
      maintenanceLogForm.reset();
      setReceiptFiles([]);
      setBeforePhotoFiles([]);
      setAfterPhotoFiles([]);
      toast({ title: "Success", description: "Maintenance log added successfully" });
    },
    onError: (error) => {
      if (isServiceDateError(error)) {
        maintenanceLogForm.setError("serviceDate", {
          type: "server",
          message: error.message,
        });
        return;
      }
      toast({ title: "Error", description: "Failed to add maintenance log", variant: "destructive" });
    },
  });

  const updateMaintenanceLogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MaintenanceLogFormData> & { receiptUrls?: string[], beforePhotoUrls?: string[], afterPhotoUrls?: string[] } }) => {
      const response = await fetch(`/api/maintenance-logs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update maintenance log');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-logs'] });
      setIsMaintenanceLogDialogOpen(false);
      setEditingMaintenanceLog(null);
      maintenanceLogForm.reset();
      setReceiptFiles([]);
      setBeforePhotoFiles([]);
      setAfterPhotoFiles([]);
      toast({ title: "Success", description: "Maintenance log updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update maintenance log", variant: "destructive" });
    },
  });

  const deleteMaintenanceLogMutation = useMutation({
    mutationFn: async (id: string) => {
      setLockedDeleteRecordId(null);
      const response = await fetch(`/api/maintenance-logs/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw await maintenanceLogRequestError(response, 'Failed to delete maintenance log');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-logs'] });
      toast({ title: "Success", description: "Maintenance log deleted successfully" });
    },
    onError: (error, id) => {
      if (error instanceof MaintenanceLogRequestError && error.code === "VERIFIED_RECORD") {
        setLockedDeleteRecordId(id);
        return;
      }
      toast({ title: "Error", description: "Failed to delete maintenance log", variant: "destructive" });
    },
  });

  // Helper: convert File to base64 data URI
  const fileToBase64Uri = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  useEffect(() => {
    if (!highlightedLogId) return;

    setHomeAreaFilter("all");
    setServiceRecordsHouseFilter("all");
    setScoreHistoryFilter("all");
    setShowAllRecords(true);

    let attempts = 0;
    const MAX_ATTEMPTS = 25;
    const RETRY_MS = 200;

    const tryHighlight = () => {
      const el = document.querySelector<HTMLElement>(`[data-log-id="${highlightedLogId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("service-record-highlight");
        highlightTimerRef.current = setTimeout(() => {
          el.classList.remove("service-record-highlight");
          setHighlightedLogId(null);
        }, 3000);
        return;
      }
      attempts++;
      if (attempts < MAX_ATTEMPTS) {
        highlightTimerRef.current = setTimeout(tryHighlight, RETRY_MS);
      } else {
        setHighlightedLogId(null);
      }
    };

    tryHighlight();

    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, [highlightedLogId]);

  const openAiInvoiceDialog = () => {
    setAiStep("upload");
    setAiCompletionMethod("contractor");
    setAiInvoiceFiles([]);
    setAiReceiptFiles([]);
    setAiAnalysis(null);
    setAiDuplicateAnalysisId(null);
    setAiDuplicateCreatedAt(null);
    setAiDiyVerifyFiles({ before: [], after: [], receipt: [] });
    setAiDiyVerifyResult(null);
    setAiSelectedHouseId(houses[0]?.id || "");
    setAiInvoiceOpen(true);
  };

  const reReviewInvoiceAnalysis = (analysis: InvoiceAnalysis) => {
    setAiAnalysis(analysis);
    setAiCompletionMethod(analysis.completionMethod === "diy" ? "diy" : "contractor");
    setAiEditDescription(analysis.serviceDescription || "");
    setAiEditDate(analysis.serviceDate || new Date().toISOString().split("T")[0]);
    setAiEditAmount(analysis.totalAmount ? String(parseFloat(analysis.totalAmount)) : "");
    setAiEditContractorName(analysis.contractorName || "");
    setAiEditContractorCompany(analysis.contractorCompany || "");
    setAiEditHomeArea(analysis.homeArea || "other");
    setAiEditServiceType(analysis.serviceType || "maintenance");
    setAiSelectedHouseId(analysis.houseId);
    setAiDiyVerifyResult(null);
    setAiDiyVerifyFiles({ before: [], after: [], receipt: [] });
    setAiStep(analysis.completionMethod === "diy" && !analysis.diyVerified ? "diy-verify" : "review");
    setAiInvoiceOpen(true);
  };

  const runDiyVerify = async () => {
    if (!aiAnalysis) return;
    if (aiDiyVerifyFiles.before.length === 0 || aiDiyVerifyFiles.after.length === 0) {
      toast({ title: "Before & after photos required", description: "Please upload at least one before photo AND one after photo to verify your DIY work.", variant: "destructive" });
      return;
    }
    setAiDiyVerifying(true);
    try {
      const toPayload = async (files: File[]) =>
        Promise.all(files.map(async (f) => ({ fileData: await fileToBase64Uri(f), fileName: f.name, fileType: f.type })));
      const res = await apiRequest(`/api/invoice-analyses/${aiAnalysis.id}/diy-verify`, "POST", {
        beforePhotoFiles: await toPayload(aiDiyVerifyFiles.before),
        afterPhotoFiles: await toPayload(aiDiyVerifyFiles.after),
        receiptFiles: await toPayload(aiDiyVerifyFiles.receipt),
      });
      const data = await res.json();
      setAiDiyVerifyResult({ diyVerified: data.diyVerified, verificationNotes: data.verificationNotes });
      // Update local analysis with new diyVerified status
      setAiAnalysis((prev) => prev ? { ...prev, diyVerified: data.diyVerified } : prev);
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-analyses"] });
      if (data.diyVerified) {
        toast({ title: "Verification passed", description: "Your DIY work has been verified. You can now confirm the record." });
      } else {
        toast({ title: "Verification inconclusive", description: "Please add clearer before/after photos showing the completed work.", variant: "destructive" });
      }
    } catch (err) {
      console.error("[DIY VERIFY]", err);
      toast({ title: "Verification failed", description: "Could not verify your photos. Please try again.", variant: "destructive" });
    } finally {
      setAiDiyVerifying(false);
    }
  };

  const runAiAnalysis = async () => {
    if (!aiSelectedHouseId) {
      toast({ title: "Error", description: "Please select a house first.", variant: "destructive" });
      return;
    }
    // Contractor work requires an invoice; DIY receipt is truly optional
    if (aiCompletionMethod === "contractor" && aiInvoiceFiles.length === 0) {
      toast({ title: "Invoice required", description: "Please upload at least one invoice photo for contractor work.", variant: "destructive" });
      return;
    }
    setAiAnalyzing(true);
    try {
      const toFilesPayload = async (files: File[]) =>
        Promise.all(files.map(async (f) => ({
          fileData: await fileToBase64Uri(f),
          fileName: f.name,
          fileType: f.type,
        })));

      const payload = {
        houseId: aiSelectedHouseId,
        completionMethod: aiCompletionMethod,
        invoiceFiles: await toFilesPayload(aiInvoiceFiles),
        receiptFiles: await toFilesPayload(aiReceiptFiles),
      };

      const res = await fetch("/api/invoice-analyses/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const responseData = await res.json();
      if (!res.ok) {
        if (res.status === 409 && responseData?.code === "DUPLICATE_INVOICE") {
          setAiDuplicateAnalysisId(responseData.analysisId ?? null);
          setAiDuplicateCreatedAt(responseData.createdAt ?? null);
          setAiStep("duplicate");
          setAiAnalyzing(false);
          return;
        }
        const reason = responseData?.message || "Could not analyze the uploaded files. Please try again.";
        toast({ title: "Upload not recognized", description: reason, variant: "destructive" });
        setAiAnalyzing(false);
        return;
      }
      const analysis: InvoiceAnalysis = responseData;
      queryClient.setQueryData<InvoiceAnalysis[]>(["/api/invoice-analyses"], (current = []) => [
        analysis,
        ...current.filter((existing) => existing.id !== analysis.id),
      ]);
      setAiAnalysis(analysis);
      setAiEditDescription(analysis.serviceDescription || "");
      setAiEditDate(analysis.serviceDate || new Date().toISOString().split("T")[0]);
      setAiEditAmount(analysis.totalAmount ? String(parseFloat(analysis.totalAmount)) : "");
      setAiEditContractorName(analysis.contractorName || "");
      setAiEditContractorCompany(analysis.contractorCompany || "");
      setAiEditHomeArea(analysis.homeArea || "other");
      setAiEditServiceType(analysis.serviceType || "maintenance");
      // For DIY work, route to the explicit verification step before review
      setAiStep(aiCompletionMethod === "diy" && !analysis.diyVerified ? "diy-verify" : "review");
    } catch (err) {
      console.error(err);
      toast({ title: "Analysis failed", description: "Could not analyze the uploaded files. Please try again.", variant: "destructive" });
    } finally {
      setAiAnalyzing(false);
    }
  };

  const confirmAiAnalysis = async () => {
    if (!aiAnalysis) return;
    setAiConfirming(true);
    try {
      const res = await apiRequest(`/api/invoice-analyses/${aiAnalysis.id}/confirm`, "PATCH", {
        serviceDescription: aiEditDescription,
        serviceDate: aiEditDate,
        totalAmount: aiEditAmount ? parseFloat(aiEditAmount) : null,
        contractorName: aiEditContractorName || null,
        contractorCompany: aiEditContractorCompany || null,
        homeArea: aiEditHomeArea,
        serviceType: aiEditServiceType,
      });
      const data = await res.json();
      const outsideScoringWindow = data.outsideScoringWindow === true;
      setAiOutsideScoringWindow(outsideScoringWindow);
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-analyses"] });
      if (data.newAchievements?.length > 0) {
        toast({ title: "Achievement Unlocked!", description: data.newAchievements[0]?.title || "New achievement earned!" });
      }
      toast({
        title: "Record created",
        description: outsideScoringWindow
          ? "This record was saved to your history, but it's older than 12 months so it won't affect your current Home Wellness Score."
          : "Service record added and health score updated.",
      });
      setAiStep("done");
      setTimeout(() => setAiInvoiceOpen(false), 1500);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save record. Please try again.", variant: "destructive" });
    } finally {
      setAiConfirming(false);
    }
  };

  const rejectContractorAnalysis = async () => {
    if (!aiAnalysis?.contractorId) return;
    setAiConfirming(true);
    try {
      await apiRequest(`/api/invoice-analyses/${aiAnalysis.id}/reject`, "PATCH");
      await queryClient.invalidateQueries({ queryKey: ["/api/invoice-analyses"] });
      setAiInvoiceOpen(false);
      setAiAnalysis(null);
      toast({ title: "Invoice rejected", description: "The invoice was not added to your service records." });
    } catch (error) {
      toast({
        title: "Could not reject invoice",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAiConfirming(false);
    }
  };

  const onSubmitMaintenanceLog = async (data: MaintenanceLogFormData) => {
    try {
      setIsUploadingFiles(true);

      const [receiptUrls, beforePhotoUrls, afterPhotoUrls] = await Promise.all([
        uploadFiles(receiptFiles),
        uploadFiles(beforePhotoFiles),
        uploadFiles(afterPhotoFiles),
      ]);

      const dataWithFiles = {
        ...data,
        receiptUrls,
        beforePhotoUrls,
        afterPhotoUrls,
      };

      if (editingMaintenanceLog) {
        updateMaintenanceLogMutation.mutate({ id: editingMaintenanceLog.id, data: dataWithFiles });
      } else {
        createMaintenanceLogMutation.mutate(dataWithFiles);
      }

      setReceiptFiles([]);
      setBeforePhotoFiles([]);
      setAfterPhotoFiles([]);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Error",
        description: "Failed to upload files. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingFiles(false);
    }
  };

  const handleEditMaintenanceLog = (log: MaintenanceLog) => {
    setEditingMaintenanceLog(log);
    maintenanceLogForm.reset({
      homeownerId: log.homeownerId,
      houseId: log.houseId,
      serviceType: log.serviceType,
      serviceDate: log.serviceDate,
      homeArea: log.homeArea ?? "",
      serviceDescription: log.serviceDescription ?? "",
      cost: log.cost || undefined,
      contractorName: log.contractorName ?? "",
      contractorCompany: log.contractorCompany ?? "",
      contractorId: log.contractorId ?? "",
      notes: log.notes ?? "",
      warrantyPeriod: log.warrantyPeriod ?? "",
      nextServiceDue: log.nextServiceDue ?? "",
    });
    setReceiptFiles([]);
    setBeforePhotoFiles([]);
    setAfterPhotoFiles([]);
    setIsMaintenanceLogDialogOpen(true);
  };

  const handleAddNewMaintenanceLog = () => {
    setEditingMaintenanceLog(null);
    maintenanceLogForm.reset({
      homeownerId,
      houseId: serviceRecordsHouseFilter !== 'all' ? serviceRecordsHouseFilter : houses[0]?.id || "",
      serviceType: "maintenance",
      serviceDate: new Date().toISOString().split('T')[0],
      homeArea: "",
      serviceDescription: "",
      cost: undefined,
      contractorName: "",
      contractorCompany: "",
      contractorId: "",
      notes: "",
      warrantyPeriod: "",
      nextServiceDue: "",
    });
    setReceiptFiles([]);
    setBeforePhotoFiles([]);
    setAfterPhotoFiles([]);
    setIsMaintenanceLogDialogOpen(true);
  };

  const getServiceTypeLabel = (type: string) => {
    return SERVICE_TYPES.find(t => t.value === type)?.label || type;
  };

  const getHomeAreaLabel = (area: string) => {
    return HOME_AREAS.find(a => a.value === area)?.label || area;
  };

  const generateServiceRecordsCSV = (records: MaintenanceLog[], sortType: 'date' | 'area') => {
    const headers = ['Service Date', 'Description', 'Area of Home', 'Contractor', 'Cost', 'Notes', 'Record Added'];
    const rows = records.map(log => [
      new Date(log.serviceDate).toLocaleDateString(),
      log.serviceDescription || '',
      log.homeArea ? getHomeAreaLabel(log.homeArea) : '',
      log.contractorCompany || '',
      log.cost || '',
      log.notes || '',
      log.createdAt ? new Date(log.createdAt).toLocaleDateString() : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const filteredLogs = maintenanceLogs?.filter((log) => {
    const matchesHomeArea = homeAreaFilter === "all" || log.homeArea === homeAreaFilter;
    const isScoring = isScoringMaintenanceLog(log);
    const matchesScoreHistory =
      scoreHistoryFilter === "all"
      || (scoreHistoryFilter === "scoring" && isScoring)
      || (scoreHistoryFilter === "historical" && !isScoring);

    return matchesHomeArea && matchesScoreHistory;
  }) || [];
  const viewDuplicateRecord = (analysisId: string) => {
    const match = invoiceAnalyses.find((analysis) => analysis.id === analysisId);
    const logId = match?.maintenanceLogId ?? null;
    setAiInvoiceOpen(false);
    setAiDuplicateAnalysisId(null);

    if (!logId) return;

    setHighlightedLogId(logId);
  };
  const scoringFilteredLogsCount = filteredLogs.filter((log) => isScoringMaintenanceLog(log)).length;

  // Stat chip computations
  const totalRecords = maintenanceLogs?.length || 0;
  const totalSpent = maintenanceLogs?.reduce((sum, l) => sum + (Number(l.cost) || 0), 0) || 0;
  const recordsThisYear = maintenanceLogs?.filter(l => new Date(l.serviceDate).getFullYear() === new Date().getFullYear()).length || 0;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">

      {/* ── PAGE HEADER ────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-[#2C0F5B] tracking-tight">Records</h1>
            <p className="text-xs md:text-sm text-gray-500 font-medium mt-0.5">Service history, documents, and insurance records</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={openAiInvoiceDialog}
              variant="outline"
              size="sm"
              className="h-9 px-3 rounded-full text-xs font-semibold shadow-sm border-gray-300 hidden sm:flex"
              data-testid="button-ai-scan-invoice"
            >
              <Scan className="w-4 h-4 mr-1.5" />
              AI Scan
            </Button>
            <Button
              onClick={handleAddNewMaintenanceLog}
              size="sm"
              className="bg-[#3C258E] hover:bg-[#2C0F5B] text-white h-9 px-4 rounded-full text-xs font-semibold shadow-sm"
              data-testid="button-add-service-record"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Log Service
            </Button>
          </div>
        </div>

        <div className="px-4 md:px-6 flex gap-6 overflow-x-auto hide-scrollbar border-t border-gray-100 mt-2">
          <Link href="/service-records" className="border-b-2 border-[#3C258E] text-[#3C258E] font-semibold py-3 text-sm whitespace-nowrap">Service History</Link>
          <Link href="/documents" className="border-b-2 border-transparent text-gray-500 hover:text-gray-800 font-medium py-3 text-sm whitespace-nowrap">Files</Link>
          <Link href="/documents?tab=insurance" className="border-b-2 border-transparent text-gray-500 hover:text-gray-800 font-medium py-3 text-sm whitespace-nowrap">Insurance</Link>
          <Link href="/documents?tab=disclosures" className="border-b-2 border-transparent text-gray-500 hover:text-gray-800 font-medium py-3 text-sm whitespace-nowrap">Disclosures</Link>
        </div>
      </div>

      {/* ── PAGE BODY ──────────────────────────────── */}
      <div className="dash-body">
        <ActivatingPlanBanner />
        <HomeownerTrialBanner />

        <Collapsible open={isInvoiceHistoryOpen} onOpenChange={setIsInvoiceHistoryOpen} className="mb-6">
          <div className="dash-light-card" style={{ padding: 0, overflow: 'hidden' }}>
            <CollapsibleTrigger asChild>
              <button
                className="w-full flex items-center justify-between gap-3 text-left"
                style={{ padding: '16px 18px' }}
                data-testid="button-toggle-invoice-history"
              >
                <span className="flex items-center gap-3">
                  <span style={{ background: '#EEEDFE', padding: 8, borderRadius: 10 }}>
                    <Scan size={17} style={{ color: '#3C258E' }} />
                  </span>
                  <span>
                    <span className="block font-bold" style={{ color: '#2C0F5B', fontSize: 14 }}>Invoice Scan History</span>
                    <span className="block text-xs text-muted-foreground">
                      {invoiceAnalysesLoading ? 'Loading scans…' : `${invoiceAnalyses.length} AI-scanned invoice${invoiceAnalyses.length === 1 ? '' : 's'}`}
                    </span>
                  </span>
                </span>
                <ChevronDown size={17} className={`transition-transform ${isInvoiceHistoryOpen ? 'rotate-180' : ''}`} style={{ color: '#3C258E' }} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: '#EEEDFE' }} data-testid="section-invoice-history">
                {invoiceAnalysesLoading ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground" data-testid="status-invoice-history-loading">
                    <Loader2 size={16} className="animate-spin" /> Loading invoice scans…
                  </div>
                ) : invoiceAnalysesError ? (
                  <p className="py-5 text-center text-sm text-red-600" data-testid="status-invoice-history-error">
                    Invoice scan history could not be loaded. Please try again later.
                  </p>
                ) : invoiceAnalyses.length === 0 ? (
                  <p className="py-5 text-center text-sm text-muted-foreground" data-testid="status-invoice-history-empty">
                    No invoices have been scanned yet.
                  </p>
                ) : invoiceAnalyses.map((analysis) => {
                  const status = analysis.status === "confirmed" || analysis.status === "rejected" ? analysis.status : "pending";
                  const statusStyle = status === "confirmed"
                    ? { background: '#DCFCE7', color: '#166534', borderColor: '#BBF7D0' }
                    : status === "rejected"
                      ? { background: '#FEE2E2', color: '#991B1B', borderColor: '#FECACA' }
                      : { background: '#FEF3C7', color: '#92400E', borderColor: '#FDE68A' };
                  const thumbnailUrl = analysis.invoiceUrls?.[0] || analysis.receiptUrls?.[0];
                  const isPdf = thumbnailUrl?.toLowerCase().split('?')[0].endsWith('.pdf');
                  return (
                    <div key={analysis.id} className="rounded-xl border p-3 flex gap-3" style={{ borderColor: '#E7E2FA' }} data-testid={`card-invoice-analysis-${analysis.id}`}>
                      {thumbnailUrl ? (
                        <a
                          href={thumbnailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border bg-gray-50 flex items-center justify-center"
                          data-testid={`link-invoice-thumbnail-${analysis.id}`}
                        >
                          {isPdf ? <FileText size={28} className="text-red-500" /> : (
                            <img src={thumbnailUrl} alt="Uploaded invoice" className="w-full h-full object-cover" data-testid={`img-invoice-thumbnail-${analysis.id}`} />
                          )}
                        </a>
                      ) : (
                        <div className="w-20 h-20 rounded-lg flex-shrink-0 bg-gray-50 flex items-center justify-center">
                          <FileText size={25} className="text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold truncate" style={{ color: '#2C0F5B', fontSize: 13 }} data-testid={`text-invoice-description-${analysis.id}`}>
                              {analysis.serviceDescription || 'Invoice scan'}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {analysis.createdAt ? new Date(analysis.createdAt).toLocaleDateString() : 'Date unavailable'}
                              {analysis.totalAmount ? ` · $${Number(analysis.totalAmount).toFixed(2)}` : ''}
                            </div>
                            {analysis.homeArea && (
                              <div
                                className="flex items-center gap-1 text-xs mt-1"
                                style={{ color: '#3C258E' }}
                                data-testid={`text-invoice-home-area-${analysis.id}`}
                              >
                                <MapPin size={12} />
                                {getHomeAreaLabel(analysis.homeArea)}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" style={statusStyle} data-testid={`status-invoice-analysis-${analysis.id}`}>
                            {status[0].toUpperCase() + status.slice(1)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Confidence: <span className="font-medium capitalize">{analysis.aiConfidence || 'unknown'}</span>
                          {analysis.contractorCompany ? ` · ${analysis.contractorCompany}` : ''}
                        </div>
                        {status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 h-8"
                            onClick={() => reReviewInvoiceAnalysis(analysis)}
                            data-testid={`button-rereview-invoice-${analysis.id}`}
                          >
                            {analysis.contractorId ? "Review contractor invoice" : "Re-review"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Filters and Download Options */}
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* House Filter */}
            {houses.length > 1 && (
              <Select value={serviceRecordsHouseFilter} onValueChange={setServiceRecordsHouseFilter}>
                <SelectTrigger className="w-full sm:w-64" style={{ backgroundColor: '#ffffff', borderColor: 'rgba(83,74,183,0.15)' }} data-testid="select-house-filter-service-records">
                  <SelectValue placeholder="Filter by house" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Houses</SelectItem>
                  {houses.map((house: House) => (
                    <SelectItem key={house.id} value={house.id}>{house.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Home Area Filter */}
            <Select value={homeAreaFilter} onValueChange={setHomeAreaFilter}>
              <SelectTrigger className="w-full sm:w-64" style={{ backgroundColor: '#ffffff', borderColor: 'rgba(83,74,183,0.15)' }} data-testid="select-home-area-filter-logs">
                <SelectValue placeholder="Filter by home area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Home Areas</SelectItem>
                {HOME_AREAS.map((area) => (
                  <SelectItem key={area.value} value={area.value}>{area.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Download Buttons */}
          {maintenanceLogs && maintenanceLogs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const sortedByDate = [...maintenanceLogs].sort((a, b) =>
                    new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()
                  );
                  const csv = generateServiceRecordsCSV(sortedByDate, 'date');
                  downloadCSV(csv, `service-records-by-date-${new Date().toISOString().split('T')[0]}.csv`);
                }}
                className="dash-light-card-btn"
                data-testid="button-download-by-date"
              >
                <Download size={13} />
                Download by Date
              </button>
              <button
                onClick={() => {
                  const sortedByArea = [...maintenanceLogs].sort((a, b) => {
                    const areaCompare = (a.homeArea || '').localeCompare(b.homeArea || '');
                    if (areaCompare !== 0) return areaCompare;
                    return new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime();
                  });
                  const csv = generateServiceRecordsCSV(sortedByArea, 'area');
                  downloadCSV(csv, `service-records-by-area-${new Date().toISOString().split('T')[0]}.csv`);
                }}
                className="dash-light-card-btn"
                data-testid="button-download-by-area"
              >
                <Download size={13} />
                Download by Area
              </button>
            </div>
          )}
        </div>

        <div
          className="mb-4 inline-flex w-full rounded-lg border border-[#D9D6F5] bg-white p-1 sm:w-auto"
          role="group"
          aria-label="Filter maintenance history"
          data-testid="score-history-filter"
        >
          {([
            ["all", "All"],
            ["scoring", "Scoring"],
            ["historical", "Historical"],
          ] as const).map(([value, label]) => {
            const isActive = scoreHistoryFilter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setScoreHistoryFilter(value);
                  setShowAllRecords(false);
                }}
                className="flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors sm:flex-none"
                style={{
                  backgroundColor: isActive ? "#3C258E" : "transparent",
                  color: isActive ? "#ffffff" : "#3C258E",
                }}
                aria-pressed={isActive}
                data-testid={`filter-maintenance-${value}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {!maintenanceLogsLoading && filteredLogs.length > 0 && (
          <p
            className="mb-4 text-sm text-gray-600"
            data-testid="score-impact-summary"
            aria-live="polite"
          >
            <span className="font-semibold text-[#2C0F5B]">{scoringFilteredLogsCount} of {filteredLogs.length}</span>
            {" "}record{filteredLogs.length === 1 ? "" : "s"} {filteredLogs.length === 1 ? "is" : "are"} counting toward your score
          </p>
        )}

        {/* Service Records List */}
        {maintenanceLogsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="property-card animate-pulse">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredLogs.length > 0 ? (
          (() => {
            const renderServiceCard = (log: MaintenanceLog) => (
              <div key={log.id} data-log-id={log.id} className="property-card hover:shadow-md transition-shadow" style={{ cursor: 'default' }}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-3">
                      <div style={{ background: '#EEEDFE', padding: 8, borderRadius: 10, flexShrink: 0 }}>
                        <Wrench style={{ width: 18, height: 18, color: '#3C258E' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 style={{ fontWeight: 700, fontSize: 13, color: '#2C0F5B', lineHeight: 1.3 }}>
                            {log.serviceDescription}
                          </h4>
                          <MaintenanceVerificationStatus
                            verificationTier={log.verificationTier}
                            aiVerificationStatus={log.aiVerificationStatus}
                            verificationReasonCodes={log.verificationReasonCodes}
                            className="max-w-full"
                          />
                        </div>
                        <div className="flex items-center flex-wrap gap-3" style={{ fontSize: 11, color: '#3C258E', marginTop: 3 }}>
                          <span className="flex items-center gap-1">
                            <Calendar style={{ width: 13, height: 13 }} />
                            {new Date(log.serviceDate).toLocaleDateString()}
                          </span>
                          {log.homeArea && (
                            <span className="flex items-center gap-1">
                              <MapPin style={{ width: 13, height: 13 }} />
                              {getHomeAreaLabel(log.homeArea)}
                            </span>
                          )}
                          <span style={{ background: '#EEEDFE', color: '#3C258E', borderRadius: 5, padding: '2px 7px', fontSize: 10, fontWeight: 600 }}>
                            {getServiceTypeLabel(log.serviceType)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditMaintenanceLog(log)}
                        style={{ color: '#3C258E' }}
                        data-testid={`button-edit-record-${log.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMaintenanceLogMutation.mutate(log.id)}
                        disabled={deleteMaintenanceLogMutation.isPending}
                        data-testid={`button-delete-record-${log.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {lockedDeleteRecordId === log.id && (
                    <div
                      className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                      role="alert"
                      data-testid={`delete-locked-message-${log.id}`}
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      <span>This record has been counted in your Home Health Score and cannot be deleted.</span>
                    </div>
                  )}

                  {(log.cost || log.contractorName || log.contractorCompany || log.nextServiceDue) && (
                    <div className="flex flex-wrap gap-4" style={{ fontSize: 12, color: '#6b7280', marginBottom: log.notes ? 12 : 0 }}>
                      {log.cost && (
                        <span className="flex items-center gap-1">
                          <DollarSign style={{ width: 13, height: 13 }} />
                          <span style={{ fontWeight: 600, color: '#2C0F5B' }}>${log.cost}</span>
                        </span>
                      )}
                      {log.contractorName && (
                        <span className="flex items-center gap-1">
                          <User style={{ width: 13, height: 13 }} />
                          {log.contractorName}
                        </span>
                      )}
                      {log.contractorCompany && (
                        <span className="flex items-center gap-1">
                          <Building2 style={{ width: 13, height: 13 }} />
                          {log.contractorCompany}
                        </span>
                      )}
                      {log.nextServiceDue && (
                        <span className="flex items-center gap-1">
                          <Clock style={{ width: 13, height: 13 }} />
                          Due: {new Date(log.nextServiceDue).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}

                  {log.notes && (
                    <div style={{ background: '#F8F7FF', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#6b7280', marginTop: 10 }}>
                      {log.notes}
                    </div>
                  )}

                  {/* Attachments Display */}
                  {((log.receiptUrls?.length ?? 0) > 0 || (log.beforePhotoUrls?.length ?? 0) > 0 || (log.afterPhotoUrls?.length ?? 0) > 0) && (
                    <div className="mt-4 space-y-3">
                      {log.receiptUrls && log.receiptUrls.length > 0 && (
                        <div>
                          <h5 style={{ fontSize: 11, fontWeight: 700, color: '#3C258E', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <FileText style={{ width: 13, height: 13 }} />
                            Receipts ({log.receiptUrls.length})
                          </h5>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {log.receiptUrls.map((url: string, index: number) => (
                              <a key={index} href={evidenceObjectUrl(url)} target="_blank" rel="noopener noreferrer"
                                className="block p-2 border rounded hover:bg-gray-50 transition-colors"
                                data-testid={`link-receipt-${index}`}>
                                {url.endsWith('.pdf') ? (
                                  <div className="flex items-center gap-2 text-sm">
                                    <FileText className="w-5 h-5 text-red-500" />
                                    <span className="truncate">Receipt {index + 1}</span>
                                  </div>
                                ) : (
                                  <img src={evidenceObjectUrl(url)} alt={`Receipt ${index + 1}`} className="w-full h-20 object-cover rounded" />
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {log.beforePhotoUrls && log.beforePhotoUrls.length > 0 && (
                        <div>
                          <h5 style={{ fontSize: 11, fontWeight: 700, color: '#3C258E', marginBottom: 6 }}>Before Photos ({log.beforePhotoUrls.length})</h5>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {log.beforePhotoUrls.map((url: string, index: number) => (
                              <a key={index} href={evidenceObjectUrl(url)} target="_blank" rel="noopener noreferrer"
                                className="block" data-testid={`link-before-photo-${index}`}>
                                <img src={evidenceObjectUrl(url)} alt={`Before photo ${index + 1}`} className="w-full h-24 object-cover rounded hover:opacity-90 transition-opacity" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {log.afterPhotoUrls && log.afterPhotoUrls.length > 0 && (
                        <div>
                          <h5 style={{ fontSize: 11, fontWeight: 700, color: '#3C258E', marginBottom: 6 }}>After Photos ({log.afterPhotoUrls.length})</h5>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {log.afterPhotoUrls.map((url: string, index: number) => (
                              <a key={index} href={evidenceObjectUrl(url)} target="_blank" rel="noopener noreferrer"
                                className="block" data-testid={`link-after-photo-${index}`}>
                                <img src={evidenceObjectUrl(url)} alt={`After photo ${index + 1}`} className="w-full h-24 object-cover rounded hover:opacity-90 transition-opacity" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {log.createdAt && (
                    <div style={{ marginTop: 10, fontSize: 10, color: '#B6A6F4', borderTop: '1px solid #EEEDFE', paddingTop: 8 }}>
                      Record added on {new Date(log.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  )}
              </div>
            );

            // Show last 2 records by default, with dropdown for older records
            const recentRecords = filteredLogs.slice(0, 2);
            const olderRecords = filteredLogs.slice(2);

            return (
              <div className="space-y-4">
                {/* Recent Records (Last 2) - Always Visible */}
                <div className="space-y-4">
                  {recentRecords.map(log => renderServiceCard(log))}
                </div>

                {/* Older Records - Collapsible Dropdown */}
                {olderRecords.length > 0 && (
                  <div className="mt-2">
                    <Collapsible open={showAllRecords} onOpenChange={setShowAllRecords}>
                      <CollapsibleTrigger asChild>
                        <button
                          className="dash-light-card-btn w-full justify-center"
                          style={{ width: '100%', justifyContent: 'center' }}
                          data-testid="button-toggle-older-records"
                        >
                          {showAllRecords ? 'Hide' : 'Show'} {olderRecords.length} Older Record{olderRecords.length !== 1 ? 's' : ''}
                          <ChevronDown
                            className={`transition-transform ${showAllRecords ? 'rotate-180' : ''}`}
                            style={{ width: 14, height: 14 }}
                          />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3">
                        <div className="space-y-3">
                          {olderRecords.map(log => renderServiceCard(log))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <div className="dash-light-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ width: 52, height: 52, background: '#EEEDFE', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <FileText style={{ width: 24, height: 24, color: '#3C258E' }} />
            </div>
            <div className="dash-light-card-title" style={{ marginBottom: 6 }}>No service records yet</div>
            <div className="dash-light-card-sub" style={{ marginBottom: 18 }}>
              Start tracking maintenance and repairs to build a complete home service history.
            </div>
            <button onClick={handleAddNewMaintenanceLog} className="dash-light-card-btn" style={{ margin: '0 auto' }}>
              <Plus size={14} />
              Add Your First Service Record
            </button>
          </div>
        )}

        {/* AI Invoice Analysis Dialog */}
        <Dialog open={aiInvoiceOpen} onOpenChange={setAiInvoiceOpen}>
          <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scan className="w-5 h-5" style={{ color: '#2c0f5b' }} />
                {aiStep === "upload" && "Scan Invoice with AI"}
                {aiStep === "diy-verify" && "Verify DIY Work"}
                {aiStep === "review" && "Review Extracted Details"}
                {aiStep === "done" && "Record Created!"}
                {aiStep === "duplicate" && "Already Scanned"}
              </DialogTitle>
            </DialogHeader>

            {aiStep === "upload" && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Upload an invoice or receipt and AI will automatically extract the service details. You can review and edit before saving.
                </p>

                {/* House selector */}
                {houses.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Which home?</label>
                    <Select value={aiSelectedHouseId} onValueChange={setAiSelectedHouseId}>
                      <SelectTrigger style={{ backgroundColor: '#ffffff' }}>
                        <SelectValue placeholder="Select house" />
                      </SelectTrigger>
                      <SelectContent>
                        {houses.map((h: House) => (
                          <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Completion method */}
                <div>
                  <label className="block text-sm font-medium mb-1">How was this completed?</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setAiCompletionMethod("contractor")}
                      className="flex-1 py-2 px-3 rounded border text-sm font-medium transition-colors border-gray-200"
                      style={aiCompletionMethod === "contractor" ? { borderColor: 'var(--purple)', background: 'var(--purple-tint)', color: 'var(--purple-deep)' } : {}}
                    >
                      Contractor / Professional
                    </button>
                    <button
                      onClick={() => setAiCompletionMethod("diy")}
                      className="flex-1 py-2 px-3 rounded border text-sm font-medium transition-colors border-gray-200"
                      style={aiCompletionMethod === "diy" ? { borderColor: 'var(--purple)', background: 'var(--purple-tint)', color: 'var(--purple-deep)' } : {}}
                    >
                      DIY
                    </button>
                  </div>
                </div>

                {/* Invoice upload */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Invoice / Receipt <span className="text-muted-foreground">(photo or PDF)</span>
                  </label>
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors" style={{ borderColor: '#b6a6f4' }}>
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      className="hidden"
                      data-testid="input-ai-invoice-files"
                      onChange={(e) => setAiInvoiceFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
                    />
                  </label>
                  {aiInvoiceFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-xs mt-1 px-2">
                      <span className="truncate text-muted-foreground">{f.name}</span>
                      <button onClick={() => setAiInvoiceFiles(p => p.filter((_, idx) => idx !== i))} className="text-red-400 ml-2"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>

                {aiCompletionMethod === "diy" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Material Receipts <span className="text-muted-foreground text-xs">(optional — for AI to extract service details)</span></label>
                      <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer transition-colors" style={{ borderColor: '#b6a6f4' }}>
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Upload receipts</span>
                        <input type="file" accept="image/*,.pdf" multiple className="hidden" data-testid="input-ai-receipt-files" onChange={(e) => setAiReceiptFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
                      </label>
                      {aiReceiptFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-xs mt-1 px-2">
                          <span className="truncate text-muted-foreground">{f.name}</span>
                          <button onClick={() => setAiReceiptFiles(p => p.filter((_, idx) => idx !== i))} className="text-red-400 ml-2"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 border border-amber-200">Before &amp; after photos for verification will be requested in the next step.</p>
                  </>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setAiInvoiceOpen(false)}>Cancel</Button>
                  <Button
                    onClick={runAiAnalysis}
                    disabled={aiAnalyzing}
                    style={{ backgroundColor: '#2c0f5b', color: 'white' }}
                    data-testid="button-ai-analyze"
                  >
                    {aiAnalyzing ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                    ) : (
                      <><Scan className="w-4 h-4 mr-2" />Analyze with AI</>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}

            {aiStep === "diy-verify" && aiAnalysis && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm font-medium text-amber-800 mb-1">DIY Work Verification Required</p>
                  <p className="text-xs text-amber-700">Upload before and after photos of your DIY work so AI can verify completion. This is required before saving your record.</p>
                </div>

                {aiDiyVerifyResult && (
                  <div className={`p-3 rounded-lg border ${aiDiyVerifyResult.diyVerified ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                    <p className={`text-sm font-medium ${aiDiyVerifyResult.diyVerified ? "text-green-800" : "text-red-800"}`}>
                      {aiDiyVerifyResult.diyVerified ? "✓ Verification passed" : "✗ Verification inconclusive"}
                    </p>
                    {aiDiyVerifyResult.verificationNotes && <p className="text-xs mt-1" style={{ color: aiDiyVerifyResult.diyVerified ? '#166534' : '#991b1b' }}>{aiDiyVerifyResult.verificationNotes}</p>}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-700">Before Photos *</label>
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer" style={{ borderColor: '#b6a6f4' }}>
                      <Upload className="w-5 h-5 mb-1" style={{ color: 'var(--hw-primary)' }} />
                      <span className="text-xs text-gray-600">Upload before photos</span>
                      <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => setAiDiyVerifyFiles((p) => ({ ...p, before: Array.from(e.target.files || []) }))} />
                    </label>
                    {aiDiyVerifyFiles.before.length > 0 && <p className="text-xs text-green-600 mt-1">{aiDiyVerifyFiles.before.length} before photo(s)</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-700">After Photos *</label>
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer" style={{ borderColor: '#b6a6f4' }}>
                      <Upload className="w-5 h-5 mb-1" style={{ color: 'var(--hw-primary)' }} />
                      <span className="text-xs text-gray-600">Upload after photos</span>
                      <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => setAiDiyVerifyFiles((p) => ({ ...p, after: Array.from(e.target.files || []) }))} />
                    </label>
                    {aiDiyVerifyFiles.after.length > 0 && <p className="text-xs text-green-600 mt-1">{aiDiyVerifyFiles.after.length} after photo(s)</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-700">Receipt (optional)</label>
                    <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer" style={{ borderColor: '#b6a6f4' }}>
                      <Upload className="w-5 h-5 mb-1" style={{ color: 'var(--hw-primary)' }} />
                      <span className="text-xs text-gray-600">Upload receipt</span>
                      <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => setAiDiyVerifyFiles((p) => ({ ...p, receipt: Array.from(e.target.files || []) }))} />
                    </label>
                    {aiDiyVerifyFiles.receipt.length > 0 && <p className="text-xs text-green-600 mt-1">{aiDiyVerifyFiles.receipt.length} receipt(s)</p>}
                  </div>
                </div>

                <DialogFooter className="gap-2 flex-col sm:flex-row">
                  <Button variant="outline" onClick={() => setAiStep("upload")} disabled={aiDiyVerifying}>Back</Button>
                  <Button
                    onClick={runDiyVerify}
                    disabled={aiDiyVerifying}
                    className="text-white"
                    style={{ backgroundColor: '#7c3aed' }}
                    data-testid="button-run-diy-verify"
                  >
                    {aiDiyVerifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : "Verify with AI"}
                  </Button>
                  {aiDiyVerifyResult?.diyVerified && (
                    <Button
                      onClick={() => setAiStep("review")}
                      className="text-white"
                      style={{ backgroundColor: '#2c0f5b' }}
                      data-testid="button-diy-verify-to-review"
                    >
                      Continue to Review
                    </Button>
                  )}
                </DialogFooter>
              </div>
            )}

            {aiStep === "review" && aiAnalysis && (
              <div className="space-y-4">
                {aiAnalysis.completionMethod === "diy" && aiAnalysis.diyVerified && (
                  <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                    <p className="text-xs text-green-800">
                      Details captured during DIY verification are locked. You can still fill any details the receipt analysis left blank.
                    </p>
                  </div>
                )}
                {/* Confidence badge */}
                <div className="flex items-center gap-2">
                  {aiAnalysis.aiConfidence === "high" ? (
                    <Badge className="gap-1 bg-green-100 text-green-800 border-green-200">
                      <CheckCircle2 className="w-3 h-3" /> High confidence
                    </Badge>
                  ) : aiAnalysis.aiConfidence === "medium" ? (
                    <Badge className="gap-1 bg-yellow-100 text-yellow-800 border-yellow-200">
                      <AlertCircle className="w-3 h-3" /> Medium confidence — review carefully
                    </Badge>
                  ) : (
                    <Badge className="gap-1 bg-red-100 text-red-800 border-red-200">
                      <AlertCircle className="w-3 h-3" /> Low confidence — please fill in manually
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">AI-assisted invoice extraction</span>
                </div>

                {aiAnalysis.aiNotes && (
                  <div className="text-xs text-muted-foreground bg-gray-50 rounded p-2">{aiAnalysis.aiNotes}</div>
                )}

                <p className="text-sm text-muted-foreground">Review and edit the details extracted from your invoice, then click Confirm to save.</p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Service Description</label>
                    <Textarea
                      value={aiEditDescription}
                      onChange={(e) => setAiEditDescription(e.target.value)}
                      disabled={aiAnalysis.completionMethod === "diy" && aiAnalysis.diyVerified && !!aiAnalysis.serviceDescription}
                      placeholder="What was done?"
                      className="min-h-[60px]"
                      data-testid="input-ai-description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Service Date</label>
                      <Input type="date" value={aiEditDate} onChange={(e) => setAiEditDate(e.target.value)} disabled={aiAnalysis.completionMethod === "diy" && aiAnalysis.diyVerified && !!aiAnalysis.serviceDate} data-testid="input-ai-date" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Total Amount ($)</label>
                      <Input type="number" step="0.01" placeholder="0.00" value={aiEditAmount} onChange={(e) => setAiEditAmount(e.target.value)} disabled={aiAnalysis.completionMethod === "diy" && aiAnalysis.diyVerified && !!aiAnalysis.totalAmount} data-testid="input-ai-amount" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Service Type</label>
                      <Select value={aiEditServiceType} onValueChange={setAiEditServiceType} disabled={aiAnalysis.completionMethod === "diy" && aiAnalysis.diyVerified && !!aiAnalysis.serviceType}>
                        <SelectTrigger style={{ backgroundColor: '#ffffff' }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Home Area</label>
                      <Select value={aiEditHomeArea} onValueChange={setAiEditHomeArea} disabled={aiAnalysis.completionMethod === "diy" && aiAnalysis.diyVerified && !!aiAnalysis.homeArea}>
                        <SelectTrigger style={{ backgroundColor: '#ffffff' }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HOME_AREAS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {aiCompletionMethod === "contractor" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Contractor Name</label>
                        <Input value={aiEditContractorName} onChange={(e) => setAiEditContractorName(e.target.value)} placeholder="Name" data-testid="input-ai-contractor-name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Company</label>
                        <Input value={aiEditContractorCompany} onChange={(e) => setAiEditContractorCompany(e.target.value)} placeholder="Company" data-testid="input-ai-contractor-company" />
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  {aiAnalysis.contractorId ? (
                    <Button variant="outline" onClick={rejectContractorAnalysis} disabled={aiConfirming}>Reject</Button>
                  ) : (
                    <Button variant="outline" onClick={() => setAiStep("upload")}>Back</Button>
                  )}
                  <Button
                    onClick={confirmAiAnalysis}
                    disabled={aiConfirming || !aiEditDescription}
                    style={{ backgroundColor: '#2c0f5b', color: 'white' }}
                    data-testid="button-ai-confirm"
                  >
                    {aiConfirming ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4 mr-2" />Confirm & Save</>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}

            {aiStep === "done" && (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-14 h-14 mx-auto text-green-500" />
                <p className="text-lg font-semibold text-green-700">Service record created!</p>
                <p className="text-sm text-muted-foreground">
                  {aiOutsideScoringWindow
                    ? "This record was saved to your history, but it's older than 12 months so it won't affect your current Home Wellness Score."
                    : "Your Home Wellness Score™ has been updated."}
                </p>
              </div>
            )}

            {aiStep === "duplicate" && (
              <div className="py-8 text-center space-y-4">
                <AlertCircle className="w-14 h-14 mx-auto" style={{ color: '#f59e0b' }} />
                <p className="text-lg font-semibold">You already scanned this invoice</p>
                <p className="text-sm text-muted-foreground">
                  This file has already been analyzed and saved to your service records. No need to scan it again.
                </p>
                {aiDuplicateCreatedAt && !Number.isNaN(Date.parse(aiDuplicateCreatedAt)) && (
                  <p className="text-sm font-medium">
                    Originally scanned {new Intl.DateTimeFormat("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(aiDuplicateCreatedAt))}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                  {aiDuplicateAnalysisId && (
                    <Button
                      onClick={() => viewDuplicateRecord(aiDuplicateAnalysisId)}
                      style={{ backgroundColor: 'var(--purple)', color: '#fff' }}
                    >
                      View existing record
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAiAnalyzing(false);
                      setAiStep("upload");
                      setAiInvoiceFiles([]);
                      setAiReceiptFiles([]);
                      setAiDuplicateAnalysisId(null);
                      setAiDuplicateCreatedAt(null);
                    }}
                  >
                    Scan a different invoice
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Maintenance Log Form Dialog */}
        <Dialog open={isMaintenanceLogDialogOpen} onOpenChange={setIsMaintenanceLogDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMaintenanceLog ? 'Edit Service Record' : 'Add New Service Record'}
              </DialogTitle>
            </DialogHeader>

            <Form {...maintenanceLogForm}>
              <form onSubmit={maintenanceLogForm.handleSubmit(onSubmitMaintenanceLog)} className="space-y-4">
                {houses.length > 1 && (
                  <FormField
                    control={maintenanceLogForm.control}
                    name="houseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>House</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                              <SelectValue placeholder="Select house" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent style={{ backgroundColor: '#ffffff' }}>
                            {houses.map((house) => (
                              <SelectItem key={house.id} value={house.id} style={{ color: '#000000' }}>
                                {house.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={maintenanceLogForm.control}
                    name="serviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                              <SelectValue placeholder="Select service type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent style={{ backgroundColor: '#ffffff' }}>
                            {SERVICE_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value} style={{ color: '#000000' }}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={maintenanceLogForm.control}
                    name="homeArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Home Area</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                              <SelectValue placeholder="Select home area" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent style={{ backgroundColor: '#ffffff' }}>
                            {HOME_AREAS.map((area) => (
                              <SelectItem key={area.value} value={area.value} style={{ color: '#000000' }}>
                                {area.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={maintenanceLogForm.control}
                  name="serviceDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Description</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Annual HVAC tune-up, Gutter cleaning, Roof repair" {...field} style={{ backgroundColor: 'white', color: '#000000' }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={maintenanceLogForm.control}
                    name="serviceDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} style={{ backgroundColor: 'white', color: '#000000' }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={maintenanceLogForm.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Service cost"
                            {...field}
                            value={field.value || ""}
                            onChange={e => {
                              const value = e.target.value;
                              field.onChange(value ? parseFloat(value) : undefined);
                            }}
                            style={{ backgroundColor: 'white', color: '#000000' }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={maintenanceLogForm.control}
                    name="contractorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contractor Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Contractor or technician name" {...field} value={field.value || ""} style={{ backgroundColor: 'white', color: '#000000' }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={maintenanceLogForm.control}
                    name="contractorCompany"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <Input placeholder="Company or service provider" {...field} value={field.value || ""} style={{ backgroundColor: 'white', color: '#000000' }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={maintenanceLogForm.control}
                    name="warrantyPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty Period</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 1 year, 6 months" {...field} value={field.value || ""} style={{ backgroundColor: 'white', color: '#000000' }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={maintenanceLogForm.control}
                    name="nextServiceDue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next Service Due</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} style={{ backgroundColor: 'white', color: '#000000' }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={maintenanceLogForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <textarea
                          className="flex min-h-[80px] w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ backgroundColor: 'white', color: '#000000' }}
                          placeholder="Any additional notes about the service..."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* File Upload Section */}
                <div className="space-y-4 pt-4 border-t" style={{ borderColor: '#b6a6f4' }}>
                  <h3 className="text-lg font-semibold">Attachments</h3>

                  {/* Receipt Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Receipts/Invoices
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setReceiptFiles(prev => [...prev, ...files]);
                      }}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-white file:text-[var(--hw-primary)]
                        hover:file:bg-gray-100"
                      data-testid="input-receipt-files"
                    />
                    {receiptFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {receiptFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-sm" style={{ color: '#b6a6f4' }}>
                            <span className="truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setReceiptFiles(prev => prev.filter((_, i) => i !== index))}
                              className="ml-2 text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Before Photos Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Before Photos
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setBeforePhotoFiles(prev => [...prev, ...files]);
                      }}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-white file:text-[var(--hw-primary)]
                        hover:file:bg-gray-100"
                      data-testid="input-before-photos"
                    />
                    {beforePhotoFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {beforePhotoFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-sm" style={{ color: '#b6a6f4' }}>
                            <span className="truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setBeforePhotoFiles(prev => prev.filter((_, i) => i !== index))}
                              className="ml-2 text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* After Photos Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      After Photos
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setAfterPhotoFiles(prev => [...prev, ...files]);
                      }}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-white file:text-[var(--hw-primary)]
                        hover:file:bg-gray-100"
                      data-testid="input-after-photos"
                    />
                    {afterPhotoFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {afterPhotoFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-sm" style={{ color: '#b6a6f4' }}>
                            <span className="truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setAfterPhotoFiles(prev => prev.filter((_, i) => i !== index))}
                              className="ml-2 text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    onClick={() => setIsMaintenanceLogDialogOpen(false)}
                    style={{ backgroundColor: 'white', color: '#2c0f5b' }}
                    className="hover:opacity-90"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMaintenanceLogMutation.isPending || updateMaintenanceLogMutation.isPending || isUploadingFiles}
                    style={{ backgroundColor: '#b6a6f4', color: 'white' }}
                    className="hover:opacity-90"
                    data-testid="button-submit-service-record"
                  >
                    {isUploadingFiles ? 'Uploading...' : (createMaintenanceLogMutation.isPending || updateMaintenanceLogMutation.isPending ? 'Saving...' : editingMaintenanceLog ? 'Update' : 'Add')} Service Record
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        <Dialog open={!!evidenceReviewSource} onOpenChange={(open) => !open && clearEvidenceReviewUrl()}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Provide additional evidence</DialogTitle>
              <DialogDescription>
                Add the photos or receipts requested by the reviewer. Your existing evidence will remain attached to the record.
              </DialogDescription>
            </DialogHeader>
            {evidenceReviewContextError ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">This evidence request is no longer available.</p>
                <Button onClick={clearEvidenceReviewUrl}>Close</Button>
              </div>
            ) : !evidenceReviewContext ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading request…</div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="font-medium text-sm">{evidenceReviewContext.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{evidenceReviewContext.note}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Current evidence: {evidenceReviewContext.evidenceCounts.beforePhotos} before photo(s), {evidenceReviewContext.evidenceCounts.afterPhotos} after photo(s), and {evidenceReviewContext.evidenceCounts.receipts} receipt(s).</p>
                </div>
                {([
                  ["before", "Before photos", "image/*"],
                  ["after", "After photos", "image/*"],
                  ["receipt", "Receipts (images or PDF)", "image/jpeg,image/png,image/webp,application/pdf"],
                ] as const).map(([role, label, accept]) => (
                  <div key={role}>
                    <label className="block text-sm font-medium mb-2">{label}</label>
                    <Input type="file" accept={accept} multiple onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      setEvidenceFiles((current) => ({ ...current, [role]: [...current[role], ...files] }));
                      event.currentTarget.value = "";
                    }} data-testid={`input-evidence-${role}`} />
                    {evidenceFiles[role].map((file, index) => (
                      <div className="mt-2 flex items-center justify-between text-sm" key={`${file.name}-${index}`}>
                        <span className="truncate">{file.name}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEvidenceFiles((current) => ({
                          ...current, [role]: current[role].filter((_, currentIndex) => currentIndex !== index),
                        }))}><X className="h-4 w-4" /><span className="sr-only">Remove {file.name}</span></Button>
                      </div>
                    ))}
                  </div>
                ))}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={clearEvidenceReviewUrl}>Cancel</Button>
                  <Button type="button" disabled={resubmitEvidenceMutation.isPending || Object.values(evidenceFiles).every((files) => files.length === 0)} onClick={() => resubmitEvidenceMutation.mutate()} data-testid="button-submit-evidence">
                    {resubmitEvidenceMutation.isPending ? "Submitting…" : "Submit evidence"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

    </div>
  );
}

export const isScoringMaintenanceLog = (log: MaintenanceLog, now = new Date()): boolean => {
  const dateOnlyMatch = String(log.serviceDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const serviceDate = dateOnlyMatch ? null : new Date(log.serviceDate);
  if (!dateOnlyMatch && (!serviceDate || Number.isNaN(serviceDate.getTime()))) return false;

  const currentAbsoluteMonth = now.getFullYear() * 12 + (now.getMonth() + 1);
  const serviceYear = dateOnlyMatch ? Number(dateOnlyMatch[1]) : serviceDate!.getFullYear();
  const serviceMonth = dateOnlyMatch ? Number(dateOnlyMatch[2]) : serviceDate!.getMonth() + 1;
  const serviceAbsoluteMonth = serviceYear * 12 + serviceMonth;
  return serviceAbsoluteMonth >= currentAbsoluteMonth - 12;
};
