// AudioDeviceManager.ts - Comprehensive audio device management

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  isDefault: boolean;
}

export interface AudioSettings {
  selectedMicrophoneId: string | null;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

type DeviceChangeCallback = (devices: AudioDevice[]) => void;

class AudioDeviceManager {
  private static instance: AudioDeviceManager;
  private devices: AudioDevice[] = [];
  private selectedDeviceId: string | null = null;
  private currentStream: MediaStream | null = null;
  private deviceChangeCallbacks: Set<DeviceChangeCallback> = new Set();
  private echoCancellation: boolean = true;
  private noiseSuppression: boolean = true;
  private autoGainControl: boolean = true;
  private hasPermission: boolean = false;
  private isInitialized: boolean = false;

  private constructor() {
    // Load saved settings from localStorage
    this.loadSettings();
    
    // Listen for device changes
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange);
    }
  }

  static getInstance(): AudioDeviceManager {
    if (!AudioDeviceManager.instance) {
      AudioDeviceManager.instance = new AudioDeviceManager();
    }
    return AudioDeviceManager.instance;
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('audio-device-settings');
      if (saved) {
        const settings: AudioSettings = JSON.parse(saved);
        this.selectedDeviceId = settings.selectedMicrophoneId;
        this.echoCancellation = settings.echoCancellation ?? true;
        this.noiseSuppression = settings.noiseSuppression ?? true;
        this.autoGainControl = settings.autoGainControl ?? true;
      }
    } catch (error) {
      console.error('Failed to load audio settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      const settings: AudioSettings = {
        selectedMicrophoneId: this.selectedDeviceId,
        echoCancellation: this.echoCancellation,
        noiseSuppression: this.noiseSuppression,
        autoGainControl: this.autoGainControl,
      };
      localStorage.setItem('audio-device-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save audio settings:', error);
    }
  }

  private handleDeviceChange = async (): Promise<void> => {
    console.log('🔄 Device change detected');
    await this.refreshDevices();
    
    // Check if the selected device is still available
    if (this.selectedDeviceId) {
      const stillExists = this.devices.some(d => d.deviceId === this.selectedDeviceId);
      if (!stillExists) {
        console.log('⚠️ Selected device disconnected, switching to default');
        const defaultDevice = this.devices.find(d => d.isDefault) || this.devices[0];
        if (defaultDevice) {
          await this.selectDevice(defaultDevice.deviceId);
        }
      }
    }

    // Notify all listeners
    this.deviceChangeCallbacks.forEach(callback => {
      callback([...this.devices]);
    });
  };

  async requestPermission(): Promise<boolean> {
    try {
      // Request permission by attempting to get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just needed the permission
      stream.getTracks().forEach(track => track.stop());
      this.hasPermission = true;
      console.log('✅ Microphone permission granted');
      return true;
    } catch (error) {
      console.error('❌ Microphone permission denied:', error);
      this.hasPermission = false;
      return false;
    }
  }

  async initialize(): Promise<AudioDevice[]> {
    if (this.isInitialized && this.hasPermission) {
      return this.devices;
    }

    // First request permission if needed
    if (!this.hasPermission) {
      await this.requestPermission();
    }

    // Then enumerate devices
    await this.refreshDevices();
    this.isInitialized = true;

    // If we have a saved selection and it exists, keep it
    // Otherwise, select the default device
    if (this.selectedDeviceId) {
      const exists = this.devices.some(d => d.deviceId === this.selectedDeviceId);
      if (!exists) {
        const defaultDevice = this.devices.find(d => d.isDefault) || this.devices[0];
        if (defaultDevice) {
          this.selectedDeviceId = defaultDevice.deviceId;
          this.saveSettings();
        }
      }
    } else {
      const defaultDevice = this.devices.find(d => d.isDefault) || this.devices[0];
      if (defaultDevice) {
        this.selectedDeviceId = defaultDevice.deviceId;
        this.saveSettings();
      }
    }

    return this.devices;
  }

  async refreshDevices(): Promise<AudioDevice[]> {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter(d => d.kind === 'audioinput');
      
      console.log('📱 Found audio devices:', audioInputs.length);

      this.devices = audioInputs.map((device, index) => {
        // Check if this is the default device
        const isDefault = device.deviceId === 'default' || 
                         device.label.toLowerCase().includes('default') ||
                         (index === 0 && !audioInputs.some(d => d.deviceId === 'default'));

        return {
          deviceId: device.deviceId,
          label: device.label || `Microphone ${index + 1}`,
          kind: device.kind as 'audioinput',
          isDefault,
        };
      });

      // Filter out the "default" device if there's also a specific device
      // and keep track of which is actually default
      const defaultDevice = this.devices.find(d => d.deviceId === 'default');
      if (defaultDevice && this.devices.length > 1) {
        // Find the actual device that "default" maps to
        const otherDevices = this.devices.filter(d => d.deviceId !== 'default');
        // Remove the generic "default" entry but mark the first real device as default
        if (otherDevices.length > 0) {
          otherDevices[0].isDefault = true;
        }
        this.devices = otherDevices;
      }

      return this.devices;
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      return [];
    }
  }

  getDevices(): AudioDevice[] {
    return [...this.devices];
  }

  getSelectedDeviceId(): string | null {
    return this.selectedDeviceId;
  }

  async selectDevice(deviceId: string): Promise<boolean> {
    const device = this.devices.find(d => d.deviceId === deviceId);
    if (!device) {
      console.error('Device not found:', deviceId);
      return false;
    }

    console.log('🎤 Selecting microphone:', device.label);
    this.selectedDeviceId = deviceId;
    this.saveSettings();

    // If there's an active stream, update it
    if (this.currentStream) {
      await this.stopCurrentStream();
      await this.getStream();
    }

    return true;
  }

  setEchoCancellation(enabled: boolean): void {
    console.log('🔊 Echo cancellation:', enabled ? 'enabled' : 'disabled');
    this.echoCancellation = enabled;
    this.saveSettings();
  }

  setNoiseSuppression(enabled: boolean): void {
    this.noiseSuppression = enabled;
    this.saveSettings();
  }

  setAutoGainControl(enabled: boolean): void {
    this.autoGainControl = enabled;
    this.saveSettings();
  }

  getEchoCancellation(): boolean {
    return this.echoCancellation;
  }

  getNoiseSuppression(): boolean {
    return this.noiseSuppression;
  }

  getAutoGainControl(): boolean {
    return this.autoGainControl;
  }

  async getStream(): Promise<MediaStream | null> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: this.selectedDeviceId ? { exact: this.selectedDeviceId } : undefined,
          echoCancellation: this.echoCancellation,
          noiseSuppression: this.noiseSuppression,
          autoGainControl: this.autoGainControl,
        },
      };

      console.log('🎙️ Getting audio stream with constraints:', constraints.audio);
      
      this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Log the actual track settings
      const track = this.currentStream.getAudioTracks()[0];
      if (track) {
        const settings = track.getSettings();
        console.log('✅ Audio track settings:', {
          deviceId: settings.deviceId,
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl,
        });
      }

      return this.currentStream;
    } catch (error) {
      console.error('❌ Failed to get audio stream:', error);
      
      // If exact device failed, try with default
      if (this.selectedDeviceId) {
        console.log('⚠️ Retrying with default device...');
        try {
          this.currentStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: this.echoCancellation,
              noiseSuppression: this.noiseSuppression,
              autoGainControl: this.autoGainControl,
            },
          });
          return this.currentStream;
        } catch (retryError) {
          console.error('❌ Failed to get audio with default device:', retryError);
        }
      }
      
      return null;
    }
  }

  async getTestStream(deviceId?: string): Promise<MediaStream | null> {
    const targetDeviceId = deviceId || this.selectedDeviceId;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: targetDeviceId ? { exact: targetDeviceId } : undefined,
          echoCancellation: this.echoCancellation,
          noiseSuppression: this.noiseSuppression,
          autoGainControl: this.autoGainControl,
        },
      });

      // Verify we got the right device
      const track = stream.getAudioTracks()[0];
      if (track) {
        const settings = track.getSettings();
        console.log('🧪 Test stream device:', settings.deviceId);
      }

      return stream;
    } catch (error) {
      console.error('Failed to get test stream:', error);
      return null;
    }
  }

  stopCurrentStream(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => {
        track.stop();
        console.log('⏹️ Stopped audio track');
      });
      this.currentStream = null;
    }
  }

  onDeviceChange(callback: DeviceChangeCallback): () => void {
    this.deviceChangeCallbacks.add(callback);
    return () => {
      this.deviceChangeCallbacks.delete(callback);
    };
  }

  getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }

  destroy(): void {
    this.stopCurrentStream();
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChange);
    }
    this.deviceChangeCallbacks.clear();
  }
}

export const audioDeviceManager = AudioDeviceManager.getInstance();
export default AudioDeviceManager;
