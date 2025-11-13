import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, Clock, XCircle, Upload, AlertCircle, FileCheck } from "lucide-react";

const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];

const verificationFormSchema = z.object({
  licenseNumber: z.string().min(1, "License number is required"),
  licenseState: z.string().length(2, "Please select a state"),
  licenseExpiration: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed > new Date();
  }, "License must not be expired"),
});

type VerificationFormData = z.infer<typeof verificationFormSchema>;

export default function AgentAccount() {
  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: verificationStatus, isLoading } = useQuery({
    queryKey: ["/api/agent/verification-status"],
  });

  const form = useForm<VerificationFormData>({
    resolver: zodResolver(verificationFormSchema),
    defaultValues: {
      licenseNumber: verificationStatus?.licenseNumber || "",
      licenseState: verificationStatus?.licenseState || "",
      licenseExpiration: verificationStatus?.licenseExpiration 
        ? new Date(verificationStatus.licenseExpiration).toISOString().split('T')[0]
        : "",
    },
  });

  const submitVerificationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/agent/submit-verification", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/verification-status"] });
      toast({
        title: "Verification submitted!",
        description: "Your verification request has been submitted for review. We'll notify you once it's been processed.",
      });
      setUploadedFile(null);
      setUploadId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit verification. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, WEBP, or PDF file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "File size must be less than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);

    // Upload file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('stateId', file);

      const response = await fetch('/api/agent/upload-state-id', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setUploadId(data.uploadId);
      toast({
        title: "File uploaded",
        description: "State ID document uploaded successfully.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload state ID. Please try again.",
        variant: "destructive",
      });
      setUploadedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (data: VerificationFormData) => {
    if (!uploadId) {
      toast({
        title: "Missing state ID",
        description: "Please upload your state ID document.",
        variant: "destructive",
      });
      return;
    }

    submitVerificationMutation.mutate({
      ...data,
      uploadId,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-4 h-4 mr-1" />
            Verified
          </Badge>
        );
      case 'pending_review':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="w-4 h-4 mr-1" />
            Under Review
          </Badge>
        );
      case 'rejected':
      case 'resubmit_required':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="w-4 h-4 mr-1" />
            Action Required
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="w-4 h-4 mr-1" />
            Not Submitted
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom, #059669 0%, #047857 100%)' }}>
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center" style={{ color: '#ffffff' }}>Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom, #059669 0%, #047857 100%)' }}>
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#ffffff' }}>Agent Account Verification</h1>
          <p className="text-lg" style={{ color: '#a7f3d0' }}>
            Verify your real estate license to start earning referral commissions
          </p>
        </div>

        {/* Status Banner */}
        <Card className="mb-8 bg-white dark:bg-gray-800 border-emerald-200 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-gray-900 dark:text-white">Verification Status</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">Current status of your agent verification</CardDescription>
              </div>
              {getStatusBadge(verificationStatus?.verificationStatus || 'not_submitted')}
            </div>
          </CardHeader>
          <CardContent>
            {verificationStatus?.verificationStatus === 'approved' && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Verified!</AlertTitle>
                <AlertDescription className="text-green-700">
                  Your real estate license has been verified. You can now earn referral commissions.
                </AlertDescription>
              </Alert>
            )}

            {verificationStatus?.verificationStatus === 'pending_review' && (
              <Alert className="bg-blue-50 border-blue-200">
                <Clock className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Under Review</AlertTitle>
                <AlertDescription className="text-blue-700">
                  Your verification is being reviewed by our team. We'll notify you once it's processed.
                </AlertDescription>
              </Alert>
            )}

            {(verificationStatus?.verificationStatus === 'rejected' || verificationStatus?.verificationStatus === 'resubmit_required') && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription>
                  {verificationStatus?.reviewNotes || "Your verification was rejected. Please review the information and resubmit."}
                </AlertDescription>
              </Alert>
            )}

            {verificationStatus?.verificationStatus === 'not_submitted' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Verification Required</AlertTitle>
                <AlertDescription>
                  You must verify your real estate license before you can earn referral commissions. Please fill out the form below.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Verification Form */}
        {verificationStatus?.verificationStatus !== 'approved' && verificationStatus?.verificationStatus !== 'pending_review' && (
          <Card className="bg-white dark:bg-gray-800 border-emerald-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Submit Verification</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Provide your real estate license information and upload a copy of your state-issued ID
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="licenseNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Real Estate License Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your license number"
                            {...field}
                            data-testid="input-license-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="licenseState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License State</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-license-state">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {US_STATES.map((state) => (
                              <SelectItem key={state.code} value={state.code}>
                                {state.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="licenseExpiration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License Expiration Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            data-testid="input-license-expiration"
                          />
                        </FormControl>
                        <FormDescription>
                          Your license must be current and not expired
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <FormLabel>State-Issued ID</FormLabel>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      {uploadedFile ? (
                        <div className="space-y-2">
                          <FileCheck className="h-12 w-12 mx-auto text-green-600" />
                          <p className="text-sm font-medium">{uploadedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUploadedFile(null);
                              setUploadId(null);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                          <div>
                            <label htmlFor="state-id-upload" className="cursor-pointer">
                              <span className="text-primary hover:underline">Click to upload</span>
                              <span className="text-muted-foreground"> or drag and drop</span>
                            </label>
                            <Input
                              id="state-id-upload"
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                              onChange={handleFileChange}
                              className="hidden"
                              disabled={isUploading}
                              data-testid="input-state-id"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            JPEG, PNG, WEBP, or PDF (max 10MB)
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload a clear photo or scan of your state-issued driver's license or ID card
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    style={{ backgroundColor: '#059669' }}
                    disabled={submitVerificationMutation.isPending || isUploading || !uploadId}
                    data-testid="button-submit-verification"
                  >
                    {submitVerificationMutation.isPending ? 'Submitting...' : 'Submit for Verification'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
