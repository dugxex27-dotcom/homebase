import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ContactContractorButton from "@/components/contact-contractor-button";
import { ContractorReviews } from "@/components/contractor-reviews";
import { 
  User, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  Shield, 
  Wrench, 
  Globe,
  Star
} from "lucide-react";
import type { Contractor } from "@shared/schema";

export default function ContractorDetail() {
  const [match, params] = useRoute("/contractor/:id");
  const contractorId = params?.id;

  const { data: contractor, isLoading, error } = useQuery<Contractor>({
    queryKey: ['/api/contractors', contractorId],
    enabled: !!contractorId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">Loading contractor details...</div>
        </main>
      </div>
    );
  }

  if (error || !contractor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Contractor Not Found</h2>
                <p className="text-muted-foreground">The contractor you're looking for doesn't exist or has been removed.</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      {/* Hero Section */}
      <section className="py-12" style={{ backgroundColor: '#3c258e' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-start space-x-6">
              <div className="relative">
                {contractor.profileImage ? (
                  <img
                    src={contractor.profileImage}
                    alt={`${contractor.name} profile photo`}
                    className="w-32 h-32 rounded-2xl object-cover border-4 border-blue-100 dark:border-blue-900/30"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="text-2xl font-bold text-white">
                      {contractor.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2">
                  <Shield className="h-4 w-4 text-white" />
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{contractor.name}</h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">{contractor.company}</p>
                    <div className="flex items-center space-x-6 mb-4">
                      <div className="flex items-center">
                        {renderStars(contractor.rating)}
                        <span className="ml-2 font-semibold text-lg">{contractor.rating}</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          ({contractor.reviewCount} review{contractor.reviewCount !== 1 ? 's' : ''})
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <ContactContractorButton contractor={contractor} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <MapPin className="h-4 w-4 mr-2 text-blue-500" />
                    <span>{contractor.location}</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <Building className="h-4 w-4 mr-2 text-green-500" />
                    <span>{contractor.experience}+ years experience</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <Shield className="h-4 w-4 mr-2 text-purple-500" />
                    <span>Licensed & Insured</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <Wrench className="h-4 w-4 mr-2 text-orange-500" />
                    <span>{contractor.services.length} specialties</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Services */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <Wrench className="h-6 w-6 mr-3 text-amber-600 dark:text-amber-400" />
                Services Offered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {contractor.services.map((service, index) => (
                  <div key={index} className="border border-amber-200 dark:border-amber-800/30 rounded-xl px-4 py-3 text-[#ffffff]" style={{ backgroundColor: '#3c258e' }}>
                    <span className="font-medium dark:text-amber-200 text-[#ffffff]">{service}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <User className="h-6 w-6 mr-3 text-blue-600 dark:text-blue-400" />
                About {contractor.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base">
                {contractor.bio}
              </p>
            </CardContent>
          </Card>

          {/* Professional Details */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <Shield className="h-6 w-6 mr-3 text-green-600 dark:text-green-400" />
                Professional Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <MapPin className="w-5 h-5 mr-3 text-blue-500" />
                  <div>
                    <div className="font-medium">Location</div>
                    <div className="text-sm">{contractor.location}</div>
                  </div>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Building className="w-5 h-5 mr-3 text-green-500" />
                  <div>
                    <div className="font-medium">Experience</div>
                    <div className="text-sm">{contractor.experience}+ years</div>
                  </div>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Shield className="w-5 h-5 mr-3 text-purple-500" />
                  <div>
                    <div className="font-medium">Licensing</div>
                    <div className="text-sm">Licensed</div>
                  </div>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Wrench className="w-5 h-5 mr-3 text-orange-500" />
                  <div>
                    <div className="font-medium">Services</div>
                    <div className="text-sm">{contractor.services.length} specialties</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews Section */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
            <CardContent className="pt-6">
              <ContractorReviews 
                contractorId={contractor.id} 
                contractorName={contractor.name}
              />
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}