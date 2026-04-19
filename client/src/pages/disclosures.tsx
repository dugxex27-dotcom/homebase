import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  ClipboardCopy, CheckCircle, ChevronRight, ChevronLeft,
  FileText, Printer, Loader2, Sparkles, AlertCircle, Info,
} from "lucide-react";
import type { House, HomeSystem } from "@shared/schema";
import {
  NY_PCDS_SECTIONS,
  buildPrefillAnswers,
  buildPrefillFromSystems,
  getSectionProgress,
  getTotalProgress,
  generateSummaryText,
  generateSectionSummaryText,
  type DisclosureAnswers,
  type DisclosureQuestion,
  type AnswerValue,
} from "@/lib/disclosure-forms/ny-pcds";

const YES_NO_OPTIONS = ["Yes", "No", "Unknown"];
const YES_NO_ONLY = ["Yes", "No"];

function QuestionWidget({
  question,
  value,
  detailValue,
  onChange,
  onDetailChange,
  prefilled,
}: {
  question: DisclosureQuestion;
  value: AnswerValue;
  detailValue: string;
  onChange: (v: AnswerValue) => void;
  onDetailChange: (v: string) => void;
  prefilled: boolean;
}) {
  const displayVal = value === null || value === undefined ? "" : String(value);
  const needsDetail = (question.type === "yes_no_unknown" || question.type === "yes_no") && displayVal === "Yes";
  const detailPrompt = question.followUp ?? "Please provide additional details.";

  return (
    <div className="space-y-2">
      {question.type === "yes_no_unknown" && (
        <div className="flex flex-wrap gap-2">
          {YES_NO_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                displayVal === opt
                  ? "border-purple-600 bg-purple-50 text-purple-700"
                  : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.type === "yes_no" && (
        <div className="flex flex-wrap gap-2">
          {YES_NO_ONLY.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                displayVal === opt
                  ? "border-purple-600 bg-purple-50 text-purple-700"
                  : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.type === "select" && question.options && (
        <Select value={displayVal} onValueChange={v => onChange(v)}>
          <SelectTrigger className={`w-full max-w-xs ${prefilled ? "border-purple-300 bg-purple-50" : ""}`}>
            <SelectValue placeholder="Select an option…" />
          </SelectTrigger>
          <SelectContent>
            {question.options.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {question.type === "number" && (
        <Input
          type="number"
          className={`w-40 ${prefilled ? "border-purple-300 bg-purple-50" : ""}`}
          value={displayVal}
          onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}
          placeholder="e.g. 2005"
        />
      )}

      {question.type === "text" && (
        <Textarea
          className="w-full max-w-lg"
          value={displayVal}
          onChange={e => onChange(e.target.value)}
          rows={2}
          placeholder="Type your answer here…"
        />
      )}

      {/* Detail text area shown when Yes is selected for yes_no or yes_no_unknown */}
      {needsDetail && (
        <div className="mt-1">
          <p className="text-xs text-gray-500 mb-1 italic">{detailPrompt}</p>
          <Textarea
            className="w-full max-w-lg text-sm"
            value={detailValue}
            onChange={e => onDetailChange(e.target.value)}
            rows={2}
            placeholder="Please describe…"
          />
        </div>
      )}
    </div>
  );
}

export default function Disclosures() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sectionIdx, setSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<DisclosureAnswers>({});
  const [prefillKeys, setPrefillKeys] = useState<Set<string>>(new Set());
  const [showSummary, setShowSummary] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sectionCopied, setSectionCopied] = useState(false);
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autosaving, setAutosaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const initializedForHouse = useRef<string | null>(null);

  const { data: houses = [] } = useQuery<House[]>({ queryKey: ["/api/houses"] });
  const houseList = houses as House[];
  const defaultHouse = houseList.find(h => h.isDefault) || houseList[0];
  const houseId = selectedHouseId ?? defaultHouse?.id;
  const currentHouse = houseList.find(h => h.id === houseId) ?? defaultHouse;

  const { data: homeSystems = [] } = useQuery<HomeSystem[]>({
    queryKey: ["/api/home-systems"],
    enabled: !!houseId,
  });

  const { data: existingDisclosure, isLoading: disclosureLoading } = useQuery({
    queryKey: ["/api/disclosures", houseId],
    queryFn: async () => {
      if (!houseId) return null;
      const res = await apiRequest(`/api/disclosures/${houseId}`, "GET");
      if (res.status === 404) return null;
      return res.json();
    },
    enabled: !!houseId,
  });

  useEffect(() => {
    if (!houseId) return;
    if (initializedForHouse.current === houseId) return;
    initializedForHouse.current = houseId;
    if (existingDisclosure?.answers && Object.keys(existingDisclosure.answers).length > 0) {
      setAnswers(existingDisclosure.answers as DisclosureAnswers);
      return;
    }
    if (currentHouse) {
      const housePrefill = buildPrefillAnswers(currentHouse as unknown as Record<string, unknown>);
      const systemsPrefill = buildPrefillFromSystems(homeSystems as HomeSystem[]);
      const combined = { ...housePrefill, ...systemsPrefill };
      if (Object.keys(combined).length > 0) {
        setAnswers(combined);
        setPrefillKeys(new Set(Object.keys(combined)));
      }
    }
  }, [houseId, existingDisclosure, currentHouse, homeSystems]);

  const houseIdRef = useRef(houseId);
  useEffect(() => { houseIdRef.current = houseId; }, [houseId]);

  const saveMutation = useMutation({
    mutationFn: async (data: DisclosureAnswers) => {
      const id = houseIdRef.current;
      if (!id) throw new Error("No house selected");
      const res = await apiRequest(`/api/disclosures/${id}`, "PUT", { answers: data });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/disclosures", houseIdRef.current] });
      setLastSaved(new Date());
      setAutosaving(false);
    },
    onError: () => {
      setAutosaving(false);
      toast({ title: "Save failed", description: "Unable to save your disclosure answers.", variant: "destructive" });
    },
  });

  const saveMutationRef = useRef(saveMutation);
  useEffect(() => { saveMutationRef.current = saveMutation; }, [saveMutation]);

  const scheduleAutosave = useCallback((newAnswers: DisclosureAnswers) => {
    if (!houseIdRef.current) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setAutosaving(true);
    autosaveTimer.current = setTimeout(() => {
      saveMutationRef.current.mutate(newAnswers);
    }, 1200);
  }, []);

  const setAnswer = useCallback((id: string, val: AnswerValue) => {
    setAnswers(prev => {
      const updated = { ...prev, [id]: val };
      scheduleAutosave(updated);
      return updated;
    });
  }, [scheduleAutosave]);

  const setDetail = useCallback((id: string, val: string) => {
    setAnswers(prev => {
      const updated = { ...prev, [`${id}_details`]: val };
      scheduleAutosave(updated);
      return updated;
    });
  }, [scheduleAutosave]);

  const handleManualSave = () => {
    if (!houseIdRef.current) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setAutosaving(false);
    saveMutation.mutate(answers);
  };

  const handleCopy = async () => {
    const text = generateSummaryText(answers);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast({ title: "Copied!", description: "Disclosure summary copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Please use the print option instead.", variant: "destructive" });
    }
  };

  const handleSectionCopy = async () => {
    const section = NY_PCDS_SECTIONS[sectionIdx];
    const text = generateSectionSummaryText(section, answers);
    try {
      await navigator.clipboard.writeText(text);
      setSectionCopied(true);
      setTimeout(() => setSectionCopied(false), 2500);
      toast({ title: "Section copied!", description: `${section.title} answers copied to clipboard.` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handlePrint = () => window.print();

  const currentSection = NY_PCDS_SECTIONS[sectionIdx];
  const totalProgress = getTotalProgress(answers);

  if (!houseId && !disclosureLoading && houseList.length === 0) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold mb-2">No Home Found</h2>
            <p className="text-gray-600">Please add a home in My Home before completing a disclosure form.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (disclosureLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (showSummary) {
    const summaryText = generateSummaryText(answers);
    return (
      <div className="min-h-screen" style={{ background: "var(--theme-primary, #f8f5ff)" }}>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setShowSummary(false)}
              className="text-purple-700 hover:underline text-sm font-medium flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back to wizard
            </button>
          </div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-lg">NY PCDS Summary</CardTitle>
                  <CardDescription>Review all your answers below. Copy or print for your records.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy} className="print:hidden">
                    {copied ? <CheckCircle className="w-4 h-4 mr-1 text-green-600" /> : <ClipboardCopy className="w-4 h-4 mr-1" />}
                    {copied ? "Copied!" : "Copy All"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
                    <Printer className="w-4 h-4 mr-1" />Print
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-xs font-mono bg-gray-50 rounded-lg p-4 overflow-auto max-h-[60vh] print:max-h-none print:overflow-visible">
                {summaryText}
              </pre>
            </CardContent>
          </Card>
          <p className="text-xs text-gray-500 mt-4 text-center print:hidden">
            This is a draft for informational purposes only. Consult your attorney or real estate agent before submitting any legal disclosure.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--theme-primary, #f8f5ff)" }}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-purple-700" />
            <h1 className="text-xl font-bold text-gray-900">Property Disclosure Wizard</h1>
            <Badge variant="secondary" className="text-xs">NY PCDS</Badge>
          </div>
          <p className="text-sm text-gray-500">
            New York State Property Condition Disclosure Statement — guided walkthrough
          </p>
        </div>

        {/* Property selector when multiple homes */}
        {houseList.length > 1 && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Property</label>
            <Select value={houseId ?? ""} onValueChange={v => {
              setSelectedHouseId(v);
              setAnswers({});
              setPrefillKeys(new Set());
            }}>
              <SelectTrigger className="w-full max-w-xs bg-white">
                <SelectValue placeholder="Select a property…" />
              </SelectTrigger>
              <SelectContent>
                {houseList.map(h => (
                  <SelectItem key={h.id} value={h.id}>{h.name} — {h.address}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Pre-fill banner */}
        {prefillKeys.size > 0 && (
          <div className="mb-4 flex items-start gap-2 text-xs text-purple-700 bg-purple-50 rounded-lg px-3 py-2">
            <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              <strong>{prefillKeys.size} answers</strong> were pre-filled from your home profile and home systems. Review and adjust as needed.
            </span>
          </div>
        )}

        {/* Overall Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Overall completion</span>
            <span>{totalProgress}%</span>
          </div>
          <Progress value={totalProgress} className="h-2" />
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {NY_PCDS_SECTIONS.map((section, idx) => {
            const pct = getSectionProgress(section.id, answers);
            const active = idx === sectionIdx;
            return (
              <button
                key={section.id}
                onClick={() => setSectionIdx(idx)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  active
                    ? "bg-purple-700 text-white border-purple-700"
                    : pct === 100
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"
                }`}
              >
                {pct === 100 && !active && <CheckCircle className="w-3 h-3 inline-block mr-1 text-green-600" />}
                {section.title}
              </button>
            );
          })}
        </div>

        {/* Section card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base">{currentSection.title}</CardTitle>
                {currentSection.description && (
                  <CardDescription className="text-xs mt-0.5">{currentSection.description}</CardDescription>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {getSectionProgress(currentSection.id, answers)}% done
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSectionCopy}
                  className="text-xs h-7 px-2"
                  title="Copy this section's answers"
                >
                  {sectionCopied ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                  <span className="ml-1 hidden sm:inline">{sectionCopied ? "Copied!" : "Copy section"}</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentSection.questions.map(question => {
              const isPrefilled = prefillKeys.has(question.id);
              const val = answers[question.id] ?? null;
              const detailVal = String(answers[`${question.id}_details`] ?? "");
              return (
                <div key={question.id} className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800 leading-snug">{question.text}</p>
                    {question.hint && isPrefilled && (
                      <span className="inline-flex items-center gap-1 text-xs text-purple-600 mt-0.5">
                        <Info className="w-3 h-3" />{question.hint}
                      </span>
                    )}
                  </div>
                  <QuestionWidget
                    question={question}
                    value={val}
                    detailValue={detailVal}
                    onChange={v => setAnswer(question.id, v)}
                    onDetailChange={v => setDetail(question.id, v)}
                    prefilled={isPrefilled}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSectionIdx(prev => Math.max(0, prev - 1))}
            disabled={sectionIdx === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />Previous
          </Button>

          <div className="flex items-center gap-2">
            {/* Autosave status */}
            {autosaving && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />Saving…
              </span>
            )}
            {!autosaving && lastSaved && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />Saved
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSave}
              disabled={saveMutation.isPending || autosaving}
            >
              Save
            </Button>
          </div>

          {sectionIdx < NY_PCDS_SECTIONS.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setSectionIdx(prev => Math.min(NY_PCDS_SECTIONS.length - 1, prev + 1))}
              style={{ backgroundColor: "var(--theme-accent, #7c3aed)", color: "white" }}
            >
              Next<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                handleManualSave();
                setShowSummary(true);
              }}
              style={{ backgroundColor: "var(--theme-accent, #7c3aed)", color: "white" }}
            >
              <FileText className="w-4 h-4 mr-1" />View Summary
            </Button>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Draft only — not a legally binding document. Consult your attorney or agent.
        </p>
      </div>
    </div>
  );
}
