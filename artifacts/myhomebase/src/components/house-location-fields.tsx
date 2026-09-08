import { useQuery } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Country = { id: string; code: string; name: string; isActive: boolean };
type Region = { id: string; code: string; name: string; type: string; isActive: boolean };
type ClimateZone = { id: string; code: string; name: string; description: string | null; isActive: boolean };

type LocationFormValues = {
  countryId?: string | null;
  regionId?: string | null;
  climateZoneId?: string | null;
  climateZone: string;
};

const SUPPORTED_COUNTRY_CODES = new Set(["US", "CA", "AU", "GB"]);

async function fetchList<T>(url: string): Promise<T[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  return response.json();
}

export function HouseLocationFields({
  form,
}: {
  form: UseFormReturn<any>;
}) {
  const countryId = form.watch("countryId") as string | null | undefined;

  const { data: countries = [], isLoading: countriesLoading } = useQuery<Country[]>({
    queryKey: ["/api/countries"],
    queryFn: () => fetchList<Country>("/api/countries"),
    select: (items) => items.filter(
      (country) => country.isActive && SUPPORTED_COUNTRY_CODES.has(country.code.toUpperCase()),
    ),
  });

  const { data: regions = [], isLoading: regionsLoading } = useQuery<Region[]>({
    queryKey: ["/api/countries", countryId, "regions"],
    queryFn: () => fetchList<Region>(`/api/countries/${countryId}/regions`),
    enabled: Boolean(countryId),
    select: (items) => items.filter((region) => region.isActive),
  });

  const { data: climateZones = [], isLoading: climateZonesLoading } = useQuery<ClimateZone[]>({
    queryKey: ["/api/countries", countryId, "climate-zones"],
    queryFn: () => fetchList<ClimateZone>(`/api/countries/${countryId}/climate-zones`),
    enabled: Boolean(countryId),
    select: (items) => items.filter((zone) => zone.isActive),
  });

  return (
    <>
      <FormField
        control={form.control}
        name="countryId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Country</FormLabel>
            <Select
              value={field.value || ""}
              onValueChange={(value) => {
                field.onChange(value);
                form.setValue("regionId", "");
                form.setValue("climateZoneId", "");
                form.setValue("climateZone", "");
              }}
              disabled={countriesLoading}
            >
              <FormControl>
                <SelectTrigger data-testid="select-house-country">
                  <SelectValue placeholder={countriesLoading ? "Loading countries..." : "Select country"} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.id} value={country.id}>{country.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="regionId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>State / Province</FormLabel>
            <Select
              value={field.value || ""}
              onValueChange={field.onChange}
              disabled={!countryId || regionsLoading}
            >
              <FormControl>
                <SelectTrigger data-testid="select-house-region">
                  <SelectValue placeholder={regionsLoading ? "Loading regions..." : "Select state or province"} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="climateZoneId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Climate Zone</FormLabel>
            <Select
              value={field.value || ""}
              onValueChange={(value) => {
                field.onChange(value);
                const zone = climateZones.find((item) => item.id === value);
                form.setValue("climateZone", zone?.code ?? "");
              }}
              disabled={!countryId || climateZonesLoading}
            >
              <FormControl>
                <SelectTrigger data-testid="select-climate-zone">
                  <SelectValue placeholder={climateZonesLoading ? "Loading climate zones..." : "Select climate zone"} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {climateZones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}{zone.description ? ` — ${zone.description}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}