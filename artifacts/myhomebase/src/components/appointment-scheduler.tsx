import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { insertContractorAppointmentSchema } from "@shared/schema";
import type { ContractorAppointment } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const SERVICE_TYPES = [
  { value: "maintenance", label: "Routine Maintenance" },
  { value: "repair", label: "Repair" },
  { value: "installation", label: "Installation" },
  { value: "replacement", label: "Replacement" },
  { value: "inspection", label: "Inspection" },
  { value: "cleaning", label: "Professional Cleaning" },
  { value: "upgrade", label: "Upgrade/Improvement" },
  { value: "emergency", label: "Emergency Service" },
  { value: "other", label: "Other" }
];

const HOME_AREAS = [
  { value: "hvac", label: "HVAC System" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "roof", label: "Roof" },
  { value: "foundation", label: "Foundation" },
  { value: "siding", label: "Siding/Exterior" },
  { value: "windows", label: "Windows" },
  { value: "doors", label: "Doors" },
  { value: "flooring", label: "Flooring" },
  { value: "kitchen", label: "Kitchen" },
  { value: "bathroom", label: "Bathroom" },
  { value: "basement", label: "Basement" },
  { value: "attic", label: "Attic" },
  { value: "garage", label: "Garage" },
  { value: "landscaping", label: "Landscaping/Yard" },
  { value: "driveway", label: "Driveway/Walkways" },
  { value: "gutters", label: "Gutters" },
  { value: "chimney", label: "Chimney" },
  { value: "septic", label: "Septic System" },
  { value: "well", label: "Well/Water System" },
  { value: "other", label: "Other" }
];

const appointmentFormSchema = insertContractorAppointmentSchema.omit({
  scheduledDateTime: true,
}).extend({
  homeownerId: z.string().min(1, "Homeowner ID is required"),
  houseId: z.string().min(1, "Property is required"),
  scheduledDate: z.string().min(1, "Date is required"),
  scheduledTime: z.string().min(1, "Time is required"),
});

type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

interface AppointmentSchedulerProps {
  homeownerId?: string;
  houseId?: string;
  contractorId?: string;
  contractorName?: string;
  contractorCompany?: string;
  contractorPhone?: string;
  appointment?: ContractorAppointment;
  triggerButtonText?: string;
  triggerButtonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  onSaved?: () => void;
  disabled?: boolean;
}

export function AppointmentScheduler({ 
  homeownerId,
  houseId,
  contractorId,
  contractorName,
  contractorCompany,
  contractorPhone,
  appointment,
  triggerButtonText = "Schedule Appointment",
  triggerButtonVariant = "default",
  onSaved,
  disabled = false,
}: AppointmentSchedulerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const typedUser = user as {
    id?: string;
    role?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    companyName?: string | null;
    phone?: string | null;
  } | null;

  const resolvedHomeownerId =
    homeownerId || (typedUser?.role === "homeowner" ? typedUser.id : "") || "";
  const resolvedContractorId =
    contractorId || (typedUser?.role === "contractor" ? typedUser.id : "") || "";
  const resolvedContractorName =
    contractorName ||
    [typedUser?.firstName, typedUser?.lastName].filter(Boolean).join(" ") ||
    typedUser?.email ||
    "";

  const getDefaultValues = (): AppointmentFormData => {
    let scheduledDate = "";
    let scheduledTime = "";
    if (appointment?.scheduledDateTime) {
      const scheduled = new Date(appointment.scheduledDateTime);
      if (!Number.isNaN(scheduled.getTime())) {
        const pad = (value: number) => String(value).padStart(2, "0");
        scheduledDate = `${scheduled.getFullYear()}-${pad(scheduled.getMonth() + 1)}-${pad(scheduled.getDate())}`;
        scheduledTime = `${pad(scheduled.getHours())}:${pad(scheduled.getMinutes())}`;
      }
    }

    return {
      homeownerId: appointment?.homeownerId || resolvedHomeownerId,
      houseId: appointment?.houseId || houseId || "",
      contractorName: appointment?.contractorName || resolvedContractorName,
      contractorCompany:
        appointment?.contractorCompany ||
        contractorCompany ||
        typedUser?.companyName ||
        "",
      contractorPhone:
        appointment?.contractorPhone ||
        contractorPhone ||
        typedUser?.phone ||
        "",
      serviceType: appointment?.serviceType || "",
      serviceDescription: appointment?.serviceDescription || "",
      homeArea: appointment?.homeArea || "",
      scheduledDate,
      scheduledTime,
      estimatedDuration: appointment?.estimatedDuration || 60,
      status: appointment?.status || "scheduled",
      notes: appointment?.notes || "",
      contractorId: appointment?.contractorId || resolvedContractorId || null,
    };
  };

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema as any),
    defaultValues: getDefaultValues(),
  });

  useEffect(() => {
    if (isOpen) form.reset(getDefaultValues());
  }, [
    isOpen,
    appointment,
    resolvedHomeownerId,
    houseId,
    resolvedContractorId,
    resolvedContractorName,
  ]);

  const saveAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      // Combine date and time into ISO datetime string
      const scheduledDateTime = new Date(`${data.scheduledDate}T${data.scheduledTime}`).toISOString();
      
      const appointmentData = {
        ...data,
        scheduledDateTime,
      };
      
      // Remove the separate date/time fields
      const { scheduledDate, scheduledTime, ...finalData } = appointmentData;
      
      const response = await fetch(
        appointment ? `/api/appointments/${appointment.id}` : '/api/appointments',
        {
        method: appointment ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          errorBody?.message ||
          `Failed to ${appointment ? "update" : "create"} appointment`,
        );
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      setIsOpen(false);
      form.reset(getDefaultValues());
      onSaved?.();
      toast({ 
        title: appointment ? "Appointment updated" : "Appointment scheduled",
        description: appointment
          ? "The visit details and reminders have been updated."
          : "The visit was scheduled and reminders were created.",
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: AppointmentFormData) => {
    saveAppointmentMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerButtonVariant}
          disabled={disabled}
          data-testid={appointment ? `button-edit-appointment-${appointment.id}` : "button-schedule-appointment"}
        >
          {triggerButtonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appointment ? "Edit appointment" : "Schedule contractor appointment"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contractorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contractor Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractorCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC Plumbing Co." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contractorPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERVICE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="homeArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Home Area</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select home area" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HOME_AREAS.map((area) => (
                          <SelectItem key={area.value} value={area.value}>
                            {area.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="serviceDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Fix leaky faucet, Install new light fixture" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduledTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="60" 
                        {...field}
                        value={field.value || ""}
                        onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any special instructions or details..."
                      className="min-h-[80px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saveAppointmentMutation.isPending}
              >
                {saveAppointmentMutation.isPending
                  ? 'Saving...'
                  : appointment
                    ? 'Save changes'
                    : 'Schedule appointment'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}