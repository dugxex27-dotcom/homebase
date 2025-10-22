import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  FileText, 
  Calendar, 
  MapPin, 
  User, 
  DollarSign,
  Clock,
  Search,
  Filter,
  Edit,
  Trash2
} from "lucide-react";

interface ServiceRecord {
  id: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  serviceType: string;
  serviceDescription: string;
  homeArea?: string;
  serviceDate: string;
  duration: string;
  cost: number;
  status: 'completed' | 'in-progress' | 'scheduled';
  notes: string;
  materialsUsed: string[];
  warrantyPeriod: string;
  followUpDate?: string;
  contractorId: string;
  createdAt: string;
}

const SERVICE_TYPES = [
  "Plumbing Repair",
  "Electrical Work", 
  "HVAC Service",
  "Roofing",
  "Flooring Installation",
  "Painting",
  "Drywall / Spackling Repair",
  "Kitchen Remodeling",
  "Bathroom Renovation",
  "Deck Building",
  "Fence Installation",
  "Landscaping",
  "Gutter Cleaning",
  "Window Installation",
  "Siding Repair",
  "Concrete Work",
  "Tile Installation",
  "Carpentry",
  "General Handyman",
  "Custom Service"
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

export default function ServiceRecords() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    customerEmail: '',
    serviceType: '',
    serviceDescription: '',
    homeArea: '',
    serviceDate: '',
    duration: '',
    cost: '',
    status: 'completed' as 'completed' | 'in-progress' | 'scheduled',
    notes: '',
    materialsUsed: [] as string[],
    warrantyPeriod: '',
    followUpDate: '',
  });

  const [materialInput, setMaterialInput] = useState('');

  // Load service records
  const { data: serviceRecords = [], isLoading } = useQuery<ServiceRecord[]>({
    queryKey: ['/api/service-records'],
  });

  // Create/update service record mutation
  const saveRecordMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const url = editingRecord ? `/api/service-records/${editingRecord.id}` : '/api/service-records';
      const method = editingRecord ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        body: JSON.stringify({
          ...data,
          cost: parseFloat(data.cost) || 0,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to save service record');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: editingRecord ? "Record Updated" : "Record Created",
        description: `Service record has been successfully ${editingRecord ? 'updated' : 'created'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/service-records'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: "Failed to save service record. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete service record mutation
  const deleteRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/service-records/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete service record');
      }
    },
    onSuccess: () => {
      toast({
        title: "Record Deleted",
        description: "Service record has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/service-records'] });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete service record. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerAddress: '',
      customerPhone: '',
      customerEmail: '',
      serviceType: '',
      serviceDescription: '',
      homeArea: '',
      serviceDate: '',
      duration: '',
      cost: '',
      status: 'completed',
      notes: '',
      materialsUsed: [],
      warrantyPeriod: '',
      followUpDate: '',
    });
    setEditingRecord(null);
    setMaterialInput('');
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addMaterial = () => {
    if (materialInput.trim() && !formData.materialsUsed.includes(materialInput.trim())) {
      setFormData(prev => ({
        ...prev,
        materialsUsed: [...prev.materialsUsed, materialInput.trim()]
      }));
      setMaterialInput('');
    }
  };

  const removeMaterial = (material: string) => {
    setFormData(prev => ({
      ...prev,
      materialsUsed: prev.materialsUsed.filter(m => m !== material)
    }));
  };

  const openEditDialog = (record: ServiceRecord) => {
    setEditingRecord(record);
    setFormData({
      customerName: record.customerName,
      customerAddress: record.customerAddress,
      customerPhone: record.customerPhone,
      customerEmail: record.customerEmail,
      serviceType: record.serviceType,
      serviceDescription: record.serviceDescription,
      homeArea: record.homeArea || '',
      serviceDate: record.serviceDate,
      duration: record.duration,
      cost: record.cost.toString(),
      status: record.status,
      notes: record.notes,
      materialsUsed: record.materialsUsed,
      warrantyPeriod: record.warrantyPeriod,
      followUpDate: record.followUpDate || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveRecordMutation.mutate(formData);
  };

  // Filter records
  const filteredRecords = serviceRecords.filter((record) => {
    const matchesSearch = record.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.serviceDescription.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto py-8 px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#1560a2' }}>
      <Header />
      
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8 p-6 rounded-lg" style={{ background: '#f2f2f2' }}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: '#1560a2' }}>Service Records</h1>
              <p style={{ color: '#1560a2' }}>
                Track services performed for customers and maintain detailed records
              </p>
            </div>
          
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} style={{ backgroundColor: '#1560a2', color: 'white' }} className="hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service Record
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#f2f2f2' }}>
              <DialogHeader>
                <DialogTitle style={{ color: '#1560a2' }}>
                  {editingRecord ? 'Edit Service Record' : 'Add New Service Record'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Customer Information */}
                <Card style={{ backgroundColor: '#1560a2' }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: 'white' }}>
                      <User className="w-5 h-5" style={{ color: 'white' }} />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="customerName" style={{ color: 'white' }}>Customer Name *</Label>
                        <Input
                          id="customerName"
                          value={formData.customerName}
                          onChange={(e) => handleInputChange('customerName', e.target.value)}
                          placeholder="John Smith"
                          required
                          style={{ backgroundColor: '#ffffff' }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="customerPhone" style={{ color: 'white' }}>Phone Number</Label>
                        <Input
                          id="customerPhone"
                          type="tel"
                          value={formData.customerPhone}
                          onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                          placeholder="(555) 123-4567"
                          style={{ backgroundColor: '#ffffff' }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="customerEmail" style={{ color: 'white' }}>Email Address</Label>
                        <Input
                          id="customerEmail"
                          type="email"
                          value={formData.customerEmail}
                          onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                          placeholder="john@example.com"
                          style={{ backgroundColor: '#ffffff' }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="customerAddress" style={{ color: 'white' }}>Service Address *</Label>
                        <Input
                          id="customerAddress"
                          value={formData.customerAddress}
                          onChange={(e) => handleInputChange('customerAddress', e.target.value)}
                          placeholder="123 Main Street, City, State"
                          required
                          style={{ backgroundColor: '#ffffff' }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Service Details */}
                <Card style={{ backgroundColor: '#1560a2' }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: 'white' }}>
                      <FileText className="w-5 h-5" style={{ color: 'white' }} />
                      Service Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="serviceType" style={{ color: 'white' }}>Service Type *</Label>
                        <Select value={formData.serviceType} onValueChange={(value) => handleInputChange('serviceType', value)}>
                          <SelectTrigger style={{ backgroundColor: '#1560a2', color: 'white' }} className="hover:bg-[#afd6f9] hover:text-black transition-colors">
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                          <SelectContent>
                            {SERVICE_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="status" style={{ color: 'white' }}>Status *</Label>
                        <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value as any)}>
                          <SelectTrigger style={{ backgroundColor: '#1560a2', color: 'white' }} className="hover:bg-[#afd6f9] hover:text-black transition-colors">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="serviceDescription" style={{ color: 'white' }}>Service Description *</Label>
                      <Textarea
                        id="serviceDescription"
                        value={formData.serviceDescription}
                        onChange={(e) => handleInputChange('serviceDescription', e.target.value)}
                        placeholder="Detailed description of the service performed..."
                        rows={3}
                        required
                        style={{ backgroundColor: '#ffffff' }}
                      />
                    </div>

                    <div>
                      <Label htmlFor="homeArea" style={{ color: 'white' }}>Home Area</Label>
                      <Select value={formData.homeArea} onValueChange={(value) => handleInputChange('homeArea', value)}>
                        <SelectTrigger style={{ backgroundColor: '#1560a2', color: 'white' }} className="hover:bg-[#afd6f9] hover:text-black transition-colors" data-testid="select-home-area">
                          <SelectValue placeholder="Select home area" />
                        </SelectTrigger>
                        <SelectContent>
                          {HOME_AREAS.map((area) => (
                            <SelectItem key={area.value} value={area.value}>{area.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="serviceDate" style={{ color: 'white' }}>Service Date *</Label>
                        <Input
                          id="serviceDate"
                          type="date"
                          value={formData.serviceDate}
                          onChange={(e) => handleInputChange('serviceDate', e.target.value)}
                          required
                          style={{ backgroundColor: '#ffffff' }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="duration" style={{ color: 'white' }}>Duration</Label>
                        <Input
                          id="duration"
                          value={formData.duration}
                          onChange={(e) => handleInputChange('duration', e.target.value)}
                          placeholder="2 hours"
                          style={{ backgroundColor: '#ffffff' }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cost" style={{ color: 'white' }}>Service Cost</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="cost"
                            type="number"
                            value={formData.cost}
                            onChange={(e) => handleInputChange('cost', e.target.value)}
                            className="pl-10"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            style={{ backgroundColor: '#ffffff' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Materials Used */}
                    <div>
                      <Label style={{ color: 'white' }}>Materials Used</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={materialInput}
                          onChange={(e) => setMaterialInput(e.target.value)}
                          placeholder="Add material..."
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
                          style={{ backgroundColor: '#ffffff' }}
                        />
                        <Button type="button" onClick={addMaterial} size="sm" style={{ backgroundColor: '#1560a2', color: 'white' }} className="hover:opacity-90">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      {formData.materialsUsed.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.materialsUsed.map((material, index) => (
                            <Badge key={index} variant="outline" className="px-2 py-1">
                              {material}
                              <button
                                type="button"
                                onClick={() => removeMaterial(material)}
                                className="ml-2 text-red-500 hover:text-red-700"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="warrantyPeriod" style={{ color: 'white' }}>Warranty Period</Label>
                        <Input
                          id="warrantyPeriod"
                          value={formData.warrantyPeriod}
                          onChange={(e) => handleInputChange('warrantyPeriod', e.target.value)}
                          placeholder="1 year"
                          style={{ backgroundColor: '#ffffff' }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="followUpDate" style={{ color: 'white' }}>Follow-up Date</Label>
                        <Input
                          id="followUpDate"
                          type="date"
                          value={formData.followUpDate}
                          onChange={(e) => handleInputChange('followUpDate', e.target.value)}
                          style={{ backgroundColor: '#ffffff' }}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes" style={{ color: 'white' }}>Additional Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="Any additional notes or observations..."
                        rows={3}
                        style={{ backgroundColor: '#ffffff' }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    style={{ backgroundColor: '#3798ef', color: 'white' }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saveRecordMutation.isPending}
                    style={{ backgroundColor: '#1560a2', color: 'white' }}
                    className="hover:opacity-90"
                  >
                    {saveRecordMutation.isPending ? 'Saving...' : (editingRecord ? 'Update Record' : 'Create Record')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6" style={{ backgroundColor: '#f2f2f2' }}>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by customer name, service type, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    style={{ backgroundColor: '#ffffff' }}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 hover:bg-[#afd6f9] hover:text-black transition-colors" style={{ backgroundColor: '#1560a2', color: 'white' }}>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Records List */}
        <div className="space-y-4">
          {filteredRecords.length === 0 ? (
            <Card style={{ backgroundColor: '#f2f2f2' }}>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Service Records</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No records match your current filters.' 
                    : 'Start by creating your first service record.'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={() => setIsDialogOpen(true)} style={{ backgroundColor: '#1560a2', color: 'white' }} className="hover:opacity-90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Service Record
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredRecords.map((record) => (
              <Card key={record.id}>
                <CardContent className="py-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{record.serviceType}</h3>
                        <Badge className={getStatusColor(record.status)}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-1">{record.serviceDescription}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {record.customerName}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {record.customerAddress}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(record.serviceDate).toLocaleDateString()}
                        </div>
                        {record.duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {record.duration}
                          </div>
                        )}
                        {record.cost > 0 && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            ${record.cost.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(record)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteRecordMutation.mutate(record.id)}
                        disabled={deleteRecordMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {record.materialsUsed.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Materials Used:</p>
                      <div className="flex flex-wrap gap-1">
                        {record.materialsUsed.map((material, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {material}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {record.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                      <p className="text-sm text-gray-600">{record.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}