import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Shield, Loader2, AlertTriangle, RefreshCw, Copy, Printer,
  CheckSquare, FileText, Clock, Sparkles, ChevronDown, ChevronUp, Info, Mail,
  History, Plus, ArrowLeft
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { House } from "@shared/schema";

const CLAIM_AREAS = [
  { value: "Roof", label: "Roof / Roofing" },
  { value: "HVAC", label: "HVAC / Heating & Cooling" },
  { value: "Plumbing", label: "Plumbing / Water Damage" },
  { value: "Electrical", label: "Electrical" },
  { value: "Foundation", label: "Foundation / Structural" },
  { value: "Appliances", label: "Appliances" },
  { value: "Interior", label: "Interior (Walls / Floors / Ceilings)" },
  { value: "Exterior", label: "Exterior (Siding / Deck / Fence)" },
  { value: "Garage", label: "Garage" },
  { value: "Other", label: "Other" },
];

interface TimelineItem {
  date: string;
  description: string;
  source: string;
}

interface InsurancePrepResult {
  id?: string;
  claimArea: string;
  summary: string;
  evidenceTimeline: TimelineItem[];
  documentsToGather: string[];
  claimMemo: string;
  meta: {
    totalRecords: number;
    houseAddress: string | null;
    houseAge: number | null;
  };
}

interface PastPackage {
  id: string;
  claimArea: string;
  incidentDescription: string | null;
  incidentDate: string | null;
  summary: string;
  evidenceTimeline: TimelineItem[];
  documentsToGather: string[];
  claimMemo: string;
  totalRecords: number;
  createdAt: string | null;
}

interface Props {
  houses: House[];
}

