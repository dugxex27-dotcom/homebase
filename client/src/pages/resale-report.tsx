import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHero } from "@/components/page-hero";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Printer, RefreshCw, ArrowLeft, CheckSquare, AlertTriangle, ThumbsUp, Loader2, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { House } from "@shared/schema";

interface ResaleReport {
  grade: string;
  summary: string;
  strengths: string[];
  concerns: string[];
  actionItems: string[];
  meta: {
    wellnessScore: number;
    maintenanceLogCount: number;
    systemCount: number;
    houseAddress: string | null;
    houseAge: number | null;
  };
}

const GRADE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  A: { label: "Excellent", color: "text-green-700",  bg: "bg-green-50",  border: "border-green-300" },
  B: { label: "Good",      color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-300"  },
  C: { label: "Fair",      color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-300" },
  D: { label: "Needs Work",color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-300"},
  F: { label: "Critical",  color: "text-red-700",    bg: "bg-red-50",    border: "border-red-300"   },
};

export default function ResaleReport() {
  const { houseId } = useParams<{ houseId: string }>();
  const [, setLocation] = useLocation();
  const [report, setReport] = useState<ResaleReport | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const { data: houses = [] } = useQuery<House[]>({
    queryKey: ["/api/houses"],
  });
  const house = houses.find(h => h.id === houseId);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/houses/${houseId}/resale-readiness`, "POST", {});
      return res.json() as Promise<ResaleReport>;
    },
    onSuccess: (data) => {
      setReport(data);
      setCheckedItems(new Set());
    },
  });

  const gradeConfig = report ? (GRADE_CONFIG[report.grade] ?? GRADE_CONFIG["C"]) : null;

  const handlePrint = () => {
    window.print();
  };

  const toggleCheck = (idx: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="min-h-screen print:min-h-0">
      <div className="print:hidden">
        <PageHero
          eyebrow="AI Analysis"
          title="Resale Readiness Report"
          subtitle={house?.name ?? house?.address ?? "Your Home"}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 print:py-4 print:px-6">
        {/* Back + controls */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <div className="flex gap-2">
            {report && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
                data-testid="button-regenerate-report"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            )}
            {report && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="border-gray-200 text-gray-700 hover:bg-gray-50"
                data-testid="button-print-report"
              >
                <Printer className="h-4 w-4 mr-1" />
                Print / Save PDF
              </Button>
            )}
          </div>
        </div>

        {/* Initial state — generate button */}
        {!report && !generateMutation.isPending && !generateMutation.isError && (
          <Card className="border-2 border-purple-200 bg-purple-50/40 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Get Your Resale Readiness Report</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm">
                Our AI reviews your documented maintenance history, home systems, and wellness score to grade your home's sell-readiness and give you a clear action plan.
              </p>
              <Button
                onClick={() => generateMutation.mutate()}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-5 text-base"
                data-testid="button-generate-report"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {generateMutation.isPending && (
          <Card className="border border-purple-200 shadow">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-purple-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">Analyzing your home's history…</p>
              <p className="text-sm text-gray-500">Reviewing maintenance logs, systems, and wellness score. This takes 5–10 seconds.</p>
            </CardContent>
          </Card>
        )}

        {/* Error state */}
        {generateMutation.isError && (
          <Card className="border border-red-200 bg-red-50 shadow">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <p className="text-base font-semibold text-red-700 mb-2">Could not generate report</p>
              <p className="text-sm text-red-600 mb-4">Something went wrong. Please try again.</p>
              <Button
                onClick={() => generateMutation.mutate()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Report */}
        {report && gradeConfig && (
          <div className="space-y-6" data-testid="resale-report-content">
            {/* Low data warning */}
            {report.meta.maintenanceLogCount < 3 && (
              <div className="flex items-start gap-3 rounded-lg p-4 bg-amber-50 border border-amber-200">
                <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  <strong>Limited data:</strong> Only {report.meta.maintenanceLogCount} maintenance record{report.meta.maintenanceLogCount !== 1 ? "s" : ""} found in the last 3 years. Adding more service records will improve the accuracy of this report.
                </p>
              </div>
            )}

            {/* Grade + Summary */}
            <Card className={`border-2 ${gradeConfig.border} ${gradeConfig.bg} shadow-md`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-5">
                  <div className={`flex-shrink-0 w-20 h-20 rounded-2xl border-2 ${gradeConfig.border} flex flex-col items-center justify-center ${gradeConfig.bg}`}>
                    <span className={`text-4xl font-black ${gradeConfig.color}`} data-testid="report-grade">{report.grade}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${gradeConfig.color}`}>{gradeConfig.label}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-lg font-bold text-gray-900">Resale Readiness Grade</h2>
                      <Badge variant="outline" className={`${gradeConfig.color} ${gradeConfig.border} text-xs`}>
                        Wellness Score: {report.meta.wellnessScore}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed" data-testid="report-summary">{report.summary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Strengths */}
            {report.strengths.length > 0 && (
              <Card className="border border-green-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ThumbsUp className="h-5 w-5 text-green-600" />
                    <h3 className="font-bold text-green-800 text-base">Strengths</h3>
                    <span className="text-xs text-green-600 ml-1">What buyers will love</span>
                  </div>
                  <ul className="space-y-2">
                    {report.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-0.5 flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 text-xs font-bold">{i + 1}</span>
                        </span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Concerns */}
            {report.concerns.length > 0 && (
              <Card className="border border-amber-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <h3 className="font-bold text-amber-800 text-base">Concerns</h3>
                    <span className="text-xs text-amber-600 ml-1">Issues to address</span>
                  </div>
                  <ul className="space-y-2">
                    {report.concerns.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-0.5 flex-shrink-0 w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center">
                          <span className="text-amber-700 text-xs font-bold">{i + 1}</span>
                        </span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Action Items */}
            {report.actionItems.length > 0 && (
              <Card className="border border-purple-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckSquare className="h-5 w-5 text-purple-600" />
                    <h3 className="font-bold text-purple-800 text-base">Before You List</h3>
                    <span className="text-xs text-purple-600 ml-1">Prioritized action plan</span>
                  </div>
                  <ul className="space-y-3">
                    {report.actionItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleCheck(i)}
                          className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors print:hidden ${
                            checkedItems.has(i)
                              ? "bg-purple-600 border-purple-600"
                              : "border-gray-300 hover:border-purple-400"
                          }`}
                          aria-label={checkedItems.has(i) ? "Mark incomplete" : "Mark complete"}
                        >
                          {checkedItems.has(i) && <span className="text-white text-xs">✓</span>}
                        </button>
                        <span className={`text-sm text-gray-700 leading-snug ${checkedItems.has(i) ? "line-through text-gray-400" : ""}`}>
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {checkedItems.size > 0 && (
                    <p className="mt-4 text-xs text-purple-600 font-medium print:hidden">
                      {checkedItems.size} of {report.actionItems.length} action item{report.actionItems.length !== 1 ? "s" : ""} completed
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Print footer */}
            <div className="hidden print:block border-t border-gray-200 pt-4 mt-8">
              <p className="text-xs text-gray-400 text-center">
                Generated by MyHomeBase™ Resale Readiness AI · {new Date().toLocaleDateString()} · For informational purposes only. Not a formal appraisal.
              </p>
            </div>

            {/* Bottom action bar */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 print:hidden">
              <Button
                variant="outline"
                onClick={handlePrint}
                className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print / Save PDF
              </Button>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate Report
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
