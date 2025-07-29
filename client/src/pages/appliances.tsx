import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertHomeApplianceSchema } from "@shared/schema";
import type { HomeAppliance } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Home, Calendar, Wrench, Phone } from "lucide-react";

// Form schema for appliance creation/editing
const applianceFormSchema = insertHomeApplianceSchema.extend({
  homeownerId: z.string().min(1, "Homeowner ID is required"),
});

type ApplianceFormData = z.infer<typeof applianceFormSchema>;

const APPLIANCE_TYPES = [
  { value: "hvac", label: "HVAC System" },
  { value: "water_heater", label: "Water Heater" },
  { value: "washer", label: "Washing Machine" },
  { value: "dryer", label: "Dryer" },
  { value: "dishwasher", label: "Dishwasher" },
  { value: "refrigerator", label: "Refrigerator" },
  { value: "oven", label: "Oven/Range" },
  { value: "garbage_disposal", label: "Garbage Disposal" },
  { value: "furnace", label: "Furnace" },
  { value: "boiler", label: "Boiler" },
  { value: "sump_pump", label: "Sump Pump" },
  { value: "water_softener", label: "Water Softener" },
  { value: "generator", label: "Generator" },
  { value: "pool_equipment", label: "Pool Equipment" },
  { value: "other", label: "Other" }
];

const LOCATIONS = [
  { value: "kitchen", label: "Kitchen" },
  { value: "basement", label: "Basement" },
  { value: "garage", label: "Garage" },
  { value: "utility_room", label: "Utility Room" },
  { value: "laundry_room", label: "Laundry Room" },
  { value: "attic", label: "Attic" },
  { value: "outdoor", label: "Outdoor" },
  { value: "main_floor", label: "Main Floor" },
  { value: "second_floor", label: "Second Floor" },
  { value: "other", label: "Other" }
];

export default function Appliances() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppliance, setEditingAppliance] = useState<HomeAppliance | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // For demo purposes, we'll use a default homeowner ID
  // In a real app, this would come from authentication
  const homeownerId = "demo-homeowner-123";

  const { data: appliances, isLoading } = useQuery<HomeAppliance[]>({
    queryKey: ['/api/appliances', { homeownerId }],
    queryFn: async () => {
      const response = await fetch(`/api/appliances?homeownerId=${homeownerId}`);
      if (!response.ok) throw new Error('Failed to fetch appliances');
      return response.json();
    },
  });

  const form = useForm<ApplianceFormData>({
    resolver: zodResolver(applianceFormSchema),
    defaultValues: {
      homeownerId,
      applianceType: "",
      brand: "",
      model: "",
      yearInstalled: undefined,
      serialNumber: "",
      notes: "",
      location: "",
      warrantyExpiration: "",
      lastServiceDate: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ApplianceFormData) => {
      const response = await fetch('/api/appliances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create appliance');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appliances'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Appliance added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add appliance",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ApplianceFormData> }) => {
      const response = await fetch(`/api/appliances/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update appliance');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appliances'] });
      setIsDialogOpen(false);
      setEditingAppliance(null);
      form.reset();
      toast({
        title: "Success",
        description: "Appliance updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update appliance",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/appliances/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete appliance');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appliances'] });
      toast({
        title: "Success",
        description: "Appliance deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete appliance",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ApplianceFormData) => {
    if (editingAppliance) {
      updateMutation.mutate({ id: editingAppliance.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (appliance: HomeAppliance) => {
    setEditingAppliance(appliance);
    form.reset({
      homeownerId: appliance.homeownerId,
      applianceType: appliance.applianceType,
      brand: appliance.brand,
      model: appliance.model,
      yearInstalled: appliance.yearInstalled || undefined,
      serialNumber: appliance.serialNumber ?? "",
      notes: appliance.notes ?? "",
      location: appliance.location ?? "",
      warrantyExpiration: appliance.warrantyExpiration ?? "",
      lastServiceDate: appliance.lastServiceDate ?? "",
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingAppliance(null);
    form.reset({
      homeownerId,
      applianceType: "",
      brand: "",
      model: "",
      yearInstalled: undefined,
      serialNumber: "",
      notes: "",
      location: "",
      warrantyExpiration: "",
      lastServiceDate: "",
    });
    setIsDialogOpen(true);
  };

  const getApplianceTypeLabel = (type: string) => {
    return APPLIANCE_TYPES.find(t => t.value === type)?.label || type;
  };

  const getLocationLabel = (location: string) => {
    return LOCATIONS.find(l => l.value === location)?.label || location;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                My Home Appliances
              </h1>
              <p className="text-lg text-muted-foreground">
                Manage your home appliances so contractors know what they'll be working on
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNew} className="bg-primary text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Appliance
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingAppliance ? 'Edit Appliance' : 'Add New Appliance'}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="applianceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Appliance Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select appliance type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {APPLIANCE_TYPES.map((type) => (
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
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., GE, Whirlpool, Carrier" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input placeholder="Model number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {LOCATIONS.map((location) => (
                                <SelectItem key={location.value} value={location.value}>
                                  {location.label}
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
                      name="yearInstalled"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year Installed</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="2020" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="serialNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serial Number (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Serial number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="warrantyExpiration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warranty Expiration (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="MM/YYYY or description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastServiceDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Service Date (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="MM/YYYY or description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Any additional details, known issues, or special instructions"
                              className="resize-none"
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="flex-1"
                      >
                        {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 
                         editingAppliance ? 'Update' : 'Add Appliance'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : appliances && appliances.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {appliances.map((appliance) => (
              <Card key={appliance.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        {getApplianceTypeLabel(appliance.applianceType)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {appliance.brand} {appliance.model}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(appliance)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(appliance.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {appliance.location && (
                    <div className="flex items-center text-sm">
                      <Home className="w-4 h-4 mr-2 text-muted-foreground" />
                      {getLocationLabel(appliance.location)}
                    </div>
                  )}
                  
                  {appliance.yearInstalled && (
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                      Installed: {appliance.yearInstalled}
                    </div>
                  )}

                  {appliance.lastServiceDate && (
                    <div className="flex items-center text-sm">
                      <Wrench className="w-4 h-4 mr-2 text-muted-foreground" />
                      Last Service: {appliance.lastServiceDate}
                    </div>
                  )}

                  {appliance.warrantyExpiration && (
                    <div className="text-sm">
                      <Badge variant="outline" className="text-xs">
                        Warranty: {appliance.warrantyExpiration}
                      </Badge>
                    </div>
                  )}

                  {appliance.serialNumber && (
                    <div className="text-xs text-muted-foreground">
                      Serial: {appliance.serialNumber}
                    </div>
                  )}

                  {appliance.notes && (
                    <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      {appliance.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Home className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No appliances added yet
            </h3>
            <p className="text-muted-foreground mb-4">
              Add your home appliances so contractors can better prepare for their work
            </p>
            <Button onClick={handleAddNew} className="bg-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Appliance
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}