export function InsurancePrepTab({ houses }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedHouseId, setSelectedHouseId] = useState<string>(houses[0]?.id ?? "");
  const [claimArea, setClaimArea] = useState<string>("");

  // Sync selectedHouseId when houses finish loading (handles async query)
  useEffect(() => {
    if (!selectedHouseId && houses.length > 0) {
      setSelectedHouseId(houses[0].id);
    }
  }, [houses, selectedHouseId]);

  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [result, setResult] = useState<InsurancePrepResult | null>(null);
  const [checkedDocs, setCheckedDocs] = useState<Set<number>>(new Set());
  const [memoExpanded, setMemoExpanded] = useState(true);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [adjusterEmail, setAdjusterEmail] = useState("");

  const emailMutation = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error("No result");
      const res = await apiRequest("/api/insurance-prep/send-email", "POST", {
        adjusterEmail: adjusterEmail.trim(),
        claimArea: result.claimArea,
        claimMemo: result.claimMemo,
        evidenceTimeline: result.evidenceTimeline,
        documentsToGather: result.documentsToGather,
        houseAddress: result.meta.houseAddress ?? null,
      });
      return res.json();
    },
    onSuccess: () => {
      setEmailDialogOpen(false);
      setAdjusterEmail("");
      toast({ title: "Email sent", description: `Claim package sent to ${adjusterEmail}.` });
    },
    onError: (err: unknown) => {
      toast({
        title: "Failed to send email",
        description: err instanceof Error ? err.message : "Please try again or use Copy All instead.",
        variant: "destructive",
      });
    },
  });

  const [view, setView] = useState<"form" | "result" | "past">("form");
  const [viewingPastId, setViewingPastId] = useState<string | null>(null);

  // Fetch past packages
  const { data: pastPackages = [], isLoading: pastLoading } = useQuery<PastPackage[]>({
    queryKey: ["/api/houses", selectedHouseId, "insurance-claim-packages"],
    queryFn: async () => {
      if (!selectedHouseId) return [];
      const res = await apiRequest(`/api/houses/${selectedHouseId}/insurance-claim-packages`);
      return res.json();
    },
    enabled: !!selectedHouseId,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/houses/${selectedHouseId}/insurance-prep`, "POST", {
        claimArea,
        incidentDescription: incidentDescription.trim() || undefined,
        incidentDate: incidentDate || undefined,
      });
      return res.json() as Promise<InsurancePrepResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      setCheckedDocs(new Set());
      setMemoExpanded(true);
      setView("result");
      setViewingPastId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/houses", selectedHouseId, "insurance-claim-packages"] });
    },
  });

  const handleSubmit = () => {
    if (!selectedHouseId || !claimArea) return;
    setResult(null);
    generateMutation.mutate();
  };

  const handleOpenPast = (pkg: PastPackage) => {
    const syntheticResult: InsurancePrepResult = {
      id: pkg.id,
      claimArea: pkg.claimArea,
      summary: pkg.summary,
      evidenceTimeline: pkg.evidenceTimeline,
      documentsToGather: pkg.documentsToGather,
      claimMemo: pkg.claimMemo,
      meta: {
        totalRecords: pkg.totalRecords,
        houseAddress: selectedHouse?.address ?? null,
        houseAge: null,
      },
    };
    setResult(syntheticResult);
    setCheckedDocs(new Set());
    setMemoExpanded(true);
    setViewingPastId(pkg.id);
    setView("result");
  };

  const handleCopy = async () => {
    if (!result) return;
    const lines = [
      `INSURANCE CLAIM PREP — ${result.claimArea}`,
      result.meta.houseAddress ? `Property: ${result.meta.houseAddress}` : "",
      `Generated by MyHomeBase™ · ${new Date().toLocaleDateString()}`,
      "",
      "CLAIM MEMO",
      "─".repeat(40),
      result.claimMemo,
      "",
      "EVIDENCE TIMELINE",
      "─".repeat(40),
      ...result.evidenceTimeline.map(e =>
        `${e.date}  [${e.source === "service_record" ? "Contractor" : "Owner"}]  ${e.description}`
      ),
      "",
      "DOCUMENTS TO GATHER",
      "─".repeat(40),
      ...result.documentsToGather.map((d, i) => `${i + 1}. ${d}`),
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast({ title: "Copied to clipboard", description: "Paste it into an email or document." });
    } catch {
      toast({ title: "Copy failed", description: "Use the Print option instead.", variant: "destructive" });
    }
  };

  const handlePrint = () => window.print();

  const toggleDoc = (i: number) => {
    setCheckedDocs(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const selectedHouse = houses.find(h => h.id === selectedHouseId);

  const handleNewClaim = () => {
    setResult(null);
    setViewingPastId(null);
    setClaimArea("");
    setIncidentDescription("");
    setIncidentDate("");
    setView("form");
  };

  return (
    <div className="space-y-6">
      {/* Intro banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800 mb-0.5">Insurance Claim Prep Assistant</p>
          <p className="text-sm text-blue-700 leading-relaxed">
            Select the area of your home you're filing a claim for. The AI will compile your maintenance history and service records into an evidence timeline and a ready-to-share claim memo.
          </p>
        </div>
      </div>

      {/* Top action row when viewing result */}
      {view === "result" && (
        <div className="flex items-center gap-3 print:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("form")}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Form
          </Button>
          {pastPackages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("past")}
              className="text-gray-600 hover:text-gray-900"
            >
              <History className="w-4 h-4 mr-1.5" />
              Past Reports ({pastPackages.length})
            </Button>
          )}
          <div className="ml-auto">
            <Button
              size="sm"
              onClick={handleNewClaim}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-new-claim"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Claim
            </Button>
          </div>
        </div>
      )}

      {/* Form view */}
      {view === "form" && (
        <>
          {/* Header row with Past Reports button */}
          {pastPackages.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{pastPackages.length} previously saved report{pastPackages.length !== 1 ? "s" : ""}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView("past")}
                className="border-gray-200 text-gray-700 hover:bg-gray-50"
                data-testid="button-past-reports"
              >
                <History className="w-4 h-4 mr-1.5" />
                Past Reports
              </Button>
            </div>
          )}

          {/* Form card */}
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-5 space-y-4">
              {/* House selector — only shown if multiple houses */}
              {houses.length > 1 && (
                <div className="space-y-1.5">
                  <Label htmlFor="house-select" className="text-sm font-medium text-gray-700">Property</Label>
                  <Select value={selectedHouseId} onValueChange={setSelectedHouseId}>
                    <SelectTrigger id="house-select" className="w-full">
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {houses.map(h => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name || h.address || `House ${h.id.slice(0, 8)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Claim area */}
              <div className="space-y-1.5">
                <Label htmlFor="claim-area" className="text-sm font-medium text-gray-700">
                  Area of Home <span className="text-red-500">*</span>
                </Label>
                <Select value={claimArea} onValueChange={setClaimArea}>
                  <SelectTrigger id="claim-area" className="w-full">
                    <SelectValue placeholder="Select the area you're claiming for…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLAIM_AREAS.map(a => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Incident description */}
              <div className="space-y-1.5">
                <Label htmlFor="incident-desc" className="text-sm font-medium text-gray-700">
                  Describe the Incident <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="incident-desc"
                  placeholder="e.g. Storm caused shingle damage on the north-facing slope. There is now a visible water stain on the upstairs ceiling…"
                  value={incidentDescription}
                  onChange={e => setIncidentDescription(e.target.value)}
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>

              {/* Incident date */}
              <div className="space-y-1.5">
                <Label htmlFor="incident-date" className="text-sm font-medium text-gray-700">
                  Approximate Date of Incident <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input
                  id="incident-date"
                  type="date"
                  value={incidentDate}
                  onChange={e => setIncidentDate(e.target.value)}
                  className="w-full sm:w-52 text-sm"
                />
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={!selectedHouseId || !claimArea || generateMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-5"
                data-testid="button-prepare-claim"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Compiling your claim package…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Prepare My Claim Package
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Loading */}
          {generateMutation.isPending && (
            <Card className="border border-blue-200 shadow-sm">
              <CardContent className="p-10 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-base font-semibold text-gray-700 mb-1">Reviewing your home records…</p>
                <p className="text-sm text-gray-500">Compiling maintenance logs, service records, and building your claim package. Takes 5–10 seconds.</p>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {generateMutation.isError && (
            <Card className="border border-red-200 bg-red-50 shadow-sm">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-base font-semibold text-red-700 mb-2">Could not generate claim package</p>
                <p className="text-sm text-red-600 mb-4">Something went wrong. Please try again.</p>
                <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700 text-white">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Past Reports view */}
      {view === "past" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("form")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
            <Button
              size="sm"
              onClick={handleNewClaim}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Claim
            </Button>
          </div>

          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Past Reports
          </h2>

          {pastLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading past reports…
            </div>
          ) : pastPackages.length === 0 ? (
            <Card className="border border-gray-200">
              <CardContent className="p-8 text-center text-gray-500 text-sm">
                No saved reports yet. Generate your first claim package above.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3" data-testid="past-reports-list">
              {pastPackages.map(pkg => (
                <Card
                  key={pkg.id}
                  className="border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow transition-all cursor-pointer"
                  onClick={() => handleOpenPast(pkg)}
                  data-testid="past-report-item"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-800">{pkg.claimArea} Claim</span>
                          {pkg.incidentDate && (
                            <span className="text-xs text-gray-400 font-mono">Incident: {pkg.incidentDate}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{pkg.summary}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400">
                            {pkg.evidenceTimeline.length} timeline item{pkg.evidenceTimeline.length !== 1 ? "s" : ""}
                          </span>
                          <span className="text-xs text-gray-400">
                            {pkg.documentsToGather.length} document{pkg.documentsToGather.length !== 1 ? "s" : ""} to gather
                          </span>
                          {pkg.createdAt && (
                            <span className="text-xs text-gray-400 ml-auto">
                              {new Date(pkg.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 rotate-[-90deg]" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results view */}
      {view === "result" && result && !generateMutation.isPending && (
        <div className="space-y-5 print:space-y-4" data-testid="insurance-prep-result">
          {/* Header + action buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {result.claimArea} Claim Package
              </h2>
              <div className="flex items-center gap-2">
                {selectedHouse && (
                  <p className="text-sm text-gray-500">{selectedHouse.address || selectedHouse.name}</p>
                )}
                {viewingPastId && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Saved report</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="border-gray-200 text-gray-700 hover:bg-gray-50" data-testid="button-copy-claim">
                <Copy className="w-4 h-4 mr-1.5" />
                Copy All
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="border-gray-200 text-gray-700 hover:bg-gray-50">
                <Printer className="w-4 h-4 mr-1.5" />
                Print / PDF
              </Button>
              {!viewingPastId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEmailDialogOpen(true)}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  data-testid="button-email-adjuster"
                >
                  <Mail className="w-4 h-4 mr-1.5" />
                  Email to Adjuster
                </Button>
              )}
              {!viewingPastId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSubmit}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  data-testid="button-regenerate-claim"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Regenerate
                </Button>
              )}
            </div>
          </div>

          {/* Summary banner */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
            <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 font-medium leading-relaxed">{result.summary}</p>
          </div>

          {/* Low data warning */}
          {result.meta.totalRecords < 3 && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Limited records found.</strong> Only {result.meta.totalRecords} maintenance record{result.meta.totalRecords !== 1 ? "s" : ""} found in the last 5 years. Adding service records and maintenance logs will strengthen future claims.
              </p>
            </div>
          )}

          {/* Evidence Timeline */}
          <Card className="border border-blue-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-blue-800 text-base">Evidence Timeline</h3>
                <span className="text-xs text-blue-500 ml-1">Relevant maintenance & service history</span>
              </div>
              {result.evidenceTimeline.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No directly relevant records found. Consider adding maintenance logs for this area.</p>
              ) : (
                <div className="space-y-3">
                  {result.evidenceTimeline.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${item.source === "service_record" ? "bg-blue-500" : "bg-purple-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className="text-xs font-mono text-gray-400">{item.date}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                            item.source === "service_record"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}>
                            {item.source === "service_record" ? "Contractor" : "Owner"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-snug">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents to Gather */}
          {result.documentsToGather.length > 0 && (
            <Card className="border border-amber-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckSquare className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-amber-800 text-base">Documents to Gather</h3>
                  <span className="text-xs text-amber-500 ml-1">Check off as you collect them</span>
                </div>
                <ul className="space-y-2.5">
                  {result.documentsToGather.map((doc, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleDoc(i)}
                        className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors print:hidden ${
                          checkedDocs.has(i)
                            ? "bg-amber-500 border-amber-500"
                            : "border-gray-300 hover:border-amber-400"
                        }`}
                        aria-label={checkedDocs.has(i) ? "Mark uncollected" : "Mark collected"}
                      >
                        {checkedDocs.has(i) && <span className="text-white text-xs">✓</span>}
                      </button>
                      <span className={`text-sm text-gray-700 leading-snug ${checkedDocs.has(i) ? "line-through text-gray-400" : ""}`}>
                        {doc}
                      </span>
                    </li>
                  ))}
                </ul>
                {checkedDocs.size > 0 && (
                  <p className="mt-3 text-xs text-amber-600 font-medium print:hidden">
                    {checkedDocs.size} of {result.documentsToGather.length} document{result.documentsToGather.length !== 1 ? "s" : ""} collected
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Claim Memo */}
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <button
                type="button"
                onClick={() => setMemoExpanded(e => !e)}
                className="flex items-center justify-between w-full mb-3 print:pointer-events-none"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <h3 className="font-bold text-gray-800 text-base">Claim Preparation Memo</h3>
                  <span className="text-xs text-gray-400 ml-1">Ready to share with your adjuster</span>
                </div>
                <span className="text-gray-400 print:hidden">
                  {memoExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>
              {memoExpanded && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans" data-testid="claim-memo">
                    {result.claimMemo}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Print footer */}
          <div className="hidden print:block border-t border-gray-200 pt-4 mt-6">
            <p className="text-xs text-gray-400 text-center">
              Generated by MyHomeBase™ Insurance Prep Assistant · {new Date().toLocaleDateString()} · For informational purposes only. Consult your insurance policy and adjuster.
            </p>
          </div>
        </div>
      )}

      {/* Email to Adjuster Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Email Claim Package to Adjuster
            </DialogTitle>
            <DialogDescription>
              Enter your adjuster's email address. We'll send them the full claim memo, evidence timeline, and documents checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="adjuster-email" className="text-sm font-medium text-gray-700">
                Adjuster's Email Address
              </Label>
              <Input
                id="adjuster-email"
                type="email"
                placeholder="adjuster@insuranceco.com"
                value={adjusterEmail}
                onChange={e => setAdjusterEmail(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && adjusterEmail.trim() && !emailMutation.isPending) {
                    emailMutation.mutate();
                  }
                }}
                className="text-sm"
                data-testid="input-adjuster-email"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setEmailDialogOpen(false); setAdjusterEmail(""); }}
              disabled={emailMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => emailMutation.mutate()}
              disabled={!adjusterEmail.trim() || emailMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-send-email"
            >
              {emailMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
