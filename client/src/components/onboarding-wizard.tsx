import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ChevronRight, ChevronLeft, HelpCircle, Home, Briefcase, UserCircle } from "lucide-react";

const TOTAL_STEPS = 4;

const step1Schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

const step2Schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const step3Schema = z.object({
  role: z.enum(["homeowner", "contractor", "agent"], {
    required_error: "Please select your role",
  }),
});

const step4Schema = z.object({
  zipCode: z.string().optional(),
  companyName: z.string().optional(),
  companyBio: z.string().optional(),
  companyPhone: z.string().optional(),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;
type Step4Data = z.infer<typeof step4Schema>;

interface OnboardingWizardProps {
  onComplete: (data: any) => void;
  isLoading?: boolean;
  initialData?: Partial<any>;
}

export function OnboardingWizard({ onComplete, isLoading, initialData }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<any>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: undefined,
    zipCode: "",
    companyName: "",
    companyBio: "",
    companyPhone: "",
    referralCode: "",
    inviteCode: "",
  });

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      firstName: formData.firstName,
      lastName: formData.lastName,
    },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      email: formData.email,
      password: formData.password,
    },
  });

  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      role: formData.role,
    },
  });

  const step4Form = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      zipCode: formData.zipCode,
      companyName: formData.companyName,
      companyBio: formData.companyBio,
      companyPhone: formData.companyPhone,
    },
  });

  // Auto-fill from URL params and localStorage on mount
  useEffect(() => {
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');
    const refParam = urlParams.get('ref');
    const emailParam = urlParams.get('email');

    // Check localStorage for saved progress
    const savedData = localStorage.getItem('homebase-onboarding-progress');
    let parsedData: any = {};
    
    if (savedData) {
      try {
        parsedData = JSON.parse(savedData);
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Merge URL params with saved data (URL params take priority)
    const mergedData = {
      ...parsedData,
      ...(emailParam ? { email: emailParam } : {}),
      ...(roleParam && (roleParam === 'homeowner' || roleParam === 'contractor' || roleParam === 'agent') 
        ? { role: roleParam } 
        : {}),
      ...(refParam ? { referralCode: refParam } : {}),
      ...initialData,
    };

    setFormData((prev: any) => ({ ...prev, ...mergedData }));

    // Update form defaults
    if (mergedData.firstName) step1Form.setValue('firstName', mergedData.firstName);
    if (mergedData.lastName) step1Form.setValue('lastName', mergedData.lastName);
    if (mergedData.email) step2Form.setValue('email', mergedData.email);
    if (mergedData.role) step3Form.setValue('role', mergedData.role);
    if (mergedData.zipCode) step4Form.setValue('zipCode', mergedData.zipCode);
  }, []);

  // Save progress to localStorage whenever formData changes
  useEffect(() => {
    if (formData.firstName || formData.email || formData.role) {
      localStorage.setItem('homebase-onboarding-progress', JSON.stringify(formData));
    }
  }, [formData]);

  // Sync form defaults when formData changes (for step navigation)
  useEffect(() => {
    step1Form.reset({
      firstName: formData.firstName,
      lastName: formData.lastName,
    });
  }, [formData.firstName, formData.lastName]);

  useEffect(() => {
    step2Form.reset({
      email: formData.email,
      password: formData.password,
    });
  }, [formData.email, formData.password]);

  useEffect(() => {
    if (formData.role) {
      step3Form.reset({ role: formData.role });
    }
  }, [formData.role]);

  useEffect(() => {
    step4Form.reset({
      zipCode: formData.zipCode,
      companyName: formData.companyName,
      companyBio: formData.companyBio,
      companyPhone: formData.companyPhone,
    });
  }, [formData.zipCode, formData.companyName, formData.companyBio, formData.companyPhone]);

  const progressPercent = (currentStep / TOTAL_STEPS) * 100;

  const handleStep1Submit = (data: Step1Data) => {
    setFormData((prev: any) => ({ ...prev, ...data }));
    setCurrentStep(2);
  };

  const handleStep2Submit = (data: Step2Data) => {
    setFormData((prev: any) => ({ ...prev, ...data }));
    setCurrentStep(3);
  };

  const handleStep3Submit = (data: Step3Data) => {
    setFormData((prev: any) => ({ ...prev, ...data }));
    setCurrentStep(4);
  };

  const handleStep4Submit = (data: Step4Data) => {
    const finalData = { ...formData, ...data };
    
    // Validate zip code for homeowners and contractors
    if ((finalData.role === 'homeowner' || finalData.role === 'contractor') && (!finalData.zipCode || finalData.zipCode.length < 5)) {
      step4Form.setError('zipCode', {
        message: 'Please enter a valid zip code (at least 5 characters)'
      });
      return;
    }
    
    // Validate contractor fields if contractor role
    if (finalData.role === 'contractor' && (!finalData.companyName || !finalData.companyBio || !finalData.companyPhone)) {
      step4Form.setError('companyName', {
        message: 'Company information is required for contractors'
      });
      return;
    }
    
    // Clear saved progress
    localStorage.removeItem('homebase-onboarding-progress');
    
    // Submit the complete form
    onComplete(finalData);
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const selectedRole = step3Form.watch("role") || formData.role;

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Progress Bar */}
      <div className="mb-8 space-y-2">
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
          <span>Step {currentStep} of {TOTAL_STEPS}</span>
          <span>{Math.round(progressPercent)}% Complete</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        
        {/* Step indicators */}
        <div className="flex justify-between mt-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex flex-col items-center flex-1">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step < currentStep 
                    ? 'bg-green-500 text-white' 
                    : step === currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step < currentStep ? <Check className="w-4 h-4" /> : step}
              </div>
              <span className="text-xs mt-1 text-center hidden sm:block">
                {step === 1 && 'Name'}
                {step === 2 && 'Account'}
                {step === 3 && 'Role'}
                {step === 4 && 'Details'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Card className="border-0 shadow-xl">
        <CardContent className="pt-6">
          {/* Step 1: Name */}
          {currentStep === 1 && (
            <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to Home Base!</h2>
                <p className="text-muted-foreground">Let's get to know you</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="flex items-center gap-2">
                    First Name
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Your first name as you'd like it to appear</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    {...step1Form.register("firstName")}
                    className="mt-2"
                    data-testid="input-first-name"
                  />
                  {step1Form.formState.errors.firstName && (
                    <p className="text-sm text-destructive mt-1">
                      {step1Form.formState.errors.firstName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    {...step1Form.register("lastName")}
                    className="mt-2"
                    data-testid="input-last-name"
                  />
                  {step1Form.formState.errors.lastName && (
                    <p className="text-sm text-destructive mt-1">
                      {step1Form.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" data-testid="button-step1-next">
                Continue <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}

          {/* Step 2: Account Credentials */}
          {currentStep === 2 && (
            <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Create Your Account</h2>
                <p className="text-muted-foreground">Set up your login credentials</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    Email Address
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">We'll use this to send updates and notifications</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    {...step2Form.register("email")}
                    className="mt-2"
                    data-testid="input-email"
                  />
                  {step2Form.formState.errors.email && (
                    <p className="text-sm text-destructive mt-1">
                      {step2Form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password" className="flex items-center gap-2">
                    Password
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Must be at least 6 characters long</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...step2Form.register("password")}
                    className="mt-2"
                    data-testid="input-password"
                  />
                  {step2Form.formState.errors.password && (
                    <p className="text-sm text-destructive mt-1">
                      {step2Form.formState.errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button type="submit" className="flex-1" size="lg" data-testid="button-step2-next">
                  Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Role Selection */}
          {currentStep === 3 && (
            <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Choose Your Role</h2>
                <p className="text-muted-foreground">How will you be using Home Base?</p>
              </div>

              <RadioGroup
                value={step3Form.watch("role")}
                onValueChange={(value) => step3Form.setValue("role", value as any)}
                className="space-y-3"
              >
                <div 
                  className={`flex items-start space-x-3 border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    step3Form.watch("role") === "homeowner" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => step3Form.setValue("role", "homeowner")}
                  data-testid="option-homeowner"
                >
                  <RadioGroupItem value="homeowner" id="homeowner" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Home className="w-5 h-5 text-primary" />
                      <Label htmlFor="homeowner" className="text-base font-medium cursor-pointer">
                        Homeowner
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Manage your home maintenance, find contractors, and track service records
                    </p>
                  </div>
                </div>

                <div 
                  className={`flex items-start space-x-3 border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    step3Form.watch("role") === "contractor" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => step3Form.setValue("role", "contractor")}
                  data-testid="option-contractor"
                >
                  <RadioGroupItem value="contractor" id="contractor" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-primary" />
                      <Label htmlFor="contractor" className="text-base font-medium cursor-pointer">
                        Contractor
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Connect with homeowners, create proposals, and grow your business
                    </p>
                  </div>
                </div>

                <div 
                  className={`flex items-start space-x-3 border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    step3Form.watch("role") === "agent" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => step3Form.setValue("role", "agent")}
                  data-testid="option-agent"
                >
                  <RadioGroupItem value="agent" id="agent" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <UserCircle className="w-5 h-5 text-primary" />
                      <Label htmlFor="agent" className="text-base font-medium cursor-pointer">
                        Real Estate Agent
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Refer clients and earn commissions on active subscriptions
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {step3Form.formState.errors.role && (
                <p className="text-sm text-destructive text-center">
                  {step3Form.formState.errors.role.message}
                </p>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button type="submit" className="flex-1" size="lg" data-testid="button-step3-next">
                  Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          )}

          {/* Step 4: Final Details */}
          {currentStep === 4 && (
            <form onSubmit={step4Form.handleSubmit(handleStep4Submit)} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Almost Done!</h2>
                <p className="text-muted-foreground">
                  {selectedRole === 'contractor' 
                    ? 'Set up your company profile' 
                    : 'Just a few more details'}
                </p>
              </div>

              <div className="space-y-4">
                {selectedRole !== 'agent' && (
                  <div>
                    <Label htmlFor="zipCode" className="flex items-center gap-2">
                      Zip Code
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              {selectedRole === 'contractor' 
                                ? 'Your service area zip code' 
                                : 'Helps us provide location-specific maintenance tips'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id="zipCode"
                      placeholder="12345"
                      {...step4Form.register("zipCode")}
                      className="mt-2"
                      data-testid="input-zip-code"
                    />
                    {step4Form.formState.errors.zipCode && (
                      <p className="text-sm text-destructive mt-1">
                        {step4Form.formState.errors.zipCode.message}
                      </p>
                    )}
                  </div>
                )}

                {selectedRole === 'agent' && (
                  <div className="text-center p-6 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      You can complete your agent profile after registration to start earning referral commissions!
                    </p>
                    <Button 
                      type="button" 
                      variant="link" 
                      className="text-xs mt-2"
                      onClick={() => setCurrentStep(3)}
                    >
                      Change role
                    </Button>
                  </div>
                )}

                {selectedRole === 'contractor' && (
                  <>
                    <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                      Set up your company profile now (you can add team members later)
                    </div>

                    <div>
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input
                        id="companyName"
                        placeholder="ABC Plumbing & Heating"
                        {...step4Form.register("companyName")}
                        className="mt-2"
                        data-testid="input-company-name"
                      />
                      {step4Form.formState.errors.companyName && (
                        <p className="text-sm text-destructive mt-1">
                          {step4Form.formState.errors.companyName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="companyBio">Company Description *</Label>
                      <Input
                        id="companyBio"
                        placeholder="Professional plumbing services since 1995"
                        {...step4Form.register("companyBio")}
                        className="mt-2"
                        data-testid="input-company-bio"
                      />
                      {step4Form.formState.errors.companyBio && (
                        <p className="text-sm text-destructive mt-1">
                          {step4Form.formState.errors.companyBio.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="companyPhone">Company Phone *</Label>
                      <Input
                        id="companyPhone"
                        placeholder="(555) 123-4567"
                        {...step4Form.register("companyPhone")}
                        className="mt-2"
                        data-testid="input-company-phone"
                      />
                      {step4Form.formState.errors.companyPhone && (
                        <p className="text-sm text-destructive mt-1">
                          {step4Form.formState.errors.companyPhone.message}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  size="lg" 
                  disabled={isLoading}
                  data-testid="button-complete-signup"
                >
                  {isLoading ? 'Creating Account...' : 'Complete Signup'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Helper text */}
      <p className="text-center text-xs text-muted-foreground mt-4">
        Your progress is automatically saved. You can come back anytime!
      </p>
    </div>
  );
}
