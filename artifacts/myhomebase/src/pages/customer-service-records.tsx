import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Calendar, 
  MapPin, 
  User, 
  DollarSign,
  Clock,
  Search,
  Building2,
  Phone,
  Mail
} from "lucide-react";

interface ServiceRecord {
  id: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  serviceType: string;
  serviceDescription: string;
  serviceDate: string;
  duration: string;
  cost: number;
  status: 'completed' | 'in-progress' | 'scheduled';
  notes: string;
  materialsUsed: string[];
  warrantyPeriod: string;
  followUpDate?: string;
  contractorId: string;
  contractorName?: string;
  contractorCompany?: string;
  createdAt: string;
}

export default function CustomerServiceRecords() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  
  // Load service records for customer
  const { data: serviceRecords = [], isLoading } = useQuery<ServiceRecord[]>({
    queryKey: ['/api/customer-service-records'],
  });

  // Filter records
  const filteredRecords = serviceRecords.filter((record) => {
    const matchesSearch = record.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.serviceDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.customerAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (record.contractorName && record.contractorName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesServiceType = serviceTypeFilter === 'all' || record.serviceType === serviceTypeFilter;
    return matchesSearch && matchesStatus && matchesServiceType;
  });

  // Get unique service types for filter
  const serviceTypes = Array.from(new Set(serviceRecords.map(record => record.serviceType)));

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
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Service History</h1>
          <p className="text-gray-600">
            View all services performed at your properties by contractors
          </p>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by service type, contractor, or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {serviceTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Records List */}
        <div className="space-y-4">
          {filteredRecords.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Service Records</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'all' || serviceTypeFilter !== 'all'
                    ? 'No records match your current filters.' 
                    : 'No services have been performed at your properties yet.'}
                </p>
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
                      
                      <p className="text-gray-600 mb-3">{record.serviceDescription}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-500">
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
                        {record.contractorName && (
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {record.contractorName}
                          </div>
                        )}
                        {record.contractorCompany && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {record.contractorCompany}
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

                  {record.warrantyPeriod && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700">
                        Warranty: <span className="font-normal text-gray-600">{record.warrantyPeriod}</span>
                      </p>
                    </div>
                  )}
                  
                  {record.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm font-medium text-gray-700 mb-1">Service Notes:</p>
                      <p className="text-sm text-gray-600">{record.notes}</p>
                    </div>
                  )}

                  {record.followUpDate && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm font-medium text-blue-700 mb-1">Follow-up Scheduled:</p>
                      <p className="text-sm text-blue-600">
                        {new Date(record.followUpDate).toLocaleDateString()}
                      </p>
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