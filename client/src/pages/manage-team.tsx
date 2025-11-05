import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Users, Copy, UserPlus, Trash2, Shield, CheckCircle, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { User, Company } from "@shared/schema";

export default function ManageTeam() {
  const { user } = useAuth();
  const typedUser = user as User | undefined;
  const { toast } = useToast();
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [userToRemove, setUserToRemove] = useState<User | null>(null);

  const isOwner = typedUser?.companyRole === 'owner';

  // Fetch company details
  const { data: company, isLoading: companyLoading } = useQuery<Company>({
    queryKey: ['/api/companies', typedUser?.companyId],
    enabled: !!typedUser?.companyId,
  });

  // Fetch team members
  const { data: teamMembers, isLoading: membersLoading } = useQuery<User[]>({
    queryKey: ['/api/companies', typedUser?.companyId, 'employees'],
    enabled: !!typedUser?.companyId,
  });

  // Fetch active invite codes (owner only)
  const { data: inviteCodes } = useQuery<any[]>({
    queryKey: ['/api/companies', typedUser?.companyId, 'invite-codes'],
    enabled: !!typedUser?.companyId && isOwner,
  });

  // Generate invite code mutation
  const generateInviteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/companies/${typedUser?.companyId}/invite-codes`);
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedCode(data.code);
      queryClient.invalidateQueries({ queryKey: ['/api/companies', typedUser?.companyId, 'invite-codes'] });
      toast({
        title: "Invite code generated",
        description: "Share this code with your new team member",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate invite code",
        variant: "destructive",
      });
    },
  });

  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async (data: Partial<Company>) => {
      const res = await apiRequest('PUT', `/api/companies/${typedUser?.companyId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', typedUser?.companyId] });
      toast({
        title: "Company updated",
        description: "Your company information has been saved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update company",
        variant: "destructive",
      });
    },
  });

  // Toggle employee permission mutation
  const togglePermissionMutation = useMutation({
    mutationFn: async ({ userId, canRespond }: { userId: string; canRespond: boolean }) => {
      const res = await apiRequest('PUT', `/api/companies/${typedUser?.companyId}/employees/${userId}/permissions`, {
        canRespondToProposals: canRespond,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', typedUser?.companyId, 'employees'] });
      toast({
        title: "Permissions updated",
        description: "Employee permissions have been changed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update permissions",
        variant: "destructive",
      });
    },
  });

  // Remove employee mutation
  const removeEmployeeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('DELETE', `/api/companies/${typedUser?.companyId}/employees/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', typedUser?.companyId, 'employees'] });
      toast({
        title: "Employee removed",
        description: "The team member has been removed from your company",
      });
      setUserToRemove(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove employee",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard",
    });
  };

  if (companyLoading || membersLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#1560a2' }}>
        <Header />
        <div className="flex items-center justify-center h-96">
          <div style={{ color: '#afd6f9' }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-[#1560a2]">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>No Company Found</CardTitle>
              <CardDescription>
                You don't seem to be associated with a company yet.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1560a2' }}>
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'white' }} data-testid="text-manage-team-title">
            Manage Team
          </h1>
          <p style={{ color: '#afd6f9' }}>
            {isOwner ? "Manage your company profile and team members" : "View your company and team"}
          </p>
        </div>

        {/* Company Information */}
        <Card className="mb-6" style={{ backgroundColor: '#f2f2f2' }}>
          <CardHeader>
            <CardTitle style={{ color: '#1560a2' }}>Company Information</CardTitle>
            <CardDescription style={{ color: '#000000' }}>
              {isOwner ? "Update your company details" : "Company details"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="company-name" style={{ color: '#1560a2' }}>Company Name</Label>
              <Input
                id="company-name"
                defaultValue={company.name}
                disabled={!isOwner}
                onBlur={(e) => {
                  if (isOwner && e.target.value !== company.name) {
                    updateCompanyMutation.mutate({ name: e.target.value });
                  }
                }}
                data-testid="input-company-name"
                style={{ backgroundColor: 'white', color: '#000000' }}
              />
            </div>
            <div>
              <Label htmlFor="company-bio" style={{ color: '#1560a2' }}>Company Bio</Label>
              <Textarea
                id="company-bio"
                defaultValue={company.bio}
                disabled={!isOwner}
                rows={4}
                onBlur={(e) => {
                  if (isOwner && e.target.value !== company.bio) {
                    updateCompanyMutation.mutate({ bio: e.target.value });
                  }
                }}
                data-testid="input-company-bio"
                style={{ backgroundColor: 'white', color: '#000000' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company-phone" style={{ color: '#1560a2' }}>Phone</Label>
                <Input
                  id="company-phone"
                  defaultValue={company.phone}
                  disabled={!isOwner}
                  onBlur={(e) => {
                    if (isOwner && e.target.value !== company.phone) {
                      updateCompanyMutation.mutate({ phone: e.target.value });
                    }
                  }}
                  data-testid="input-company-phone"
                  style={{ backgroundColor: 'white', color: '#000000' }}
                />
              </div>
              <div>
                <Label htmlFor="company-email" style={{ color: '#1560a2' }}>Email</Label>
                <Input
                  id="company-email"
                  defaultValue={company.email}
                  disabled={!isOwner}
                  onBlur={(e) => {
                    if (isOwner && e.target.value !== company.email) {
                      updateCompanyMutation.mutate({ email: e.target.value });
                    }
                  }}
                  data-testid="input-company-email"
                  style={{ backgroundColor: 'white', color: '#000000' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="mb-6" style={{ backgroundColor: '#f2f2f2' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2" style={{ color: '#1560a2' }}>
                <Users className="w-5 h-5" style={{ color: '#1560a2' }} />
                Team Members ({teamMembers?.length || 0})
              </CardTitle>
              <CardDescription style={{ color: '#000000' }}>
                {isOwner ? "Manage your team and their permissions" : "View your team members"}
              </CardDescription>
            </div>
            {isOwner && (
              <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-generate-invite">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate Invite Code</DialogTitle>
                    <DialogDescription>
                      Create a new invite code to add a team member to your company
                    </DialogDescription>
                  </DialogHeader>
                  {generatedCode ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Input value={generatedCode} readOnly data-testid="input-generated-code" />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(generatedCode)}
                          data-testid="button-copy-code"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Share this code with your new team member during registration
                      </p>
                      <Button
                        onClick={() => {
                          setGeneratedCode("");
                          setIsGenerateDialogOpen(false);
                        }}
                        className="w-full"
                        data-testid="button-done"
                      >
                        Done
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => generateInviteMutation.mutate()}
                      disabled={generateInviteMutation.isPending}
                      className="w-full"
                      data-testid="button-confirm-generate"
                    >
                      {generateInviteMutation.isPending ? "Generating..." : "Generate Code"}
                    </Button>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamMembers?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`team-member-${member.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-medium">
                        {member.firstName} {member.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">{member.email}</div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={member.companyRole === 'owner' ? 'default' : 'secondary'}>
                        {member.companyRole === 'owner' ? (
                          <>
                            <Shield className="w-3 h-3 mr-1" />
                            Owner
                          </>
                        ) : (
                          'Employee'
                        )}
                      </Badge>
                      {member.canRespondToProposals ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Can Respond
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500 border-gray-500">
                          <XCircle className="w-3 h-3 mr-1" />
                          View Only
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {isOwner && member.companyRole === 'employee' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          togglePermissionMutation.mutate({
                            userId: member.id,
                            canRespond: !member.canRespondToProposals,
                          })
                        }
                        disabled={togglePermissionMutation.isPending}
                        data-testid={`button-toggle-permission-${member.id}`}
                      >
                        {member.canRespondToProposals ? 'Revoke Permission' : 'Grant Permission'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setUserToRemove(member)}
                        data-testid={`button-remove-${member.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Invite Codes (Owner Only) */}
        {isOwner && inviteCodes && inviteCodes.length > 0 && (
          <Card style={{ backgroundColor: '#f2f2f2' }}>
            <CardHeader>
              <CardTitle style={{ color: '#1560a2' }}>Active Invite Codes</CardTitle>
              <CardDescription style={{ color: '#000000' }}>
                These codes can be used by new team members to join your company
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {inviteCodes
                  .filter((code) => code.isActive && !code.usedBy)
                  .map((code) => (
                    <div
                      key={code.id}
                      className="flex items-center justify-between p-3 border rounded"
                      data-testid={`invite-code-${code.id}`}
                    >
                      <code className="font-mono text-sm">{code.code}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(code.code)}
                        data-testid={`button-copy-invite-${code.id}`}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Remove Employee Confirmation Dialog */}
      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {userToRemove?.firstName} {userToRemove?.lastName} from your company?
              They will no longer have access to company proposals and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToRemove && removeEmployeeMutation.mutate(userToRemove.id)}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-remove"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
