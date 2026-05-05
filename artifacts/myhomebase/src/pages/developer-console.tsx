import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, CheckCircle, AlertTriangle, Info, Clock, User, Globe } from "lucide-react";
import { format } from "date-fns";

interface ErrorLog {
  id: string;
  errorType: string;
  errorMessage: string;
  errorStack: string | null;
  url: string | null;
  userAgent: string | null;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  severity: string;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  notes: string | null;
  metadata: any;
  createdAt: string;
}

interface ErrorBreadcrumb {
  id: string;
  errorLogId: string;
  timestamp: string;
  eventType: string;
  message: string;
  data: any;
}

interface ErrorDetails {
  error: ErrorLog;
  breadcrumbs: ErrorBreadcrumb[];
}

const severityIcons: Record<string, any> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  critical: AlertCircle,
};

const severityColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  critical: "bg-red-600 text-white dark:bg-red-700",
};

const typeColors: Record<string, string> = {
  client: "bg-[var(--purple-tint)] text-[var(--purple-deep)]",
  api: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  server: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export default function DeveloperConsole() {
  const { toast } = useToast();
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [errorTypeFilter, setErrorTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [resolvedFilter, setResolvedFilter] = useState<string>("all");
  const [resolveNotes, setResolveNotes] = useState("");

  // Fetch errors with filters
  const { data: errors = [], isLoading } = useQuery<ErrorLog[]>({
    queryKey: ['/api/errors', errorTypeFilter, severityFilter, resolvedFilter],
  });

  // Fetch error details
  const { data: errorDetails } = useQuery<ErrorDetails>({
    queryKey: [`/api/errors/${selectedError}`],
    enabled: !!selectedError,
  });

  // Resolve error mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ id, resolved, notes }: { id: string; resolved: boolean; notes?: string }) => {
      return await apiRequest(`/api/errors/${id}`, 'PATCH', { resolved, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/errors'] });
      queryClient.invalidateQueries({ queryKey: [`/api/errors/${selectedError}`] });
      toast({
        title: "Success",
        description: "Error status updated",
      });
      setResolveNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update error",
        variant: "destructive",
      });
    },
  });

  const handleResolve = () => {
    if (selectedError) {
      resolveMutation.mutate({
        id: selectedError,
        resolved: true,
        notes: resolveNotes || undefined,
      });
    }
  };

  const handleUnresolve = () => {
    if (selectedError) {
      resolveMutation.mutate({
        id: selectedError,
        resolved: false,
      });
    }
  };

  const filteredErrors = errors;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Developer Console</h1>
        <p className="text-muted-foreground">Monitor and manage application errors</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Error Type</label>
              <Select value={errorTypeFilter} onValueChange={setErrorTypeFilter}>
                <SelectTrigger data-testid="filter-error-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="server">Server</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger data-testid="filter-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
                <SelectTrigger data-testid="filter-resolved">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="false">Unresolved</SelectItem>
                  <SelectItem value="true">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error List */}
      <Card>
        <CardHeader>
          <CardTitle>Errors ({filteredErrors.length})</CardTitle>
          <CardDescription>Click on an error to view details</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading errors...</div>
          ) : filteredErrors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No errors found</div>
          ) : (
            <div className="space-y-3">
              {filteredErrors.map((error) => {
                const SeverityIcon = severityIcons[error.severity];
                return (
                  <div
                    key={error.id}
                    className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => setSelectedError(error.id)}
                    data-testid={`error-${error.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <SeverityIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className={typeColors[error.errorType]}>
                              {error.errorType}
                            </Badge>
                            <Badge className={severityColors[error.severity]}>
                              {error.severity}
                            </Badge>
                            {error.resolved && (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-sm mb-1 truncate">{error.errorMessage}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(error.createdAt), 'MMM d, yyyy h:mm a')}
                            </span>
                            {error.userEmail && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {error.userEmail}
                              </span>
                            )}
                            {error.url && (
                              <span className="flex items-center gap-1 truncate">
                                <Globe className="h-3 w-3" />
                                {new URL(error.url).pathname}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Details Dialog */}
      <Dialog open={!!selectedError} onOpenChange={(open) => !open && setSelectedError(null)}>
        <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto">
          {errorDetails && (
            <>
              <DialogHeader>
                <DialogTitle>Error Details</DialogTitle>
                <DialogDescription>
                  {format(new Date(errorDetails.error.createdAt), 'MMMM d, yyyy h:mm:ss a')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Status and Actions */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Badge className={typeColors[errorDetails.error.errorType]}>
                      {errorDetails.error.errorType}
                    </Badge>
                    <Badge className={severityColors[errorDetails.error.severity]}>
                      {errorDetails.error.severity}
                    </Badge>
                    {errorDetails.error.resolved && (
                      <Badge className="bg-green-100 text-green-800">Resolved</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!errorDetails.error.resolved ? (
                      <Button onClick={handleResolve} size="sm" data-testid="button-resolve">
                        Mark Resolved
                      </Button>
                    ) : (
                      <Button onClick={handleUnresolve} variant="outline" size="sm" data-testid="button-unresolve">
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>

                {/* Error Message */}
                <div>
                  <h3 className="font-semibold mb-2">Error Message</h3>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-mono">{errorDetails.error.errorMessage}</p>
                  </div>
                </div>

                {/* Stack Trace */}
                {errorDetails.error.errorStack && (
                  <div>
                    <h3 className="font-semibold mb-2">Stack Trace</h3>
                    <div className="p-3 bg-muted rounded-md overflow-x-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {errorDetails.error.errorStack}
                      </pre>
                    </div>
                  </div>
                )}

                {/* User Context */}
                {(errorDetails.error.userEmail || errorDetails.error.url) && (
                  <div>
                    <h3 className="font-semibold mb-2">User Context</h3>
                    <div className="space-y-2 text-sm">
                      {errorDetails.error.userEmail && (
                        <div className="flex gap-2">
                          <span className="font-medium w-24">Email:</span>
                          <span>{errorDetails.error.userEmail}</span>
                        </div>
                      )}
                      {errorDetails.error.userRole && (
                        <div className="flex gap-2">
                          <span className="font-medium w-24">Role:</span>
                          <span className="capitalize">{errorDetails.error.userRole}</span>
                        </div>
                      )}
                      {errorDetails.error.url && (
                        <div className="flex gap-2">
                          <span className="font-medium w-24">URL:</span>
                          <span className="break-all">{errorDetails.error.url}</span>
                        </div>
                      )}
                      {errorDetails.error.userAgent && (
                        <div className="flex gap-2">
                          <span className="font-medium w-24">Browser:</span>
                          <span className="text-muted-foreground text-xs break-all">
                            {errorDetails.error.userAgent}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Breadcrumbs */}
                {errorDetails.breadcrumbs.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">User Activity ({errorDetails.breadcrumbs.length} events)</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {errorDetails.breadcrumbs.map((crumb) => (
                        <div key={crumb.id} className="p-2 bg-muted rounded text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <Badge variant="outline" className="text-xs mb-1">
                                {crumb.eventType}
                              </Badge>
                              <p className="text-sm">{crumb.message}</p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(crumb.timestamp), 'HH:mm:ss')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution Notes */}
                {!errorDetails.error.resolved && (
                  <div>
                    <h3 className="font-semibold mb-2">Resolution Notes (Optional)</h3>
                    <Textarea
                      placeholder="Add notes about how this was resolved..."
                      value={resolveNotes}
                      onChange={(e) => setResolveNotes(e.target.value)}
                      data-testid="textarea-resolve-notes"
                    />
                  </div>
                )}

                {errorDetails.error.notes && (
                  <div>
                    <h3 className="font-semibold mb-2">Resolution Notes</h3>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm">{errorDetails.error.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
