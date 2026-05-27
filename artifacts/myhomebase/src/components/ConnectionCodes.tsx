import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
          <CardDescription>Share this permanent code with contractors so they can add service records to your account.  Contractor must be a Homebase user</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : codeData?.code ? (
            <>
              <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-lg">
                <div className="text-center space-y-2">
                  <div className="font-mono text-3xl font-bold tracking-wider" data-testid="text-connection-code">
                    {codeData.code}
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(codeData.code)}
                      data-testid="button-copy-code"
                      style={{ backgroundColor: '#2c0f5b', color: 'white', borderColor: '#2c0f5b' }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Code
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowQRDialog(true)}
                      data-testid="button-view-qr"
                      style={{ backgroundColor: '#2c0f5b', color: 'white', borderColor: '#2c0f5b' }}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      View QR Code
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Regenerating will invalidate your current code</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => regenerateMutation.mutate()}
                    disabled={regenerateMutation.isPending}
                    data-testid="button-regenerate-code"
                    style={{ backgroundColor: '#2c0f5b', color: 'white', borderColor: '#2c0f5b', flexShrink: 0 }}
                  >
                    <RefreshCw className="h-3 w-3 mr-1.5" />
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
  const [selectedHouseId, setSelectedHouseId] = useState("");

  const validateMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("/api/permanent-connection-code/validate", "POST", { code });
      return response.json();
    },
    onSuccess: (data) => {
      setHomeownerInfo(data);
      // Auto-select if the homeowner has exactly one home
      const houses: Array<{ id: string; name: string; address: string }> = data.houses ?? [];
      setSelectedHouseId(houses.length === 1 ? houses[0].id : "");
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
    setHomeownerInfo(null);
    setSelectedHouseId("");
    validateMutation.mutate(code.toUpperCase().trim());
  };

  const houses: Array<{ id: string; name: string; address: string }> = homeownerInfo?.houses ?? [];
  const needsHousePick = houses.length > 1;
  const canProceed = !!homeownerInfo && (!needsHousePick || !!selectedHouseId);

  const handleAddServiceRecord = () => {
    const params = new URLSearchParams({ homeownerId: homeownerInfo.homeownerId });
    if (selectedHouseId) params.set("houseId", selectedHouseId);
    window.location.href = `/service-records?${params.toString()}`;
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
          <div className="flex flex-col gap-2">
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
              className="w-full"
              style={{ backgroundColor: '#1560a2', color: 'white' }}
            >
              {validateMutation.isPending ? "Validating..." : "Validate"}
            </Button>
          </div>
        </div>

        {homeownerInfo && (
          <div className="p-4 border rounded-lg space-y-3" data-testid="div-homeowner-info" style={{ backgroundColor: '#e6f2ff', borderColor: '#1560a2' }}>
            <h3 className="font-semibold" style={{ color: '#1560a2' }}>Connected to:</h3>
            <div className="space-y-1 text-sm" style={{ color: '#000000' }}>
              <div><strong>Name:</strong> {homeownerInfo.homeownerName}</div>
              <div><strong>Email:</strong> {homeownerInfo.homeownerEmail}</div>
              {homeownerInfo.homeownerZipCode && (
                <div><strong>Zip Code:</strong> {homeownerInfo.homeownerZipCode}</div>
              )}
            </div>

            {/* House picker — required when homeowner has multiple properties */}
            {needsHousePick && (
              <div className="space-y-1">
                <Label style={{ color: '#1560a2', fontSize: 13 }}>
                  Select property for this job <span style={{ color: '#dc2626' }}>*</span>
                </Label>
                <select
                  value={selectedHouseId}
                  onChange={(e) => setSelectedHouseId(e.target.value)}
                  data-testid="select-house-id"
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 6,
                    border: '1.5px solid #1560a2', backgroundColor: '#fff',
                    color: '#1560a2', fontSize: 13, outline: 'none',
                  }}
                >
                  <option value="">— choose a property —</option>
                  {houses.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name || h.address}
                    </option>
                  ))}
                </select>
                {!selectedHouseId && (
                  <p style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>
                    You must select a property before adding a service record.
                  </p>
                )}
              </div>
            )}

            {/* Single house — show it for clarity */}
            {houses.length === 1 && (
              <div style={{ fontSize: 12, color: '#1560a2' }}>
                📍 Property: <strong>{houses[0].name || houses[0].address}</strong>
              </div>
            )}

            <div className="pt-1">
              <Button
                onClick={handleAddServiceRecord}
                disabled={!canProceed}
                className="w-full"
                data-testid="button-add-service-record"
                style={{ backgroundColor: canProceed ? '#1560a2' : '#93a8c4', color: 'white' }}
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
