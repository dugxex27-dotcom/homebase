import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertCustomMaintenanceTaskSchema } from "@shared/schema";
import type { CustomMaintenanceTask } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Calendar, Clock, Wrench, DollarSign } from "lucide-react";

const customTaskFormSchema = insertCustomMaintenanceTaskSchema.extend({
  homeownerId: z.string().min(1, "Homeowner ID is required"),
  tools: z.array(z.string()).optional(),
  specificMonths: z.array(z.string()).optional(),
});

type CustomTaskFormData = z.infer<typeof customTaskFormSchema>;

const FREQUENCY_OPTIONS = [
  { value: "once", label: "One time task" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Every 3 months" },
  { value: "biannually", label: "Every 6 months" },
  { value: "annually", label: "Once a year" },
  { value: "custom", label: "Custom (specify days)" }
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "bg-green-100 text-green-800" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  { value: "high", label: "High", color: "bg-red-100 text-red-800" }
];

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "difficult", label: "Difficult" }
];

const CATEGORY_OPTIONS = [
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "exterior", label: "Exterior" },
  { value: "interior", label: "Interior" },
  { value: "appliances", label: "Appliances" },
  { value: "safety", label: "Safety" },
  { value: "landscaping", label: "Landscaping" },
  { value: "other", label: "Other" }
];

const MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" }
];

interface CustomMaintenanceTasksProps {
  homeownerId: string;
  houseId?: string;
}

