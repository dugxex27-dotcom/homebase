import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ContractorAppointment } from "@shared/schema";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Home,
  Loader2,
  MapPin,
  Trash2,
  UserRound,
} from "lucide-react";
import { AppointmentScheduler } from "@/components/appointment-scheduler";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface LinkedHomeowner {
  id: string;
  name: string;
  email: string;
  houses: Array<{ id: string; name: string; address: string }>;
}

function formatAppointmentDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAppointmentTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ContractorCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const typedUser = user as {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    companyName?: string | null;
    phone?: string | null;
  } | null;
  const [connectionCode, setConnectionCode] = useState("");
  const [linkedHomeowner, setLinkedHomeowner] =
    useState<LinkedHomeowner | null>(null);
  const [selectedHouseId, setSelectedHouseId] = useState("");
  const [appointmentToDelete, setAppointmentToDelete] =
    useState<ContractorAppointment | null>(null);

  const {
    data: appointments = [],
    isLoading,
    isError,
  } = useQuery<ContractorAppointment[]>({
    queryKey: ["/api/appointments", typedUser?.id],
    queryFn: async () => {
      const response = await fetch("/api/appointments", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load appointments");
      return response.json();
    },
    enabled: Boolean(typedUser?.id),
  });

  const validateCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch("/api/permanent-connection-code/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || "Invalid connection code");
      }
      return response.json();
    },
    onSuccess: (data) => {
      const homeowner: LinkedHomeowner = {
        id: data.homeownerId,
        name: data.homeownerName,
        email: data.homeownerEmail,
        houses: data.houses || [],
      };
      setLinkedHomeowner(homeowner);
      setSelectedHouseId(
        homeowner.houses.length === 1 ? homeowner.houses[0].id : "",
      );
      toast({
        title: "Homeowner connected",
        description: `You can now schedule a visit for ${homeowner.name}.`,
      });
    },
    onError: (error: Error) => {
      setLinkedHomeowner(null);
      setSelectedHouseId("");
      toast({
        title: "Could not connect homeowner",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || "Failed to delete appointment");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      setAppointmentToDelete(null);
      toast({
        title: "Appointment deleted",
        description: "The visit and its pending reminders were removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const upcomingAppointments = useMemo(() => {
    const now = Date.now();
    return appointments
      .filter((appointment) => {
        const scheduled = new Date(appointment.scheduledDateTime).getTime();
        return (
          Number.isFinite(scheduled) &&
          scheduled >= now &&
          appointment.status !== "cancelled"
        );
      })
      .sort(
        (a, b) =>
          new Date(a.scheduledDateTime).getTime() -
          new Date(b.scheduledDateTime).getTime(),
      );
  }, [appointments]);

  const selectedHouse = linkedHomeowner?.houses.find(
    (house) => house.id === selectedHouseId,
  );
  const contractorName =
    [typedUser?.firstName, typedUser?.lastName].filter(Boolean).join(" ") ||
    typedUser?.email ||
    "Contractor";

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/contractor-dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#1560A2] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mb-8 rounded-2xl bg-gradient-to-br from-[#0C3460] to-[#1560A2] p-6 text-white shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-white/15 p-3">
              <CalendarDays className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[#AFD6F9]">
                Contractor schedule
              </p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                Schedule and manage visits
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-blue-50 sm:text-base">
                Connect a homeowner, choose their property, and manage upcoming
                appointments and reminders in one place.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-[#1560A2]" />
                Schedule a new visit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="connection-code">
                  Homeowner connection code
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="connection-code"
                    value={connectionCode}
                    maxLength={8}
                    placeholder="8-character code"
                    onChange={(event) =>
                      setConnectionCode(event.target.value.toUpperCase())
                    }
                    data-testid="input-calendar-connection-code"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      connectionCode.trim().length !== 8 ||
                      validateCodeMutation.isPending
                    }
                    onClick={() =>
                      validateCodeMutation.mutate(connectionCode)
                    }
                    data-testid="button-calendar-connect"
                  >
                    {validateCodeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Connect"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Ask the homeowner for the permanent code shown in their
                  MyHomeBase account.
                </p>
              </div>

              {linkedHomeowner && (
                <Alert className="border-blue-200 bg-blue-50">
                  <UserRound className="h-4 w-4 text-[#1560A2]" />
                  <AlertTitle>{linkedHomeowner.name}</AlertTitle>
                  <AlertDescription>{linkedHomeowner.email}</AlertDescription>
                </Alert>
              )}

              {linkedHomeowner && linkedHomeowner.houses.length === 0 && (
                <Alert variant="destructive">
                  <AlertTitle>No properties available</AlertTitle>
                  <AlertDescription>
                    This homeowner needs to add a property before a visit can
                    be scheduled.
                  </AlertDescription>
                </Alert>
              )}

              {linkedHomeowner && linkedHomeowner.houses.length > 0 && (
                <div className="space-y-2">
                  <Label>Property</Label>
                  <Select
                    value={selectedHouseId}
                    onValueChange={setSelectedHouseId}
                  >
                    <SelectTrigger data-testid="select-calendar-property">
                      <SelectValue placeholder="Choose a property" />
                    </SelectTrigger>
                    <SelectContent>
                      {linkedHomeowner.houses.map((house) => (
                        <SelectItem key={house.id} value={house.id}>
                          {house.name} — {house.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedHouse && linkedHomeowner && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2 font-medium text-slate-800">
                    <Home className="h-4 w-4" />
                    {selectedHouse.name}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {selectedHouse.address}
                  </div>
                </div>
              )}

              <AppointmentScheduler
                homeownerId={linkedHomeowner?.id}
                houseId={selectedHouseId}
                contractorId={typedUser?.id}
                contractorName={contractorName}
                contractorCompany={typedUser?.companyName || ""}
                contractorPhone={typedUser?.phone || ""}
                triggerButtonText="Schedule appointment"
                disabled={!selectedHouseId}
                onSaved={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["/api/appointments"],
                  })
                }
              />

              {!selectedHouseId && (
                <p className="text-xs text-amber-700">
                  Connect a homeowner and select a property before opening the
                  scheduler.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span>Upcoming visits</span>
                <Badge variant="secondary">{upcomingAppointments.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading appointments…
                </div>
              )}

              {isError && (
                <Alert variant="destructive">
                  <AlertTitle>Appointments unavailable</AlertTitle>
                  <AlertDescription>
                    Refresh the page to try loading your schedule again.
                  </AlertDescription>
                </Alert>
              )}

              {!isLoading && !isError && upcomingAppointments.length === 0 && (
                <div className="py-12 text-center">
                  <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 font-medium text-slate-700">
                    No upcoming visits
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Connect a homeowner to schedule the next appointment.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="rounded-xl border border-slate-200 p-4"
                    data-testid={`appointment-card-${appointment.id}`}
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-slate-900">
                            {appointment.serviceDescription}
                          </h2>
                          <Badge variant="outline">{appointment.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm capitalize text-slate-600">
                          {appointment.serviceType} ·{" "}
                          {appointment.homeArea.replaceAll("_", " ")}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4" />
                            {formatAppointmentDate(
                              appointment.scheduledDateTime,
                            )}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            {formatAppointmentTime(
                              appointment.scheduledDateTime,
                            )}
                            {appointment.estimatedDuration
                              ? ` · ${appointment.estimatedDuration} min`
                              : ""}
                          </span>
                        </div>
                        {appointment.notes && (
                          <p className="mt-3 text-sm text-slate-500">
                            {appointment.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <AppointmentScheduler
                          appointment={appointment}
                          triggerButtonText="Edit"
                          triggerButtonVariant="outline"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          aria-label="Delete appointment"
                          onClick={() => setAppointmentToDelete(appointment)}
                          data-testid={`button-delete-appointment-${appointment.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(appointmentToDelete)}
        onOpenChange={(open) => {
          if (!open) setAppointmentToDelete(null);
        }}
        title="Delete this appointment?"
        description="The appointment and any pending reminder notifications will be removed."
        confirmText={deleteMutation.isPending ? "Deleting…" : "Delete appointment"}
        onConfirm={() => {
          if (appointmentToDelete) {
            deleteMutation.mutate(appointmentToDelete.id);
          }
        }}
      />
    </main>
  );
}