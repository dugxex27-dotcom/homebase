import { useRoute, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  FileText, ArrowLeft, CheckCircle, Clock,
  Calendar, Shield, PenTool, Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

interface ContractSnapshot {
  id: string;
  proposalId: string;
  title: string;
  description: string;
  serviceType: string;
  estimatedCost: string;
  estimatedDuration: string;
  scope: string;
  materials: string[];
  warrantyPeriod: string | null;
  validUntil: string;
  status: string;
  createdAt: string;
  acceptedAt: string;
  customerSignerName: string;
  customerSignedAt: string;
  contractFilePath: string | null;
}

export default function ContractorContractDetail() {
  const [, params] = useRoute("/contractor/proposals/:id/contract");
  const id = params?.id;
  const [, setLocation] = useLocation();

  const { data: contract, isLoading, error } = useQuery<ContractSnapshot>({
    queryKey: ["/api/proposals", id, "contract"],
    queryFn: async () => {
      if (!id) throw new Error("No ID");
      const res = await fetch(`/api/proposals/${id}/contract`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Contract not found");
        throw new Error("Failed to fetch contract");
      }
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-24"></div>
        <div className="h-32 bg-gray-100 rounded-xl border border-gray-200"></div>
        <div className="h-64 bg-gray-100 rounded-xl border border-gray-200"></div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-20">
        <h2 className="text-xl font-semibold text-gray-900">Contract not found</h2>
        <p className="text-gray-500 mt-2">The contract could not be loaded or does not exist.</p>
        <Button variant="link" onClick={() => setLocation("/contractor-dashboard")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return "$0.00";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-24">
      <Link 
        href="/contractor-dashboard"
        className={buttonVariants({ variant: "ghost" }) + " text-gray-500 hover:text-gray-900 -ml-2 mb-2 inline-flex"}
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight" data-testid="text-contract-title">
            {contract.title || "Untitled Contract"}
          </h1>
          <p className="text-gray-500 mt-2 flex items-center gap-2">
            Generated on {contract.createdAt ? format(new Date(contract.createdAt), "MMMM d, yyyy") : "Unknown"}
          </p>
        </div>
        <div className="shrink-0" data-testid={`contract-status-${contract.status}`}>
          <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 px-3 py-1 text-sm">
            <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> 
            {contract.status ? contract.status.charAt(0).toUpperCase() + contract.status.slice(1) : "Accepted"}
          </Badge>
        </div>
      </div>

      <Card className="bg-green-50/50 border-green-100">
        <CardContent className="p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-900">Signed & Accepted</p>
            <p className="text-sm text-green-700 mt-0.5" data-testid="text-signer-info">
              Electronically signed by {contract.customerSignerName || "Unknown"} on {contract.customerSignedAt ? format(new Date(contract.customerSignedAt), "MMM d, yyyy 'at' h:mm a") : "Unknown"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="overflow-hidden border-gray-200">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                Project Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {contract.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                  <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed" data-testid="text-contract-description">
                    {contract.description}
                  </div>
                </div>
              )}
              
              {contract.scope && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Scope of Work</h3>
                  <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100" data-testid="text-contract-scope">
                    {contract.scope}
                  </div>
                </div>
              )}

              {contract.materials && contract.materials.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Materials Included</h3>
                  <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                    {contract.materials.map((m: string, i: number) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {contract.contractFilePath && (
            <Card className="border-gray-200">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  Contract Document
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium text-gray-900 truncate">Signed Contract PDF</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild className="shrink-0 ml-4">
                    <a href={contract.contractFilePath} target="_blank" rel="noopener noreferrer" data-testid="link-view-contract-file">
                      <Download className="w-4 h-4 mr-2" /> View File
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-gray-200 bg-[#1560a2]/5 border-[#1560a2]/10">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-[#1560a2] mb-4 uppercase tracking-wider">Estimate Summary</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Cost</p>
                  <p className="text-3xl font-bold text-gray-900" data-testid="text-estimated-cost">
                    {formatCurrency(contract.estimatedCost)}
                  </p>
                </div>
                
                <div className="pt-4 border-t border-[#1560a2]/10 space-y-4">
                  {contract.estimatedDuration && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Estimated Duration</p>
                        <p className="text-sm font-medium text-gray-900" data-testid="text-estimated-duration">{contract.estimatedDuration}</p>
                      </div>
                    </div>
                  )}

                  {contract.serviceType && (
                    <div className="flex items-start gap-3">
                      <PenTool className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Service Type</p>
                        <p className="text-sm font-medium text-gray-900 capitalize">{contract.serviceType.replace(/-/g, ' ')}</p>
                      </div>
                    </div>
                  )}
                  
                  {contract.warrantyPeriod && (
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Warranty</p>
                        <p className="text-sm font-medium text-gray-900" data-testid="text-warranty-period">{contract.warrantyPeriod}</p>
                      </div>
                    </div>
                  )}

                  {contract.validUntil && (
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Valid Until</p>
                        <p className="text-sm font-medium text-gray-900" data-testid="text-valid-until">{format(new Date(`${contract.validUntil}T00:00:00`), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
