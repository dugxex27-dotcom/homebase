import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Flag, AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface ReviewFlag {
  id: string;
  reviewId: string;
  reportedBy: string;
  reason: string;
  notes: string | null;
  status: 'pending' | 'investigating' | 'resolved_valid' | 'resolved_invalid';
  reviewedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date | null;
  review?: {
    id: string;
    contractorId: string;
    homeownerId: string;
    rating: number;
    comment: string | null;
    wouldRecommend: boolean;
    reviewerName?: string;
    contractorName?: string;
    deviceFingerprint?: string | null;
    ipAddress?: string | null;
  };
  reporter?: {
    name: string;
    email: string;
  };
}

export default function AdminFlaggedReviews() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedFlag, setSelectedFlag] = useState<ReviewFlag | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [investigationNotes, setInvestigationNotes] = useState("");

  // Fetch flagged reviews
  const { data: flags = [], isLoading } = useQuery<ReviewFlag[]>({
    queryKey: ['/api/admin/review-flags', statusFilter],
    queryFn: async () => {
      const url = statusFilter === 'all' 
        ? '/api/admin/review-flags'
        : `/api/admin/review-flags?status=${statusFilter}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch flagged reviews");
      return res.json();
    },
  });

  // Update flag status mutation
  const updateFlagMutation = useMutation({
    mutationFn: async ({ flagId, status, notes }: { flagId: string; status: string; notes?: string }) => {
      return apiRequest(`/api/admin/review-flags/${flagId}`, "PUT", { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/review-flags'] });
      toast({ title: "Flag status updated successfully" });
      setIsViewDialogOpen(false);
      setSelectedFlag(null);
      setInvestigationNotes("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update flag status",
        variant: "destructive" 
      });
    }
  });

  const handleViewFlag = (flag: ReviewFlag) => {
    setSelectedFlag(flag);
    setInvestigationNotes(flag.notes || "");
    setIsViewDialogOpen(true);
  };

  const handleUpdateStatus = (status: string) => {
    if (!selectedFlag) return;
    updateFlagMutation.mutate({
      flagId: selectedFlag.id,
      status,
      notes: investigationNotes
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="destructive" className="flex items-center gap-1"><Flag className="h-3 w-3" /> Pending</Badge>;
      case 'investigating':
        return <Badge variant="default" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Investigating</Badge>;
      case 'resolved_valid':
        return <Badge className="bg-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Valid Review</Badge>;
      case 'resolved_invalid':
        return <Badge className="bg-orange-600 flex items-center gap-1"><XCircle className="h-3 w-3" /> Invalid Review</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'fake':
        return 'Fake or fraudulent review';
      case 'inappropriate':
        return 'Inappropriate content';
      case 'spam':
        return 'Spam';
      case 'other':
        return 'Other';
      default:
        return reason;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-flagged-reviews-title">
            Flagged Reviews Management
          </h1>
          <p className="text-gray-600 mt-2">Investigate and manage reported reviews for fraud prevention</p>
        </div>

        {/* Status Filter Tabs */}
        <Card className="mb-8" data-testid="card-status-filter">
          <CardHeader>
            <CardTitle>Filter by Status</CardTitle>
            <CardDescription>View flagged reviews by their investigation status</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="pending" data-testid="button-filter-pending">Pending ({flags.filter(f => f.status === 'pending').length})</TabsTrigger>
                <TabsTrigger value="investigating" data-testid="button-filter-investigating">Investigating</TabsTrigger>
                <TabsTrigger value="resolved_valid" data-testid="button-filter-resolved-valid">Valid</TabsTrigger>
                <TabsTrigger value="resolved_invalid" data-testid="button-filter-resolved-invalid">Invalid</TabsTrigger>
                <TabsTrigger value="all" data-testid="button-filter-all">All ({flags.length})</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Flagged Reviews Table */}
        <Card data-testid="card-flagged-reviews-table">
          <CardHeader>
            <CardTitle>Flagged Reviews</CardTitle>
            <CardDescription>
              {statusFilter === 'all' ? 'All flagged reviews' : `Reviews with status: ${statusFilter}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : flags.length === 0 ? (
              <div className="text-center py-12">
                <Flag className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No flagged reviews found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Review Details</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Flagged Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flags.map((flag, index) => (
                      <TableRow key={flag.id} data-testid={`row-flag-${index}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium" data-testid={`text-contractor-${index}`}>
                              {flag.review?.contractorName || 'Unknown Contractor'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Rating: {flag.review?.rating || 0}/5 stars
                            </div>
                            {flag.review?.ipAddress && (
                              <div className="text-xs text-orange-600 mt-1">
                                IP: {flag.review.ipAddress}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-reason-${index}`}>
                          <div>{getReasonLabel(flag.reason)}</div>
                          {flag.notes && (
                            <div className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                              {flag.notes}
                            </div>
                          )}
                        </TableCell>
                        <TableCell data-testid={`text-reporter-${index}`}>
                          <div className="text-sm">
                            {flag.reporter?.name || 'Unknown User'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {flag.reporter?.email || ''}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`badge-status-${index}`}>
                          {getStatusBadge(flag.status)}
                        </TableCell>
                        <TableCell data-testid={`text-flagged-date-${index}`}>
                          {flag.createdAt ? format(new Date(flag.createdAt), "MMM d, yyyy h:mm a") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewFlag(flag)}
                            data-testid={`button-view-flag-${index}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Investigate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Investigation Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Investigate Flagged Review</DialogTitle>
              <DialogDescription>
                Review details and take appropriate action
              </DialogDescription>
            </DialogHeader>
            
            {selectedFlag && (
              <div className="space-y-4">
                {/* Review Not Found Warning */}
                {!selectedFlag.review && (
                  <div className="border border-orange-300 rounded-lg p-4 bg-orange-50">
                    <div className="flex items-center gap-2 text-orange-700 mb-2">
                      <AlertTriangle className="h-5 w-5" />
                      <h3 className="font-semibold">Review Data Missing</h3>
                    </div>
                    <p className="text-sm text-orange-600">
                      The review associated with this flag could not be found. It may have been deleted.
                      You can still update the flag status to resolve this report.
                    </p>
                  </div>
                )}
                
                {/* Review Details */}
                {selectedFlag.review && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="font-semibold mb-2">Review Content</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Contractor:</span>{' '}
                        <span className="text-sm">{selectedFlag.review.contractorName || 'Unknown'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Reviewer:</span>{' '}
                        <span className="text-sm">{selectedFlag.review.reviewerName || 'Unknown'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Rating:</span>{' '}
                        <span className="text-sm">{selectedFlag.review.rating || 0}/5 stars</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Would Recommend:</span>{' '}
                        <span className="text-sm">{selectedFlag.review.wouldRecommend ? 'Yes' : 'No'}</span>
                      </div>
                      {selectedFlag.review.comment && (
                        <div>
                          <span className="text-sm font-medium">Comment:</span>
                          <p className="text-sm mt-1 text-muted-foreground">{selectedFlag.review.comment}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fraud Detection Info */}
                {selectedFlag.review && (selectedFlag.review.ipAddress || selectedFlag.review.deviceFingerprint) && (
                  <div className="border rounded-lg p-4 bg-orange-50">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      Fraud Detection Information
                    </h3>
                    <div className="space-y-2">
                      {selectedFlag.review.ipAddress && (
                        <div>
                          <span className="text-sm font-medium">IP Address:</span>{' '}
                          <span className="text-sm font-mono">{selectedFlag.review.ipAddress}</span>
                        </div>
                      )}
                      {selectedFlag.review.deviceFingerprint && (
                        <div>
                          <span className="text-sm font-medium">Device Fingerprint:</span>{' '}
                          <span className="text-sm font-mono text-xs">{selectedFlag.review.deviceFingerprint.substring(0, 40)}...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Flag Details */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Flag Details</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Reason:</span>{' '}
                      <span className="text-sm">{getReasonLabel(selectedFlag.reason)}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Reported By:</span>{' '}
                      <span className="text-sm">{selectedFlag.reporter?.name || 'Unknown'} ({selectedFlag.reporter?.email || 'N/A'})</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Status:</span>{' '}
                      {getStatusBadge(selectedFlag.status)}
                    </div>
                    {selectedFlag.notes && (
                      <div>
                        <span className="text-sm font-medium">Reporter Notes:</span>
                        <p className="text-sm mt-1 text-muted-foreground">{selectedFlag.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Investigation Notes */}
                <div>
                  <Label htmlFor="investigation-notes">Investigation Notes (optional)</Label>
                  <Textarea
                    id="investigation-notes"
                    value={investigationNotes}
                    onChange={(e) => setInvestigationNotes(e.target.value)}
                    placeholder="Add notes about your investigation..."
                    rows={4}
                    className="mt-2"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsViewDialogOpen(false);
                  setSelectedFlag(null);
                  setInvestigationNotes("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleUpdateStatus('investigating')}
                disabled={updateFlagMutation.isPending}
              >
                Mark as Investigating
              </Button>
              <Button
                variant="default"
                onClick={() => handleUpdateStatus('resolved_valid')}
                disabled={updateFlagMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark Valid
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleUpdateStatus('resolved_invalid')}
                disabled={updateFlagMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Mark Invalid
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
