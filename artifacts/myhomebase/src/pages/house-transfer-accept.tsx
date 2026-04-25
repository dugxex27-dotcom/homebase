import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { HouseTransfer, User as UserType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Home, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  ArrowRight,
  Mail,
  Phone
} from "lucide-react";

export default function HouseTransferAccept() {
  const [, params] = useRoute("/house-transfer/:token");
  const token = params?.token;
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch transfer details by token
  const { data: transfer, isLoading, error, refetch } = useQuery<HouseTransfer>({
    queryKey: ['/api/house-transfers/token', token],
    queryFn: () => apiRequest('GET', `/api/house-transfers/token/${token}`),
    enabled: !!token,
  });

  // Accept transfer mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!transfer?.id) throw new Error("Transfer not found");
      return await apiRequest('POST', `/api/house-transfers/${transfer.id}/accept`);
    },
    onSuccess: () => {
      toast({
        title: "Transfer Accepted",
        description: "You have successfully accepted the house transfer. The original owner will be notified.",
      });
      refetch();
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/house-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/houses'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept house transfer.",
        variant: "destructive",
      });
    }
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-6 w-6 text-destructive" />
                Invalid Transfer Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This transfer link is invalid or malformed. Please check the link and try again.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                </div>
                <p className="text-muted-foreground mt-4">Loading transfer details...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-6 w-6 text-destructive" />
                Transfer Not Found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                This transfer link has expired or is no longer valid.
              </p>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Transfer links expire after 7 days for security reasons.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isExpired = transfer?.status === 'expired';
  const isCompleted = transfer?.status === 'completed';
  const isPending = transfer?.status === 'pending';
  const isAccepted = transfer?.status === 'accepted';

  // Check if user is the intended recipient (by email match or ID match)
  const emailMatch = (user as any)?.email?.toLowerCase() === transfer?.toHomeownerEmail?.toLowerCase();
  const idMatch = !!transfer?.toHomeownerId && user?.id === transfer?.toHomeownerId;
  const isIntendedRecipient = isAuthenticated && (idMatch || emailMatch);
  const canAccept = isPending && isIntendedRecipient;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-6 w-6" />
                House Transfer Invitation
              </CardTitle>
              <CardDescription>
                You've been invited to receive ownership of a house
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Transfer Status */}
              <div className="flex items-center justify-between">
                <span className="font-medium">Status:</span>
                <Badge 
                  variant={
                    isCompleted ? "default" : 
                    isAccepted ? "secondary" : 
                    isPending ? "outline" : 
                    "destructive"
                  }
                  data-testid={`status-${transfer.status}`}
                >
                  {transfer?.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                  {transfer?.status === 'accepted' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {transfer?.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {transfer?.status === 'expired' && <XCircle className="h-3 w-3 mr-1" />}
                  {transfer?.status ? transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1) : 'Unknown'}
                </Badge>
              </div>

              <Separator />

              {/* House Details */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  House Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Address:</span>
                    <p className="font-medium" data-testid="house-address">
                      {transfer?.houseAddress || "Address not available"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Transfer Note:</span>
                    <p className="font-medium" data-testid="transfer-note">
                      {transfer?.transferNote || "No note provided"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Recipient Details */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Transfer Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">To Email:</span>
                    <p className="font-medium" data-testid="recipient-email">
                      {transfer?.toHomeownerEmail}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <p className="font-medium">
                      {transfer?.createdAt ? new Date(transfer.createdAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Section */}
              <Separator />
              
              {!isAuthenticated && (
                <div className="space-y-4">
                  <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      You need to be signed in to accept this house transfer. Please sign in with the email address {transfer?.toHomeownerEmail}.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    onClick={() => window.location.href = `/signin?redirect=${encodeURIComponent(window.location.pathname)}`}
                    className="w-full"
                    data-testid="button-sign-in"
                  >
                    Sign In to Accept Transfer
                  </Button>
                </div>
              )}

              {isAuthenticated && !isIntendedRecipient && (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This transfer is intended for {transfer?.toHomeownerEmail}, but you're signed in as {(user as any)?.email}. Please sign in with the correct account.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    onClick={() => window.location.href = `/signin?redirect=${encodeURIComponent(window.location.pathname)}`}
                    variant="outline"
                    className="w-full"
                    data-testid="button-switch-account"
                  >
                    Switch Account
                  </Button>
                </div>
              )}

              {canAccept && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      By accepting this transfer, you will become the new owner of this house and all associated maintenance data.
                    </AlertDescription>
                  </Alert>
                  
                  <Button 
                    onClick={() => {
                      if (!isAuthenticated) {
                        window.location.href = `/signin?redirect=${encodeURIComponent(window.location.pathname)}`;
                        return;
                      }
                      acceptMutation.mutate();
                    }}
                    disabled={acceptMutation.isPending}
                    className="w-full"
                    data-testid="button-accept-transfer"
                  >
                    {acceptMutation.isPending ? (
                      "Accepting..."
                    ) : (
                      <>
                        Accept House Transfer
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              )}

              {isAccepted && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    You have accepted this house transfer. The original owner will now be notified to confirm the transfer.
                  </AlertDescription>
                </Alert>
              )}

              {isCompleted && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    This house transfer has been completed successfully. You are now the owner of this house.
                  </AlertDescription>
                </Alert>
              )}

              {isExpired && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    This transfer invitation has expired. Please contact the original owner for a new invitation.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}