import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight, FileSignature } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Proposal } from "@shared/schema";
import { format } from "date-fns";

export default function HomeownerProposals() {
  const { data: proposals = [], isLoading } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals"],
    queryFn: async () => {
      const response = await fetch("/api/proposals", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch proposals");
      return response.json();
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent": return <Clock className="w-4 h-4 text-blue-500" />;
      case "accepted": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected": return <XCircle className="w-4 h-4 text-red-500" />;
      case "expired": return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent": return <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200">Pending Review</Badge>;
      case "accepted": return <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">Accepted</Badge>;
      case "rejected": return <Badge variant="secondary" className="bg-red-50 text-red-700 hover:bg-red-50 border-red-200">Rejected</Badge>;
      case "expired": return <Badge variant="secondary" className="bg-orange-50 text-orange-700 hover:bg-orange-50 border-orange-200">Expired</Badge>;
      case "draft": return <Badge variant="outline" className="text-gray-500 border-gray-200">Draft</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return "$0.00";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl border border-gray-200"></div>
          ))}
        </div>
      </div>
    );
  }

  // Filter out drafts unless they explicitly belong to the homeowner (usually drafts are contractor-only, but just in case)
  // Actually, API might return them, let's keep all for safety or filter out 'draft' if we want.
  // The requirement says "including sent/pending, accepted, rejected, expired, and draft statuses as returned by the API"
  
  const sortedProposals = [...proposals].sort((a, b) => {
    return new Date(b.createdAt || Date.now()).getTime() - new Date(a.createdAt || Date.now()).getTime();
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-[#3C258E]" />
            Proposals
          </h1>
          <p className="text-gray-500 mt-1">Review and manage proposals from your contractors.</p>
        </div>
      </div>

      {sortedProposals.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No proposals yet</h3>
            <p className="text-gray-500 mt-1 max-w-sm">
              When a contractor sends you a proposal for a project, it will appear here for your review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedProposals.map((proposal) => (
            <Link
              key={proposal.id}
              href={`/proposals/${proposal.id}`}
              className="block group"
              data-testid={`link-proposal-${proposal.id}`}
            >
              <Card className="transition-all duration-200 hover:shadow-md border-gray-200 hover:border-[#3C258E]/30 bg-white" data-testid={`card-proposal-${proposal.id}`}>
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5" data-testid={`badge-status-${proposal.status}-${proposal.id}`}>
                        {getStatusBadge(proposal.status)}
                        <span className="text-xs text-gray-400 font-medium" data-testid={`text-date-${proposal.id}`}>
                          {proposal.createdAt ? format(new Date(proposal.createdAt), "MMM d, yyyy") : "Unknown date"}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 truncate pr-4 group-hover:text-[#3C258E] transition-colors" data-testid={`text-title-${proposal.id}`}>
                        {proposal.title || "Untitled Proposal"}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                        {proposal.serviceType && (
                          <span className="capitalize px-2 py-0.5 bg-gray-100 rounded-md text-xs font-medium" data-testid={`text-service-${proposal.id}`}>
                            {proposal.serviceType.replace(/-/g, ' ')}
                          </span>
                        )}
                        <span className="font-medium text-gray-900" data-testid={`text-cost-${proposal.id}`}>
                          {formatCurrency(proposal.estimatedCost)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center text-[#3C258E] font-medium text-sm">
                      View Details
                      <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                    </div>

                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
