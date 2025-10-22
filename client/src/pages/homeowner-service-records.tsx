import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
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
  Mail,
  CheckCircle,
  AlertCircle,
  Wrench,
  Home
} from "lucide-react";

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

interface ServiceRecord {
  id: string;
  contractorId: string;
  homeownerId: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  serviceType: string;
  serviceDescription: string;
  homeArea?: string;
  serviceDate: string;
  duration: string;
  cost: string;
  status: 'completed' | 'in-progress' | 'scheduled';
  notes: string;
  materialsUsed: string[];
  warrantyPeriod: string;
  followUpDate?: string;
  isVisibleToHomeowner: boolean;
  contractorName?: string;
  contractorCompany?: string;
  contractorPhone?: string;
  contractorEmail?: string;
  createdAt: string;
}

export default function HomeownerServiceRecords() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  const [homeAreaFilter, setHomeAreaFilter] = useState<string>("all");
  
  // Load service records for homeowner
  const { data: serviceRecords = [], isLoading } = useQuery<ServiceRecord[]>({
    queryKey: ['/api/homeowner-service-records'],
  });

  // Filter records
  const filteredRecords = serviceRecords.filter((record) => {
    const matchesSearch = record.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.serviceDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.customerAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (record.contractorName && record.contractorName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesServiceType = serviceTypeFilter === 'all' || record.serviceType === serviceTypeFilter;
    const matchesHomeArea = homeAreaFilter === 'all' || record.homeArea === homeAreaFilter;
    return matchesSearch && matchesStatus && matchesServiceType && matchesHomeArea;
  });

  // Get unique service types for filter
  const serviceTypes = Array.from(new Set(serviceRecords.map(record => record.serviceType)));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in-progress': return <AlertCircle className="w-4 h-4" />;
      case 'scheduled': return <Clock className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Wrench className="mx-auto h-16 w-16 mb-4 opacity-90" />
            <h1 className="text-4xl font-bold mb-4">Your Service Records</h1>
            <p className="text-xl text-amber-100 max-w-2xl mx-auto">
              Track all the professional services performed on your property
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-8 shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-700">
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Search className="w-5 h-5" />
              Filter Service Records
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Search</label>
                <Input
                  placeholder="Search by service type, description, or contractor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-amber-200 focus:border-amber-400 focus:ring-amber-400"
                  data-testid="input-search-service-records"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-amber-200 focus:border-amber-400" data-testid="select-status-filter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Service Type</label>
                <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                  <SelectTrigger className="border-amber-200 focus:border-amber-400" data-testid="select-service-type-filter">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {serviceTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Home Area</label>
                <Select value={homeAreaFilter} onValueChange={setHomeAreaFilter}>
                  <SelectTrigger className="border-amber-200 focus:border-amber-400" data-testid="select-home-area-filter">
                    <SelectValue placeholder="All areas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    {HOME_AREAS.map((area) => (
                      <SelectItem key={area.value} value={area.value}>{area.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-400">
            Showing {filteredRecords.length} of {serviceRecords.length} service records
          </p>
        </div>

        {/* Service Records Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse shadow-lg border-0">
                <CardHeader className="bg-gray-50 dark:bg-gray-800">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <Card className="text-center py-12 shadow-lg border-0">
            <CardContent>
              <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Service Records Found</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || statusFilter !== 'all' || serviceTypeFilter !== 'all' || homeAreaFilter !== 'all'
                  ? "Try adjusting your filters to see more results."
                  : "No service records have been added to your account yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredRecords.map((record) => (
              <Card key={record.id} className="shadow-lg border-0 hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-1">
                        {record.serviceType}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {new Date(record.serviceDate).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(record.status)} flex items-center gap-1`}>
                      {getStatusIcon(record.status)}
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Service Description */}
                    <div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {record.serviceDescription}
                      </p>
                    </div>

                    {/* Contractor Info */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-amber-600" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">Contractor</span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{record.contractorName}</span>
                        </div>
                        {record.contractorCompany && (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3 h-3" />
                            <span>{record.contractorCompany}</span>
                          </div>
                        )}
                        {record.contractorPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            <span>{record.contractorPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Service Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {record.homeArea && (
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-amber-600" />
                          <span className="text-gray-600 dark:text-gray-400">Area:</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {HOME_AREAS.find(a => a.value === record.homeArea)?.label || record.homeArea}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{record.duration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-amber-600" />
                        <span className="text-gray-600 dark:text-gray-400">Cost:</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">${record.cost}</span>
                      </div>
                    </div>

                    {/* Materials Used */}
                    {record.materialsUsed && record.materialsUsed.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Materials Used:</span>
                        <div className="flex flex-wrap gap-1">
                          {record.materialsUsed.map((material, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {material}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Warranty & Follow-up */}
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      {record.warrantyPeriod && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 dark:text-gray-400">Warranty:</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{record.warrantyPeriod}</span>
                        </div>
                      )}
                      {record.followUpDate && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 dark:text-gray-400">Next Service:</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {new Date(record.followUpDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {record.notes && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Notes:</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                          "{record.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}