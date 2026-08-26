import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Filter, Users } from "lucide-react";
import { format } from "date-fns";

interface DemoLead {
  id: string;
  name: string;
  email: string;
  zipcode: string;
  role: string;
  ipAddress: string | null;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  homeowner: "Homeowner",
  contractor: "Contractor",
  agent: "Agent",
};

const roleBadgeVariants: Record<string, "default" | "secondary" | "outline"> = {
  homeowner: "default",
  contractor: "secondary",
  agent: "outline",
};

export default function AdminDemoLeadsPage() {
  const [, navigate] = useLocation();

  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [emailSearch, setEmailSearch] = useState("");

  const { data: leads = [], isLoading } = useQuery<DemoLead[]>({
    queryKey: ["/api/admin/demo-leads", roleFilter, emailSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (emailSearch.trim()) params.set("email", emailSearch.trim());

      const query = params.toString();
      const url = `/api/admin/demo-leads${query ? `?${query}` : ""}`;

      const res = await apiRequest(url, "GET");
      return res.json();
    },
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7" style={{ color: "var(--purple)" }} />
            Demo Leads
          </h1>
          <p className="text-muted-foreground mt-2">
            Marketing leads captured from the pre-demo-login gate
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/admin")}
          data-testid="button-back-to-admin"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger data-testid="select-filter-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="demo-lead-email-search">Email</Label>
              <Input
                id="demo-lead-email-search"
                placeholder="Search by email..."
                value={emailSearch}
                onChange={(e) => setEmailSearch(e.target.value)}
                data-testid="input-filter-email"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-demo-leads">
        <CardHeader>
          <CardTitle>Captured Leads</CardTitle>
          <CardDescription>Sorted by most recent submission first</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground" data-testid="text-no-demo-leads">
              No demo leads found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Zip Code</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead, index) => (
                    <TableRow key={lead.id} data-testid={`row-demo-lead-${index}`}>
                      <TableCell data-testid={`text-demo-lead-name-${index}`}>{lead.name}</TableCell>
                      <TableCell data-testid={`text-demo-lead-email-${index}`}>{lead.email}</TableCell>
                      <TableCell data-testid={`text-demo-lead-zip-${index}`}>{lead.zipcode}</TableCell>
                      <TableCell data-testid={`text-demo-lead-role-${index}`}>
                        <Badge variant={roleBadgeVariants[lead.role] || "outline"}>
                          {roleLabels[lead.role] || lead.role}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-demo-lead-time-${index}`}>
                        {lead.createdAt ? format(new Date(lead.createdAt), "MMM d, yyyy h:mm a") : "-"}
                      </TableCell>
                      <TableCell data-testid={`text-demo-lead-ip-${index}`}>
                        {lead.ipAddress || <span className="text-gray-400">-</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
