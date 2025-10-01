import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QRScannerProps {
  onScanSuccess: (qrCode: string) => void;
  onClose: () => void;
}

export const QRScanner = ({ onScanSuccess, onClose }: QRScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initScanner = async () => {
      try {
        // Initialize scanner with direct camera control
        scannerRef.current = new Html5Qrcode("qr-reader");
        
        // Request camera permissions and start scanning
        const cameras = await Html5Qrcode.getCameras();
        
        if (!cameras || cameras.length === 0) {
          throw new Error("No cameras found on device");
        }

        // Prefer back camera on mobile devices
        const cameraId = cameras.length > 1 ? cameras[1].id : cameras[0].id;

        await scannerRef.current.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (isMounted) {
              onScanSuccess(decodedText);
              scannerRef.current?.stop().catch(console.error);
              onClose();
            }
          },
          (error) => {
            // Suppress verbose scanning errors
            const errorMessage = typeof error === 'string' ? error : String(error);
            if (!errorMessage.includes("NotFoundException")) {
              console.log("QR scan error:", errorMessage);
            }
          }
        );

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Camera initialization error:", err);
        if (isMounted) {
          const errorMsg = err instanceof Error ? err.message : "Failed to access camera";
          setError(errorMsg);
          setIsLoading(false);
          toast.error("Camera access denied or unavailable");
        }
      }
    };

    initScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScanSuccess, onClose]);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <CardTitle className="text-lg sm:text-xl">Scan Equipment QR Code</CardTitle>
            </div>
          </div>
          <CardDescription className="text-sm">
            Position the QR code within the camera frame
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Requesting camera access...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="w-full aspect-square bg-destructive/10 border-2 border-destructive/50 rounded-lg flex items-center justify-center">
              <div className="text-center space-y-2 p-4">
                <Camera className="h-12 w-12 text-destructive mx-auto opacity-50" />
                <p className="text-sm text-destructive font-medium">{error}</p>
                <p className="text-xs text-muted-foreground">Please allow camera access in your browser settings</p>
              </div>
            </div>
          )}
          
          <div 
            id="qr-reader" 
            className={`w-full rounded-lg overflow-hidden ${isLoading || error ? 'hidden' : 'block'}`}
          ></div>
          
          {!isLoading && !error && (
            <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
              <p className="text-xs sm:text-sm text-muted-foreground">
                💡 <strong>Tip:</strong> Hold steady and align the QR code within the frame
              </p>
            </div>
          )}
          
          <Button 
            onClick={onClose} 
            variant="outline" 
            className="w-full"
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRScanner;
