import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import {
  Home, Wrench, Droplets, Thermometer, Waves, Shield,
  CheckCircle, ArrowRight, ArrowLeft, Upload, SkipForward,
  Info, HelpCircle, Plus, Trash2, Star, Globe
} from "lucide-react";
import { useLocation } from "wouter";

const TOTAL_STEPS = 7;

const AGE_OPTIONS = [
  { value: "lt5", label: "Less than 5 years" },
  { value: "5-10", label: "5 to 10 years" },
  { value: "10-15", label: "10 to 15 years" },
  { value: "15-20", label: "15 to 20 years" },
  { value: "20+", label: "Over 20 years" },
  { value: "unknown", label: "Not sure" },
];

const HEATING_OPTIONS = [
  { value: "gas_furnace", label: "Gas Furnace" },
  { value: "oil_furnace", label: "Oil Furnace" },
  { value: "heat_pump", label: "Heat Pump" },
  { value: "electric_baseboard", label: "Electric Baseboard" },
  { value: "other", label: "Other" },
];

const COOLING_OPTIONS = [
  { value: "central_air", label: "Central Air" },
  { value: "window_units", label: "Window Units" },
  { value: "mini_split", label: "Mini Split" },
  { value: "none", label: "None" },
];

const WATER_HEATER_OPTIONS = [
  { value: "gas", label: "Gas" },
  { value: "electric", label: "Electric" },
  { value: "tankless", label: "Tankless" },
  { value: "heat_pump", label: "Heat Pump" },
];

const ROOF_OPTIONS = [
  { value: "asphalt_shingle", label: "Asphalt Shingle" },
  { value: "metal", label: "Metal" },
  { value: "tile", label: "Tile" },
  { value: "flat", label: "Flat / TPO" },
  { value: "wood", label: "Wood Shake" },
  { value: "other", label: "Other" },
];

interface WizardData {
  // Step 2
  address?: string;
  climateZone?: string;
  // Step 3
  hasPool?: boolean;
  hasGarage?: boolean;
  hasBasement?: boolean;
  hasSolarPanels?: boolean;
  hasDeckOrPatio?: boolean;
  residenceType?: string;
  // Step 4
  heatingType?: string;
  heatingAge?: string;
  coolingType?: string;
  coolingAge?: string;
  waterHeaterType?: string;
  waterHeaterAge?: string;
  roofType?: string;
  roofAge?: string;
  // Step 5
  appliances?: { type: string; brand: string; model: string; serial: string; year: string }[];
  // Step 6
  linkedContractors?: string[];
}

interface TooltipLabelProps {
  label: string;
  tip: string;
}

function TooltipLabel({ label, tip }: TooltipLabelProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{tip}</TooltipContent>
      </Tooltip>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  tip: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, tip, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <TooltipLabel label={label} tip={tip} />
      <Switch checked={!!checked} onCheckedChange={onChange} />
    </div>
  );
}

interface HomeownerSetupWizardProps {
  onComplete: () => void;
}

