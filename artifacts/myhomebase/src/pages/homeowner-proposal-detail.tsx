import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  FileText, ArrowLeft, CheckCircle, XCircle, Clock,
  AlertCircle, Building2, Calendar,
  Shield, PenTool, Paperclip, Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Proposal, Contractor, Company } from "@shared/schema";

export default function HomeownerProposalDetail() {
  const [, params] = useRoute("/proposals/:id");
  const id = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAcceptOpen, setIsAcceptOpen] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [agreementConfirmed, setAgreementConfirmed] = useState(false);

  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: proposal, isLoading: isLoadingProposal } = useQuery<Proposal>({
    queryKey: ["/api/proposals", id],
    queryFn: async () => {
      if (!id) throw new Error("No ID");
      const res = await fetch(`/api/proposals/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch proposal");
      return res.json();
    },
    enabled: !!id,
  });

  const contractorId = proposal?.contractorId;
  const companyId = proposal?.companyId;

  const { data: contractor } = useQuery<Contractor>({
    queryKey: ["/api/contractors", contractorId],
    queryFn: async () => {
      const res = await fetch(`/api/contractors/${contractorId}`);
      if (!res.ok) throw new Error("Failed to fetch contractor");
      return res.json();
    },
    enabled: !!contractorId,
  });

  const { data: company } = useQuery<Company>({
    queryKey: ["/api/companies", companyId],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}`);
      if (!res.ok) throw new Error("Failed to fetch company");
      return res.json();
    },
    enabled: !!companyId,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/proposals/${id}/accept-and-sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ signerName, agreementConfirmed }),
      });
      if (!res.ok) throw new Error("Failed to accept proposal");
      return res.json();
    },
    onSuccess: (updatedProposal) => {
      queryClient.setQueryData(["/api/proposals", id], updatedProposal);
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      setIsAcceptOpen(false);
      toast({
        title: "Proposal Accepted",
        description: "You have successfully signed and accepted this proposal.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Something went wrong while accepting the proposal.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/proposals/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rejectionReason }),
      });
      if (!res.ok) throw new Error("Failed to reject proposal");
      return res.json();
    },
    onSuccess: (updatedProposal) => {
      queryClient.setQueryData(["/api/proposals", id], updatedProposal);
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      setIsRejectOpen(false);
      toast({
        title: "Proposal Declined",
        description: "You have declined this proposal.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Something went wrong while declining the proposal.",
        variant: "destructive",
      });
    },
  });

  if (isLoadingProposal) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-24"></div>
        <div className="h-32 bg-gray-100 rounded-xl border border-gray-200"></div>
        <div className="h-64 bg-gray-100 rounded-xl border border-gray-200"></div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-20">
        <h2 className="text-xl font-semibold text-gray-900">Proposal not found</h2>
        <Button variant="link" onClick={() => setLocation("/proposals")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Proposals
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent": return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 text-sm"><Clock className="w-3.5 h-3.5 mr-1.5" /> Pending Review</Badge>;
      case "accepted": return <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 px-3 py-1 text-sm"><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Accepted</Badge>;
      case "rejected": return <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200 px-3 py-1 text-sm"><XCircle className="w-3.5 h-3.5 mr-1.5" /> Declined</Badge>;
      case "expired": return <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200 px-3 py-1 text-sm"><AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Expired</Badge>;
      case "draft": return <Badge variant="outline" className="text-gray-500 border-gray-200 px-3 py-1 text-sm">Draft</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return "$0.00";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  };

  const validUntilTime = proposal.validUntil
    ? new Date(`${proposal.validUntil}T23:59:59`).getTime()
    : Number.POSITIVE_INFINITY;
  const isExpiredByDate = Number.isFinite(validUntilTime) && validUntilTime < Date.now();
  const isSent = proposal.status === "sent" && !isExpiredByDate;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-24">
      <Button 
        variant="ghost" 
        onClick={() => setLocation("/proposals")} 
        className="text-gray-500 hover:text-gray-900 -ml-2 mb-2"
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Proposals
      </Button>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight" data-testid="text-proposal-title">
            {proposal.title || "Untitled Proposal"}
          </h1>
          <p className="text-gray-500 mt-2 flex items-center gap-2">
            Generated on {proposal.createdAt ? format(new Date(proposal.createdAt), "MMMM d, yyyy") : "Unknown"}
          </p>
        </div>
        <div className="shrink-0" data-testid={`status-badge-${proposal.status}`}>
          {getStatusBadge(proposal.status)}
        </div>
      </div>

      {proposal.status === 'accepted' && proposal.customerSignerName && (
        <Card className="bg-green-50/50 border-green-100">
          <CardContent className="p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900">Signed & Accepted</p>
              <p className="text-sm text-green-700 mt-0.5">
                Electronically signed by {proposal.customerSignerName} on {proposal.contractSignedAt ? format(new Date(proposal.contractSignedAt), "MMM d, yyyy 'at' h:mm a") : "Unknown"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {proposal.status === 'rejected' && proposal.rejectionReason && (
        <Card className="bg-red-50/50 border-red-100">
          <CardContent className="p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Proposal Declined</p>
              <p className="text-sm text-red-700 mt-0.5">Reason: {proposal.rejectionReason}</p>
            </div>
          </CardContent>
        </Card>
      )}

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
              {proposal.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                  <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed" data-testid="text-proposal-description">
                    {proposal.description}
                  </div>
                </div>
              )}
              
              {proposal.scope && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Scope of Work</h3>
                  <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100" data-testid="text-proposal-scope">
                    {proposal.scope}
                  </div>
                </div>
              )}

              {proposal.materials && proposal.materials.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Materials Included</h3>
                  <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                    {proposal.materials.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {proposal.customerNotes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes from Contractor</h3>
                  <div className="text-gray-700 whitespace-pre-wrap text-sm italic border-l-4 border-gray-200 pl-4 py-1" data-testid="text-customer-notes">
                    {proposal.customerNotes}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {((proposal.attachments && proposal.attachments.length > 0) || proposal.contractFilePath) && (
            <Card className="border-gray-200">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-gray-500" />
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {proposal.contractFilePath && (
                  <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-gray-900 truncate">Contract Agreement</p>
                        <p className="text-xs text-gray-500">PDF Document</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild className="shrink-0 ml-4">
                      <a href={proposal.contractFilePath} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 mr-2" /> View
                      </a>
                    </Button>
                  </div>
                )}
                
                {proposal.attachments && proposal.attachments.map((url, i) => {
                  const filename = url.split('/').pop() || `Attachment ${i + 1}`;
                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-gray-100 text-gray-600 rounded">
                          <Paperclip className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-medium text-gray-900 truncate">{filename}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild className="shrink-0 ml-4">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-gray-200 bg-[#3C258E]/5 border-[#3C258E]/10">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-[#3C258E] mb-4 uppercase tracking-wider">Estimate Summary</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Cost</p>
                  <p className="text-3xl font-bold text-gray-900" data-testid="text-estimated-cost">
                    {formatCurrency(proposal.estimatedCost)}
                  </p>
                </div>
                
                <div className="pt-4 border-t border-[#3C258E]/10 space-y-4">
                  {proposal.estimatedDuration && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Estimated Duration</p>
                        <p className="text-sm font-medium text-gray-900">{proposal.estimatedDuration}</p>
                      </div>
                    </div>
                  )}

                  {proposal.serviceType && (
                    <div className="flex items-start gap-3">
                      <PenTool className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Service Type</p>
                        <p className="text-sm font-medium text-gray-900 capitalize">{proposal.serviceType.replace(/-/g, ' ')}</p>
                      </div>
                    </div>
                  )}
                  
                  {proposal.warrantyPeriod && (
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Warranty</p>
                        <p className="text-sm font-medium text-gray-900">{proposal.warrantyPeriod}</p>
                      </div>
                    </div>
                  )}

                  {proposal.validUntil && (
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Valid Until</p>
                        <p className="text-sm font-medium text-gray-900">{format(new Date(proposal.validUntil), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                Contractor Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {contractor ? (
                <div className="space-y-3">
                  {company?.businessLogo || contractor.businessLogo ? (
                    <img 
                      src={company?.businessLogo || contractor.businessLogo || ""} 
                      alt="Business Logo" 
                      className="h-12 w-auto object-contain rounded"
                    />
                  ) : null}
                  <div>
                    <p className="font-semibold text-gray-900" data-testid="text-contractor-company">
                      {company?.name || contractor.company || contractor.name}
                    </p>
                    {company?.name && (
                      <p className="text-sm text-gray-500" data-testid="text-contractor-name">
                        {contractor.name}
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {contractor.email && <p data-testid="text-contractor-email">{contractor.email}</p>}
                    {contractor.phone && <p data-testid="text-contractor-phone">{contractor.phone}</p>}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Contractor information unavailable</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {proposal.status === "sent" && isExpiredByDate && (
        <Card className="border-orange-100 bg-orange-50/60">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-900">This proposal has expired</p>
              <p className="text-sm text-orange-700 mt-0.5">
                The valid-until date has passed, so it can no longer be accepted or declined here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isSent && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg z-10 lg:pl-64 flex justify-center gap-4">
          <div className="max-w-4xl w-full flex justify-end gap-4 px-4 md:px-8">
            <Button 
              variant="outline" 
              className="px-8"
              onClick={() => setIsRejectOpen(true)}
              data-testid="button-decline-proposal"
            >
              Decline
            </Button>
            <Button 
              className="bg-[#3C258E] hover:bg-[#2A1965] text-white px-8"
              onClick={() => setIsAcceptOpen(true)}
              data-testid="button-accept-proposal"
            >
              Accept & Sign
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isAcceptOpen} onOpenChange={(open) => {
        setIsAcceptOpen(open);
        if (!open) {
          setSignerName("");
          setAgreementConfirmed(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Accept & Sign Proposal</DialogTitle>
            <DialogDescription>
              By signing below, you agree to the terms, scope, and estimated cost outlined in this proposal.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="signerName" className="text-sm font-medium text-gray-700">
                Type your full name to sign <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="signerName" 
                placeholder="John Doe" 
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                data-testid="input-signer-name"
                className="font-medium"
              />
            </div>
            
            <div className="flex items-start space-x-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Checkbox 
                id="agreement" 
                checked={agreementConfirmed}
                onCheckedChange={(checked) => setAgreementConfirmed(checked as boolean)}
                data-testid="checkbox-agreement"
                className="mt-1"
              />
              <Label htmlFor="agreement" className="text-sm leading-snug text-gray-700 cursor-pointer font-normal">
                I agree to the terms of this proposal, including the scope of work and estimated cost, and authorize the contractor to proceed.
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAcceptOpen(false)} data-testid="button-cancel-accept">Cancel</Button>
            <Button 
              onClick={() => acceptMutation.mutate()} 
              disabled={!signerName.trim() || !agreementConfirmed || acceptMutation.isPending}
              className="bg-[#3C258E] hover:bg-[#2A1965] text-white"
              data-testid="button-confirm-accept"
            >
              {acceptMutation.isPending ? "Signing..." : "Sign & Accept"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectOpen} onOpenChange={(open) => {
        setIsRejectOpen(open);
        if (!open) setRejectionReason("");
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Proposal</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this proposal? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-4">
            <Label htmlFor="rejectionReason" className="text-sm font-medium text-gray-700">
              Reason for declining (Optional)
            </Label>
            <Textarea 
              id="rejectionReason" 
              placeholder="e.g., The cost is too high, going with another contractor, etc." 
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              data-testid="input-rejection-reason"
              rows={3}
            />
            <p className="text-xs text-gray-500">This feedback will be shared with the contractor.</p>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRejectOpen(false)} data-testid="button-cancel-reject">Cancel</Button>
            <Button 
              variant="destructive"
              onClick={() => rejectMutation.mutate()} 
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Declining..." : "Decline Proposal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
