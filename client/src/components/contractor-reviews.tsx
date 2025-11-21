import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContractorReviewSchema, type ContractorReview } from "@shared/schema";
import { z } from "zod";
import { Star, Calendar, Package, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ContractorReviewsProps {
  contractorId: string;
  contractorName?: string;
}

type ReviewFormData = {
  rating: number;
  comment?: string | null;
  serviceType?: string | null;
  serviceDate?: string | null;
  wouldRecommend?: boolean;
  contractorId: string;
  homeownerId: string;
};

function StarRating({ rating, onRatingChange, readonly = false }: { rating: number; onRatingChange?: (rating: number) => void; readonly?: boolean }) {
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onRatingChange?.(star)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          <Star
            className={`w-5 h-5 ${
              star <= rating
                ? 'text-yellow-500 fill-yellow-500'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review, isOwner, onEdit, onDelete }: { review: ContractorReview; isOwner: boolean; onEdit: (review: ContractorReview) => void; onDelete: (review: ContractorReview) => void }) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <StarRating rating={review.rating} readonly />
            <span className="text-sm text-muted-foreground">
              {review.createdAt ? format(new Date(review.createdAt), 'MMM dd, yyyy') : 'No date'}
            </span>
          </div>
          {isOwner && (
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(review)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete(review)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        {review.serviceType && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Package className="w-4 h-4" />
            <span>{review.serviceType}</span>
            {review.serviceDate && (
              <>
                <Calendar className="w-4 h-4 ml-2" />
                <span>{format(new Date(review.serviceDate), 'MMM dd, yyyy')}</span>
              </>
            )}
          </div>
        )}
      </CardHeader>
      {review.comment && (
        <CardContent className="pt-0">
          <p className="text-gray-700 dark:text-gray-300">{review.comment}</p>
          {review.wouldRecommend && (
            <Badge variant="secondary" className="mt-2">
              Would Recommend
            </Badge>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function ReviewForm({ 
  contractorId, 
  contractorName, 
  existingReview, 
  onSuccess 
}: { 
  contractorId: string; 
  contractorName?: string; 
  existingReview?: ContractorReview; 
  onSuccess: () => void; 
}) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reviewSchema = z.object({
    rating: z.number().min(1, "Please select a rating").max(5),
    comment: z.string().nullable().optional(),
    serviceType: z.string().nullable().optional(),
    serviceDate: z.string().nullable().optional(),
    wouldRecommend: z.boolean().optional(),
    contractorId: z.string(),
    homeownerId: z.string(),
  });

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: existingReview?.rating || 0,
      comment: existingReview?.comment || "",
      serviceType: existingReview?.serviceType || "",
      serviceDate: existingReview?.serviceDate ? new Date(existingReview.serviceDate).toISOString().split('T')[0] : "",
      wouldRecommend: existingReview?.wouldRecommend ?? true,
      contractorId,
      homeownerId: "", // This will be set by the server
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: ReviewFormData) => 
      apiRequest(`/api/contractors/${contractorId}/reviews`, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractors', contractorId, 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contractors', contractorId, 'rating'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/my-reviews'] });
      toast({ title: "Review submitted successfully!" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to submit review",
        variant: "destructive" 
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ReviewFormData>) => 
      apiRequest(`/api/reviews/${existingReview.id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractors', contractorId, 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contractors', contractorId, 'rating'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/my-reviews'] });
      toast({ title: "Review updated successfully!" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update review",
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: ReviewFormData) => {
    const reviewData = { 
      ...data, 
      rating
    };
    if (existingReview) {
      updateMutation.mutate(reviewData);
    } else {
      createMutation.mutate(reviewData);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Rating *</Label>
          <div className="mt-1">
            <StarRating rating={rating} onRatingChange={setRating} />
          </div>
          {form.formState.errors.rating && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.rating.message}</p>
          )}
        </div>

        <FormField
          control={form.control}
          name="serviceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Type</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., Plumbing, HVAC, Electrical" 
                  value={field.value || ''} 
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
          name="serviceDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Date</FormLabel>
              <FormControl>
                <Input 
                  type="date" 
                  value={field.value || ''} 
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
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Review</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Share your experience with this contractor..."
                  className="min-h-[100px]"
                  value={field.value || ''}
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
              <Select onValueChange={(value) => field.onChange(value === 'true')} defaultValue={field.value ? 'true' : 'false'}>
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

        <div className="flex space-x-2 pt-4">
          <Button 
            type="submit" 
            disabled={createMutation.isPending || updateMutation.isPending || rating === 0}
          >
            {createMutation.isPending || updateMutation.isPending ? "Submitting..." : existingReview ? "Update Review" : "Submit Review"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function ContractorReviews({ contractorId, contractorName }: ContractorReviewsProps) {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ContractorReview | null>(null);
  const [deleteReviewConfirmOpen, setDeleteReviewConfirmOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<ContractorReview | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery<ContractorReview[]>({
    queryKey: ['/api/contractors', contractorId, 'reviews'],
  });

  const { data: rating } = useQuery<{ averageRating: number; totalReviews: number }>({
    queryKey: ['/api/contractors', contractorId, 'rating'],
  });

  const { data: myReviews = [] } = useQuery<ContractorReview[]>({
    queryKey: ['/api/reviews/my-reviews'],
    enabled: !!user && (user as any).role === 'homeowner',
  });

  // Check if homeowner can review this contractor (requires accepted proposals)
  const { data: eligibility } = useQuery<{ canReview: boolean; reason?: string }>({
    queryKey: ['/api/contractors', contractorId, 'can-review'],
    enabled: !!user && (user as any).role === 'homeowner',
  });

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => 
      apiRequest(`/api/reviews/${reviewId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractors', contractorId, 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contractors', contractorId, 'rating'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/my-reviews'] });
      toast({ title: "Review deleted successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete review",
        variant: "destructive" 
      });
    }
  });

  const handleEdit = (review: ContractorReview) => {
    setEditingReview(review);
    setIsDialogOpen(true);
  };

  const handleDelete = (review: ContractorReview) => {
    setReviewToDelete(review);
    setDeleteReviewConfirmOpen(true);
  };

  const confirmDeleteReview = () => {
    if (reviewToDelete) {
      deleteMutation.mutate(reviewToDelete.id);
      setDeleteReviewConfirmOpen(false);
      setReviewToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingReview(null);
  };

  const canLeaveReview = user && (user as any).role === 'homeowner' && eligibility?.canReview;
  const hasExistingReview = myReviews.some((review: ContractorReview) => review.contractorId === contractorId);

  if (isLoading) {
    return <div>Loading reviews...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Reviews & Ratings</h3>
          {rating && (
            <div className="flex items-center space-x-2 mt-2">
              <StarRating rating={Math.round(rating.averageRating)} readonly />
              <span className="text-lg font-medium">{rating.averageRating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({rating.totalReviews} review{rating.totalReviews !== 1 ? 's' : ''})
              </span>
            </div>
          )}
        </div>
        
        {user && (user as any).role === 'homeowner' ? (
          canLeaveReview && !hasExistingReview ? (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>Write a Review</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingReview ? 'Edit Review' : `Review ${contractorName || 'Contractor'}`}
                  </DialogTitle>
                </DialogHeader>
                <ReviewForm
                  contractorId={contractorId}
                  contractorName={contractorName}
                  existingReview={editingReview || undefined}
                  onSuccess={handleDialogClose}
                />
              </DialogContent>
            </Dialog>
          ) : hasExistingReview ? (
            <Badge variant="secondary">You've already reviewed this contractor</Badge>
          ) : eligibility && !eligibility.canReview ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {eligibility.reason || "You can only review contractors after accepting their proposals"}
              </p>
              <Badge variant="outline">Review Unavailable</Badge>
            </div>
          ) : null
        ) : null}
      </div>

      <Separator />

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No reviews yet. Be the first to leave a review!
              </p>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review: ContractorReview) => {
            const isOwner = user && myReviews.some((myReview: ContractorReview) => myReview.id === review.id);
            return (
              <ReviewCard
                key={review.id}
                review={review}
                isOwner={!!isOwner}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            );
          })
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteReviewConfirmOpen}
        onOpenChange={setDeleteReviewConfirmOpen}
        title="Delete Review?"
        description="Are you sure you want to delete this review? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteReview}
        variant="destructive"
      />
    </div>
  );
}