import { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

interface QRScannerProps {
  onScanSuccess: (qrCode: string) => void;
  onClose: () => void;
}

export const QRScanner = ({ onScanSuccess, onClose }: QRScannerProps) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode: "environment" // Use back camera on mobile
          }
        },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          onScanSuccess(decodedText);
          scannerRef.current?.clear();
          onClose();
        },
        (error) => {
          // Suppress verbose scanning errors - safely handle different error types
          const errorMessage = typeof error === 'string' ? error : String(error);
          if (!errorMessage.includes("NotFoundException")) {
            console.log("QR scan error:", errorMessage);
          }
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [onScanSuccess, onClose]);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Camera className="h-6 w-6 text-primary" />
            <CardTitle>Scan Equipment QR Code</CardTitle>
          </div>
          <CardDescription>
            Position the QR code within the camera frame to unlock the category checklist
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> Scan the equipment's QR code to unlock its maintenance checklist
            </p>
          </div>
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
