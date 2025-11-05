import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Copy, RefreshCw } from "lucide-react";
import QRCode from "qrcode";

export function HomeownerConnectionCodes() {
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [showQRDialog, setShowQRDialog] = useState(false);

  // Fetch permanent connection code
  const { data: codeData, isLoading } = useQuery<{ code: string }>({
    queryKey: ["/api/permanent-connection-code"],
  });

  // Generate QR code when code is available
  useEffect(() => {
    if (codeData?.code) {
      generateQRCode(codeData.code);
    }
  }, [codeData?.code]);

  // Generate QR code
  const generateQRCode = async (code: string) => {
    try {
      const url = `${window.location.origin}/contractor-connect?code=${code}`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  // Regenerate connection code mutation
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/permanent-connection-code/regenerate", "POST");
      return response.json();
    },
    onSuccess: (data: { code: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/permanent-connection-code"] });
      toast({
        title: "Code regenerated!",
        description: `Your new code is: ${data.code}`,
      });
      generateQRCode(data.code);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate connection code",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Contractor Connection Code</CardTitle>
          <CardDescription>
            Share this permanent code with contractors so they can add service records to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : codeData?.code ? (
            <>
              <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg">
                <div className="text-center space-y-4">
                  <div className="font-mono text-4xl font-bold tracking-wider" data-testid="text-connection-code">
                    {codeData.code}
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(codeData.code)}
                      data-testid="button-copy-code"
                      style={{ color: 'white' }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Code
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowQRDialog(true)}
                      data-testid="button-view-qr"
                      style={{ color: 'white' }}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      View QR Code
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Need a new code?</p>
                    <p className="text-sm text-muted-foreground">
                      Regenerating will invalidate your current code
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => regenerateMutation.mutate()}
                    disabled={regenerateMutation.isPending}
                    data-testid="button-regenerate-code"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {regenerateMutation.isPending ? "Regenerating..." : "Regenerate Code"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">No connection code available</p>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent data-testid="dialog-qr-code">
          <DialogHeader>
            <DialogTitle>Connection Code QR Code</DialogTitle>
            <DialogDescription>
              Contractors can scan this QR code to quickly connect with your account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-center">
            {qrCodeUrl && (
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="mx-auto"
                data-testid="img-qr-code"
              />
            )}
            {codeData?.code && (
              <div className="space-y-2">
                <div className="font-mono text-2xl font-bold">{codeData.code}</div>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(codeData.code)}
                  data-testid="button-copy-qr-code"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ContractorCodeEntry() {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [homeownerInfo, setHomeownerInfo] = useState<any>(null);

  const validateMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("/api/permanent-connection-code/validate", "POST", { code });
      return response.json();
    },
    onSuccess: (data) => {
      setHomeownerInfo(data);
      toast({
        title: "Code validated!",
        description: `Connected to ${data.homeownerName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Invalid code",
        description: error.message || "This code is invalid",
        variant: "destructive",
      });
    },
  });

  const handleValidate = () => {
    if (!code.trim()) {
      toast({
        title: "Error",
        description: "Please enter a code",
        variant: "destructive",
      });
      return;
    }
    validateMutation.mutate(code.toUpperCase().trim());
  };

  return (
    <Card style={{ backgroundColor: '#f2f2f2' }}>
      <CardHeader>
        <CardTitle style={{ color: '#1560a2' }}>Enter Homeowner Connection Code</CardTitle>
        <CardDescription style={{ color: '#000000' }}>
          Enter the code provided by the homeowner to add service records
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label style={{ color: '#1560a2' }}>Connection Code</Label>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter 8-character code"
              maxLength={8}
              className="font-mono text-lg placeholder:text-white placeholder:opacity-70"
              data-testid="input-connection-code"
              style={{ backgroundColor: '#1560a2', color: 'white', borderColor: '#1560a2' }}
            />
            <Button
              onClick={handleValidate}
              disabled={validateMutation.isPending || !code.trim()}
              data-testid="button-validate-code"
              style={{ backgroundColor: '#1560a2', color: 'white' }}
            >
              {validateMutation.isPending ? "Validating..." : "Validate"}
            </Button>
          </div>
        </div>

        {homeownerInfo && (
          <div className="p-4 border rounded-lg space-y-2" data-testid="div-homeowner-info" style={{ backgroundColor: '#e6f2ff', borderColor: '#1560a2' }}>
            <h3 className="font-semibold" style={{ color: '#1560a2' }}>Connected to:</h3>
            <div className="space-y-1 text-sm" style={{ color: '#000000' }}>
              <div><strong>Name:</strong> {homeownerInfo.homeownerName}</div>
              <div><strong>Email:</strong> {homeownerInfo.homeownerEmail}</div>
              {homeownerInfo.homeownerZipCode && (
                <div><strong>Zip Code:</strong> {homeownerInfo.homeownerZipCode}</div>
              )}
            </div>
            <div className="pt-2">
              <Button
                onClick={() => window.location.href = `/service-records?homeownerId=${homeownerInfo.homeownerId}`}
                className="w-full"
                data-testid="button-add-service-record"
                style={{ backgroundColor: '#1560a2', color: 'white' }}
              >
                Add Service Record
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
