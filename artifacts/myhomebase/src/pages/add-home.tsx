import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, ArrowRight, Home, MapPin, Building2, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getHomeWellnessScoreStatus } from "@/lib/home-wellness-score";

export default function AddHome() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useAuth();
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [propertyType, setPropertyType] = useState("single_family");
  const [yearBuilt, setYearBuilt] = useState("");
  const [squareFeet, setSquareFeet] = useState("");
  const [homeSystems, setHomeSystems] = useState<string[]>([]);
  const [hasInspection, setHasInspection] = useState(false);
  const [createdHouseId, setCreatedHouseId] = useState<string | null>(null);

  const { data: firstScore } = useQuery<{ score: number; scoreBand?: string }>({
    queryKey: ["/api/houses", createdHouseId, "health-score"],
    queryFn: async () => {
      const response = await fetch(`/api/houses/${createdHouseId}/health-score`, { credentials: "include" });
      if (!response.ok) throw new Error("Unable to calculate your first score");
      return response.json();
    },
    enabled: !!createdHouseId,
  });

  const addHouseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/houses", "POST", {
        address,
        name: "My Home",
        climateZone: "temperate",
        city,
        state,
        zipCode: zip,
        propertyType,
        yearBuilt: yearBuilt ? parseInt(yearBuilt, 10) : undefined,
        squareFeet: squareFeet ? parseInt(squareFeet, 10) : undefined,
      });
      return res.json();
    },
    onSuccess: async (newHouse) => {
      setCreatedHouseId(newHouse.id);
      const systemResults = await Promise.allSettled(
        homeSystems.map((systemType) =>
          apiRequest("/api/home-systems", "POST", {
            houseId: newHouse.id,
            systemType,
          }),
        ),
      );
      queryClient.invalidateQueries({ queryKey: ["/api/houses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home-systems"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/homeowner/wizard-progress"] });

      if (systemResults.some((result) => result.status === "rejected")) {
        toast({
          title: "Home created",
          description: "Your home is ready, but one or more optional systems could not be saved. You can add them later.",
        });
      }

      toast({
        title: "Home added successfully",
        description: "Your home has been added to your profile.",
      });
      
      setStep(3);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add home",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  const toggleSystem = (system: string) => {
    setHomeSystems((current) =>
      current.includes(system) ? current.filter((item) => item !== system) : [...current, system],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!address || !city || !state || !zip) {
        toast({
          title: "Missing fields",
          description: "Please fill out all address fields.",
          variant: "destructive",
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      addHouseMutation.mutate();
    } else {
      setLocation("/maintenance");
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Button 
        variant="ghost" 
        onClick={() => step === 1 ? setLocation("/") : setStep(step - 1)}
        className="mb-6 -ml-4 text-muted-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Add Your Home</h1>
        <p className="text-muted-foreground">
          {step === 1 ? "Start with your address." : step === 2 ? "Add optional property details." : "Your home record is ready."}
        </p>
      </div>

      <div className="flex gap-2 mb-8">
        <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-secondary'}`} />
        <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-secondary'}`} />
        <div className={`h-2 flex-1 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-secondary'}`} />
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 ? (
          <Card className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="address" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="123 Main St" 
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Anytown" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger id="state">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AL">AL</SelectItem>
                      <SelectItem value="AK">AK</SelectItem>
                      <SelectItem value="AZ">AZ</SelectItem>
                      <SelectItem value="AR">AR</SelectItem>
                      <SelectItem value="CA">CA</SelectItem>
                      <SelectItem value="CO">CO</SelectItem>
                      <SelectItem value="CT">CT</SelectItem>
                      <SelectItem value="DE">DE</SelectItem>
                      <SelectItem value="FL">FL</SelectItem>
                      <SelectItem value="GA">GA</SelectItem>
                      <SelectItem value="HI">HI</SelectItem>
                      <SelectItem value="ID">ID</SelectItem>
                      <SelectItem value="IL">IL</SelectItem>
                      <SelectItem value="IN">IN</SelectItem>
                      <SelectItem value="IA">IA</SelectItem>
                      <SelectItem value="KS">KS</SelectItem>
                      <SelectItem value="KY">KY</SelectItem>
                      <SelectItem value="LA">LA</SelectItem>
                      <SelectItem value="ME">ME</SelectItem>
                      <SelectItem value="MD">MD</SelectItem>
                      <SelectItem value="MA">MA</SelectItem>
                      <SelectItem value="MI">MI</SelectItem>
                      <SelectItem value="MN">MN</SelectItem>
                      <SelectItem value="MS">MS</SelectItem>
                      <SelectItem value="MO">MO</SelectItem>
                      <SelectItem value="MT">MT</SelectItem>
                      <SelectItem value="NE">NE</SelectItem>
                      <SelectItem value="NV">NV</SelectItem>
                      <SelectItem value="NH">NH</SelectItem>
                      <SelectItem value="NJ">NJ</SelectItem>
                      <SelectItem value="NM">NM</SelectItem>
                      <SelectItem value="NY">NY</SelectItem>
                      <SelectItem value="NC">NC</SelectItem>
                      <SelectItem value="ND">ND</SelectItem>
                      <SelectItem value="OH">OH</SelectItem>
                      <SelectItem value="OK">OK</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                      <SelectItem value="PA">PA</SelectItem>
                      <SelectItem value="RI">RI</SelectItem>
                      <SelectItem value="SC">SC</SelectItem>
                      <SelectItem value="SD">SD</SelectItem>
                      <SelectItem value="TN">TN</SelectItem>
                      <SelectItem value="TX">TX</SelectItem>
                      <SelectItem value="UT">UT</SelectItem>
                      <SelectItem value="VT">VT</SelectItem>
                      <SelectItem value="VA">VA</SelectItem>
                      <SelectItem value="WA">WA</SelectItem>
                      <SelectItem value="WV">WV</SelectItem>
                      <SelectItem value="WI">WI</SelectItem>
                      <SelectItem value="WY">WY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code *</Label>
                <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="12345" />
              </div>
            </div>
          </Card>
        ) : step === 2 ? (
          <Card className="p-6">
            <div className="space-y-8">
              <div className="space-y-3">
                <Label>Property Type</Label>
                <RadioGroup value={propertyType} onValueChange={setPropertyType} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <RadioGroupItem value="single_family" id="type-sf" className="peer sr-only" />
                    <Label
                      htmlFor="type-sf"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <Home className="mb-3 h-6 w-6" />
                      Single Family
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="townhouse" id="type-th" className="peer sr-only" />
                    <Label
                      htmlFor="type-th"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <Building2 className="mb-3 h-6 w-6" />
                      Townhouse
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="condo" id="type-co" className="peer sr-only" />
                    <Label
                      htmlFor="type-co"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <Building2 className="mb-3 h-6 w-6" />
                      Condo
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yearBuilt">Year Built (Optional)</Label>
                  <Input 
                    id="yearBuilt" 
                    type="number" 
                    value={yearBuilt} 
                    onChange={(e) => setYearBuilt(e.target.value)} 
                    placeholder="e.g. 1995" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="squareFeet">Square Feet (Optional)</Label>
                  <Input 
                    id="squareFeet" 
                    type="number" 
                    value={squareFeet} 
                    onChange={(e) => setSquareFeet(e.target.value)} 
                    placeholder="e.g. 2500" 
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label>Home systems (optional)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {["Heating", "Central Air", "Roof", "Water Heater", "Electrical", "Plumbing"].map((system) => (
                    <button
                      key={system}
                      type="button"
                      onClick={() => toggleSystem(system)}
                      aria-pressed={homeSystems.includes(system)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm ${
                        homeSystems.includes(system) ? "border-primary bg-primary/10 text-primary" : "border-border"
                      }`}
                    >
                      {system}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={hasInspection}
                    onChange={(event) => setHasInspection(event.target.checked)}
                  />
                  I have an inspection report to add after setup
                </label>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-center space-y-4">
            <Home className="w-10 h-10 mx-auto text-primary" />
            <h2 className="text-2xl font-bold">See your first Home Wellness Score™</h2>
            <p className="text-muted-foreground">
              We created your starting score from the details you shared. Complete your first recommended task to begin improving it.
            </p>
            <div className="text-5xl font-black text-primary">
              {firstScore?.score ?? "—"}
              <span className="text-base font-medium text-muted-foreground"> / 1000</span>
            </div>
            <p className="font-semibold">
              {firstScore ? (firstScore.scoreBand ?? getHomeWellnessScoreStatus(firstScore.score).label) : "Calculating…"}
            </p>
            {hasInspection && (
              <Button type="button" variant="outline" onClick={() => setLocation("/documents?upload=inspection")}>
                Upload inspection report
              </Button>
            )}
          </Card>
        )}

        <div className="mt-8 flex justify-end">
          <Button type="submit" disabled={addHouseMutation.isPending} className="w-full md:w-auto theme-btn-primary">
            {step === 1 ? (
              <>
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : step === 2 && addHouseMutation.isPending ? (
              "Adding Home..."
            ) : step === 2 ? (
              "Complete Setup"
            ) : (
              "View My First Tasks"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
