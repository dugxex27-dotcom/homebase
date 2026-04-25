import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PenTool, RotateCcw, Check, X } from "lucide-react";

interface ESignatureProps {
  onSignature: (signatureData: {
    signature: string;
    signerName: string;
    signedAt: string;
    ipAddress?: string;
  }) => void;
  onCancel: () => void;
  signerName?: string;
  documentTitle?: string;
  isOpen: boolean;
}

export function ESignature({ 
  onSignature, 
  onCancel, 
  signerName = "", 
  documentTitle = "Contract",
  isOpen 
}: ESignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [name, setName] = useState(signerName);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
        setHasSignature(true);
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
      }
    }
  };

  const handleSign = async () => {
    if (!name.trim()) {
      alert("Please enter your name");
      return;
    }

    if (!hasSignature) {
      alert("Please provide your signature");
      return;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const signatureData = canvas.toDataURL();
      
      // Get user's IP (in a real app, this would be done server-side)
      let ipAddress = '';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch (error) {
        console.log('Could not get IP address');
      }

      onSignature({
        signature: signatureData,
        signerName: name.trim(),
        signedAt: new Date().toISOString(),
        ipAddress
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="w-5 h-5" />
            Electronic Signature - {documentTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              By signing below, you acknowledge that you have read, understood, and agree to the terms of this {documentTitle.toLowerCase()}.
              Your electronic signature has the same legal effect as a handwritten signature.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signer-name">Full Name *</Label>
            <Input
              id="signer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full legal name"
              data-testid="input-signer-name"
            />
          </div>

          <div className="space-y-2">
            <Label>Signature *</Label>
            <div className="border border-gray-300 rounded-lg p-4 bg-white">
              <canvas
                ref={canvasRef}
                width={500}
                height={150}
                className="w-full border border-gray-200 rounded cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                data-testid="canvas-signature"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-600">Sign above using your mouse or touchscreen</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  data-testid="button-clear-signature"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Date: {new Date().toLocaleString()}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={onCancel}
              data-testid="button-cancel-signature"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button 
              onClick={handleSign}
              disabled={!name.trim() || !hasSignature}
              data-testid="button-submit-signature"
            >
              <Check className="w-4 h-4 mr-1" />
              Sign Contract
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}