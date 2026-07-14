import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logoImage from '@assets/my-homebase-logo-tm-final_1776295160061.png';
import { PLAN_LABELS } from '@/lib/planLabels';

const profileSchema = z.object({
  zipCode: z.string().min(5, "Zip code must be at least 5 characters"),
  role: z.enum(["homeowner", "contractor"], {
    required_error: "Please select your role",
  }),
  companyName: z.string().optional(),
  companyBio: z.string().optional(),
  companyPhone: z.string().optional(),
}).refine((data) => {
  // If contractor, require company fields
  if (data.role === "contractor") {
    return data.companyName && data.companyBio && data.companyPhone;
  }
  return true;
}, {
  message: "Company name, bio, and phone are required for contractors",
  path: ["companyName"],
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function CompleteProfile() {
  const { toast } = useToast();

  const pendingPlanSlug = sessionStorage.getItem('pendingPlan') ?? '';
  const pendingPlan = PLAN_LABELS[pendingPlanSlug]
    ? { slug: pendingPlanSlug, ...PLAN_LABELS[pendingPlanSlug] }
    : null;

  // Pre-select contractor role when arriving from the contractor Google OAuth flow.
  const intentContractor =
    new URLSearchParams(window.location.search).get('intent') === 'contractor';

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      zipCode: "",
      role: intentContractor ? "contractor" : "homeowner",
      companyName: "",
      companyBio: "",
      companyPhone: "",
    },
  });

  const selectedRole = form.watch("role");

  const mutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return await apiRequest("/api/auth/complete-profile", "POST", data);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Profile completed!",
        description: "Redirecting to your dashboard...",
      });
      
      // Redirect to appropriate dashboard
      let redirectPath: string;
      if (data.role === 'contractor') {
        // Send new Google OAuth contractors through the pricing/checkout flow
        // so they choose a plan before landing on the dashboard.
        redirectPath = '/contractor-pricing?trial=true&onboarding=true';
      } else {
        const pendingPlan = sessionStorage.getItem('pendingPlan');
        if (pendingPlan) {
          sessionStorage.removeItem('pendingPlan');
          redirectPath = `/homeowner-pricing?onboarding=true&plan=${encodeURIComponent(pendingPlan)}`;
        } else {
          redirectPath = '/';
        }
      }
      
      setTimeout(() => {
        window.location.href = redirectPath;
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete profile",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ProfileFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src={logoImage} 
            alt="MyHomeBase™" 
            className="h-24 w-auto mx-auto mb-4"
            data-testid="img-logo"
          />
          <p className="text-lg" style={{ color: '#ffffff' }}>
            Complete your profile to get started
          </p>
        </div>

        {/* Plan reminder banner */}
        {pendingPlan && (
          <div
            data-testid="plan-reminder-banner"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(83,74,183,0.08)',
              border: '1.5px solid rgba(83,74,183,0.2)',
              borderRadius: 12,
              padding: '10px 14px',
              marginBottom: 16,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3C258E', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#2C0F5B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Selected plan</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#3C258E' }}>{pendingPlan.name} — {pendingPlan.price}</p>
            </div>
          </div>
        )}

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-foreground">
              One More Step
            </CardTitle>
            <p className="text-muted-foreground">
              We need a bit more information to personalize your experience
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zip Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your zip code"
                          {...field}
                          data-testid="input-zip-code"
                          style={{ color: '#ffffff' }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>I am a</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem 
                              value="homeowner" 
                              id="homeowner"
                              data-testid="radio-homeowner"
                            />
                            <Label htmlFor="homeowner" className="cursor-pointer">
                              Homeowner
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem 
                              value="contractor" 
                              id="contractor"
                              data-testid="radio-contractor"
                            />
                            <Label htmlFor="contractor" className="cursor-pointer">
                              Contractor
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Company fields for contractors */}
                {selectedRole === 'contractor' && (
                  <>
                    <div className="text-sm text-muted-foreground mb-2">
                      Create your company profile (team members can be added later via invite)
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., ABC Plumbing"
                              {...field}
                              data-testid="input-company-name"
                              style={{ color: '#ffffff' }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyBio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Bio</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Brief description of your company"
                              {...field}
                              data-testid="input-company-bio"
                              style={{ color: '#ffffff' }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Phone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(555) 123-4567"
                              {...field}
                              data-testid="input-company-phone"
                              style={{ color: '#ffffff' }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={mutation.isPending}
                  style={{ 
                    background: selectedRole === 'contractor' ? '#518ebc' : '#3c258e'
                  }}
                  data-testid="button-complete-profile"
                >
                  {mutation.isPending ? 'Saving...' : 'Complete Profile'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