export function CustomMaintenanceTasks({ homeownerId, houseId }: CustomMaintenanceTasksProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CustomMaintenanceTask | null>(null);
  const [deleteTaskConfirmOpen, setDeleteTaskConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<CustomMaintenanceTask | null>(null);

  // Fetch custom maintenance tasks
  const { data: customTasks = [], isLoading } = useQuery<CustomMaintenanceTask[]>({
    queryKey: ['/api/custom-maintenance-tasks', { homeownerId, houseId }],
    queryFn: async () => {
      const params = new URLSearchParams({ homeownerId });
      if (houseId) params.append('houseId', houseId);
      
      const response = await fetch(`/api/custom-maintenance-tasks?${params}`);
      if (!response.ok) throw new Error('Failed to fetch custom maintenance tasks');
      return response.json();
    },
  });

  // Form handling
  const form = useForm<CustomTaskFormData>({
    resolver: zodResolver(customTaskFormSchema),
    defaultValues: {
      homeownerId,
      houseId: houseId || null,
      title: "",
      description: "",
      category: "other",
      priority: "medium",
      estimatedTime: "",
      difficulty: "easy",
      tools: [],
      cost: "",
      frequencyType: "monthly",
      frequencyValue: undefined,
      specificMonths: [],
      isActive: true,
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: CustomTaskFormData) => {
      const response = await fetch('/api/custom-maintenance-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create custom maintenance task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-maintenance-tasks'] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Success", description: "Custom maintenance task created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create custom maintenance task", variant: "destructive" });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomTaskFormData> }) => {
      const response = await fetch(`/api/custom-maintenance-tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update custom maintenance task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-maintenance-tasks'] });
      setIsDialogOpen(false);
      setEditingTask(null);
      form.reset();
      toast({ title: "Success", description: "Custom maintenance task updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update custom maintenance task", variant: "destructive" });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/custom-maintenance-tasks/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete custom maintenance task');
      // DELETE typically returns 204 with no content, so don't try to parse JSON
      return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-maintenance-tasks'] });
      toast({ title: "Success", description: "Custom maintenance task deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete custom maintenance task", variant: "destructive" });
    },
  });

  const handleSubmit = (data: CustomTaskFormData) => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data });
    } else {
      createTaskMutation.mutate(data);
    }
  };

  const handleEdit = (task: CustomMaintenanceTask) => {
    setEditingTask(task);
    form.reset({
      ...task,
      tools: task.tools || [],
      specificMonths: task.specificMonths || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (task: CustomMaintenanceTask) => {
    setTaskToDelete(task);
    setDeleteTaskConfirmOpen(true);
  };

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      deleteTaskMutation.mutate(taskToDelete.id);
      setDeleteTaskConfirmOpen(false);
      setTaskToDelete(null);
    }
  };

  const getFrequencyLabel = (task: CustomMaintenanceTask) => {
    switch (task.frequencyType) {
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Every 3 months';
      case 'biannually': return 'Every 6 months';
      case 'annually': 
        if (task.specificMonths && task.specificMonths.length > 0) {
          const monthNames = task.specificMonths.map(m => MONTH_OPTIONS.find(opt => opt.value === m)?.label).join(', ');
          return `Annually in ${monthNames}`;
        }
        return 'Once a year';
      case 'custom': return `Every ${task.frequencyValue} days`;
      default: return task.frequencyType;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-center" style={{ color: '#2c0f5b' }}>Your Custom Tasks</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingTask(null);
              form.reset();
            }} className="text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-90" style={{ backgroundColor: '#2c0f5b' }} data-testid="button-add-custom-task">
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#2c0f5b' }}>
            <DialogHeader>
              <DialogTitle style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>
                {editingTask ? 'Edit Custom Task' : 'Create Custom Task'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: 'white' }}>Task Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Clean pool filter" {...field} style={{ backgroundColor: 'white' }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: 'white' }}>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Detailed description of the task..." {...field} style={{ backgroundColor: 'white' }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ color: 'white' }}>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger style={{ backgroundColor: 'white' }}>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
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
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ color: 'white' }}>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger style={{ backgroundColor: 'white' }}>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="estimatedTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ color: 'white' }}>Estimated Time</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 30 minutes" {...field} value={field.value || ""} style={{ backgroundColor: 'white' }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ color: 'white' }}>Difficulty</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                          <FormControl>
                            <SelectTrigger style={{ backgroundColor: 'white' }}>
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DIFFICULTY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
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
                  name="frequencyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: 'white' }}>How Often</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger style={{ backgroundColor: 'white' }}>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('frequencyType') === 'custom' && (
                  <FormField
                    control={form.control}
                    name="frequencyValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ color: 'white' }}>Every X days</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Enter number of days" {...field} value={field.value || ""} style={{ backgroundColor: 'white' }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch('frequencyType') === 'annually' && (
                  <FormField
                    control={form.control}
                    name="specificMonths"
                    render={() => (
                      <FormItem>
                        <FormLabel style={{ color: 'white' }}>Specific Months (optional)</FormLabel>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {MONTH_OPTIONS.map((month) => (
                            <FormField
                              key={month.value}
                              control={form.control}
                              name="specificMonths"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={month.value}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(month.value)}
                                        onCheckedChange={(checked) => {
                                          const currentValue = field.value || [];
                                          return checked
                                            ? field.onChange([...currentValue, month.value])
                                            : field.onChange(
                                                currentValue.filter(
                                                  (value) => value !== month.value
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal" style={{ color: 'white' }}>
                                      {month.label}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: 'white' }}>Estimated Cost (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., $25" {...field} value={field.value || ""} style={{ backgroundColor: 'white' }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    onClick={() => setIsDialogOpen(false)}
                    style={{ backgroundColor: 'white', color: '#2c0f5b' }}
                    className="hover:opacity-90"
                    data-testid="button-cancel-custom-task"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                    className="text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-90"
                    style={{ backgroundColor: '#2c0f5b' }}
                    data-testid="button-create-custom-task"
                  >
                    {editingTask ? 'Update Task' : 'Create Task'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <div className="text-center py-8">Loading your custom tasks...</div>
      ) : customTasks.length === 0 ? (
        <Card className="border-2" style={{ borderColor: '#b6a6f4', backgroundColor: '#f8f9fa' }}>
          <CardContent className="py-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4" style={{ color: '#b6a6f4' }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: '#2c0f5b' }}>No custom tasks yet</h3>
            <p className="text-gray-600 mb-4">
              Create your own maintenance tasks with custom schedules
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {customTasks.map((task) => {
            const priorityOption = PRIORITY_OPTIONS.find(p => p.value === task.priority);
            return (
              <Card key={task.id} className="border-2" style={{ borderColor: '#b6a6f4', backgroundColor: '#ffffff' }}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg" style={{ color: '#2c0f5b' }}>{task.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {task.description}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(task)}
                        className="hover:bg-purple-50"
                        style={{ color: '#2c0f5b' }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(task)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary" className="capitalize">
                      {task.category}
                    </Badge>
                    <Badge className={priorityOption?.color}>
                      {priorityOption?.label}
                    </Badge>
                    <Badge variant="outline">
                      {task.difficulty}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {getFrequencyLabel(task)}
                    </div>
                    {task.estimatedTime && (
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {task.estimatedTime}
                      </div>
                    )}
                    {task.cost && (
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {task.cost}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteTaskConfirmOpen}
        onOpenChange={setDeleteTaskConfirmOpen}
        title="Delete Custom Task?"
        description={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteTask}
        variant="destructive"
      />
    </div>
  );
}