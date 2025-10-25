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
import logoImage from "@assets/homebase-logo.png";

const profileSchema = z.object({
  zipCode: z.string().min(5, "Zip code must be at least 5 characters"),
  role: z.enum(["homeowner", "contractor"], {
    required_error: "Please select your role",
  }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function CompleteProfile() {
  const { toast } = useToast();
  
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      zipCode: "",
      role: "homeowner",
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
      const redirectPath = data.role === 'contractor' 
        ? '/dashboard/contractor' 
        : '/dashboard/homeowner';
      
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
            alt="Home Base" 
            className="h-24 w-auto mx-auto mb-4"
            data-testid="img-logo"
          />
          <p className="text-lg" style={{ color: '#ffffff' }}>
            Complete your profile to get started
          </p>
        </div>

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
