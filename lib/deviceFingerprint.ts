/**
 * Generate a unique device fingerprint based on browser characteristics
 * This creates a consistent identifier for each device/browser combination
 */
export const generateDeviceFingerprint = async (): Promise<string> => {
  const components: string[] = [];

  // Screen resolution
  components.push(`${window.screen.width}x${window.screen.height}`);
  components.push(`${window.screen.colorDepth}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Language
  components.push(navigator.language);

  // Platform
  components.push(navigator.platform);

  // User agent
  components.push(navigator.userAgent);

  // Hardware concurrency (CPU cores)
  components.push(`${navigator.hardwareConcurrency || 'unknown'}`);

  // Device memory (if available)
  const deviceMemory = (navigator as any).deviceMemory;
  if (deviceMemory) {
    components.push(`${deviceMemory}GB`);
  }

  // Canvas fingerprint (more unique)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Smart Steps', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Smart Steps', 4, 17);
      components.push(canvas.toDataURL());
    }
  } catch (e) {
    // Canvas fingerprinting might be blocked
    components.push('canvas-blocked');
  }

  // WebGL fingerprint
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
      }
    }
  } catch (e) {
    components.push('webgl-blocked');
  }

  // Combine all components
  const fingerprint = components.join('|');

  // Generate hash using SubtleCrypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
};

/**
 * Get or create device fingerprint
 * Stores in localStorage for consistency across sessions
 */
export const getDeviceFingerprint = async (): Promise<string> => {
  const stored = localStorage.getItem('device_fingerprint');
  
  if (stored) {
    return stored;
  }

  const fingerprint = await generateDeviceFingerprint();
  localStorage.setItem('device_fingerprint', fingerprint);
  
  return fingerprint;
};

/**
 * Check if device has already attempted a specific exam
 */
export const checkExistingAttempt = async (
  examId: string,
  deviceFingerprint: string
): Promise<boolean> => {
  const { supabase } = await import('../pages/integrations/supabase/client');
  
  const { data, error } = await supabase
    .from('student_attempts')
    .select('id')
    .eq('exam_id', examId)
    .eq('device_fingerprint', deviceFingerprint)
    .limit(1);

  if (error) {
    console.error('Error checking existing attempt:', error);
    return false;
  }

  return (data?.length || 0) > 0;
};