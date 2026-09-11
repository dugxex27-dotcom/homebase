import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { HouseholdProfileEditor } from "@/components/household-profile-editor";
import { MaintenanceScheduleDisplay } from "@/components/maintenance-schedule-display";
import { Home, Edit, AlertCircle, Calendar, CheckCircle2, Circle } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DraftValues {
  homeType?: string | null;
  yearBuilt?: number | null;
  squareFootage?: number | null;
  roofType?: string | null;
  hvacType?: string | null;
  roofInstalledYear?: number | null;
  hvacInstalledYear?: number | null;
  waterHeaterInstalledYear?: number | null;
  homeSystems?: string[] | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Checklist field definitions
// ---------------------------------------------------------------------------

interface ChecklistFieldDef {
  key: string;
  label: string;
  focusField: string;
}

const CHECKLIST_FIELDS: ChecklistFieldDef[] = [
  { key: "homeType", label: "Home Type", focusField: "select-home-type" },
  { key: "yearBuilt", label: "Year Built", focusField: "input-year-built" },
  { key: "squareFootage", label: "Square Footage", focusField: "input-square-footage" },
  { key: "roofType", label: "Roof Type", focusField: "select-roof-type" },
  { key: "hvacType", label: "HVAC Type", focusField: "select-hvac-type" },
  { key: "roofInstalledYear", label: "Roof Installed Year", focusField: "input-roof-installed-year" },
  { key: "hvacInstalledYear", label: "HVAC Installed Year", focusField: "input-hvac-installed-year" },
  { key: "waterHeaterInstalledYear", label: "Water Heater Installed Year", focusField: "input-water-heater-installed-year" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HouseholdProfilePage() {
  const [, params] = useRoute("/household-profile/:id");
  const houseId = params?.id || "";
  const [showEditor, setShowEditor] = useState(false);
  const [focusField, setFocusField] = useState<string | null>(null);
  const [draftProgress, setDraftProgress] = useState<DraftValues>({});

  const { data: houses, isLoading: housesLoading } = useQuery<any[]>({
    queryKey: ["/api/houses"],
  });

  const house = houses?.find((h) => h.id === houseId);

  // Sync draft from server data when the house object changes identity
  useEffect(() => {
    if (!house) return;
    setDraftProgress({
      homeType: house.homeType,
      yearBuilt: house.yearBuilt,
      squareFootage: house.squareFootage,
      roofType: house.roofType,
      hvacType: house.hvacType,
      roofInstalledYear: house.roofInstalledYear,
      hvacInstalledYear: house.hvacInstalledYear,
      waterHeaterInstalledYear: house.waterHeaterInstalledYear,
      homeSystems: house.homeSystems,
    });
  }, [house]);

  useEffect(() => {
    document.title = "Household Profile | MyHomeBase™";
  }, []);

  // Keep checklist progress responsive while the editor auto-saves.
  const handleFieldChange = useCallback((values: Record<string, unknown>) => {
    setDraftProgress((prev) => ({ ...prev, ...values }));
  }, []);

  // Open the editor focused on a specific field
  function openEditorAt(field: ChecklistFieldDef) {
    setFocusField(field.focusField);
    setShowEditor(true);
  }

  if (housesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!house) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">House Not Found</CardTitle>
              <CardDescription>
                The requested property could not be found.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.href = '/'}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const hasCompleteProfile = draftProgress.homeType && draftProgress.yearBuilt && draftProgress.roofType && draftProgress.hvacType;
  const completedFieldCount = CHECKLIST_FIELDS.filter((field) => Boolean(draftProgress[field.key] ?? null)).length;
  const profileCompletionPercentage = Math.floor((completedFieldCount / CHECKLIST_FIELDS.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Home className="h-8 w-8" />
              Household Profile
            </h1>
            <p className="text-muted-foreground mt-1">
              {house.name} - {house.address}
            </p>
          </div>
          <Button
            onClick={() => { setFocusField(null); setShowEditor(true); }}
            className="gap-2"
            data-testid="button-edit-profile"
          >
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>

        {/* Profile Completeness Alert */}
        {!hasCompleteProfile && (
          <Card className="border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20">
            <CardHeader>
              <CardTitle className="text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Complete Your Profile
              </CardTitle>
              <CardDescription className="text-yellow-700 dark:text-yellow-300">
                Fill in your household details to get a personalized maintenance schedule.
                Click any item below to fill it in.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Profile Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Profile Checklist
            </CardTitle>
            <CardDescription>
              Click any field to open the editor focused on that item.
            </CardDescription>
            <div className="space-y-2 pt-2">
              <span className="text-sm font-medium">{profileCompletionPercentage}% complete</span>
              <Progress
                value={profileCompletionPercentage}
                data-testid="profile-progress-bar"
                aria-label="Profile completion"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {CHECKLIST_FIELDS.map((field) => {
                const isFilled = Boolean(draftProgress[field.key] ?? null);
                return (
                  <li
                    key={field.key}
                    data-testid={`checklist-field-${field.key}`}
                    aria-label={`${field.label}: ${isFilled ? "filled" : "missing"}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => openEditorAt(field)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") openEditorAt(field);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors
                      ${isFilled
                        ? "text-foreground hover:bg-muted/60"
                        : "text-muted-foreground hover:bg-yellow-50 dark:hover:bg-yellow-950/20"
                      }`}
                  >
                    {isFilled ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-yellow-500 shrink-0" />
                    )}
                    <span className="text-sm font-medium">{field.label}</span>
                    {!isFilled && (
                      <span className="ml-auto text-xs text-yellow-600 dark:text-yellow-400">Add info</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Current Profile Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ProfileField label="Home Type" value={house.homeType} />
              <ProfileField label="Square Footage" value={house.squareFootage} unit="sq ft" />
              <ProfileField label="Year Built" value={house.yearBuilt} />
              <ProfileField label="Number of Stories" value={house.numberOfStories} />
              <ProfileField label="Foundation" value={house.foundationType} />
              <ProfileField label="Garage" value={house.garageType} />
              <ProfileField label="Roof Type" value={house.roofType} />
              <ProfileField label="Roof Installed" value={house.roofInstalledYear} />
              <ProfileField label="HVAC Type" value={house.hvacType} />
              <ProfileField label="HVAC Installed" value={house.hvacInstalledYear} />
              <ProfileField label="Heating Fuel" value={house.primaryHeatingFuel} />
              <ProfileField label="Plumbing Type" value={house.plumbingType} />
              <ProfileField label="Water Heater Type" value={house.waterHeaterType} />
              <ProfileField label="Water Heater Installed" value={house.waterHeaterInstalledYear} />
            </div>
            <ProfileField
              label="Home Systems"
              value={Array.isArray(house.homeSystems) ? house.homeSystems : null}
            />
          </CardContent>
        </Card>

        {/* Maintenance Schedule */}
        {hasCompleteProfile ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-6 w-6" />
              <h2 className="text-2xl font-bold">Annual Maintenance Schedule</h2>
            </div>
            <MaintenanceScheduleDisplay houseId={houseId} />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Annual Maintenance Schedule
              </CardTitle>
              <CardDescription>
                Complete your household profile to view your personalized maintenance schedule
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Editor Dialog */}
        <HouseholdProfileEditor
          open={showEditor}
          onOpenChange={setShowEditor}
          houseId={houseId}
          focusField={focusField}
          onFieldChange={handleFieldChange}
          currentProfile={{
            homeType: house.homeType,
            squareFootage: house.squareFootage,
            yearBuilt: house.yearBuilt,
            roofInstalledYear: house.roofInstalledYear,
            roofType: house.roofType,
            hvacInstalledYear: house.hvacInstalledYear,
            hvacType: house.hvacType,
            plumbingType: house.plumbingType,
            foundationType: house.foundationType,
            waterHeaterInstalledYear: house.waterHeaterInstalledYear,
            waterHeaterType: house.waterHeaterType,
            garageType: house.garageType,
            numberOfStories: house.numberOfStories,
            primaryHeatingFuel: house.primaryHeatingFuel,
            homeSystems: house.homeSystems,
            ...draftProgress,
          }}
        />
      </div>
    </div>
  );
}

interface ProfileFieldProps {
  label: string;
  value?: string | number | string[] | null;
  unit?: string;
}

function ProfileField({ label, value, unit }: ProfileFieldProps) {
  if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
    return (
      <div>
        <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
        <dd className="mt-1 text-sm text-muted-foreground italic">Not specified</dd>
      </div>
    );
  }

  const formatValue = (item: string | number) => (
    typeof item === "string"
      ? item.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
      : item
  );
  const displayValue = Array.isArray(value)
    ? value.map(formatValue).join(", ")
    : formatValue(value);

  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold">
        {displayValue}{unit ? ` ${unit}` : ""}
      </dd>
    </div>
  );
}
