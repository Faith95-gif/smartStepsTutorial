import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, CameraOff, AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WebcamProctorAdvancedProps {
  onFaceNotDetected: () => void;
  isExamActive: boolean;
  onCameraFailed?: () => void;
}

const WebcamProctorAdvanced = ({ 
  onFaceNotDetected, 
  isExamActive,
  onCameraFailed 
}: WebcamProctorAdvancedProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceDetectorRef = useRef<any>(null);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [noFaceCount, setNoFaceCount] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modelLoaded, setModelLoaded] = useState(false);
  
  const { toast } = useToast();

  // Load face detection model
  useEffect(() => {
    const loadFaceDetection = async () => {
      try {
        // Check if browser supports Face Detection API
        if ('FaceDetector' in window) {
          // @ts-ignore - FaceDetector is experimental
          faceDetectorRef.current = new FaceDetector({
            maxDetectedFaces: 1,
            fastMode: true
          });
          setModelLoaded(true);
          setLoading(false);
        } else {
          // Fallback to basic detection
          console.warn("FaceDetector API not available, using fallback");
          setModelLoaded(true); // Use fallback method
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading face detector:", error);
        setModelLoaded(true); // Use fallback
        setLoading(false);
      }
    };

    loadFaceDetection();
  }, []);

  // Advanced face detection using FaceDetector API or fallback
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !isExamActive || !modelLoaded) return;

    const video = videoRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    try {
      let facePresent = false;

      // Try using FaceDetector API
      if (faceDetectorRef.current) {
        try {
          const faces = await faceDetectorRef.current.detect(video);
          facePresent = faces && faces.length > 0;
        } catch (e) {
          // Fallback to basic detection if API fails
          facePresent = basicFaceDetection();
        }
      } else {
        // Use basic detection as fallback
        facePresent = basicFaceDetection();
      }

      setFaceDetected(facePresent);

      if (!facePresent) {
        setNoFaceCount(prev => {
          const newCount = prev + 1;
          
          // Progressive warnings
          if (newCount === 1) {
            toast({
              title: "⚠️ Warning",
              description: "Please keep your face visible to the camera.",
              variant: "destructive",
            });
          } else if (newCount === 2) {
            toast({
              title: "🚨 Final Warning",
              description: "Face not detected! Exam will end if you continue to look away.",
              variant: "destructive",
            });
          } else if (newCount >= 3) {
            // Face not detected for 3+ seconds
            toast({
              title: "❌ Exam Violation",
              description: "Face not detected for too long. A chance has been deducted.",
              variant: "destructive",
            });
            onFaceNotDetected();
            return 0; // Reset counter after deducting chance
          }
          
          return newCount;
        });
      } else {
        setNoFaceCount(0);
      }
    } catch (error) {
      console.error("Face detection error:", error);
    }
  }, [isExamActive, modelLoaded, onFaceNotDetected, toast]);

  // Basic fallback face detection
  const basicFaceDetection = (): boolean => {
    if (!videoRef.current || !canvasRef.current) return false;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return false;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let skinPixels = 0;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const searchRadius = Math.min(canvas.width, canvas.height) / 4;

    // Detect skin tones in center area
    for (let y = centerY - searchRadius; y < centerY + searchRadius; y += 5) {
      for (let x = centerX - searchRadius; x < centerX + searchRadius; x += 5) {
        const i = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Skin tone detection
        if (r > 95 && g > 40 && b > 20 && 
            r > g && r > b && 
            Math.abs(r - g) > 15 &&
            r - g > 10) {
          skinPixels++;
        }
      }
    }

    const threshold = (searchRadius * searchRadius) / 100;
    return skinPixels > threshold;
  };

  // Initialize webcam
  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          },
          audio: false
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);
          setPermissionDenied(false);

          toast({
            title: "📹 Camera Monitoring Active",
            description: "Your face must remain visible throughout the exam.",
          });
        }
      } catch (error) {
        console.error("Error accessing webcam:", error);
        setPermissionDenied(true);
        setCameraActive(false);
        
        toast({
          title: "Camera Access Denied",
          description: "Camera access is required for exam proctoring. Please enable it and refresh.",
          variant: "destructive",
        });

        onCameraFailed?.();
      }
    };

    if (isExamActive && modelLoaded) {
      startWebcam();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isExamActive, modelLoaded, toast, onCameraFailed]);

  // Start detection interval
  useEffect(() => {
    if (cameraActive && isExamActive && modelLoaded) {
      detectionIntervalRef.current = setInterval(detectFace, 1000);
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [cameraActive, isExamActive, modelLoaded, detectFace]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <p className="text-sm">Loading camera monitoring...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (permissionDenied) {
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CameraOff className="w-8 h-8 text-destructive" />
            <div className="flex-1">
              <p className="font-semibold text-destructive">Camera Access Required</p>
              <p className="text-sm text-muted-foreground">
                This exam requires camera monitoring. Please allow camera access and refresh the page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 transition-colors ${
      faceDetected ? 'border-success bg-success/5' : 'border-warning bg-warning/5'
    }`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {cameraActive ? (
                <Camera className="w-5 h-5 text-success animate-pulse" />
              ) : (
                <CameraOff className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">Proctoring Active</span>
            </div>
            <Badge 
              variant={faceDetected ? "default" : "destructive"} 
              className="gap-1 animate-pulse"
            >
              {faceDetected ? (
                <>
                  <Eye className="w-3 h-3" />
                  Monitoring
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  Face Missing ({3 - noFaceCount}s)
                </>
              )}
            </Badge>
          </div>

          {/* Video Preview */}
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-w-xs mx-auto">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
              style={{ transform: 'scaleX(-1)' }}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Warning Overlay */}
            {!faceDetected && cameraActive && (
              <div className="absolute inset-0 bg-destructive/30 flex items-center justify-center backdrop-blur-sm">
                <div className="text-center text-white p-4">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-2 animate-bounce" />
                  <p className="text-sm font-bold">LOOK AT THE SCREEN!</p>
                  <p className="text-xs mt-1">Face Not Detected</p>
                </div>
              </div>
            )}

            {/* Detection Frame */}
            {faceDetected && (
              <div className="absolute inset-8 border-2 border-success rounded-lg pointer-events-none">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-success"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-success"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-success"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-success"></div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-xs space-y-1 bg-muted p-2 rounded">
            <p className="font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Proctoring Rules:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground ml-1">
              <li>Keep your face visible at all times</li>
              <li>Look at the screen throughout the exam</li>
              <li>Looking away for 3+ seconds deducts a chance</li>
              <li>3 violations = exam automatically ends</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebcamProctorAdvanced;