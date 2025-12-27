import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Users, Home, Briefcase, Plus, Ban, TrendingUp, DollarSign, UserMinus, MessageSquare, ArrowRight, Flag, UserCheck, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface AdminStats {
  totalUsers: number;
  homeownerCount: number;
  contractorCount: number;
  agentCount: number;
  topSearches: Array<{ searchTerm: string; count: number }>;
  signupsByZip: Array<{ zipCode: string; count: number }>;
}

interface SearchAnalytic {
  id: string;
  userId: string | null;
  searchTerm: string;
  serviceType: string | null;
  userZipCode: string | null;
  searchContext: string | null;
  createdAt: Date | null;
}

interface InviteCode {
  id: string;
  code: string;
  createdBy: string | null;
  usedBy: string[];
  isActive: boolean;
  maxUses: number;
  currentUses: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface AnalyticsData {
  activeUsers: Array<{ date: string; count: number }>;
  referrals: Array<{ date: string; count: number }>;
  contractors: Array<{ date: string; count: number }>;
  revenue: {
    mrr: number;
    totalRevenue: number;
    revenueByPlan: Array<{ plan: string; revenue: number }>;
    revenueSeries: Array<{ date: string; amount: number }>;
  };
  churn: {
    churnRate: number;
    churnedUsers: number;
    totalActiveUsers: number;
    churnSeries: Array<{ date: string; rate: number }>;
  };
  features: Array<{ feature: string; count: number }>;
}

interface AgentWithUser {
  id: string;
  agentId: string;
  verificationStatus: string;
  createdAt: string | null;
  verifiedAt: string | null;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    createdAt: string | null;
  } | null;
}

const CHART_COLORS = ['#9333ea', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff', '#f3e8ff'];

export default function AdminDashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [timeRange, setTimeRange] = useState<7 | 30 | 90 | 365>(30);

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch search analytics (last 50)
  const { data: recentSearches, isLoading: searchesLoading } = useQuery<SearchAnalytic[]>({
    queryKey: ["/api/admin/search-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/search-analytics?limit=50", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch search analytics");
      return res.json();
    },
  });

  // Fetch invite codes
  const { data: inviteCodes, isLoading: codesLoading } = useQuery<InviteCode[]>({
    queryKey: ["/api/admin/invite-codes"],
  });

  // Fetch advanced analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics", timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics?days=${timeRange}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  // Fetch agents for verification
  const { data: agents, isLoading: agentsLoading } = useQuery<AgentWithUser[]>({
    queryKey: ["/api/admin/agents"],
  });

  // Verify agent mutation
  const verifyAgentMutation = useMutation({
    mutationFn: async ({ agentId, action, notes }: { agentId: string; action: 'approve' | 'reject' | 'request_resubmit'; notes?: string }) => {
      return apiRequest(`/api/admin/agents/${agentId}/verify`, "PATCH", { action, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents"] });
      toast({
        title: "Success",
        description: "Agent verification status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update agent verification",
        variant: "destructive",
      });
    },
  });

  // Create invite code mutation
  const createCodeMutation = useMutation({
    mutationFn: async (data: { code: string; maxUses: number }) => {
      return apiRequest("/api/admin/invite-codes", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invite-codes"] });
      setIsDialogOpen(false);
      setNewCode("");
      setMaxUses("1");
      toast({
        title: "Success",
        description: "Invite code created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invite code",
        variant: "destructive",
      });
    },
  });

  // Deactivate invite code mutation
  const deactivateCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiRequest(`/api/admin/invite-codes/${code}/deactivate`, "PATCH", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invite-codes"] });
      toast({
        title: "Success",
        description: "Invite code deactivated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate invite code",
        variant: "destructive",
      });
    },
  });

  const handleCreateCode = () => {
    if (!newCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a code",
        variant: "destructive",
      });
      return;
    }

    const maxUsesNum = parseInt(maxUses);
    if (isNaN(maxUsesNum) || maxUsesNum < 1) {
      toast({
        title: "Error",
        description: "Max uses must be a positive number",
        variant: "destructive",
      });
      return;
    }

    createCodeMutation.mutate({ code: newCode.trim(), maxUses: maxUsesNum });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-admin-title">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage users, analytics, and invite codes</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card data-testid="card-total-users">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-total-users">{stats?.totalUsers || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-homeowner-count">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Homeowners</CardTitle>
              <Home className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-homeowner-count">{stats?.homeownerCount || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-contractor-count">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Contractors</CardTitle>
              <Briefcase className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-contractor-count">{stats?.contractorCount || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-agent-count">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Real Estate Agents</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-agent-count">{stats?.agentCount || 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Support Tickets Management */}
        <Card className="mb-8" data-testid="card-support-tickets">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                  Support Tickets Management
                </CardTitle>
                <CardDescription className="mt-2">
                  View and respond to user support tickets
                </CardDescription>
              </div>
              <Button
                onClick={() => navigate('/admin/support')}
                data-testid="button-manage-support-tickets"
              >
                Manage Tickets
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Access the full support ticket dashboard to filter, assign, and respond to user inquiries across all categories and priorities.
            </p>
          </CardContent>
        </Card>

        {/* Flagged Reviews Management */}
        <Card className="mb-8" data-testid="card-flagged-reviews">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-orange-600" />
                  Flagged Reviews Management
                </CardTitle>
                <CardDescription className="mt-2">
                  Investigate and manage reported reviews for fraud prevention
                </CardDescription>
              </div>
              <Button
                onClick={() => navigate('/admin/flagged-reviews')}
                data-testid="button-manage-flagged-reviews"
              >
                Manage Flagged Reviews
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Review reported suspicious reviews, investigate IP/device duplicates, and take action on fraudulent content.
            </p>
          </CardContent>
        </Card>

        {/* Agent Verification Management */}
        <Card className="mb-8" data-testid="card-agent-verification">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              Real Estate Agent Verification
            </CardTitle>
            <CardDescription>
              Verify real estate agents to enable their affiliate commissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {agentsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : agents && agents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Signed Up</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.id} data-testid={`row-agent-${agent.id}`}>
                      <TableCell className="font-medium">
                        {agent.user ? `${agent.user.firstName || ''} ${agent.user.lastName || ''}`.trim() || 'Unknown' : 'Unknown'}
                      </TableCell>
                      <TableCell>{agent.user?.email || 'N/A'}</TableCell>
                      <TableCell>
                        {agent.user?.createdAt ? format(new Date(agent.user.createdAt), 'MMM d, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            agent.verificationStatus === 'approved' ? 'default' : 
                            agent.verificationStatus === 'pending_review' ? 'secondary' :
                            agent.verificationStatus === 'rejected' ? 'destructive' : 'outline'
                          }
                          className={agent.verificationStatus === 'approved' ? 'bg-green-600' : ''}
                        >
                          {agent.verificationStatus === 'not_submitted' ? (
                            <><Clock className="h-3 w-3 mr-1" />Not Submitted</>
                          ) : agent.verificationStatus === 'pending_review' ? (
                            <><Clock className="h-3 w-3 mr-1" />Pending</>
                          ) : agent.verificationStatus === 'approved' ? (
                            <><CheckCircle className="h-3 w-3 mr-1" />Verified</>
                          ) : agent.verificationStatus === 'rejected' ? (
                            <><XCircle className="h-3 w-3 mr-1" />Rejected</>
                          ) : (
                            agent.verificationStatus
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {agent.verificationStatus !== 'approved' && (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => verifyAgentMutation.mutate({ agentId: agent.agentId, action: 'approve' })}
                            disabled={verifyAgentMutation.isPending}
                            data-testid={`button-approve-agent-${agent.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}
                        {agent.verificationStatus === 'approved' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => verifyAgentMutation.mutate({ agentId: agent.agentId, action: 'reject', notes: 'Verification revoked by admin' })}
                            disabled={verifyAgentMutation.isPending}
                            data-testid={`button-revoke-agent-${agent.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No real estate agents have signed up yet.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Searches */}
          <Card data-testid="card-top-searches">
            <CardHeader>
              <CardTitle>Top Search Terms</CardTitle>
              <CardDescription>Most searched terms by users</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Search Term</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.topSearches && stats.topSearches.length > 0 ? (
                      stats.topSearches.slice(0, 10).map((search, index) => (
                        <TableRow key={index} data-testid={`row-search-${index}`}>
                          <TableCell data-testid={`text-search-term-${index}`}>{search.searchTerm}</TableCell>
                          <TableCell className="text-right" data-testid={`text-search-count-${index}`}>{search.count}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-gray-500">
                          No search data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Signups by Zip Code */}
          <Card data-testid="card-signups-by-zip">
            <CardHeader>
              <CardTitle>Signups by Zip Code</CardTitle>
              <CardDescription>Top locations by user signups</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zip Code</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.signupsByZip && stats.signupsByZip.length > 0 ? (
                      stats.signupsByZip.slice(0, 10).map((signup, index) => (
                        <TableRow key={index} data-testid={`row-zip-${index}`}>
                          <TableCell data-testid={`text-zip-code-${index}`}>{signup.zipCode}</TableCell>
                          <TableCell className="text-right" data-testid={`text-zip-count-${index}`}>{signup.count}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-gray-500">
                          No signup data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Time Range Selector */}
        <Card className="mb-8" data-testid="card-time-range">
          <CardHeader>
            <CardTitle>Analytics Time Range</CardTitle>
            <CardDescription>Select time range for analytics charts</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={timeRange.toString()} onValueChange={(v) => setTimeRange(parseInt(v) as 7 | 30 | 90 | 365)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="7" data-testid="button-filter-7days">7 Days</TabsTrigger>
                <TabsTrigger value="30" data-testid="button-filter-30days">30 Days</TabsTrigger>
                <TabsTrigger value="90" data-testid="button-filter-90days">90 Days</TabsTrigger>
                <TabsTrigger value="365" data-testid="button-filter-365days">365 Days</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Analytics Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Active Users Over Time */}
          <Card data-testid="card-active-users-chart">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Users Over Time</CardTitle>
                  <CardDescription>Daily active user signups</CardDescription>
                </div>
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={analytics?.activeUsers || []} data-testid="chart-active-users">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#9333ea" strokeWidth={2} name="Active Users" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Referral Growth */}
          <Card data-testid="card-referral-growth-chart">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Referral Growth</CardTitle>
                  <CardDescription>Cumulative referrals over time</CardDescription>
                </div>
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={analytics?.referrals || []} data-testid="chart-referral-growth">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={2} name="Total Referrals" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Contractor Signups */}
          <Card data-testid="card-contractor-signups-chart">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contractor Signups</CardTitle>
                  <CardDescription>New contractors by day</CardDescription>
                </div>
                <Briefcase className="h-5 w-5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics?.contractors || []} data-testid="chart-contractor-signups">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#dc2626" name="New Contractors" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Revenue Metrics */}
          <Card data-testid="card-revenue-chart">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Subscription Revenue</CardTitle>
                  <CardDescription>MRR: ${analytics?.revenue?.mrr?.toFixed(2) || '0.00'}</CardDescription>
                </div>
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={analytics?.revenue?.revenueSeries || []} data-testid="chart-revenue">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="amount" stroke="#16a34a" fill="#22c55e" fillOpacity={0.6} name="Revenue ($)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Churn Rate */}
          <Card data-testid="card-churn-chart">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Churn Rate</CardTitle>
                  <CardDescription>Overall churn: {analytics?.churn?.churnRate?.toFixed(2) || '0.00'}%</CardDescription>
                </div>
                <UserMinus className="h-5 w-5 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={analytics?.churn?.churnSeries || []} data-testid="chart-churn-rate">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="rate" stroke="#ea580c" strokeWidth={2} name="Churn Rate (%)" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Feature Usage */}
          <Card data-testid="card-feature-usage-chart">
            <CardHeader>
              <CardTitle>Feature Usage</CardTitle>
              <CardDescription>Most used features by count</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart data-testid="chart-feature-usage">
                    <Pie
                      data={analytics?.features || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ feature, percent }: any) => `${feature}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {(analytics?.features || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Searches Timeline */}
        <Card className="mb-8" data-testid="card-recent-searches">
          <CardHeader>
            <CardTitle>Recent Searches</CardTitle>
            <CardDescription>Last 50 searches from users</CardDescription>
          </CardHeader>
          <CardContent>
            {searchesLoading ? (
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Search Term</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead>Zip Code</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSearches && recentSearches.length > 0 ? (
                      recentSearches.map((search, index) => (
                        <TableRow key={search.id} data-testid={`row-recent-search-${index}`}>
                          <TableCell data-testid={`text-recent-term-${index}`}>{search.searchTerm}</TableCell>
                          <TableCell data-testid={`text-recent-service-${index}`}>
                            {search.serviceType || <span className="text-gray-400">-</span>}
                          </TableCell>
                          <TableCell data-testid={`text-recent-zip-${index}`}>
                            {search.userZipCode || <span className="text-gray-400">-</span>}
                          </TableCell>
                          <TableCell data-testid={`text-recent-time-${index}`}>
                            {search.createdAt ? format(new Date(search.createdAt), "MMM d, yyyy h:mm a") : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500">
                          No recent searches
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invite Code Management */}
        <Card data-testid="card-invite-codes">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Invite Codes</CardTitle>
                <CardDescription>Manage invite codes for user registration</CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-code">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Code
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Invite Code</DialogTitle>
                    <DialogDescription>
                      Generate a new invite code for user registration
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="code">Code</Label>
                      <Input
                        id="code"
                        data-testid="input-code"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value)}
                        placeholder="e.g., WELCOME2025"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="maxUses">Max Uses</Label>
                      <Input
                        id="maxUses"
                        data-testid="input-max-uses"
                        type="number"
                        min="1"
                        value={maxUses}
                        onChange={(e) => setMaxUses(e.target.value)}
                        placeholder="1"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel-code"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateCode}
                      disabled={createCodeMutation.isPending}
                      data-testid="button-submit-code"
                    >
                      {createCodeMutation.isPending ? "Creating..." : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {codesLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Max Uses</TableHead>
                      <TableHead>Current Uses</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inviteCodes && inviteCodes.length > 0 ? (
                      inviteCodes.map((code, index) => (
                        <TableRow key={code.id} data-testid={`row-code-${index}`}>
                          <TableCell className="font-mono" data-testid={`text-code-${index}`}>{code.code}</TableCell>
                          <TableCell data-testid={`text-max-uses-${index}`}>{code.maxUses}</TableCell>
                          <TableCell data-testid={`text-current-uses-${index}`}>{code.currentUses}</TableCell>
                          <TableCell data-testid={`badge-status-${index}`}>
                            <Badge variant={code.isActive ? "default" : "secondary"}>
                              {code.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-created-${index}`}>
                            {code.createdAt ? format(new Date(code.createdAt), "MMM d, yyyy") : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {code.isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deactivateCodeMutation.mutate(code.code)}
                                disabled={deactivateCodeMutation.isPending}
                                data-testid={`button-deactivate-${index}`}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Deactivate
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500">
                          No invite codes found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
