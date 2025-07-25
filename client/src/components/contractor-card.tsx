import { Star, MapPin, Shield, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Contractor } from "@shared/schema";
import { Link } from "wouter";

interface ContractorCardProps {
  contractor: Contractor;
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-4">
        {contractor.profileImage && (
          <img
            src={contractor.profileImage}
            alt={`${contractor.name} profile photo`}
            className="w-16 h-16 rounded-full object-cover"
          />
        )}
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900">{contractor.name}</h3>
              <p className="text-sm text-gray-600">{contractor.company}</p>
            </div>
            <div className="flex items-center">
              {renderStars(contractor.rating)}
              <span className="ml-1 text-sm text-gray-600">
                {contractor.rating} ({contractor.reviewCount})
              </span>
            </div>
          </div>
          
          <div className="mt-2">
            <div className="flex items-center text-sm text-gray-600 mb-1">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{contractor.distance} miles away</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Shield className="w-4 h-4 mr-1" />
              <span>Licensed & Insured</span>
              <span className="mx-2">•</span>
              <span>{contractor.experience} years experience</span>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-sm text-gray-700 line-clamp-2">
              {contractor.bio}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {contractor.services.map((service, index) => (
              <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700">
                {service}
              </Badge>
            ))}
          </div>

          <div className="mt-4 flex space-x-2">
            <Button 
              className="flex-1 bg-primary text-white hover:bg-blue-700"
              onClick={() => window.open(`tel:${contractor.phone}`, '_self')}
            >
              <Phone className="mr-2 h-4 w-4" />
              Contact Now
            </Button>
            <Link href={`/contractor/${contractor.id}`}>
              <Button variant="outline" className="px-4">
                View Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
