import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Copy, Trash2, Plus } from "lucide-react";
import QRCode from "qrcode";

interface ConnectionCode {
  id: string;
  homeownerId: string;
  houseId: string | null;
  code: string;
  expiresAt: string;
  isActive: boolean;
  usageLimit: number | null;
  usageCount: number;
  createdAt: string;
}

interface House {
  id: string;
  nickname: string;
  address: string;
}

export function HomeownerConnectionCodes() {
  const { toast } = useToast();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState<string | undefined>();
  const [expiresIn, setExpiresIn] = useState<number>(24);
  const [usageLimit, setUsageLimit] = useState<number>(1);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [selectedCode, setSelectedCode] = useState<ConnectionCode | null>(null);

  // Fetch houses
  const { data: houses = [] } = useQuery<House[]>({
    queryKey: ["/api/houses"],
  });

  // Fetch connection codes
  const { data: codes = [], isLoading } = useQuery<ConnectionCode[]>({
    queryKey: ["/api/homeowner-connection-codes"],
  });

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
      setSelectedCode(codes.find(c => c.code === code) || null);
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  // Create connection code mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/homeowner-connection-codes", "POST", {
        houseId: selectedHouse === "all" ? null : (selectedHouse || null),
        expiresIn,
        usageLimit,
      });
      return response.json();
    },
    onSuccess: (data: ConnectionCode) => {
      queryClient.invalidateQueries({ queryKey: ["/api/homeowner-connection-codes"] });
      toast({
        title: "Connection code created!",
        description: `Code: ${data.code}`,
      });
      setShowGenerateDialog(false);
      generateQRCode(data.code);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create connection code",
        variant: "destructive",
      });
    },
  });

  // Delete connection code mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/homeowner-connection-codes/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homeowner-connection-codes"] });
      toast({
        title: "Success",
        description: "Connection code deactivated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate connection code",
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

  const activeCodes = codes.filter(c => c.isActive && new Date(c.expiresAt) > new Date());
  const expiredCodes = codes.filter(c => !c.isActive || new Date(c.expiresAt) <= new Date());

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contractor Connection Codes</CardTitle>
              <CardDescription>
                Generate QR codes or shareable codes for contractors to add service records
              </CardDescription>
            </div>
            <Button onClick={() => setShowGenerateDialog(true)} data-testid="button-generate-code">
              <Plus className="h-4 w-4 mr-2" />
              Generate Code
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : activeCodes.length === 0 ? (
            <p className="text-muted-foreground">No active connection codes. Generate one to get started.</p>
          ) : (
            <div className="space-y-4">
              {activeCodes.map((code) => (
                <div
                  key={code.id}
                  className="p-4 border rounded-lg space-y-2"
                  data-testid={`code-item-${code.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-xl font-bold">{code.code}</div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateQRCode(code.code)}
                        data-testid={`button-view-qr-${code.id}`}
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        View QR
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(code.code)}
                        data-testid={`button-copy-${code.id}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate(code.id)}
                        data-testid={`button-deactivate-${code.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Expires: {new Date(code.expiresAt).toLocaleString()}</div>
                    <div>
                      Uses: {code.usageCount} / {code.usageLimit === null ? "Unlimited" : code.usageLimit}
                    </div>
                    {code.houseId && (
                      <div>House: {houses.find(h => h.id === code.houseId)?.nickname || "Unknown"}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {expiredCodes.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                View expired/inactive codes ({expiredCodes.length})
              </summary>
              <div className="mt-2 space-y-2">
                {expiredCodes.map((code) => (
                  <div key={code.id} className="p-2 border rounded bg-muted/50 opacity-60 text-sm">
                    <span className="font-mono">{code.code}</span>
                    <span className="ml-2 text-muted-foreground">
                      {!code.isActive ? "(Deactivated)" : "(Expired)"}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Generate Code Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent data-testid="dialog-generate-code">
          <DialogHeader>
            <DialogTitle>Generate Connection Code</DialogTitle>
            <DialogDescription>
              Create a code that contractors can use to add service records for your property
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Property (Optional)</Label>
              <Select value={selectedHouse} onValueChange={setSelectedHouse}>
                <SelectTrigger data-testid="select-house">
                  <SelectValue placeholder="All properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All properties</SelectItem>
                  {houses.map((house) => (
                    <SelectItem key={house.id} value={house.id}>
                      {house.nickname || house.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Expires in (hours)</Label>
              <Input
                type="number"
                value={expiresIn}
                onChange={(e) => setExpiresIn(parseInt(e.target.value))}
                min={1}
                max={168}
                data-testid="input-expires-in"
              />
            </div>

            <div className="space-y-2">
              <Label>Usage limit</Label>
              <Input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(parseInt(e.target.value))}
                min={1}
                max={100}
                data-testid="input-usage-limit"
              />
              <p className="text-sm text-muted-foreground">
                How many times this code can be used
              </p>
            </div>

            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="w-full"
              data-testid="button-create-code"
            >
              {createMutation.isPending ? "Generating..." : "Generate Code"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={!!qrCodeUrl} onOpenChange={() => { setQrCodeUrl(""); setSelectedCode(null); }}>
        <DialogContent data-testid="dialog-qr-code">
          <DialogHeader>
            <DialogTitle>Connection Code QR Code</DialogTitle>
            <DialogDescription>
              Share this QR code or the code below with your contractor
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
            {selectedCode && (
              <div className="space-y-2">
                <div className="font-mono text-2xl font-bold">{selectedCode.code}</div>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(selectedCode.code)}
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
      const response = await apiRequest("/api/homeowner-connection-codes/validate", "POST", { code });
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
        description: error.message || "This code is invalid, expired, or has been fully used",
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
              <div><strong>Zip Code:</strong> {homeownerInfo.homeownerZipCode}</div>
              {homeownerInfo.house && (
                <div><strong>Property:</strong> {homeownerInfo.house.nickname || homeownerInfo.house.address}</div>
              )}
            </div>
            <div className="pt-2">
              <Button
                onClick={() => window.location.href = `/service-records?homeownerId=${homeownerInfo.homeownerId}&houseId=${homeownerInfo.houseId || ""}`}
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
