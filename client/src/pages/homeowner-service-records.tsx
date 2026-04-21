import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertMaintenanceLogSchema } from "@shared/schema";
import type { MaintenanceLog, House, InvoiceAnalysis } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { FreeUserUpgradePrompt, HomeownerTrialBanner } from "@/components/homeowner-feature-gate";
import { PageHero } from "@/components/page-hero";
import { useHomeownerSubscription } from "@/hooks/useHomeownerSubscription";
import { apiRequest } from "@/lib/queryClient";
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
  X
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

export default function HomeownerServiceRecords() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const homeownerId = user?.id || "";
  
  const { isFreeUser, isLoading: subscriptionLoading } = useHomeownerSubscription();

  if (isFreeUser && !subscriptionLoading) {
    return <FreeUserUpgradePrompt />;
  }

  const [isMaintenanceLogDialogOpen, setIsMaintenanceLogDialogOpen] = useState(false);
  const [editingMaintenanceLog, setEditingMaintenanceLog] = useState<MaintenanceLog | null>(null);
  const [homeAreaFilter, setHomeAreaFilter] = useState<string>("all");
  const [serviceRecordsHouseFilter, setServiceRecordsHouseFilter] = useState<string>("all");
  const [showAllRecords, setShowAllRecords] = useState<boolean>(false);

  // File upload state
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [beforePhotoFiles, setBeforePhotoFiles] = useState<File[]>([]);
  const [afterPhotoFiles, setAfterPhotoFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // AI Invoice Analysis state
  const [aiInvoiceOpen, setAiInvoiceOpen] = useState(false);
  const [aiStep, setAiStep] = useState<"upload" | "review" | "done">("upload");
  const [aiCompletionMethod, setAiCompletionMethod] = useState<"contractor" | "diy">("contractor");
  const [aiInvoiceFiles, setAiInvoiceFiles] = useState<File[]>([]);
  const [aiBeforeFiles, setAiBeforeFiles] = useState<File[]>([]);
  const [aiAfterFiles, setAiAfterFiles] = useState<File[]>([]);
  const [aiReceiptFiles, setAiReceiptFiles] = useState<File[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<InvoiceAnalysis | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiConfirming, setAiConfirming] = useState(false);
  // Editable review form
  const [aiEditDescription, setAiEditDescription] = useState("");
  const [aiEditDate, setAiEditDate] = useState("");
  const [aiEditAmount, setAiEditAmount] = useState("");
  const [aiEditContractorName, setAiEditContractorName] = useState("");
  const [aiEditContractorCompany, setAiEditContractorCompany] = useState("");
  const [aiEditHomeArea, setAiEditHomeArea] = useState("");
  const [aiEditServiceType, setAiEditServiceType] = useState("");
  const [aiSelectedHouseId, setAiSelectedHouseId] = useState("");

  // Load houses
  const { data: houses = [] } = useQuery<House[]>({
    queryKey: ['/api/houses'],
  });

  // Load confirmed invoice analyses to reliably power "Verified by AI" badges
  const { data: confirmedAnalyses = [] } = useQuery<InvoiceAnalysis[]>({
    queryKey: ['/api/invoice-analyses'],
    queryFn: async () => {
      const res = await fetch('/api/invoice-analyses');
      if (!res.ok) return [];
      return res.json();
    },
  });
  const aiVerifiedLogIds = new Set(
    confirmedAnalyses
      .filter((a) => a.status === "confirmed" && a.maintenanceLogId)
      .map((a) => a.maintenanceLogId!)
  );

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
    resolver: zodResolver(maintenanceLogFormSchema),
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
      if (!response.ok) throw new Error('Failed to create maintenance log');
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
    onError: () => {
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
      const response = await fetch(`/api/maintenance-logs/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete maintenance log');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-logs'] });
      toast({ title: "Success", description: "Maintenance log deleted successfully" });
    },
    onError: () => {
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

  const openAiInvoiceDialog = () => {
    setAiStep("upload");
    setAiCompletionMethod("contractor");
    setAiInvoiceFiles([]);
    setAiBeforeFiles([]);
    setAiAfterFiles([]);
    setAiReceiptFiles([]);
    setAiAnalysis(null);
    setAiSelectedHouseId(houses[0]?.id || "");
    setAiInvoiceOpen(true);
  };

  const runAiAnalysis = async () => {
    if (!aiSelectedHouseId) {
      toast({ title: "Error", description: "Please select a house first.", variant: "destructive" });
      return;
    }
    const allFiles = [...aiInvoiceFiles, ...aiReceiptFiles, ...aiBeforeFiles, ...aiAfterFiles];
    if (allFiles.length === 0) {
      toast({ title: "Error", description: "Please upload at least one invoice or photo.", variant: "destructive" });
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
        beforePhotoFiles: await toFilesPayload(aiBeforeFiles),
        afterPhotoFiles: await toFilesPayload(aiAfterFiles),
        receiptFiles: await toFilesPayload(aiReceiptFiles),
      };

      const res = await apiRequest("/api/invoice-analyses/analyze", "POST", payload);
      const analysis: InvoiceAnalysis = await res.json();
      setAiAnalysis(analysis);
      setAiEditDescription(analysis.serviceDescription || "");
      setAiEditDate(analysis.serviceDate || new Date().toISOString().split("T")[0]);
      setAiEditAmount(analysis.totalAmount ? String(parseFloat(analysis.totalAmount)) : "");
      setAiEditContractorName(analysis.contractorName || "");
      setAiEditContractorCompany(analysis.contractorCompany || "");
      setAiEditHomeArea(analysis.homeArea || "other");
      setAiEditServiceType(analysis.serviceType || "maintenance");
      setAiStep("review");
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
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-analyses"] });
      if (data.newAchievements?.length > 0) {
        toast({ title: "Achievement Unlocked!", description: data.newAchievements[0]?.title || "New achievement earned!" });
      }
      toast({ title: "Record created", description: "Service record added and health score updated." });
      setAiStep("done");
      setTimeout(() => setAiInvoiceOpen(false), 1500);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save record. Please try again.", variant: "destructive" });
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

  const filteredLogs = maintenanceLogs?.filter(log => homeAreaFilter === "all" || log.homeArea === homeAreaFilter) || [];

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow="Homeowner"
        title="Service Records"
        subtitle="Complete history of maintenance and repairs"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={openAiInvoiceDialog}
              data-testid="button-ai-scan-invoice"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 9, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Scan style={{ width: 13, height: 13 }} />
              AI Scan Invoice
            </button>
            <button
              onClick={handleAddNewMaintenanceLog}
              data-testid="button-add-service-record"
              style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 9, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
            >
              + Add record
            </button>
          </div>
        }
      />
      <div className="container mx-auto px-4 py-8">
        <HomeownerTrialBanner />

        {/* Filters and Download Options */}
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* House Filter */}
            {houses.length > 1 && (
              <Select value={serviceRecordsHouseFilter} onValueChange={setServiceRecordsHouseFilter}>
                <SelectTrigger className="w-full sm:w-64" style={{ backgroundColor: '#f2f2f2' }} data-testid="select-house-filter-service-records">
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
              <SelectTrigger className="w-full sm:w-64" style={{ backgroundColor: '#f2f2f2' }} data-testid="select-home-area-filter-logs">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const sortedByDate = [...maintenanceLogs].sort((a, b) => 
                    new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()
                  );
                  const csv = generateServiceRecordsCSV(sortedByDate, 'date');
                  downloadCSV(csv, `service-records-by-date-${new Date().toISOString().split('T')[0]}.csv`);
                }}
                className="text-xs"
                style={{ backgroundColor: '#2c0f5b', color: 'white', borderColor: '#2c0f5b' }}
                data-testid="button-download-by-date"
              >
                <Download className="w-3 h-3 mr-1" />
                Download by Date
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const sortedByArea = [...maintenanceLogs].sort((a, b) => {
                    const areaCompare = (a.homeArea || '').localeCompare(b.homeArea || '');
                    if (areaCompare !== 0) return areaCompare;
                    return new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime();
                  });
                  const csv = generateServiceRecordsCSV(sortedByArea, 'area');
                  downloadCSV(csv, `service-records-by-area-${new Date().toISOString().split('T')[0]}.csv`);
                }}
                className="text-xs"
                style={{ backgroundColor: '#2c0f5b', color: 'white', borderColor: '#2c0f5b' }}
                data-testid="button-download-by-area"
              >
                <Download className="w-3 h-3 mr-1" />
                Download by Area
              </Button>
            </div>
          )}
        </div>

        {/* Service Records List */}
        {maintenanceLogsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredLogs.length > 0 ? (
          (() => {
            const renderServiceCard = (log: MaintenanceLog) => (
              <Card key={log.id} className="hover:shadow-md transition-shadow" style={{ backgroundColor: '#f2f2f2' }}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded">
                        <Wrench className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-semibold text-foreground">
                            {log.serviceDescription}
                          </h4>
                          {aiVerifiedLogIds.has(log.id) && (
                            <Badge className="text-xs gap-1 bg-purple-100 text-purple-800 border-purple-200 font-medium">
                              <CheckCircle2 className="w-3 h-3" /> Verified by AI
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm" style={{ color: '#2c0f5b' }}>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(log.serviceDate).toLocaleDateString()}
                          </span>
                          {log.homeArea && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {getHomeAreaLabel(log.homeArea)}
                            </span>
                          )}
                          <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: '#2c0f5b20', color: '#2c0f5b' }}>
                            {getServiceTypeLabel(log.serviceType)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleEditMaintenanceLog(log)}
                        style={{ color: '#2c0f5b' }}
                        className="hover:opacity-90"
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
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {log.cost && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">${log.cost}</span>
                      </div>
                    )}
                    {log.contractorName && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{log.contractorName}</span>
                      </div>
                    )}
                    {log.contractorCompany && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{log.contractorCompany}</span>
                      </div>
                    )}
                    {log.nextServiceDue && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>Due: {new Date(log.nextServiceDue).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  
                  {log.notes && (
                    <div className="mt-4 p-3 bg-muted rounded text-sm">
                      <span className="text-muted-foreground">{log.notes}</span>
                    </div>
                  )}
                  
                  {/* Attachments Display */}
                  {(log.receiptUrls?.length > 0 || log.beforePhotoUrls?.length > 0 || log.afterPhotoUrls?.length > 0) && (
                    <div className="mt-4 space-y-3">
                      {/* Receipts */}
                      {log.receiptUrls && log.receiptUrls.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: '#2c0f5b' }}>
                            <FileText className="w-4 h-4" />
                            Receipts ({log.receiptUrls.length})
                          </h5>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {log.receiptUrls.map((url: string, index: number) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-2 border rounded hover:bg-gray-50 transition-colors"
                                data-testid={`link-receipt-${index}`}
                              >
                                {url.endsWith('.pdf') ? (
                                  <div className="flex items-center gap-2 text-sm">
                                    <FileText className="w-5 h-5 text-red-500" />
                                    <span className="truncate">Receipt {index + 1}</span>
                                  </div>
                                ) : (
                                  <img
                                    src={url}
                                    alt={`Receipt ${index + 1}`}
                                    className="w-full h-20 object-cover rounded"
                                  />
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Before Photos */}
                      {log.beforePhotoUrls && log.beforePhotoUrls.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: '#2c0f5b' }}>
                            Before Photos ({log.beforePhotoUrls.length})
                          </h5>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {log.beforePhotoUrls.map((url: string, index: number) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                                data-testid={`link-before-photo-${index}`}
                              >
                                <img
                                  src={url}
                                  alt={`Before photo ${index + 1}`}
                                  className="w-full h-24 object-cover rounded hover:opacity-90 transition-opacity"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* After Photos */}
                      {log.afterPhotoUrls && log.afterPhotoUrls.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: '#2c0f5b' }}>
                            After Photos ({log.afterPhotoUrls.length})
                          </h5>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {log.afterPhotoUrls.map((url: string, index: number) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                                data-testid={`link-after-photo-${index}`}
                              >
                                <img
                                  src={url}
                                  alt={`After photo ${index + 1}`}
                                  className="w-full h-24 object-cover rounded hover:opacity-90 transition-opacity"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {log.createdAt && (
                    <div className="mt-3 text-xs text-gray-500 border-t pt-2">
                      Record added on {new Date(log.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
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
                  <div className="mt-4">
                    <Collapsible open={showAllRecords} onOpenChange={setShowAllRecords}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full flex items-center justify-center gap-2"
                          style={{ backgroundColor: '#f2f2f2', borderColor: '#2c0f5b' }}
                          data-testid="button-toggle-older-records"
                        >
                          <span style={{ color: '#2c0f5b' }}>
                            {showAllRecords ? 'Hide' : 'Show'} {olderRecords.length} Older Record{olderRecords.length !== 1 ? 's' : ''}
                          </span>
                          <ChevronDown 
                            className={`w-4 h-4 transition-transform ${showAllRecords ? 'rotate-180' : ''}`}
                            style={{ color: '#2c0f5b' }}
                          />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <div className="space-y-4">
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
          <div className="text-center py-12 rounded-lg" style={{ backgroundColor: '#ffffff' }}>
            <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: '#b6a6f4' }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: '#2c0f5b' }}>No service records yet</h3>
            <p className="mb-4" style={{ color: '#000000' }}>
              Start tracking maintenance and repairs to build a complete home service history.
            </p>
            <Button onClick={handleAddNewMaintenanceLog} style={{ backgroundColor: '#2c0f5b', color: 'white' }} className="hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Service Record
            </Button>
          </div>
        )}

        {/* AI Invoice Analysis Dialog */}
        <Dialog open={aiInvoiceOpen} onOpenChange={setAiInvoiceOpen}>
          <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scan className="w-5 h-5" style={{ color: '#2c0f5b' }} />
                {aiStep === "upload" && "Scan Invoice with AI"}
                {aiStep === "review" && "Review Extracted Details"}
                {aiStep === "done" && "Record Created!"}
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
                      className={`flex-1 py-2 px-3 rounded border text-sm font-medium transition-colors ${aiCompletionMethod === "contractor" ? "border-purple-600 bg-purple-50 text-purple-800" : "border-gray-200 hover:border-gray-300"}`}
                    >
                      Contractor / Professional
                    </button>
                    <button
                      onClick={() => setAiCompletionMethod("diy")}
                      className={`flex-1 py-2 px-3 rounded border text-sm font-medium transition-colors ${aiCompletionMethod === "diy" ? "border-purple-600 bg-purple-50 text-purple-800" : "border-gray-200 hover:border-gray-300"}`}
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
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:border-purple-400 transition-colors" style={{ borderColor: '#b6a6f4' }}>
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
                      <label className="block text-sm font-medium mb-1">Before Photos <span className="text-muted-foreground text-xs">(helps verify DIY work)</span></label>
                      <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:border-purple-400 transition-colors" style={{ borderColor: '#b6a6f4' }}>
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Upload before photos</span>
                        <input type="file" accept="image/*" multiple className="hidden" data-testid="input-ai-before-photos" onChange={(e) => setAiBeforeFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
                      </label>
                      {aiBeforeFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-xs mt-1 px-2">
                          <span className="truncate text-muted-foreground">{f.name}</span>
                          <button onClick={() => setAiBeforeFiles(p => p.filter((_, idx) => idx !== i))} className="text-red-400 ml-2"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">After Photos <span className="text-muted-foreground text-xs">(shows completed work)</span></label>
                      <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:border-purple-400 transition-colors" style={{ borderColor: '#b6a6f4' }}>
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Upload after photos</span>
                        <input type="file" accept="image/*" multiple className="hidden" data-testid="input-ai-after-photos" onChange={(e) => setAiAfterFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
                      </label>
                      {aiAfterFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-xs mt-1 px-2">
                          <span className="truncate text-muted-foreground">{f.name}</span>
                          <button onClick={() => setAiAfterFiles(p => p.filter((_, idx) => idx !== i))} className="text-red-400 ml-2"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Material Receipts <span className="text-muted-foreground text-xs">(optional — further verifies DIY)</span></label>
                      <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:border-purple-400 transition-colors" style={{ borderColor: '#b6a6f4' }}>
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

            {aiStep === "review" && aiAnalysis && (
              <div className="space-y-4">
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
                  <span className="text-xs text-muted-foreground ml-auto">Verified by AI</span>
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
                      placeholder="What was done?"
                      className="min-h-[60px]"
                      data-testid="input-ai-description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Service Date</label>
                      <Input type="date" value={aiEditDate} onChange={(e) => setAiEditDate(e.target.value)} data-testid="input-ai-date" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Total Amount ($)</label>
                      <Input type="number" step="0.01" placeholder="0.00" value={aiEditAmount} onChange={(e) => setAiEditAmount(e.target.value)} data-testid="input-ai-amount" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Service Type</label>
                      <Select value={aiEditServiceType} onValueChange={setAiEditServiceType}>
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
                      <Select value={aiEditHomeArea} onValueChange={setAiEditHomeArea}>
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
                  <Button variant="outline" onClick={() => setAiStep("upload")}>Back</Button>
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
                <p className="text-sm text-muted-foreground">Your home health score has been updated.</p>
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
                        file:bg-white file:text-purple-700
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
                        file:bg-white file:text-purple-700
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
                        file:bg-white file:text-purple-700
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
      </div>
    </div>
  );
}
