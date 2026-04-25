import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
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
  Star,
  ExternalLink
} from "lucide-react";
import { SiFacebook, SiInstagram, SiLinkedin, SiGoogle } from "react-icons/si";
import type { Contractor } from "@shared/schema";
import { trackProfileView, trackSocialClick } from "@/lib/analytics";

// Utility to ensure URL has proper protocol
function ensureHttps(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const trimmedUrl = url.trim();
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    console.log('[ensureHttps] URL already has protocol:', trimmedUrl);
    return trimmedUrl;
  }
  const result = `https://${trimmedUrl}`;
  console.log('[ensureHttps] Added https:// to URL:', result);
  return result;
}

export default function ContractorDetail() {
  const [match, params] = useRoute("/contractor/:id");
  const contractorId = params?.id;

  console.log('[ContractorDetail] Route params:', params, 'contractorId:', contractorId);

  const { data: contractor, isLoading, error } = useQuery<Contractor>({
    queryKey: ['/api/contractors', contractorId],
    enabled: !!contractorId,
  });

  console.log('[ContractorDetail] Query state:', { contractor, isLoading, error });

  // Track profile view when contractor data loads
  useEffect(() => {
    if (contractor?.id) {
      trackProfileView(contractor.id);
    }
  }, [contractor?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">Loading contractor details...</div>
        </main>
      </div>
    );
  }

  if (error || !contractor) {
    return (
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen dark:bg-gray-900 bg-[#3c258e]">
      {/* Hero Section */}
      <section className="py-12" style={{ backgroundColor: '#3c258e' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-start space-x-6">
              <div className="relative">
                {contractor.businessLogo || contractor.profileImage ? (
                  <img
                    src={(contractor.businessLogo || contractor.profileImage) || ''}
                    alt={`${contractor.company} logo`}
                    className="w-32 h-32 rounded-2xl object-cover border-4 border-blue-100 dark:border-blue-900/30"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="text-2xl font-bold text-white">
                      {contractor.company.split(' ').map(n => n[0]).join('')}
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
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{contractor.company}</h1>
                      {contractor.isVerified && (
                        <div className="relative group">
                          <Badge className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm font-semibold flex items-center gap-1" data-testid="badge-verified">
                            <Shield className="h-4 w-4" />
                            Verified
                          </Badge>
                          <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                            <p className="font-semibold mb-1">Verified Contractor</p>
                            <p>This contractor has been verified with:</p>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              <li>Active contractor license</li>
                              <li>Valid insurance coverage</li>
                              <li>Complete profile information</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">Contact: {contractor.name}</p>
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
                    <span>Licensed & Insured{contractor.insuranceCoverageAmount ? ` (${contractor.insuranceCoverageAmount})` : ''}</span>
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
                <Building className="h-6 w-6 mr-3 text-blue-600 dark:text-blue-400" />
                About {contractor.company}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base">
                {contractor.bio}
              </p>
            </CardContent>
          </Card>

          {/* Project Photos */}
          {contractor.projectPhotos && contractor.projectPhotos.length > 0 && (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <Building className="h-6 w-6 mr-3 text-purple-600 dark:text-purple-400" />
                  Project Portfolio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {contractor.projectPhotos.map((photo, index) => (
                    <div key={index} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                      <img 
                        src={photo} 
                        alt={`Project ${index + 1}`} 
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
                        data-testid={`project-photo-${index}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                <div className="flex items-start text-gray-600 dark:text-gray-300">
                  <User className="w-5 h-5 mr-3 text-blue-500 mt-1" />
                  <div>
                    <div className="font-medium">Contact Person</div>
                    <div className="text-sm">{contractor.name}</div>
                  </div>
                </div>
                <div className="flex items-start text-gray-600 dark:text-gray-300">
                  <Phone className="w-5 h-5 mr-3 text-green-500 mt-1" />
                  <div>
                    <div className="font-medium">Phone</div>
                    <div className="text-sm">{contractor.phone}</div>
                  </div>
                </div>
                <div className="flex items-start text-gray-600 dark:text-gray-300">
                  <Mail className="w-5 h-5 mr-3 text-purple-500 mt-1" />
                  <div>
                    <div className="font-medium">Email</div>
                    <div className="text-sm">{contractor.email}</div>
                  </div>
                </div>
                <div className="flex items-start text-gray-600 dark:text-gray-300">
                  <MapPin className="w-5 h-5 mr-3 text-blue-500 mt-1" />
                  <div>
                    <div className="font-medium">Location</div>
                    <div className="text-sm">{contractor.location}</div>
                  </div>
                </div>
                <div className="flex items-start text-gray-600 dark:text-gray-300">
                  <Building className="w-5 h-5 mr-3 text-green-500 mt-1" />
                  <div>
                    <div className="font-medium">Experience</div>
                    <div className="text-sm">{contractor.experience}+ years</div>
                  </div>
                </div>
                <div className="flex items-start text-gray-600 dark:text-gray-300">
                  <Shield className="w-5 h-5 mr-3 text-purple-500 mt-1" />
                  <div>
                    <div className="font-medium">License</div>
                    <div className="text-sm">{contractor.licenseNumber}</div>
                    <div className="text-xs text-gray-500">{contractor.licenseMunicipality}</div>
                  </div>
                </div>
                <div className="flex items-start text-gray-600 dark:text-gray-300">
                  <Wrench className="w-5 h-5 mr-3 text-orange-500 mt-1" />
                  <div>
                    <div className="font-medium">Service Radius</div>
                    <div className="text-sm">{contractor.serviceRadius} miles</div>
                  </div>
                </div>
                <div className="flex items-start text-gray-600 dark:text-gray-300">
                  <Shield className="w-5 h-5 mr-3 text-red-500 mt-1" />
                  <div>
                    <div className="font-medium">Emergency Services</div>
                    <div className="text-sm">{contractor.hasEmergencyServices ? 'Available 24/7' : 'Not Available'}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Website & Social Media */}
          {(contractor.website || contractor.facebook || contractor.instagram || contractor.linkedin || contractor.googleBusinessUrl) && (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <Globe className="h-6 w-6 mr-3 text-blue-600 dark:text-blue-400" />
                  Connect Online
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contractor.website && (
                    <a 
                      href={ensureHttps(contractor.website)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackSocialClick(contractor.id, 'website')}
                      className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                      data-testid="link-website"
                    >
                      <Globe className="w-6 h-6 mr-3 text-blue-600" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">Website</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{contractor.website}</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                    </a>
                  )}
                  {contractor.facebook && (
                    <a 
                      href={ensureHttps(contractor.facebook)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackSocialClick(contractor.id, 'facebook')}
                      className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                      data-testid="link-facebook"
                    >
                      <SiFacebook className="w-6 h-6 mr-3 text-[#1877f2]" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">Facebook</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Follow us on Facebook</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#1877f2]" />
                    </a>
                  )}
                  {contractor.instagram && (
                    <a 
                      href={ensureHttps(contractor.instagram)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackSocialClick(contractor.id, 'instagram')}
                      className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                      data-testid="link-instagram"
                    >
                      <SiInstagram className="w-6 h-6 mr-3 text-[#e4405f]" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">Instagram</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">See our work on Instagram</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#e4405f]" />
                    </a>
                  )}
                  {contractor.linkedin && (
                    <a 
                      href={ensureHttps(contractor.linkedin)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackSocialClick(contractor.id, 'linkedin')}
                      className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                      data-testid="link-linkedin"
                    >
                      <SiLinkedin className="w-6 h-6 mr-3 text-[#0a66c2]" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">LinkedIn</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Connect on LinkedIn</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#0a66c2]" />
                    </a>
                  )}
                  {contractor.googleBusinessUrl && (
                    <a 
                      href={ensureHttps(contractor.googleBusinessUrl)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => trackSocialClick(contractor.id, 'google_business')}
                      className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                      data-testid="link-google-business"
                    >
                      <SiGoogle className="w-6 h-6 mr-3 text-[#4285f4]" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">Google Business</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">View our Google listing</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#4285f4]" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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