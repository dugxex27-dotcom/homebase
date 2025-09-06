import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertProposalSchema, type Proposal } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, FileText, Calendar, DollarSign, Clock, Edit, Trash2 } from "lucide-react";

const proposalFormSchema = insertProposalSchema.extend({
  materials: z.string(),
});

type ProposalFormData = z.infer<typeof proposalFormSchema>;

interface ProposalsProps {
  contractorId: string;
}

export function Proposals({ contractorId }: ProposalsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);

  const form = useForm<ProposalFormData>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      contractorId: contractorId,
      title: "",
      description: "",
      serviceType: "",
      estimatedCost: "0.00",
      estimatedDuration: "",
      scope: "",
      materials: "",
      warrantyPeriod: "",
      validUntil: "",
      status: "draft",
      customerNotes: "",
      internalNotes: "",
    },
  });

  const { data: proposals = [], isLoading } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals", contractorId],
  });

  const createMutation = useMutation({
    mutationFn: (data: ProposalFormData) => {
      const payload = {
        ...data,
        materials: data.materials.split(',').map(item => item.trim()).filter(item => item.length > 0),
        estimatedCost: parseFloat(data.estimatedCost).toString(),
      };
      return apiRequest("/api/proposals", "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Proposal created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create proposal",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProposalFormData> }) => {
      const payload: any = {
        ...data,
        estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost).toString() : undefined,
      };
      if (data.materials) {
        payload.materials = data.materials.split(',').map(item => item.trim()).filter(item => item.length > 0);
      }
      return apiRequest(`/api/proposals/${id}`, "PATCH", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      setIsDialogOpen(false);
      setEditingProposal(null);
      form.reset();
      toast({
        title: "Success",
        description: "Proposal updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update proposal",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/proposals/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      toast({
        title: "Success",
        description: "Proposal deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete proposal",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProposalFormData) => {
    if (editingProposal) {
      updateMutation.mutate({ id: editingProposal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (proposal: Proposal) => {
    setEditingProposal(proposal);
    form.reset({
      contractorId: proposal.contractorId,
      title: proposal.title,
      description: proposal.description,
      serviceType: proposal.serviceType,
      estimatedCost: proposal.estimatedCost,
      estimatedDuration: proposal.estimatedDuration,
      scope: proposal.scope,
      materials: (proposal.materials || []).join(', '),
      warrantyPeriod: proposal.warrantyPeriod || "",
      validUntil: proposal.validUntil,
      status: proposal.status,
      customerNotes: proposal.customerNotes || "",
      internalNotes: proposal.internalNotes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this proposal?")) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'sent': return 'default';
      case 'accepted': return 'default';
      case 'rejected': return 'destructive';
      case 'expired': return 'outline';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proposals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading proposals...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-red-800" />
            Proposals
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingProposal(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-proposal" className="bg-red-800 hover:bg-red-900 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Proposal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProposal ? "Edit Proposal" : "Create New Proposal"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Kitchen renovation proposal"
                              {...field}
                              data-testid="input-proposal-title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="serviceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Type</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-service-type">
                                <SelectValue placeholder="Select service type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hvac">HVAC</SelectItem>
                                <SelectItem value="plumbing">Plumbing</SelectItem>
                                <SelectItem value="electrical">Electrical</SelectItem>
                                <SelectItem value="roofing">Roofing</SelectItem>
                                <SelectItem value="gutters">Gutters</SelectItem>
                                <SelectItem value="drywall">Drywall / Spackling</SelectItem>
                                <SelectItem value="custom-cabinetry">Custom Cabinetry</SelectItem>
                                <SelectItem value="flooring">Flooring</SelectItem>
                                <SelectItem value="painting">Painting</SelectItem>
                                <SelectItem value="landscaping">Landscaping</SelectItem>
                                <SelectItem value="christmas-light-hanging">Christmas Light Hanging</SelectItem>
                                <SelectItem value="snow-removal">Snow Removal</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Brief overview of the project"
                            {...field}
                            data-testid="textarea-proposal-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scope"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scope of Work</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Detailed scope of work including specific tasks, materials, and deliverables"
                            rows={4}
                            {...field}
                            data-testid="textarea-proposal-scope"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="estimatedCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Cost ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              data-testid="input-estimated-cost"
                            />
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
                          <FormLabel>Estimated Duration</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="2-3 days, 1 week, etc."
                              {...field}
                              data-testid="input-estimated-duration"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="materials"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Materials (comma-separated)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Pipes, fittings, sealant, labor"
                            {...field}
                            data-testid="input-materials"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="warrantyPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warranty Period</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="1 year, 6 months, etc."
                              {...field}
                              value={field.value || ""}
                              data-testid="input-warranty-period"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="validUntil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valid Until</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              data-testid="input-valid-until"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="sent">Sent</SelectItem>
                              <SelectItem value="accepted">Accepted</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notes visible to the customer about this job"
                            {...field}
                            value={field.value || ""}
                            data-testid="textarea-customer-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="internalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Private notes for internal use only"
                            {...field}
                            value={field.value || ""}
                            data-testid="textarea-internal-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit-proposal"
                      className="bg-red-800 hover:bg-red-900 text-white"
                    >
                      {editingProposal ? "Update" : "Create"} Proposal
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {proposals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No proposals yet. Create your first proposal to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal: Proposal) => (
              <div
                key={proposal.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                data-testid={`proposal-card-${proposal.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg" data-testid={`proposal-title-${proposal.id}`}>
                        {proposal.title}
                      </h3>
                      <Badge variant={getStatusColor(proposal.status)} data-testid={`proposal-status-${proposal.id}`}>
                        {proposal.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3" data-testid={`proposal-description-${proposal.id}`}>
                      {proposal.description}
                    </p>
                    
                    {/* Display notes */}
                    {(proposal.customerNotes || proposal.internalNotes) && (
                      <div className="mb-3 space-y-2">
                        {proposal.customerNotes && (
                          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Customer Notes</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300" data-testid={`customer-notes-${proposal.id}`}>
                              {proposal.customerNotes}
                            </p>
                          </div>
                        )}
                        {proposal.internalNotes && (
                          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Internal Notes</h4>
                            <p className="text-sm text-gray-700 dark:text-gray-300" data-testid={`internal-notes-${proposal.id}`}>
                              {proposal.internalNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-red-800" />
                        <span data-testid={`proposal-cost-${proposal.id}`}>
                          ${parseFloat(proposal.estimatedCost).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-red-800" />
                        <span data-testid={`proposal-duration-${proposal.id}`}>
                          {proposal.estimatedDuration}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-red-800" />
                        <span data-testid={`proposal-valid-until-${proposal.id}`}>
                          Valid until {new Date(proposal.validUntil).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(proposal)}
                      data-testid={`button-edit-proposal-${proposal.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(proposal.id)}
                      data-testid={`button-delete-proposal-${proposal.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}