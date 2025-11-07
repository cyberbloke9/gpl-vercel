import { useState, useEffect, useRef } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadMedia } from "@/lib/storage-helpers";
import { toast } from "sonner";

interface PhotoUploadProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  required?: boolean;
  userId: string;
  checklistId: string;
  fieldName: string;
}

export const PhotoUpload = ({ label, value, onChange, required, userId, checklistId, fieldName }: PhotoUploadProps) => {
  const [preview, setPreview] = useState<string | undefined>(value);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Sync preview with value prop (but only if it's different)
  useEffect(() => {
    if (value && value !== preview && !uploading) {
      setPreview(value);
    }
  }, [value]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1920;
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Compression failed'));
              }
            },
            'image/jpeg',
            0.8 // 80% quality
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);

    try {
      // Compress image AGGRESSIVELY for Android to avoid memory issues
      let fileToUpload = file;
      if (file.size > 512 * 1024) { // If larger than 512KB, compress
        try {
          fileToUpload = await compressImage(file);
          console.log(`Compressed from ${(file.size / 1024).toFixed(0)}KB to ${(fileToUpload.size / 1024).toFixed(0)}KB`);
        } catch (compressionError) {
          console.warn('Compression failed, using original:', compressionError);
          fileToUpload = file;
        }
      }

      // Upload directly to Supabase WITHOUT creating object URL preview
      const url = await uploadMedia(fileToUpload, userId, checklistId, fieldName);

      if (!url) {
        throw new Error('Upload failed - no URL returned');
      }

      // Update parent component with the permanent URL
      onChange(url);

      // Set preview to uploaded URL
      setPreview(url);

      toast.success("Photo uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photo. Please try again.");
      setPreview(value);
    } finally {
      setUploading(false);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    // Clean up object URL if exists
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setPreview(undefined);
    onChange("");

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>

      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt={label}
            className="w-32 h-32 object-cover rounded border"
            onError={(e) => {
              console.error("Image load error:", e);
              e.currentTarget.src =
                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="128"%3E%3Crect width="128" height="128" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="16" fill="%23999"%3EError%3C/text%3E%3C/svg%3E';
            }}
          />
          <Button
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={(e) => {
              e.preventDefault();
              handleRemove();
            }}
            disabled={uploading}
            type="button"
          >
            <X className="h-4 w-4" />
          </Button>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            onClick={(e) => {
              // Reset value to ensure onChange fires even for same file
              e.currentTarget.value = '';
            }}
            className="hidden"
            id={`photo-${fieldName}`}
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Capture Photo
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