export default function HomeownerSetupWizard({ onComplete }: HomeownerSetupWizardProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    hasPool: false, hasGarage: false, hasBasement: false,
    hasSolarPanels: false, hasDeckOrPatio: false,
    appliances: [],
  });
  const [newAppliance, setNewAppliance] = useState({ type: "", brand: "", model: "", serial: "", year: "" });
  const [contractorSearch, setContractorSearch] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [climateZoneDetected, setClimateZoneDetected] = useState<string | null>(null);
  const [isDetectingZone, setIsDetectingZone] = useState(false);

  // Load progress from the server
  const { data: progress } = useQuery<{ step: number; data: WizardData; completedAt: string | null }>({
    queryKey: ["/api/homeowner/wizard-progress"],
  });

  useEffect(() => {
    if (progress && progress.step > 0 && progress.step < 8) {
      setStep(progress.step);
      if (progress.data && Object.keys(progress.data).length > 0) {
        setData(d => ({ ...d, ...progress.data }));
      }
    }
  }, [progress]);

  const saveMutation = useMutation({
    mutationFn: ({ step, data }: { step: number; data: WizardData }) =>
      apiRequest("PUT", "/api/homeowner/wizard-progress", { step, data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/homeowner/wizard-progress"] }),
  });

  const applyWizardDataMutation = useMutation({
    mutationFn: (wizardData: WizardData) => apiRequest("PUT", "/api/homeowner/wizard-progress", { step: 8, data: wizardData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homeowner/wizard-progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/houses"] });
      onComplete();
    },
    onError: () => toast({ title: "Failed to complete setup", variant: "destructive" }),
  });

  function goNext() {
    const nextStep = step + 1;
    saveMutation.mutate({ step: nextStep, data });
    setStep(nextStep);
  }

  function goPrev() {
    if (step > 1) setStep(step - 1);
  }

  function skip() {
    goNext();
  }

  async function detectClimateZone(address: string) {
    if (!address.trim()) return;
    setIsDetectingZone(true);
    try {
      const res = await fetch(`/api/houses/climate-zone?address=${encodeURIComponent(address)}`);
      if (res.ok) {
        const result = await res.json();
        setClimateZoneDetected(result.climateZone || "Unknown");
        setData(d => ({ ...d, climateZone: result.climateZone, address }));
      } else {
        setClimateZoneDetected("Unknown");
        setData(d => ({ ...d, address }));
      }
    } catch {
      setClimateZoneDetected("Unknown");
      setData(d => ({ ...d, address }));
    } finally {
      setIsDetectingZone(false);
    }
  }

  function addAppliance() {
    if (!newAppliance.type) return;
    setData(d => ({
      ...d,
      appliances: [...(d.appliances || []), { ...newAppliance }],
    }));
    setNewAppliance({ type: "", brand: "", model: "", serial: "", year: "" });
  }

  function removeAppliance(i: number) {
    setData(d => ({ ...d, appliances: (d.appliances || []).filter((_, idx) => idx !== i) }));
  }

  const progressPercent = Math.round(((step - 1) / TOTAL_STEPS) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto">
      {/* Progress Bar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
              Step {step} of {TOTAL_STEPS}
            </span>
            <span className="text-xs text-gray-400">{progressPercent}% complete</span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-gray-100" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto">
              <Home className="w-10 h-10 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome to MyHomeBase™!</h1>
              <p className="text-gray-500 dark:text-gray-400">Let's get your home set up. This takes about 5 minutes.</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-6 text-left space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Protect your home</p>
                  <p className="text-sm text-gray-500">Document conditions, track maintenance, and stay ahead of repairs.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Wrench className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Document your maintenance</p>
                  <p className="text-sm text-gray-500">Keep a complete history of all service records in one place.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Star className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Build your Home Wellness Score™</p>
                  <p className="text-sm text-gray-500">Get a clear picture of your home's condition and value.</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 text-base"
                onClick={goNext}
              >
                Enter My Home Info Manually
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 text-base border-purple-200 text-purple-700 hover:bg-purple-50"
                onClick={() => {
                  onComplete();
                  setLocation("/documents");
                }}
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload My Home Inspection Report
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Property Address */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Property Address</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">We'll use this to detect your climate zone and customize your maintenance tasks.</p>
            </div>
            <div>
              <Label htmlFor="address">Full Property Address</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="address"
                  value={addressInput}
                  onChange={e => setAddressInput(e.target.value)}
                  placeholder="123 Main St, Portland, OR 97201"
                  className="flex-1"
                  onKeyDown={e => { if (e.key === "Enter") detectClimateZone(addressInput); }}
                />
                <Button
                  variant="outline"
                  onClick={() => detectClimateZone(addressInput)}
                  disabled={isDetectingZone || !addressInput.trim()}
                  className="border-purple-200 text-purple-700"
                >
                  {isDetectingZone ? "..." : "Detect"}
                </Button>
              </div>
            </div>
            {climateZoneDetected && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-300">Climate Zone Detected</p>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Your home is in the <strong>{climateZoneDetected}</strong> climate zone — we'll customize your maintenance tasks based on your local weather and conditions.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={goPrev} className="w-24">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button variant="ghost" onClick={skip} className="text-gray-400 hover:text-gray-600">
                <SkipForward className="w-4 h-4 mr-1" />
                Skip for Now
              </Button>
              <Button
                className="ml-auto bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => {
                  setData(d => ({ ...d, address: addressInput, climateZone: climateZoneDetected || undefined }));
                  goNext();
                }}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Home Type & Basic Features */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Home Type & Features</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">A few quick questions about your property.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <ToggleRow
                label="Do you have a pool?"
                tip="We'll add pool maintenance tasks to your schedule and remind you about seasonal opening/closing."
                checked={!!data.hasPool}
                onChange={v => setData(d => ({ ...d, hasPool: v }))}
              />
              <ToggleRow
                label="Do you have a garage?"
                tip="Helps us remind you about garage door maintenance and lubrication."
                checked={!!data.hasGarage}
                onChange={v => setData(d => ({ ...d, hasGarage: v }))}
              />
              <ToggleRow
                label="Do you have a basement?"
                tip="We'll include basement inspection and moisture checks in your maintenance schedule."
                checked={!!data.hasBasement}
                onChange={v => setData(d => ({ ...d, hasBasement: v }))}
              />
              <ToggleRow
                label="Do you have solar panels?"
                tip="We'll include solar panel cleaning and inverter checks to maximize your system performance."
                checked={!!data.hasSolarPanels}
                onChange={v => setData(d => ({ ...d, hasSolarPanels: v }))}
              />
              <ToggleRow
                label="Do you have a deck or patio?"
                tip="Deck maintenance tasks like sealing and staining are added to your seasonal schedule."
                checked={!!data.hasDeckOrPatio}
                onChange={v => setData(d => ({ ...d, hasDeckOrPatio: v }))}
              />
            </div>
            <div>
              <TooltipLabel label="Property Type" tip="Helps us tailor maintenance recommendations to your property type." />
              <Select
                value={data.residenceType || ""}
                onValueChange={v => setData(d => ({ ...d, residenceType: v }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary Residence</SelectItem>
                  <SelectItem value="vacation">Vacation Home</SelectItem>
                  <SelectItem value="investment">Investment Property</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={goPrev} className="w-24">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                className="ml-auto bg-purple-600 hover:bg-purple-700 text-white"
                onClick={goNext}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Home Systems */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Home Systems</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Tell us about your major mechanical systems. All fields are optional — skip anything you're not sure about.</p>
            </div>

            {/* Heating */}
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Thermometer className="w-4 h-4 text-orange-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">Heating System</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <TooltipLabel label="Type" tip="Knowing your heating type helps us schedule filter changes, tune-ups, and fuel efficiency checks." />
                    <Select value={data.heatingType || ""} onValueChange={v => setData(d => ({ ...d, heatingType: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {HEATING_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <TooltipLabel label="Age" tip="Heating systems typically last 15–20 years. Knowing the age helps us flag when replacement budgeting should begin." />
                    <Select value={data.heatingAge || ""} onValueChange={v => setData(d => ({ ...d, heatingAge: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Approximate age" />
                      </SelectTrigger>
                      <SelectContent>
                        {AGE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cooling */}
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Waves className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">Cooling System</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <TooltipLabel label="Type" tip="Cooling system type affects maintenance frequency and the best seasonal tune-up timing." />
                    <Select value={data.coolingType || ""} onValueChange={v => setData(d => ({ ...d, coolingType: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {COOLING_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <TooltipLabel label="Age" tip="Most AC systems last 15–20 years. Age helps us plan ahead for eventual replacement." />
                    <Select value={data.coolingAge || ""} onValueChange={v => setData(d => ({ ...d, coolingAge: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Approximate age" />
                      </SelectTrigger>
                      <SelectContent>
                        {AGE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Water Heater */}
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="w-4 h-4 text-cyan-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">Water Heater</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <TooltipLabel label="Type" tip="Water heater type determines flush schedule and sediment buildup rate." />
                    <Select value={data.waterHeaterType || ""} onValueChange={v => setData(d => ({ ...d, waterHeaterType: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {WATER_HEATER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <TooltipLabel label="Age" tip="Tank water heaters last 8–12 years. Knowing the age helps with replacement planning." />
                    <Select value={data.waterHeaterAge || ""} onValueChange={v => setData(d => ({ ...d, waterHeaterAge: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Approximate age" />
                      </SelectTrigger>
                      <SelectContent>
                        {AGE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Roof */}
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Home className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">Roof</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <TooltipLabel label="Roof Type" tip="Roof type affects maintenance intervals. Asphalt shingles typically need replacement every 20–30 years." />
                    <Select value={data.roofType || ""} onValueChange={v => setData(d => ({ ...d, roofType: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROOF_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <TooltipLabel label="Age" tip="Knowing your roof age helps us remind you when to start budgeting for replacement and flag it for insurance documentation." />
                    <Select value={data.roofAge || ""} onValueChange={v => setData(d => ({ ...d, roofAge: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Approximate age" />
                      </SelectTrigger>
                      <SelectContent>
                        {AGE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={goPrev} className="w-24">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button variant="ghost" onClick={skip} className="text-gray-400 hover:text-gray-600">
                <SkipForward className="w-4 h-4 mr-1" />
                Skip for Now
              </Button>
              <Button
                className="ml-auto bg-purple-600 hover:bg-purple-700 text-white"
                onClick={goNext}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Appliances */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Appliances</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Adding model and serial numbers helps track warranties and get recalled product alerts.
                You can always add more from your dashboard.
              </p>
            </div>

            {/* Existing appliances */}
            {(data.appliances || []).length > 0 && (
              <div className="space-y-2">
                {(data.appliances || []).map((a, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">{a.type}</p>
                      <p className="text-sm text-gray-500">{[a.brand, a.model].filter(Boolean).join(" · ")}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => removeAppliance(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add appliance form */}
            <Card className="border border-dashed border-gray-300 dark:border-gray-600">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Add an appliance</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Appliance Type *</Label>
                    <Input
                      value={newAppliance.type}
                      onChange={e => setNewAppliance(a => ({ ...a, type: e.target.value }))}
                      placeholder="e.g. Refrigerator, HVAC"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Brand</Label>
                    <Input
                      value={newAppliance.brand}
                      onChange={e => setNewAppliance(a => ({ ...a, brand: e.target.value }))}
                      placeholder="e.g. Samsung"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Model Number</Label>
                    <Input
                      value={newAppliance.model}
                      onChange={e => setNewAppliance(a => ({ ...a, model: e.target.value }))}
                      placeholder="Model #"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Serial Number</Label>
                    <Input
                      value={newAppliance.serial}
                      onChange={e => setNewAppliance(a => ({ ...a, serial: e.target.value }))}
                      placeholder="Serial #"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Purchase / Install Year</Label>
                    <Input
                      value={newAppliance.year}
                      onChange={e => setNewAppliance(a => ({ ...a, year: e.target.value }))}
                      placeholder="e.g. 2019"
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-200 text-purple-700"
                  disabled={!newAppliance.type}
                  onClick={addAppliance}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Appliance
                </Button>
              </CardContent>
            </Card>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={goPrev} className="w-24">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button variant="ghost" onClick={skip} className="text-gray-400 hover:text-gray-600">
                <SkipForward className="w-4 h-4 mr-1" />
                Skip for Now
              </Button>
              <Button
                className="ml-auto bg-purple-600 hover:bg-purple-700 text-white"
                onClick={goNext}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 6: Contractors */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Contractors</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Link contractors you already use. This allows you to upload service records directly to your home history.
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
              <Info className="w-4 h-4 inline mr-2" />
              You can find contractors and invite them to join MyHomeBase™ from the Contractors section in your dashboard.
            </div>
            <div>
              <Label>Search for a Contractor</Label>
              <Input
                className="mt-2"
                placeholder="Search by name or business name..."
                value={contractorSearch}
                onChange={e => setContractorSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={goPrev} className="w-24">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button variant="ghost" onClick={skip} className="text-gray-400 hover:text-gray-600">
                <SkipForward className="w-4 h-4 mr-1" />
                Skip for Now
              </Button>
              <Button
                className="ml-auto bg-purple-600 hover:bg-purple-700 text-white"
                onClick={goNext}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 7: Completion */}
        {step === 7 && (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">You're all set!</h2>
              <p className="text-gray-500 dark:text-gray-400">Your home profile is ready. Here's what you set up:</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 text-left space-y-3">
              {data.address && (
                <div className="flex items-center gap-2 text-sm">
                  <Home className="w-4 h-4 text-purple-500" />
                  <span className="text-gray-700 dark:text-gray-300">{data.address}</span>
                </div>
              )}
              {data.climateZone && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span className="text-gray-700 dark:text-gray-300">{data.climateZone} climate zone</span>
                </div>
              )}
              {(data.heatingType || data.coolingType || data.waterHeaterType || data.roofType) && (
                <div className="flex items-center gap-2 text-sm">
                  <Wrench className="w-4 h-4 text-orange-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {[data.heatingType && "Heating", data.coolingType && "Cooling", data.waterHeaterType && "Water Heater", data.roofType && "Roof"].filter(Boolean).join(", ")} configured
                  </span>
                </div>
              )}
              {(data.appliances || []).length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-gray-700 dark:text-gray-300">{(data.appliances || []).length} appliance{(data.appliances || []).length > 1 ? "s" : ""} added</span>
                </div>
              )}
              {(data.hasPool || data.hasGarage || data.hasBasement || data.hasSolarPanels || data.hasDeckOrPatio) && (
                <div className="flex items-center gap-2 text-sm">
                  <Home className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {[data.hasPool && "Pool", data.hasGarage && "Garage", data.hasBasement && "Basement", data.hasSolarPanels && "Solar", data.hasDeckOrPatio && "Deck"].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 text-base"
                disabled={applyWizardDataMutation.isPending}
                onClick={() => applyWizardDataMutation.mutate(data)}
              >
                {applyWizardDataMutation.isPending ? "Setting up..." : "Go To My Dashboard"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <p className="text-xs text-gray-400">
                You can always update your home information from the dashboard at any time.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

