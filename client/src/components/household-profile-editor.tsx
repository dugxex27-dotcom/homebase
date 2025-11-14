import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateHouseholdProfileSchema } from "@shared/schema";
import { z } from "zod";
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
import { Button } from "@/components/ui/button";
import { Home, Wrench, Droplets, Flame } from "lucide-react";

type HouseholdProfileFormData = z.infer<typeof updateHouseholdProfileSchema>;

interface HouseholdProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  houseId: string;
  currentProfile?: Partial<HouseholdProfileFormData>;
}

export function HouseholdProfileEditor({
  open,
  onOpenChange,
  houseId,
  currentProfile,
}: HouseholdProfileEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<HouseholdProfileFormData>({
    resolver: zodResolver(updateHouseholdProfileSchema),
    defaultValues: currentProfile || {},
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: HouseholdProfileFormData) => {
      const response = await apiRequest(`/api/houses/${houseId}/profile`, "PATCH", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/houses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/houses", houseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/houses", houseId, "schedule"] });
      toast({
        title: "Profile Updated",
        description: "Household profile has been updated successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update household profile.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: HouseholdProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
