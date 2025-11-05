import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Proposals } from "@/components/proposals";
import { ContractorCodeEntry } from "@/components/ConnectionCodes";

import { useAuth } from "@/hooks/useAuth";
import { Calendar, FileText, User, Star } from "lucide-react";
import type { User as UserType } from "@shared/schema";

export default function ContractorDashboard() {
  const { user } = useAuth();
  const typedUser = user as UserType | undefined;
  
  if (!typedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1560a2' }}>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary mb-2">Loading...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen" style={{ background: '#1560a2' }}>
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 p-6 rounded-lg" style={{ background: '#f2f2f2' }}>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#1560a2' }}>Contractor Dashboard</h1>
          <p className="text-lg" style={{ color: '#000000' }}>Manage your contracting business and grow your client base</p>
        </div>


        {/* Proposals Section */}
        <div className="mb-8">
          <Proposals contractorId={typedUser.id} />
        </div>

        {/* Connection Code Entry */}
        <div className="mb-8">
          <ContractorCodeEntry />
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  className="h-20 flex flex-col items-center justify-center space-y-2 text-white hover:opacity-90" 
                  style={{ backgroundColor: '#1560a2' }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.color = '#afd6f9'; 
                    e.currentTarget.querySelectorAll('svg').forEach(svg => svg.style.color = '#afd6f9'); 
                  }} 
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.color = 'white'; 
                    e.currentTarget.querySelectorAll('svg').forEach(svg => svg.style.color = 'white'); 
                  }}
                >
                  <Calendar className="h-6 w-6" />
                  <span>View Schedule</span>
                </Button>
                <Button 
                  className="h-20 flex flex-col items-center justify-center space-y-2 text-white hover:opacity-90"
                  style={{ backgroundColor: '#1560a2', border: 'none' }}
                  onClick={() => window.location.href = "/service-records"}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#afd6f9'; e.currentTarget.querySelectorAll('svg').forEach(svg => svg.style.color = '#afd6f9'); }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.querySelectorAll('svg').forEach(svg => svg.style.color = 'white'); }}
                >
                  <FileText className="h-6 w-6 text-white" />
                  <span>Service Records</span>
                </Button>
                <Button 
                  className="h-20 flex flex-col items-center justify-center space-y-2 text-white hover:opacity-90"
                  style={{ backgroundColor: '#1560a2', border: 'none' }}
                  onClick={() => window.location.href = "/profile"}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#afd6f9'; e.currentTarget.querySelectorAll('svg').forEach(svg => svg.style.color = '#afd6f9'); }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.querySelectorAll('svg').forEach(svg => svg.style.color = 'white'); }}
                >
                  <User className="h-6 w-6 text-white" />
                  <span>Edit Profile</span>
                </Button>
                <Button 
                  className="h-20 flex flex-col items-center justify-center space-y-2 text-white hover:opacity-90" 
                  style={{ backgroundColor: '#1560a2' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#afd6f9'; e.currentTarget.querySelectorAll('svg').forEach(svg => svg.style.color = '#afd6f9'); }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.querySelectorAll('svg').forEach(svg => svg.style.color = 'white'); }}
                >
                  <Star className="h-6 w-6 text-white" />
                  <span>View Reviews</span>
                </Button>
              </div>
            </CardContent>
          </Card>


        </div>
      </main>
    </div>
  );
}