import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Star, MapPin, Shield, Phone, Mail, Calendar, Clock, Award } from "lucide-react";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Contractor } from "@shared/schema";

export default function ContractorProfile() {
  const [, params] = useRoute("/contractor/:id");
  const contractorId = params?.id;

  const { data: contractor, isLoading, error } = useQuery<Contractor>({
    queryKey: ['/api/contractors', contractorId],
    enabled: !!contractorId,
  });

  const renderStars = (rating: string) => {
    const numRating = parseFloat(rating);
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating % 1 !== 0;
    
    return (
      <div className="flex text-yellow-400">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={i} className="h-5 w-5 fill-current" />
        ))}
        {hasHalfStar && <Star className="h-5 w-5 fill-current opacity-50" />}
        {[...Array(5 - Math.ceil(numRating))].map((_, i) => (
          <Star key={`empty-${i}`} className="h-5 w-5 text-gray-300" />
        ))}
      </div>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contractor Not Found</h2>
            <p className="text-gray-600">Sorry, we couldn't find the contractor you're looking for.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
              <div className="flex items-start space-x-6">
                <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded mb-4 w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contractor Not Found</h2>
            <p className="text-gray-600">Sorry, we couldn't find the contractor you're looking for.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Contractor Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row items-start space-y-6 lg:space-y-0 lg:space-x-8">
              {contractor.profileImage && (
                <img
                  src={contractor.profileImage}
                  alt={`${contractor.name} profile photo`}
                  className="w-32 h-32 rounded-full object-cover mx-auto lg:mx-0"
                />
              )}
              
              <div className="flex-1 text-center lg:text-left">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {contractor.name}
                </h1>
                <h2 className="text-xl text-gray-600 mb-4">
                  {contractor.company}
                </h2>
                
                <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-2 lg:space-y-0 lg:space-x-6 mb-4">
                  <div className="flex items-center">
                    {renderStars(contractor.rating)}
                    <span className="ml-2 text-lg font-medium text-gray-900">
                      {contractor.rating}
                    </span>
                    <span className="ml-1 text-gray-600">
                      ({contractor.reviewCount} reviews)
                    </span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{contractor.location}</span>
                    {contractor.distance && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{contractor.distance} miles away</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-sm text-gray-600 mb-6">
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 mr-1" />
                    <span>Licensed & Insured</span>
                  </div>
                  <div className="flex items-center">
                    <Award className="w-4 h-4 mr-1" />
                    <span>{contractor.experience} years experience</span>
                  </div>
                  {contractor.isAvailableThisWeek && (
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>Available this week</span>
                    </div>
                  )}
                  {contractor.hasEmergencyServices && (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>Emergency services</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Button 
                    size="lg"
                    className="bg-primary text-white hover:bg-blue-700"
                    onClick={() => window.open(`tel:${contractor.phone}`, '_self')}
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Call Now
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    onClick={() => window.open(`mailto:${contractor.email}`, '_self')}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Email
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* About & Services */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  {contractor.bio}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Services Offered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {contractor.services.map((service, index) => (
                    <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700">
                      {service}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* License & Insurance Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>License & Insurance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">License Status</h4>
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-green-600" />
                    <span className="text-sm text-gray-600">
                      {contractor.isLicensed ? 'Licensed' : 'Not Licensed'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    License #: {contractor.licenseNumber}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Insurance</h4>
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-green-600" />
                    <span className="text-sm text-gray-600">
                      {contractor.isInsured ? 'Insured' : 'Not Insured'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Provider: {contractor.insuranceProvider}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-3 text-gray-400" />
                  <span className="text-sm text-gray-700">{contractor.phone}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-3 text-gray-400" />
                  <span className="text-sm text-gray-700">{contractor.email}</span>
                </div>
                <div className="flex items-start">
                  <MapPin className="w-4 h-4 mr-3 text-gray-400 mt-0.5" />
                  <span className="text-sm text-gray-700">{contractor.location}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
