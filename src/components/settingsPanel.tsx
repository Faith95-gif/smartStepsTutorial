import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Volume2,
  Video,
  Users,
  Calendar,
  Shield,
  Wrench,
  X,
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon,
  Monitor,
  Mic,
  Copy,
  Lock,
  MessageSquare,
  Smile,
  FileText,
  Radio,
  Circle,
  Info,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { audioDeviceManager, AudioDevice } from "../services/AudioDeviceManager";

// ============= Types =============
type SettingsGroup = 
  | "general"
  | "audio"
  | "video"
  | "participants"
  | "meeting"
  | "privacy"
  | "advanced";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isHost: boolean;
  meetingId: string;
  userName: string;
  meetingName?: string;
  isLocked?: boolean;
  onNameChange?: (name: string) => void;
  onMeetingNameChange?: (name: string) => void;
  onLockMeetingChange?: (locked: boolean) => void;
  onShowControlsChange?: (show: boolean) => void;
  showMeetingControls?: boolean;
  onCameraChange?: (deviceId: string) => void;
  onScreenSharePermissionChange?: (allowed: boolean) => void;
  allowScreenShare?: boolean;
  // Permission controls
  chatEnabled?: boolean;
  onChatEnabledChange?: (enabled: boolean) => void;
  allowRename?: boolean;
  onAllowRenameChange?: (allowed: boolean) => void;
  emojiReactionsEnabled?: boolean;
  onEmojiReactionsChange?: (enabled: boolean) => void;
}

// ============= Settings Group Config =============
const settingsGroups = [
  { id: "general" as const, label: "General", icon: Settings },
  { id: "audio" as const, label: "Audio", icon: Volume2 },
  { id: "video" as const, label: "Video", icon: Video },
  { id: "participants" as const, label: "Participants", icon: Users },
  { id: "meeting" as const, label: "Meeting", icon: Calendar },
  { id: "privacy" as const, label: "Privacy", icon: Shield },
  { id: "advanced" as const, label: "Advanced", icon: Wrench },
];

