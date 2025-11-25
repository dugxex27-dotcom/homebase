import { Star, MapPin, Shield, Mail, TrendingUp, Calendar, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import ContactContractorButton from "@/components/contact-contractor-button";
import type { Contractor } from "@shared/schema";
import { format } from "date-fns";

interface ContractorCardProps {
  contractor: Contractor & { isBoosted?: boolean };
}

export default function ContractorCard({ contractor }: ContractorCardProps) {
  const renderStars = (rating: string) => {
    const numRating = parseFloat(rating);
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating % 1 !== 0;
    
    return (
      <div className="flex text-yellow-400 text-sm">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-current" />
        ))}
        {hasHalfStar && <Star className="h-4 w-4 fill-current opacity-50" />}
        {[...Array(5 - Math.ceil(numRating))].map((_, i) => (
          <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
        ))}
      </div>
    );
  };

  const formatMemberSince = (date: Date | string | null | undefined) => {
    if (!date) return null;
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, 'MMMM yyyy');
    } catch {
      return null;
    }
  };

  const calculateYearsOnPlatform = (date: Date | string | null | undefined) => {
    if (!date) return null;
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const years = Math.floor((Date.now() - dateObj.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      return years;
    } catch {
      return null;
    }
  };

  const yearsOnPlatform = calculateYearsOnPlatform(contractor.createdAt);

  return (
    <div className="bg-card border rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-primary/20">
      <div className="flex items-start space-x-4">
        <div className="relative">
          {(contractor.businessLogo || contractor.profileImage) ? (
            <img
              src={contractor.businessLogo || contractor.profileImage}
              alt={`${contractor.company} logo`}
              className="w-20 h-20 rounded-lg object-contain border-2 border-primary/10 bg-white p-2"
              data-testid="contractor-logo"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {contractor.company.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
          )}
          {yearsOnPlatform !== null && yearsOnPlatform > 0 && (
            <div 
              className="absolute -top-3 -right-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg px-2.5 py-1.5 shadow-lg border-2 border-white"
              title={`${yearsOnPlatform} year${yearsOnPlatform !== 1 ? 's' : ''} on platform`}
              data-testid="badge-years-on-platform"
            >
              <div className="flex items-center gap-1.5">
                <Medal className="w-4 h-4 text-white" />
                <span className="text-sm font-bold text-white whitespace-nowrap" data-testid="text-years-count">
                  {yearsOnPlatform} {yearsOnPlatform === 1 ? 'Year' : 'Years'}
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground text-lg truncate">{contractor.company}</h3>
                {contractor.isBoosted && (
                  <Badge className="text-xs px-2 py-1 text-white font-medium" style={{ background: 'linear-gradient(135deg, #ffd700, #ff8c00)' }}>
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Boosted
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm mb-2">{contractor.name}</p>
            </div>
            <div className="flex items-center ml-4 flex-shrink-0">
              {renderStars(contractor.rating)}
              <span className="ml-2 text-sm font-medium text-foreground">
                {contractor.rating}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">
                ({contractor.reviewCount})
              </span>
            </div>
          </div>
          
          <div className="space-y-2 mb-3">
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mr-2 text-primary/60" />
              <span>{contractor.distance} miles away • {contractor.location}</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Shield className="w-4 h-4 mr-2 text-primary/60" />
              <span>Licensed & Insured • {contractor.experience} years experience</span>
            </div>
            {contractor.createdAt && formatMemberSince(contractor.createdAt) && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="w-4 h-4 mr-2 text-primary/60" />
                <span>Member since {formatMemberSince(contractor.createdAt)}</span>
              </div>
            )}
          </div>

          <div className="mb-3">
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {contractor.bio}
            </p>
          </div>

          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {contractor.services.slice(0, 3).map((service, index) => (
                <Badge key={index} variant="secondary" className="text-xs bg-primary/10 text-primary hover:bg-primary/20">
                  {service}
                </Badge>
              ))}
              {contractor.services.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{contractor.services.length - 3} more
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <ContactContractorButton 
              contractor={contractor}
              size="sm"
              className="flex-1"
            />
            <Link href={`/contractor/${contractor.id}`} className="flex-shrink-0">
              <Button variant="outline" size="sm" className="px-3 whitespace-nowrap" style={{ backgroundColor: '#2c0f5b', color: '#ffffff', borderColor: '#2c0f5b' }}>
                View Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
