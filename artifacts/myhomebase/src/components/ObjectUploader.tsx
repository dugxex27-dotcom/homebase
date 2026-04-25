import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, FileText, Image, File } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (uploadedFiles: UploadedFile[]) => void;
  buttonClassName?: string;
  children: ReactNode;
  acceptedFileTypes?: string[];
  fileType?: string; // "proposal" or "contract"
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file management with drag and drop support.
 */
export function ObjectUploader({
  maxNumberOfFiles = 5,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
  acceptedFileTypes = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".txt"],
  fileType = "proposal"
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles = Array.from(selectedFiles).filter(file => {
      if (file.size > maxFileSize) {
        alert(`File ${file.name} is too large. Maximum size is ${Math.round(maxFileSize / 1024 / 1024)}MB`);
        return false;
      }
      return true;
    });

    const totalFiles = files.length + newFiles.length;
    if (totalFiles > maxNumberOfFiles) {
      alert(`You can only upload up to ${maxNumberOfFiles} files`);
      return;
    }

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const uploaded: UploadedFile[] = [];

    for (const file of files) {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        // Get upload URL from backend
        const { url } = await onGetUploadParameters();

        // Upload file directly to storage
        const uploadResponse = await fetch(url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (uploadResponse.ok) {
          // Extract the object path from the upload URL
          const urlObj = new URL(url);
          const objectPath = urlObj.pathname;

          uploaded.push({
            name: file.name,
            size: file.size,
            type: file.type,
            url: uploadResponse.url,
            path: `/objects${objectPath.split('/').slice(-2).join('/')}`
          });

          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        }
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        alert(`Failed to upload ${file.name}`);
      }
    }

    setUploadedFiles(uploaded);
    setUploading(false);
    
    if (uploaded.length > 0 && onComplete) {
      onComplete(uploaded);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFiles([]);
    setUploadProgress({});
    setUploadedFiles([]);
  };

  return (
    <div>
      <Button 
        onClick={() => setShowModal(true)} 
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-primary-foreground hover:bg-primary/90 py-2 h-8 px-3 text-xs bg-[#1560a2]"
        data-testid={`button-upload-${fileType}`}
      >
        {children}
      </Button>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Upload Files</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeModal}
                data-testid="button-close-upload"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <CardContent className="p-6 space-y-4 max-h-96 overflow-y-auto">
              {/* File Drop Zone */}
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileSelect(e.dataTransfer.files);
                }}
                onDragOver={(e) => e.preventDefault()}
                data-testid="dropzone-files"
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Drag and drop files here, or</p>
                <input
                  type="file"
                  multiple
                  accept={acceptedFileTypes.join(",")}
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                  id="file-input"
                  data-testid="input-file-select"
                />
                <Button
                  onClick={() => document.getElementById('file-input')?.click()}
                  style={{ backgroundColor: '#1560a2', color: 'white' }}
                  data-testid="button-select-files"
                >
                  Choose Files
                </Button>
                <p className="text-sm text-gray-500 mt-2">
                  Maximum {maxNumberOfFiles} files, {Math.round(maxFileSize / 1024 / 1024)}MB each
                </p>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Selected Files:</h4>
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        {getFileIcon(file.type)}
                        <div>
                          <p className="text-sm font-medium" data-testid={`text-filename-${index}`}>{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {Math.round(file.size / 1024)} KB
                          </p>
                        </div>
                      </div>
                      {uploading && uploadProgress[file.name] !== undefined ? (
                        <div className="text-sm text-blue-600">
                          {uploadProgress[file.name]}%
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          data-testid={`button-remove-file-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Success */}
              {uploadedFiles.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">Files Uploaded Successfully:</h4>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm text-green-700">
                      {getFileIcon(file.type)}
                      <span data-testid={`text-uploaded-${index}`}>{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Footer */}
            <div className="p-6 border-t flex justify-end space-x-2">
              <Button onClick={closeModal} style={{ backgroundColor: '#1560a2', color: 'white' }} data-testid="button-cancel-upload">
                Cancel
              </Button>
              <Button
                onClick={uploadFiles}
                disabled={files.length === 0 || uploading}
                style={{ backgroundColor: '#1560a2', color: 'white' }}
                data-testid="button-upload-files"
              >
                {uploading ? "Uploading..." : `Upload ${files.length} file(s)`}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}