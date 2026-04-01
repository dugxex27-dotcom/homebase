import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ContractorReview } from "@shared/schema";
import { z } from "zod";
import {
  Star, Calendar, Package, Flag, CheckCircle2, Mail, MessageSquare,
  Camera, Info, Clock, Receipt, ChevronDown, ChevronUp
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ContractorReviewsProps {
  contractorId: string;
  contractorName?: string;
}

type EligibleRecord = {
  id: string;
  serviceType: string | null;
  serviceDate: string | null;
  serviceDescription: string | null;
  completedAt: string | null;
  hasInvoice: boolean;
  photoCount: number;
};

type EligibilityData = {
  canReview: boolean;
  reason?: string;
  alreadyReviewed?: boolean;
  eligibleRecords?: EligibleRecord[];
};

type RatingData = {
  averageRating: number;
  totalReviews: number;
  starBreakdown?: { 1: number; 2: number; 3: number; 4: number; 5: number };
};

function StarRating({
  rating,
  onRatingChange,
  readonly = false,
  size = "md",
}: {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";
  return (
    <div className="flex items-center space-x-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onRatingChange?.(star)}
          className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform p-0.5`}
        >
          <Star
            className={`${sizeClass} ${
              star <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function StarBreakdown({ breakdown, total }: { breakdown: Record<number, number>; total: number }) {
  return (
    <div className="space-y-1.5 w-full max-w-xs">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = breakdown[star] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-sm">
            <span className="w-3 text-muted-foreground">{star}</span>
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />
            <Progress value={pct} className="h-2 flex-1" />
            <span className="w-6 text-right text-muted-foreground text-xs">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function ContractorResponseBox({
  response,
  respondedAt,
}: {
  response: string;
  respondedAt: string | null;
}) {
  return (
    <div className="mt-3 pl-4 border-l-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 rounded-r-md p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
          Contractor Response
          {respondedAt && (
            <span className="font-normal text-blue-500 dark:text-blue-400 ml-1">
              · {formatDistanceToNow(new Date(respondedAt), { addSuffix: true })}
            </span>
          )}
        </span>
      </div>
      <p className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">{response}</p>
    </div>
  );
}

function ContractorResponseForm({
  reviewId,
  onSuccess,
}: {
  reviewId: string;
  onSuccess: () => void;
}) {
  const [response, setResponse] = useState("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => apiRequest(`/api/reviews/${reviewId}/response`, "POST", { response }),
    onSuccess: () => {
      toast({ title: "Response posted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
      setOpen(false);
      onSuccess();
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message || "Failed to post response", variant: "destructive" });
    },
  });

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="mt-2 text-blue-700 border-blue-300" onClick={() => setOpen(true)}>
        <MessageSquare className="w-3.5 h-3.5 mr-1" />
        Respond to this review
      </Button>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <Textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Share your perspective on this review — responses are public, professional, and final."
        className="min-h-[80px] text-sm"
        maxLength={2000}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending || !response.trim()}>
          {mutation.isPending ? "Posting…" : "Post Response"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        <Info className="w-3 h-3 inline mr-1" />
        Your response is permanent and cannot be edited after posting.
      </p>
    </div>
  );
}

function ReviewCard({
  review,
  isContractorOwner,
  onFlag,
}: {
  review: ContractorReview & { contractorResponse?: string | null; contractorRespondedAt?: string | null };
  isContractorOwner: boolean;
  onFlag?: (review: ContractorReview) => void;
}) {
  const [responseRefresh, setResponseRefresh] = useState(0);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <StarRating rating={review.rating} readonly />
              <span className="text-sm text-muted-foreground">
                {review.createdAt ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true }) : ""}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {review.isVerifiedService && (
                <Badge
                  variant="outline"
                  className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-xs"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Verified Service
                </Badge>
              )}
              {(review as any).reviewerEmailVerified && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs"
                >
                  <Mail className="w-3 h-3 mr-1" />
                  Email Verified
                </Badge>
              )}
              {review.wouldRecommend && (
                <Badge variant="secondary" className="text-xs">Would Recommend</Badge>
              )}
            </div>
          </div>

          {onFlag && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onFlag(review)}
              className="text-muted-foreground hover:text-red-600"
            >
              <Flag className="w-4 h-4" />
            </Button>
          )}
        </div>

        {(review.serviceType || review.serviceDate) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
            {review.serviceType && (
              <>
                <Package className="w-3.5 h-3.5" />
                <span>{review.serviceType}</span>
              </>
            )}
            {review.serviceDate && (
              <>
                <Calendar className="w-3.5 h-3.5 ml-1" />
                <span>{format(new Date(review.serviceDate), "MMM yyyy")}</span>
              </>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {review.comment && (
          <p className="text-gray-700 dark:text-gray-300 text-sm">{review.comment}</p>
        )}

        {(review as any).reviewPhotoUrl && (
          <img
            src={(review as any).reviewPhotoUrl}
            alt="Review photo"
            className="rounded-md max-h-48 object-cover border"
          />
        )}

        {review.contractorResponse ? (
          <ContractorResponseBox
            response={review.contractorResponse}
            respondedAt={review.contractorRespondedAt ?? null}
          />
        ) : isContractorOwner ? (
          <ContractorResponseForm
            key={responseRefresh}
            reviewId={review.id}
            onSuccess={() => setResponseRefresh((v) => v + 1)}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function ReviewForm({
  contractorId,
  contractorName,
  eligibleRecords,
  onSuccess,
}: {
  contractorId: string;
  contractorName?: string;
  eligibleRecords: EligibleRecord[];
  onSuccess: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [selectedRecordId, setSelectedRecordId] = useState<string>(eligibleRecords[0]?.id ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reviewSchema = z.object({
    rating: z.number().min(1, "Please select a rating").max(5),
    comment: z.string().nullable().optional(),
    wouldRecommend: z.boolean().optional(),
  });

  type FormData = z.infer<typeof reviewSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, comment: "", wouldRecommend: true },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const fd = new FormData();
      fd.append("rating", String(rating));
      fd.append("comment", data.comment || "");
      fd.append("wouldRecommend", data.wouldRecommend ? "true" : "false");
      fd.append("serviceRecordId", selectedRecordId);
      if (photoFile) fd.append("photo", photoFile);
      const res = await fetch(`/api/contractors/${contractorId}/reviews`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to submit review");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors", contractorId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractors", contractorId, "rating"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractors", contractorId, "can-review"] });
      toast({ title: "Review submitted!", description: "Thank you for sharing your experience." });
      onSuccess();
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message || "Failed to submit review", variant: "destructive" });
    },
  });

  const onSubmit = (data: FormData) => {
    if (rating === 0) {
      toast({ title: "Please select a star rating", variant: "destructive" });
      return;
    }
    if (!selectedRecordId) {
      toast({ title: "Please select a service record", variant: "destructive" });
      return;
    }
    createMutation.mutate(data);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const selectedRecord = eligibleRecords.find((r) => r.id === selectedRecordId);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <Label className="mb-1.5 block">Select Verified Service *</Label>
          <Select value={selectedRecordId} onValueChange={setSelectedRecordId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a completed service…" />
            </SelectTrigger>
            <SelectContent>
              {eligibleRecords.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.serviceType || "Service"}{" "}
                  {r.serviceDate ? `· ${format(new Date(r.serviceDate), "MMM yyyy")}` : ""}
                  {r.hasInvoice ? " · Invoice" : r.photoCount > 0 ? ` · ${r.photoCount} photo${r.photoCount !== 1 ? "s" : ""}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedRecord && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              {selectedRecord.hasInvoice ? "Invoice on file" : `${selectedRecord.photoCount} photo${selectedRecord.photoCount !== 1 ? "s" : ""} on file`}
            </p>
          )}
        </div>

        <div>
          <Label className="mb-1.5 block">Your Rating *</Label>
          <StarRating rating={rating} onRatingChange={setRating} size="lg" />
          {rating === 0 && form.formState.isSubmitted && (
            <p className="text-sm text-red-500 mt-1">Please select a rating</p>
          )}
        </div>

        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Review</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe your experience — quality of work, communication, punctuality…"
                  className="min-h-[100px]"
                  value={field.value || ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="wouldRecommend"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Would you recommend this contractor?</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(v === "true")}
                defaultValue={field.value ? "true" : "false"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="true">Yes, I would recommend</SelectItem>
                  <SelectItem value="false">No, I would not recommend</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <Label className="mb-1.5 block">Add a Photo (optional)</Label>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-4 h-4 mr-2" />
              {photoFile ? "Change Photo" : "Upload Photo"}
            </Button>
            {photoFile && (
              <span className="text-sm text-muted-foreground">{photoFile.name}</span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
          {photoPreview && (
            <img
              src={photoPreview}
              alt="Preview"
              className="mt-2 rounded-md max-h-36 object-cover border"
            />
          )}
        </div>

        <div className="pt-1">
          <p className="text-xs text-muted-foreground mb-3 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
            Reviews are permanent once submitted and cannot be edited or deleted. Please ensure your review is accurate.
          </p>
          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? "Submitting…" : "Submit Review"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function ContractorReviews({ contractorId, contractorName }: ContractorReviewsProps) {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [reviewToFlag, setReviewToFlag] = useState<ContractorReview | null>(null);
  const [flagReason, setFlagReason] = useState<string>("fake");
  const [flagNotes, setFlagNotes] = useState<string>("");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isHomeowner = !!user && (user as any).role === "homeowner";
  const isContractor = !!user && (user as any).role === "contractor";

  const { data: reviews = [], isLoading } = useQuery<ContractorReview[]>({
    queryKey: ["/api/contractors", contractorId, "reviews"],
  });

  const { data: rating } = useQuery<RatingData>({
    queryKey: ["/api/contractors", contractorId, "rating"],
  });

  const { data: eligibility } = useQuery<EligibilityData>({
    queryKey: ["/api/contractors", contractorId, "can-review"],
    enabled: isHomeowner,
  });

  const flagMutation = useMutation({
    mutationFn: ({ reviewId, reason, notes }: { reviewId: string; reason: string; notes?: string }) =>
      apiRequest(`/api/reviews/${reviewId}/flag`, "POST", { reason, notes }),
    onSuccess: () => {
      toast({ title: "Review reported", description: "Our team will investigate this review." });
      setFlagDialogOpen(false);
      setReviewToFlag(null);
      setFlagReason("fake");
      setFlagNotes("");
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message || "Failed to flag review", variant: "destructive" });
    },
  });

  const handleFlag = (review: ContractorReview) => {
    setReviewToFlag(review);
    setFlagDialogOpen(true);
  };

  const confirmFlagReview = () => {
    if (reviewToFlag) {
      flagMutation.mutate({ reviewId: reviewToFlag.id, reason: flagReason, notes: flagNotes });
    }
  };

  const canLeaveReview = isHomeowner && eligibility?.canReview && eligibility.eligibleRecords && eligibility.eligibleRecords.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="h-24 animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header: Rating Summary */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">Reviews & Ratings</h3>
          {rating && rating.totalReviews > 0 ? (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <StarRating rating={Math.round(rating.averageRating)} readonly size="lg" />
                <span className="text-2xl font-bold">{rating.averageRating.toFixed(1)}</span>
                <span className="text-muted-foreground text-sm">
                  ({rating.totalReviews} review{rating.totalReviews !== 1 ? "s" : ""})
                </span>
              </div>

              {rating.starBreakdown && (
                <div>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    onClick={() => setShowBreakdown((s) => !s)}
                  >
                    {showBreakdown ? (
                      <><ChevronUp className="w-3 h-3" />Hide breakdown</>
                    ) : (
                      <><ChevronDown className="w-3 h-3" />View breakdown</>
                    )}
                  </button>
                  {showBreakdown && (
                    <div className="mt-2">
                      <StarBreakdown breakdown={rating.starBreakdown} total={rating.totalReviews} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">No reviews yet</p>
          )}
        </div>

        {/* Write review / eligibility block */}
        {isHomeowner && (
          <div className="shrink-0">
            {eligibility?.alreadyReviewed ? (
              <Badge variant="secondary">You've already reviewed this contractor</Badge>
            ) : canLeaveReview ? (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">Write a Review</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Review {contractorName || "Contractor"}</DialogTitle>
                  </DialogHeader>
                  <ReviewForm
                    contractorId={contractorId}
                    contractorName={contractorName}
                    eligibleRecords={eligibility.eligibleRecords!}
                    onSuccess={() => setIsDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            ) : eligibility && !eligibility.canReview ? (
              <div className="text-right max-w-xs">
                <div className="text-sm text-muted-foreground mb-1 flex items-start gap-1.5">
                  {eligibility.reason?.includes("48 hour") ? (
                    <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  ) : (
                    <Receipt className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                  )}
                  <span>{eligibility.reason}</span>
                </div>
                <Badge variant="outline">Review Unavailable</Badge>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Separator />

      {/* Reviews list */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No reviews yet. Verified reviews help homeowners find great contractors.
              </p>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review: ContractorReview) => {
            const isReviewContractor = isContractor && (user as any)?.id === review.contractorId;
            return (
              <ReviewCard
                key={review.id}
                review={review as any}
                isContractorOwner={isReviewContractor}
                onFlag={user && !isReviewContractor ? handleFlag : undefined}
              />
            );
          })
        )}
      </div>

      {/* Flag Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="flag-reason">Reason for reporting</Label>
              <Select value={flagReason} onValueChange={setFlagReason}>
                <SelectTrigger id="flag-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fake">Fake or fraudulent review</SelectItem>
                  <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="flag-notes">Additional details (optional)</Label>
              <Textarea
                id="flag-notes"
                value={flagNotes}
                onChange={(e) => setFlagNotes(e.target.value)}
                placeholder="Any additional information about this report…"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFlagDialogOpen(false);
                  setReviewToFlag(null);
                  setFlagReason("fake");
                  setFlagNotes("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={confirmFlagReview} disabled={flagMutation.isPending}>
                {flagMutation.isPending ? "Submitting…" : "Submit Report"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