// ============= Settings Panel Component =============
const SettingsPanel = ({
  isOpen,
  onClose,
  isHost,
  meetingId,
  userName,
  meetingName: meetingNameProp = "Team Meeting",
  isLocked: isLockedProp = false,
  onNameChange,
  onMeetingNameChange,
  onLockMeetingChange,
  onShowControlsChange,
  showMeetingControls: showMeetingControlsProp = true,
  onCameraChange,
  onScreenSharePermissionChange,
  allowScreenShare: allowScreenShareProp = true,
  chatEnabled: chatEnabledProp = true,
  onChatEnabledChange,
  allowRename: allowRenameProp = true,
  onAllowRenameChange,
  emojiReactionsEnabled: emojiReactionsEnabledProp = true,
  onEmojiReactionsChange,
}: SettingsPanelProps) => {
  const { toast } = useToast();
  const [activeGroup, setActiveGroup] = useState<SettingsGroup | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // General Settings State - load from localStorage
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    const saved = localStorage.getItem("meeting-theme");
    return (saved as "light" | "dark" | "system") || "system";
  });
  const [showMeetingControls, setShowMeetingControls] = useState(showMeetingControlsProp);
  const [displayName, setDisplayName] = useState(userName);

  // Apply theme on mount and when changed
  useEffect(() => {
    const applyTheme = (newTheme: "light" | "dark" | "system") => {
      const root = document.documentElement;
      
      if (newTheme === "system") {
        const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", systemDark);
      } else {
        root.classList.toggle("dark", newTheme === "dark");
      }
      
      localStorage.setItem("meeting-theme", newTheme);
    };
    
    applyTheme(theme);

    // Listen for system theme changes when in system mode
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("system");
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  // Update parent when showMeetingControls changes
  useEffect(() => {
    if (onShowControlsChange) {
      onShowControlsChange(showMeetingControls);
    }
    localStorage.setItem("meeting-always-show-controls", String(showMeetingControls));
  }, [showMeetingControls, onShowControlsChange]);

  // Sync displayName with userName prop
  useEffect(() => {
    setDisplayName(userName);
  }, [userName]);

  // Sync meetingName with prop
  useEffect(() => {
    setMeetingName(meetingNameProp);
  }, [meetingNameProp]);

  // Sync lockMeeting with prop
  useEffect(() => {
    setLockMeeting(isLockedProp);
  }, [isLockedProp]);
  
  // Audio Settings State - using AudioDeviceManager
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>("");
  const [microphones, setMicrophones] = useState<AudioDevice[]>([]);
  const [echoCancellation, setEchoCancellation] = useState(() => audioDeviceManager.getEchoCancellation());
  const [noiseSuppression, setNoiseSuppression] = useState(() => audioDeviceManager.getNoiseSuppression());
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [currentTestDevice, setCurrentTestDevice] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  
  // Video Settings State
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [allowScreenShare, setAllowScreenShare] = useState(allowScreenShareProp);
  const [isTestingVideo, setIsTestingVideo] = useState(false);
  const [hasVideoPermission, setHasVideoPermission] = useState(false);
  const [isLoadingVideoDevices, setIsLoadingVideoDevices] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  
  // Participant Settings State
  const [allowParticipantRename, setAllowParticipantRename] = useState(allowRenameProp);
  const [allowHandRaising, setAllowHandRaising] = useState(true);
  
  // Meeting Settings State
  const [meetingName, setMeetingName] = useState(meetingNameProp);
  const [lockMeeting, setLockMeeting] = useState(isLockedProp);
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [enableChat, setEnableChat] = useState(chatEnabledProp);
  const [fileSharing, setFileSharing] = useState(true);
  const [emojiReactions, setEmojiReactions] = useState(true);
  const [recordMeeting, setRecordMeeting] = useState<"none" | "local">("none");
  const [maxVisibleParticipants, setMaxVisibleParticipants] = useState<9 | 15>(9);

  // Sync enableChat with prop
  useEffect(() => {
    setEnableChat(chatEnabledProp);
  }, [chatEnabledProp]);

  // Sync allowParticipantRename with prop
  useEffect(() => {
    setAllowParticipantRename(allowRenameProp);
  }, [allowRenameProp]);

  // Sync emojiReactions with prop
  useEffect(() => {
    setEmojiReactions(emojiReactionsEnabledProp);
  }, [emojiReactionsEnabledProp]);

  // Load audio devices using AudioDeviceManager
  const loadAudioDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    try {
      console.log('🎤 Loading audio devices...');
      const devices = await audioDeviceManager.initialize();
      setMicrophones(devices);
      setHasPermission(true);
      
      // Set selected device from saved preferences or first available
      const savedDevice = audioDeviceManager.getSelectedDeviceId();
      if (savedDevice && devices.some(d => d.deviceId === savedDevice)) {
        setSelectedMicrophone(savedDevice);
      } else if (devices.length > 0) {
        setSelectedMicrophone(devices[0].deviceId);
      }
      
      console.log('✅ Loaded', devices.length, 'audio devices');
    } catch (err) {
      console.error("Error loading audio devices:", err);
      toast({ 
        description: "Could not access microphone. Please check permissions.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoadingDevices(false);
    }
  }, [toast]);

  // Load video devices
  const loadVideoDevices = useCallback(async () => {
    setIsLoadingVideoDevices(true);
    try {
      console.log('📹 Loading video devices...');
      
      // FIX: Check if we already have permission before requesting
      // This prevents conflicts when camera is already in use by the meeting
      let permissionGranted = false;
      
      // Try using Permissions API if available (not supported in all browsers)
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
          permissionGranted = permissionStatus.state === 'granted';
          console.log('📹 Camera permission status:', permissionStatus.state);
        } catch (e) {
          console.log('📹 Permissions API not available, will check via enumerateDevices');
        }
      }
      
      // If we don't already have permission, request it
      // But in Capacitor, if camera is in use, skip this step
      if (!permissionGranted) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter(d => d.kind === "videoinput");
          
          // If we can see device labels, we have permission
          if (videoInputs.length > 0 && videoInputs[0].label) {
            permissionGranted = true;
            console.log('📹 Permission already granted (devices have labels)');
          }
        } catch (e) {
          console.log('📹 Could not enumerate devices:', e);
        }
      }
      
      // Only request camera if we don't have permission yet
      if (!permissionGranted) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          permissionGranted = true;
        } catch (err) {
          console.error("Error requesting camera permission:", err);
          toast({ 
            description: "Could not access camera. Please check permissions.", 
            variant: "destructive" 
          });
          setIsLoadingVideoDevices(false);
          return; // Exit early if permission denied
        }
      }
      
      // Now enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === "videoinput");
      setCameras(videoInputs);
      setHasVideoPermission(true);
      
      // Set saved device or first available
      const savedDevice = localStorage.getItem('video-device-id');
      if (savedDevice && videoInputs.some(d => d.deviceId === savedDevice)) {
        setSelectedCamera(savedDevice);
      } else if (videoInputs.length > 0 && !selectedCamera) {
        setSelectedCamera(videoInputs[0].deviceId);
      }
      
      console.log('✅ Loaded', videoInputs.length, 'video devices');
    } catch (err) {
      console.error("Error loading video devices:", err);
      // Don't show error if camera is just in use
      const errorMessage = (err as Error).message || '';
      if (!errorMessage.includes('in use') && !errorMessage.includes('NotReadableError')) {
        toast({ 
          description: "Could not access camera. Please check permissions.", 
          variant: "destructive" 
        });
      }
    } finally {
      setIsLoadingVideoDevices(false);
    }
  }, [toast]); // Remove selectedCamera from dependencies

  // Handle camera selection change
  const handleCameraChange = async (deviceId: string) => {
    console.log('📹 Selecting camera:', deviceId);
    
    // Stop current video test if running
    if (isTestingVideo) {
      stopVideoTest();
    }
    
    setSelectedCamera(deviceId);
    localStorage.setItem('video-device-id', deviceId);
    
    // Notify parent component to switch camera in WebRTC
    if (onCameraChange) {
      onCameraChange(deviceId);
    }
    
    const device = cameras.find(c => c.deviceId === deviceId);
    if (device) {
      toast({ description: `Selected: ${device.label || 'Camera'}` });
    }
  };

  // Handle screen share permission change
  const handleScreenSharePermissionChange = (allowed: boolean) => {
    setAllowScreenShare(allowed);
    if (onScreenSharePermissionChange) {
      onScreenSharePermissionChange(allowed);
    }
    toast({ 
      description: allowed 
        ? "Participants can now share their screen" 
        : "Participants can no longer share their screen"
    });
  };

  // Initialize devices and listen for changes
  useEffect(() => {
    if (isOpen) {
      loadAudioDevices();
      loadVideoDevices();

      // Subscribe to audio device changes
      const unsubscribeAudio = audioDeviceManager.onDeviceChange((newDevices) => {
        console.log('🔄 Audio device change detected, updating list...');
        setMicrophones(newDevices);
        
        // Check if current selection still exists
        if (selectedMicrophone && !newDevices.some(d => d.deviceId === selectedMicrophone)) {
          const defaultDevice = newDevices.find(d => d.isDefault) || newDevices[0];
          if (defaultDevice) {
            setSelectedMicrophone(defaultDevice.deviceId);
            toast({ description: `Switched to ${defaultDevice.label}` });
          }
        }
      });
      
      // Listen for video device changes
      const handleVideoDeviceChange = async () => {
        console.log('🔄 Video device change detected, updating list...');
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter(d => d.kind === "videoinput");
          setCameras(videoInputs);
          
          // Check if current selection still exists
          if (selectedCamera && !videoInputs.some(d => d.deviceId === selectedCamera)) {
            if (videoInputs.length > 0) {
              setSelectedCamera(videoInputs[0].deviceId);
              toast({ description: `Switched to ${videoInputs[0].label || 'Camera'}` });
            }
          }
        } catch (e) {
          console.error('Error handling video device change:', e);
        }
      };
      
      navigator.mediaDevices.addEventListener('devicechange', handleVideoDeviceChange);

      return () => {
        unsubscribeAudio();
        navigator.mediaDevices.removeEventListener('devicechange', handleVideoDeviceChange);
      };
    }
  }, [isOpen, loadAudioDevices, loadVideoDevices]); // FIX: Remove circular dependencies

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopAudioTest();
      stopVideoTest();
      setActiveGroup(null);
    }
  }, [isOpen]);

  const selectGroup = (group: SettingsGroup) => {
    setIsAnimating(true);
    setTimeout(() => {
      setActiveGroup(group);
      setIsAnimating(false);
    }, 150);
  };

  const goBack = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setActiveGroup(null);
      setIsAnimating(false);
    }, 150);
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ description: `${label} copied to clipboard` });
    } catch (err) {
      toast({ description: "Failed to copy", variant: "destructive" });
    }
  };

  const handleNameChange = () => {
    if (displayName.trim() && onNameChange) {
      onNameChange(displayName.trim());
      toast({ description: "Display name updated" });
    }
  };

  // Ref to track testing state for the animation loop
  const isTestingRef = useRef(false);

  // Handle microphone selection change
  const handleMicrophoneChange = async (deviceId: string) => {
    console.log('🎤 Selecting microphone:', deviceId);
    
    // Stop current test if running
    if (isTesting) {
      stopAudioTest();
    }
    
    setSelectedMicrophone(deviceId);
    await audioDeviceManager.selectDevice(deviceId);
    
    const device = microphones.find(m => m.deviceId === deviceId);
    if (device) {
      toast({ description: `Selected: ${device.label}` });
    }
  };

  // Handle echo cancellation change
  const handleEchoCancellationChange = (enabled: boolean) => {
    console.log('🔊 Echo cancellation:', enabled ? 'enabled' : 'disabled');
    setEchoCancellation(enabled);
    audioDeviceManager.setEchoCancellation(enabled);
    
    // Restart test if running to apply new settings
    if (isTesting) {
      stopAudioTest();
      setTimeout(() => startAudioTest(), 100);
    }
    
    toast({ 
      description: `Echo cancellation ${enabled ? 'enabled' : 'disabled'}` 
    });
  };

  // Handle noise suppression change
  const handleNoiseSuppressionChange = (enabled: boolean) => {
    setNoiseSuppression(enabled);
    audioDeviceManager.setNoiseSuppression(enabled);
    
    if (isTesting) {
      stopAudioTest();
      setTimeout(() => startAudioTest(), 100);
    }
    
    toast({ 
      description: `Noise suppression ${enabled ? 'enabled' : 'disabled'}` 
    });
  };

  // Audio test functions - tests the SELECTED microphone specifically
  const startAudioTest = async () => {
    if (!selectedMicrophone) {
      toast({ description: "Please select a microphone first", variant: "destructive" });
      return;
    }

    try {
      console.log('🧪 Starting audio test with device:', selectedMicrophone);
      console.log('🔊 Echo cancellation:', echoCancellation);
      
      // Use exact deviceId to ensure we test the selected device
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: { exact: selectedMicrophone },
          echoCancellation: echoCancellation,
          noiseSuppression: noiseSuppression,
          autoGainControl: true,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      audioStreamRef.current = stream;
      
      // Verify we got the correct device
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const settings = audioTrack.getSettings();
        console.log('✅ Audio test using device:', settings.deviceId);
        console.log('📊 Track settings:', {
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl,
        });
        
        setCurrentTestDevice(settings.deviceId || selectedMicrophone);
      }
      
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      isTestingRef.current = true;
      setIsTesting(true);
      updateAudioLevel();
      
      const device = microphones.find(m => m.deviceId === selectedMicrophone);
      toast({ 
        description: `Testing: ${device?.label || 'Selected microphone'}` 
      });
    } catch (err) {
      console.error('❌ Failed to start audio test:', err);
      
      // Try with fallback if exact device fails
      try {
        console.log('⚠️ Retrying without exact constraint...');
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: selectedMicrophone,
            echoCancellation: echoCancellation,
            noiseSuppression: noiseSuppression,
          },
        });
        audioStreamRef.current = fallbackStream;
        
        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(fallbackStream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);
        
        isTestingRef.current = true;
        setIsTesting(true);
        updateAudioLevel();
        
        toast({ 
          description: "Testing microphone (fallback mode)" 
        });
      } catch (fallbackErr) {
        console.error('❌ Fallback also failed:', fallbackErr);
        toast({ 
          description: "Could not access the selected microphone. Please check if it's connected.", 
          variant: "destructive" 
        });
      }
    }
  };

  const updateAudioLevel = () => {
    if (!analyserRef.current || !isTestingRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(Math.min(100, average * 2));
    
    if (isTestingRef.current) {
      requestAnimationFrame(updateAudioLevel);
    }
  };

  const stopAudioTest = () => {
    console.log('⏹️ Stopping audio test');
    isTestingRef.current = false;
    setIsTesting(false);
    setAudioLevel(0);
    setCurrentTestDevice(null);
    audioStreamRef.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close();
    audioStreamRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
  };

  // Refresh devices manually
  const refreshDevices = async () => {
    toast({ description: "Refreshing device list..." });
    await loadAudioDevices();
    await loadVideoDevices();
    toast({ description: "Device list updated" });
  };

  // Video test functions - tests the SELECTED camera specifically
  const startVideoTest = async () => {
    if (!selectedCamera) {
      toast({ description: "Please select a camera first", variant: "destructive" });
      return;
    }

    try {
      console.log('🎥 Starting video test with camera:', selectedCamera);
      
      // Use exact deviceId to ensure we test the selected camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          deviceId: { exact: selectedCamera },
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
      });
      
      videoStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsTestingVideo(true);
      
      const device = cameras.find(c => c.deviceId === selectedCamera);
      toast({ description: `Testing: ${device?.label || 'Selected camera'}` });
    } catch (err) {
      console.error('❌ Failed to start video test:', err);
      
      // Try without exact constraint as fallback
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: selectedCamera },
        });
        videoStreamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
        setIsTestingVideo(true);
        toast({ description: "Testing camera (fallback mode)" });
      } catch (fallbackErr) {
        toast({ description: "Could not access the selected camera. Please check if it's connected.", variant: "destructive" });
      }
    }
  };

  const stopVideoTest = () => {
    setIsTestingVideo(false);
    videoStreamRef.current?.getTracks().forEach(t => t.stop());
    videoStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // ============= Render Settings Groups =============
  const renderGeneralSettings = () => (
    <div className="space-y-6 animate-settings-slide-in">
   

      <div className="flex items-center justify-between p-4 rounded-xl bg-settings-option">
        <div>
          <Label className="text-sm font-medium text-settings-text">Always show meeting controls</Label>
          <p className="text-xs text-settings-muted mt-0.5">Keep controls visible during meeting</p>
        </div>
        <Switch
          checked={showMeetingControls}
          onCheckedChange={setShowMeetingControls}
        />
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium text-settings-label">Display Name</Label>
        <div className="flex gap-2">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="flex-1 h-11 bg-settings-input border-settings-border text-settings-text rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter your name"
            disabled={!isHost && !allowRenameProp}
          />
          <Button
            onClick={handleNameChange}
            className="h-11 px-6 bg-settings-active hover:bg-settings-active/90 text-settings-active-text rounded-xl"
            disabled={!isHost && !allowRenameProp}
          >
            Change Name
          </Button>
        </div>
        {!isHost && !allowRenameProp && (
          <p className="text-xs text-destructive flex items-center gap-1.5 mt-2">
            <Info className="h-3.5 w-3.5" />
            The host disabled Participant Renaming
          </p>
        )}
      </div>
    </div>
  );

  const renderAudioSettings = () => (
    <div className="space-y-6 animate-settings-slide-in">
      {/* Microphone Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-settings-label">Select Microphone</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshDevices}
            disabled={isLoadingDevices}
            className="h-8 px-2 text-settings-muted hover:text-settings-text"
          >
            <RefreshCw className={cn("h-4 w-4", isLoadingDevices && "animate-spin")} />
          </Button>
        </div>
        
        {!hasPermission && microphones.length === 0 ? (
          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Microphone access required</span>
            </div>
            <p className="text-xs text-settings-muted mt-1">
              Click the button below to allow microphone access
            </p>
            <Button
              onClick={loadAudioDevices}
              className="mt-3 h-9 bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Allow Microphone Access
            </Button>
          </div>
        ) : (
          <Select value={selectedMicrophone} onValueChange={handleMicrophoneChange}>
            <SelectTrigger className="h-11 bg-settings-input border-settings-border text-settings-text rounded-xl">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-settings-muted" />
                <SelectValue placeholder={isLoadingDevices ? "Loading microphones..." : "Select microphone"} />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900 border-settings-border rounded-xl z-[10000] shadow-lg max-h-[300px]">
              {microphones.length === 0 ? (
                <div className="p-4 text-center text-settings-muted text-sm">
                  No microphones detected
                </div>
              ) : (
                microphones.map((mic) => (
                  <SelectItem 
                    key={mic.deviceId} 
                    value={mic.deviceId} 
                    className="text-settings-text hover:bg-settings-option"
                  >
                    <div className="flex items-center gap-2">
                      {mic.isDefault && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                      <span className="truncate">{mic.label}</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}

        {/* Device count indicator */}
        {microphones.length > 0 && (
          <p className="text-xs text-settings-muted flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            {microphones.length} microphone{microphones.length !== 1 ? 's' : ''} detected
          </p>
        )}
      </div>



      {/* Microphone Test */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-settings-label">Test Your Microphone</Label>
        <div className="p-4 rounded-xl bg-settings-option space-y-4">
          {/* Currently testing indicator */}
          {isTesting && currentTestDevice && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-600 dark:text-green-400">
                Testing: {microphones.find(m => m.deviceId === selectedMicrophone)?.label || 'Selected microphone'}
              </span>
            </div>
          )}
          
          <Button
            onClick={isTesting ? stopAudioTest : startAudioTest}
            disabled={!selectedMicrophone || isLoadingDevices}
            className={cn(
              "w-full h-11 rounded-xl transition-all duration-300",
              isTesting
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                : "bg-settings-active hover:bg-settings-active/90 text-settings-active-text"
            )}
          >
            <Mic className={cn("h-4 w-4 mr-2", isTesting && "animate-pulse")} />
            {isTesting ? "Stop Test" : "Test Selected Microphone"}
          </Button>
          
          {/* Audio Level Meter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-settings-muted">
              <span>Input Level</span>
              <span>{Math.round(audioLevel)}%</span>
            </div>
            <div className="h-4 bg-settings-meter-bg rounded-full overflow-hidden relative">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-75",
                  audioLevel < 30 
                    ? "bg-green-500" 
                    : audioLevel < 70 
                      ? "bg-yellow-500" 
                      : "bg-red-500"
                )}
                style={{ width: `${audioLevel}%` }}
              />
              {/* Level markers */}
              <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none">
                <div className="h-2 w-px bg-settings-muted/30" />
                <div className="h-2 w-px bg-settings-muted/30" />
                <div className="h-2 w-px bg-settings-muted/30" />
                <div className="h-2 w-px bg-settings-muted/30" />
              </div>
            </div>
            <p className="text-xs text-settings-muted text-center">
              {isTesting 
                ? audioLevel > 5 
                  ? "✓ Microphone is working! Speak to see the level change."
                  : "Speak into your microphone to test..."
                : "Click the button above to test your microphone"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Audio Settings Info */}
      <div className="p-3 rounded-xl bg-settings-option/50 border border-settings-border">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-settings-muted mt-0.5" />
          <div className="text-xs text-settings-muted space-y-1">
            <p>Your audio will only go through the selected microphone.</p>
            <p>If you disconnect the selected device, it will automatically switch to another available microphone.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderVideoSettings = () => (
    <div className="space-y-6 animate-settings-slide-in">
   
      {isHost && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-settings-option">
          <div>
            <Label className="text-sm font-medium text-settings-text">Allow Participants to share screen</Label>
            <p className="text-xs text-settings-muted mt-0.5">Host only setting</p>
          </div>
          <Switch
            checked={allowScreenShare}
            onCheckedChange={handleScreenSharePermissionChange}
          />
        </div>
      )}

      
    
    </div>
  );

  const renderParticipantSettings = () => (
    <div className="space-y-6 animate-settings-slide-in">
      <div className="space-y-3">
        <Label className="text-sm font-medium text-settings-label">Display Name</Label>
        <div className="flex gap-2">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="flex-1 h-11 bg-settings-input border-settings-border text-settings-text rounded-xl"
            placeholder="Enter your name"
          />
          <Button
            onClick={handleNameChange}
            className="h-11 px-6 bg-settings-active hover:bg-settings-active/90 text-settings-active-text rounded-xl"
          >
            Change Name
          </Button>
        </div>
      </div>

      {isHost && (
        <>
          <div className="flex items-center justify-between p-4 rounded-xl bg-settings-option">
            <div>
              <Label className="text-sm font-medium text-settings-text">Allow participants to rename themselves</Label>
              <p className="text-xs text-settings-muted mt-0.5">Host only setting</p>
            </div>
            <Switch
              checked={allowParticipantRename}
              onCheckedChange={(checked) => {
                setAllowParticipantRename(checked);
                if (onAllowRenameChange) {
                  onAllowRenameChange(checked);
                }
                toast({
                  description: checked 
                    ? "Participants can now rename themselves" 
                    : "Participants can no longer rename themselves",
                });
              }}
            />
          </div>

          
        </>
      )}

      {!isHost && (
        <div className="p-4 rounded-xl bg-settings-option/50 border border-settings-border">
          <p className="text-sm text-settings-muted flex items-center gap-2">
            <Info className="h-4 w-4" />
            Some settings are only available to the meeting host
          </p>
        </div>
      )}
    </div>
  );

  const renderMeetingSettings = () => (
    <div className="space-y-6 animate-settings-slide-in">
      {isHost && (
        <div className="space-y-3">
          <Label className="text-sm font-medium text-settings-label">Meeting Name</Label>
          <div className="flex gap-2">
            <Input
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              className="flex-1 h-11 bg-settings-input border-settings-border text-settings-text rounded-xl"
              placeholder="Enter meeting name"
            />
            <Button 
              onClick={() => {
                if (onMeetingNameChange && meetingName.trim()) {
                  onMeetingNameChange(meetingName.trim());
                  toast({
                    title: "Meeting name updated",
                    description: `Meeting name changed to "${meetingName.trim()}"`,
                  });
                }
              }}
              disabled={!meetingName.trim()}
              className="h-11 px-6 bg-settings-active hover:bg-settings-active/90 text-settings-active-text rounded-xl"
            >
              Change Name
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Label className="text-sm font-medium text-settings-label">Meeting ID</Label>
        <div className="flex gap-2">
          <Input
            value={meetingId}
            readOnly
            className="flex-1 h-11 bg-settings-option border-settings-border text-settings-text rounded-xl font-mono"
          />
          <Button
            onClick={() => handleCopy(meetingId, "Meeting ID")}
            variant="ghost"
            className="h-11 px-4 bg-settings-option hover:bg-settings-option-hover text-settings-text rounded-xl"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isHost && (
        <>
          <div className="flex items-center justify-between p-4 rounded-xl bg-settings-option">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-settings-icon" />
              <div>
                <Label className="text-sm font-medium text-settings-text">Lock Meeting</Label>
                <p className="text-xs text-settings-muted mt-0.5">Prevent new participants from joining</p>
              </div>
            </div>
            <Switch 
              checked={lockMeeting} 
              onCheckedChange={(checked) => {
                setLockMeeting(checked);
                onLockMeetingChange?.(checked);
              }} 
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-settings-option">
            <div>
              <Label className="text-sm font-medium text-settings-text">Admit all Participants</Label>
              <p className="text-xs text-settings-muted mt-0.5">Approve participants before they join</p>
            </div>
            <Switch checked={waitingRoom} onCheckedChange={setWaitingRoom} />
          </div>

         

     

          <div className="flex items-center justify-between p-4 rounded-xl bg-settings-option">
            <div className="flex items-center gap-3">
              <Smile className="h-5 w-5 text-settings-icon" />
              <div>
                <Label className="text-sm font-medium text-settings-text">Allow Emoji Reactions</Label>
                <p className="text-xs text-settings-muted mt-0.5">Participants can react with emojis</p>
              </div>
            </div>
            <Switch 
              checked={emojiReactions} 
              onCheckedChange={(checked) => {
                setEmojiReactions(checked);
                if (onEmojiReactionsChange) {
                  onEmojiReactionsChange(checked);
                }
                toast({
                  description: checked 
                    ? "Emoji reactions have been enabled for all participants" 
                    : "Emoji reactions have been disabled for all participants",
                });
              }} 
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-settings-label">Record Meeting</Label>
            <div className="flex gap-2">
              {[
                { value: "none", label: "Don't Record" },
                { value: "local", label: "Record to Computer" },
              ].map((option) => (
                <Button
                  key={option.value}
                  onClick={() => setRecordMeeting(option.value as typeof recordMeeting)}
                  variant="ghost"
                  className={cn(
                    "flex-1 h-11 rounded-xl transition-all duration-300",
                    recordMeeting === option.value
                      ? "bg-settings-active text-settings-active-text shadow-settings-glow"
                      : "bg-settings-option hover:bg-settings-option-hover text-settings-text"
                  )}
                >
                <Circle className="h-4 w-4 mr-2 fill-red-500 text-red-500" />
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

        
        </>
      )}

      {!isHost && (
        <div className="p-4 rounded-xl bg-settings-option/50 border border-settings-border">
          <p className="text-sm text-settings-muted flex items-center gap-2">
            <Info className="h-4 w-4" />
            Meeting controls are only available to the host
          </p>
        </div>
      )}
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6 animate-settings-slide-in">
      <div className="space-y-3">
        <Label className="text-sm font-medium text-settings-label">Privacy Actions</Label>
        <div className="space-y-3">
          <Button
            variant="ghost"
            className="w-full h-14 justify-between px-4 rounded-xl bg-settings-option hover:bg-settings-option-hover text-settings-text"
            onClick={() => window.open("/privacy-policy", "_blank")}
          >
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-settings-icon" />
              <span>View Privacy Policy</span>
            </div>
            <ExternalLink className="h-4 w-4 text-settings-muted" />
          </Button>
          
          <Button
            variant="ghost"
            className="w-full h-14 justify-between px-4 rounded-xl bg-settings-option hover:bg-settings-option-hover text-settings-text"
            onClick={() => toast({ description: "Data usage settings opened" })}
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-settings-icon" />
              <span>Data Usage Settings</span>
            </div>
            <ChevronRight className="h-4 w-4 text-settings-muted" />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className="space-y-6 animate-settings-slide-in">
      <div className="space-y-3">
        <Label className="text-sm font-medium text-settings-label">System</Label>
        <div className="space-y-3">
          <Button
            variant="ghost"
            className="w-full h-14 justify-between px-4 rounded-xl bg-settings-option hover:bg-settings-option-hover text-settings-text"
            onClick={() => {
              const info = `Browser: ${navigator.userAgent}\nScreen: ${screen.width}x${screen.height}\nLanguage: ${navigator.language}`;
              toast({ description: "System info copied to clipboard" });
              navigator.clipboard.writeText(info);
            }}
          >
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-settings-icon" />
              <span>System Information</span>
            </div>
            <ChevronRight className="h-4 w-4 text-settings-muted" />
          </Button>
          
          <Button
            variant="ghost"
            className="w-full h-14 justify-between px-4 rounded-xl bg-settings-option hover:bg-settings-option-hover text-settings-text"
            onClick={() => toast({ description: "Logs viewer opened" })}
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-settings-icon" />
              <span>View Logs</span>
            </div>
            <ChevronRight className="h-4 w-4 text-settings-muted" />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderActiveGroupContent = () => {
    switch (activeGroup) {
      case "general":
        return renderGeneralSettings();
      case "audio":
        return renderAudioSettings();
      case "video":
        return renderVideoSettings();
      case "participants":
        return renderParticipantSettings();
      case "meeting":
        return renderMeetingSettings();
      case "privacy":
        return renderPrivacySettings();
      case "advanced":
        return renderAdvancedSettings();
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-fade-in"
        onClick={onClose}
      />

      {/* Settings Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-settings-bg border-l border-settings-border z-[9999] flex flex-col animate-settings-panel-slide">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-settings-border">
          <div className="flex items-center gap-3">
            {activeGroup && (
              <Button
                onClick={goBack}
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl text-settings-text hover:bg-settings-option"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-settings-text">
                {activeGroup
                  ? settingsGroups.find((g) => g.id === activeGroup)?.label
                  : "Settings"}
              </h2>
              {!activeGroup && (
                <p className="text-xs text-settings-muted">Customize your meeting experience</p>
              )}
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-settings-text hover:bg-settings-option hover:rotate-90 transition-all duration-300"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className={cn("p-4 transition-opacity duration-150", isAnimating && "opacity-0")}>
            {!activeGroup ? (
              /* Settings Groups List */
              <div className="space-y-2">
                {settingsGroups.map((group, idx) => (
                  <button
                    key={group.id}
                    onClick={() => selectGroup(group.id)}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-settings-option hover:bg-settings-option-hover text-settings-text transition-all duration-300 hover:scale-[1.02] animate-settings-item-in"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-settings-icon-bg flex items-center justify-center">
                        <group.icon className="h-5 w-5 text-settings-icon" />
                      </div>
                      <span className="font-medium">{group.label}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-settings-muted" />
                  </button>
                ))}
              </div>
            ) : (
              /* Active Group Settings */
              renderActiveGroupContent()
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

export default SettingsPanel;