import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { updateHouseholdProfileSchema } from "@shared/schema";
import { z } from "zod/v4";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Home, Wrench, Droplets, CheckCircle2, Loader2 } from "lucide-react";

type HouseholdProfileFormData = z.infer<typeof updateHouseholdProfileSchema>;
type QueuedProfileSave = {
  houseId: string;
  values: HouseholdProfileFormData;
};

function normalizeProfileValues(
  values: Partial<HouseholdProfileFormData>,
): HouseholdProfileFormData {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => (
      value !== null &&
      value !== undefined &&
      !(typeof value === "number" && Number.isNaN(value))
    )),
  ) as HouseholdProfileFormData;
}

interface HouseholdProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  houseId: string;
  currentProfile?: Partial<HouseholdProfileFormData>;
  focusField?: string | null;
  onFieldChange?: (values: Record<string, unknown>) => void;
}

export function HouseholdProfileEditor({
  open,
  onOpenChange,
  houseId,
  currentProfile,
  focusField,
  onFieldChange,
}: HouseholdProfileEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const lastSavedValuesRef = useRef("");
  const wasOpenRef = useRef(false);
  const activeHouseIdRef = useRef(houseId);
  const isSavingRef = useRef(false);
  const queuedSavesRef = useRef<QueuedProfileSave[]>([]);

  const form = useForm<HouseholdProfileFormData>({
    resolver: zodResolver(updateHouseholdProfileSchema as any),
    defaultValues: currentProfile || {},
  });

  const watchedValues = useWatch({ control: form.control });

  const persistProfile = useCallback(async (values: HouseholdProfileFormData) => {
    const targetHouseId = activeHouseIdRef.current;
    const existingSave = queuedSavesRef.current.find((save) => save.houseId === targetHouseId);
    if (existingSave) {
      existingSave.values = values;
    } else {
      queuedSavesRef.current.push({ houseId: targetHouseId, values });
    }
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setSaveStatus("saving");

    while (queuedSavesRef.current.length > 0) {
      const save = queuedSavesRef.current.shift()!;

      try {
        const response = await apiRequest(
          `/api/houses/${save.houseId}/profile`,
          "PATCH",
          save.values,
        );
        await response.json();
        const definedValues = Object.fromEntries(
          Object.entries(save.values).filter(([, value]) => value !== undefined),
        );
        queryClient.setQueryData<Record<string, unknown>[]>(
          ["/api/houses"],
          (cachedHouses) => cachedHouses?.map((cachedHouse) => (
            cachedHouse.id === save.houseId
              ? { ...cachedHouse, ...definedValues }
              : cachedHouse
          )),
        );
        if (save.houseId === activeHouseIdRef.current) {
          lastSavedValuesRef.current = JSON.stringify(save.values);
        }
      } catch (error) {
        toast({
          title: "Update Failed",
          description: error instanceof Error ? error.message : "Failed to update household profile.",
          variant: "destructive",
        });
        if (queuedSavesRef.current.length === 0) {
          setSaveStatus("idle");
        }
      }
    }

    isSavingRef.current = false;
    setSaveStatus(
      JSON.stringify(form.getValues()) === lastSavedValuesRef.current ? "saved" : "idle",
    );
    void queryClient.invalidateQueries({ queryKey: ["/api/houses"] });
    void queryClient.invalidateQueries({ queryKey: ["/api/houses", activeHouseIdRef.current] });
    void queryClient.invalidateQueries({ queryKey: ["/api/houses", activeHouseIdRef.current, "schedule"] });
  }, [form, queryClient, toast]);

  // Initialize each editor session from the latest persisted values.
  useEffect(() => {
    if (activeHouseIdRef.current !== houseId) {
      activeHouseIdRef.current = houseId;
      const initialValues = normalizeProfileValues(currentProfile || {});
      form.reset(initialValues);
      lastSavedValuesRef.current = JSON.stringify(initialValues);
      setSaveStatus("idle");
      wasOpenRef.current = open;
      return;
    }

    if (open && !wasOpenRef.current && !lastSavedValuesRef.current) {
      const initialValues = normalizeProfileValues(currentProfile || {});
      form.reset(initialValues);
      lastSavedValuesRef.current = JSON.stringify(initialValues);
      setSaveStatus("idle");
    }
    wasOpenRef.current = open;
  }, [open, currentProfile, form]);

  // Keep the checklist live, then persist valid changes after a short pause.
  useEffect(() => {
    if (!open) return;

    const values = normalizeProfileValues(watchedValues);
    onFieldChange?.(values as Record<string, unknown>);

    const serializedValues = JSON.stringify(values);
    if (!lastSavedValuesRef.current || serializedValues === lastSavedValuesRef.current) {
      return;
    }

    setSaveStatus("idle");
    const timer = window.setTimeout(async () => {
      const isValid = await form.trigger();
      if (!isValid) return;
      void persistProfile(normalizeProfileValues(form.getValues()));
    }, 800);

    return () => window.clearTimeout(timer);
  }, [watchedValues, onFieldChange, open, form, persistProfile]);

  // Focus the specified field element when the dialog opens
  useEffect(() => {
    if (!open || !focusField) return;
    const timer = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-testid="${focusField}"]`);
      el?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [open, focusField]);

  const handleOpenChange = async (nextOpen: boolean) => {
    if (
      !nextOpen &&
      JSON.stringify(normalizeProfileValues(form.getValues())) !== lastSavedValuesRef.current &&
      await form.trigger()
    ) {
      void persistProfile(normalizeProfileValues(form.getValues()));
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Edit Household Profile
          </DialogTitle>
          <DialogDescription>
            Provide details about your property to get personalized maintenance recommendations.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(event) => event.preventDefault()} className="space-y-6">
            {/* Property Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Home className="h-4 w-4" />
                Property Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="homeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Home Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-home-type">
                            <SelectValue placeholder="Select home type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="single_family">Single Family</SelectItem>
                          <SelectItem value="condo">Condo</SelectItem>
                          <SelectItem value="townhouse">Townhouse</SelectItem>
                          <SelectItem value="apartment">Apartment</SelectItem>
                          <SelectItem value="mobile_home">Mobile Home</SelectItem>
                          <SelectItem value="multi_family">Multi-Family</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="squareFootage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Square Footage</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="2000"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          data-testid="input-square-footage"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearBuilt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year Built</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="2000"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          data-testid="input-year-built"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numberOfStories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Stories</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-stories">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1 Story</SelectItem>
                          <SelectItem value="2">2 Stories</SelectItem>
                          <SelectItem value="3">3 Stories</SelectItem>
                          <SelectItem value="4">4+ Stories</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="foundationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Foundation Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-foundation">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="slab">Slab</SelectItem>
                          <SelectItem value="crawl_space">Crawl Space</SelectItem>
                          <SelectItem value="basement">Basement</SelectItem>
                          <SelectItem value="pier_and_beam">Pier and Beam</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="garageType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Garage Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-garage">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="attached">Attached</SelectItem>
                          <SelectItem value="detached">Detached</SelectItem>
                          <SelectItem value="carport">Carport</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Roof Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Home className="h-4 w-4" />
                Roof
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="roofType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roof Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-roof-type">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="asphalt_shingle">Asphalt Shingle</SelectItem>
                          <SelectItem value="metal">Metal</SelectItem>
                          <SelectItem value="tile">Tile</SelectItem>
                          <SelectItem value="flat">Flat</SelectItem>
                          <SelectItem value="slate">Slate</SelectItem>
                          <SelectItem value="wood">Wood</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roofInstalledYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roof Installed Year</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="2015"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          data-testid="input-roof-year"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* HVAC Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                HVAC System
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hvacType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HVAC Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-hvac-type">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="central_air">Central Air</SelectItem>
                          <SelectItem value="heat_pump">Heat Pump</SelectItem>
                          <SelectItem value="furnace">Furnace</SelectItem>
                          <SelectItem value="boiler">Boiler</SelectItem>
                          <SelectItem value="ductless">Ductless Mini-Split</SelectItem>
                          <SelectItem value="window_unit">Window Unit</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hvacInstalledYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HVAC Installed Year</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="2018"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          data-testid="input-hvac-year"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryHeatingFuel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Heating Fuel</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-heating-fuel">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="natural_gas">Natural Gas</SelectItem>
                          <SelectItem value="electric">Electric</SelectItem>
                          <SelectItem value="oil">Oil</SelectItem>
                          <SelectItem value="propane">Propane</SelectItem>
                          <SelectItem value="wood">Wood</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Plumbing & Water Heater */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                Plumbing & Water
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="plumbingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plumbing Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-plumbing-type">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="copper">Copper</SelectItem>
                          <SelectItem value="pex">PEX</SelectItem>
                          <SelectItem value="cpvc">CPVC</SelectItem>
                          <SelectItem value="galvanized">Galvanized</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="waterHeaterType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Water Heater Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-water-heater-type">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="tank">Tank</SelectItem>
                          <SelectItem value="tankless">Tankless</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="waterHeaterInstalledYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Water Heater Installed Year</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="2019"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          data-testid="input-water-heater-year"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div
              className="flex min-h-5 items-center justify-end gap-1.5 pt-2 text-xs text-muted-foreground"
              aria-live="polite"
              data-testid="profile-save-status"
            >
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  Saved
                </>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
