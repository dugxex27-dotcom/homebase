import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';

export default function TestUpload() {
  const [logoPreview, setLogoPreview] = useState<string>('');
  const { toast } = useToast();

  const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxWidth) {
              width = (width * maxWidth) / height;
              height = maxWidth;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('========================================');
    console.log('[TEST UPLOAD] Starting upload test!');
    console.log('========================================');
    
    const file = event.target.files?.[0];
    console.log('[TEST UPLOAD] File selected:', file?.name, 'Size:', file?.size);
    
    if (!file) {
      console.log('[TEST UPLOAD] No file selected');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      console.log('[TEST UPLOAD] File too large');
      toast({
        title: "File Too Large",
        description: "Logo file must be smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log('[TEST UPLOAD] Starting compression...');
      
      toast({
        title: "Uploading Logo...",
        description: "Compressing and saving to database...",
      });
      
      const compressedImage = await compressImage(file, 800, 0.85);
      console.log('[TEST UPLOAD] Compressed to', compressedImage.length, 'characters');
      
      const email = 'freshandcleangutters@gmail.com';
      console.log('[TEST UPLOAD] Using email:', email);
      console.log('[TEST UPLOAD] Sending POST to /api/upload-logo-raw (RAW SQL VERSION)');
      
      const uploadResponse = await fetch('/api/upload-logo-raw', {
        method: 'POST',
        body: JSON.stringify({ 
          imageData: compressedImage,
          email: email
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      console.log('[TEST UPLOAD] Response status:', uploadResponse.status);
      console.log('[TEST UPLOAD] Response ok:', uploadResponse.ok);
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('[TEST UPLOAD ERROR]', errorText);
        throw new Error(errorText || 'Failed to upload logo');
      }
      
      const responseData = await uploadResponse.json();
      console.log('[TEST UPLOAD SUCCESS]', responseData);
      
      const { url } = responseData;
      
      setLogoPreview(url);
      
      toast({
        title: "✅ Logo Saved to Database!",
        description: "Your logo is permanently saved. Check the database!",
      });
      
      console.log('[TEST UPLOAD] Complete! Logo URL:', url);
      
    } catch (error) {
      console.error('[TEST UPLOAD FAILED]', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to save logo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Logo Upload Test Page</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Test Logo Upload (No Auth Required)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              This is a test page to upload a logo directly to the database without authentication.
              Open your browser console (F12 → Console) to see detailed logs.
            </div>
            
            {logoPreview && (
              <div className="flex items-center justify-center p-4 border rounded-lg">
                <img 
                  src={logoPreview} 
                  alt="Uploaded Logo" 
                  className="max-w-xs object-contain"
                />
              </div>
            )}
            
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="test-logo-upload"
                data-testid="input-logo"
              />
              <label htmlFor="test-logo-upload">
                <Button 
                  type="button" 
                  variant="default"
                  className="cursor-pointer w-full"
                  asChild
                  data-testid="button-upload"
                >
                  <span>Select Image to Upload</span>
                </Button>
              </label>
            </div>
            
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Opens browser file picker</p>
              <p>• Compresses image to 800px max width</p>
              <p>• Uploads to object storage</p>
              <p>• Saves URL to companies table in database</p>
              <p>• Email: freshandcleangutters@gmail.com</p>
              <p>• Company ID: 33cbeb58-158b-47d6-982e-2901f730fa14</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
