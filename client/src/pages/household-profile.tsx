import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HouseholdProfileEditor } from "@/components/household-profile-editor";
import { MaintenanceScheduleDisplay } from "@/components/maintenance-schedule-display";
import { Home, Edit, AlertCircle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function HouseholdProfilePage() {
  const [, params] = useRoute("/household-profile/:id");
  const houseId = params?.id || "";
  const [showEditor, setShowEditor] = useState(false);

  const { data: houses, isLoading: housesLoading } = useQuery<any[]>({
    queryKey: ["/api/houses"],
  });

  const house = houses?.find((h) => h.id === houseId);

  useEffect(() => {
    document.title = "Household Profile | HomeBase";
  }, []);

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

  const hasCompleteProfile = house.homeType && house.yearBuilt && house.roofType && house.hvacType;

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
            onClick={() => setShowEditor(true)}
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
                Fill in your household details to get a personalized maintenance schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowEditor(true)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Complete Profile Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Current Profile Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          }}
        />
      </div>
    </div>
  );
}

interface ProfileFieldProps {
  label: string;
  value?: string | number | null;
  unit?: string;
}

function ProfileField({ label, value, unit }: ProfileFieldProps) {
  if (!value) {
    return (
      <div>
        <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
        <dd className="mt-1 text-sm text-muted-foreground italic">Not specified</dd>
      </div>
    );
  }

  const displayValue = typeof value === 'string' 
    ? value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : value;

  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold">
        {displayValue}{unit ? ` ${unit}` : ''}
      </dd>
    </div>
  );
}
