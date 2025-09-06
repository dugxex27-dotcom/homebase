import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: any) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A simple file upload component for uploading contract documents.
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Check file size
    if (file.size > maxFileSize) {
      toast({
        title: "Error",
        description: "File is too large. Maximum size is 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Get upload parameters
      const { url } = await onGetUploadParameters();
      
      // Upload file directly to storage
      const response = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      // Call completion handler with mock result structure
      const mockResult = {
        successful: [{
          name: file.name,
          uploadURL: url,
        }]
      };
      
      onComplete?.(mockResult);
      
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error", 
        description: "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <Button 
        onClick={() => fileInputRef.current?.click()} 
        className={buttonClassName}
        disabled={isUploading}
      >
        {isUploading ? "Uploading..." : children}
      </Button>
    </div>
  );
}