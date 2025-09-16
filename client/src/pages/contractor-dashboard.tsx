import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Proposals } from "@/components/proposals";

import { useAuth } from "@/hooks/useAuth";
import { Calendar, Users, Star, TrendingUp, FileText, User } from "lucide-react";
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
          <p className="text-lg" style={{ color: '#9ed0ef' }}>Manage your contracting business and grow your client base</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
              <Calendar className="h-4 w-4" style={{ color: '#1560a2' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">+2 from last week</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <Users className="h-4 w-4" style={{ color: '#1560a2' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">+1 new this month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4" style={{ color: '#1560a2' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.9</div>
              <p className="text-xs text-muted-foreground">Based on 127 reviews</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <TrendingUp className="h-4 w-4" style={{ color: '#1560a2' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$8,200</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Appointments */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold">HVAC System Inspection</h4>
                  <p className="text-sm text-muted-foreground">123 Oak Street, Seattle</p>
                  <p className="text-sm text-muted-foreground">Today, 2:00 PM</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">Scheduled</Badge>
                  <Button size="sm" style={{ backgroundColor: '#1560a2', color: 'white' }}>View Details</Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold">Kitchen Cabinet Installation</h4>
                  <p className="text-sm text-muted-foreground">456 Pine Avenue, Seattle</p>
                  <p className="text-sm text-muted-foreground">Tomorrow, 9:00 AM</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">Confirmed</Badge>
                  <Button size="sm" style={{ backgroundColor: '#1560a2', color: 'white' }}>View Details</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proposals Section */}
        <div className="mb-8">
          <Proposals contractorId={typedUser.id} />
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