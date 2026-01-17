import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Check, Image, Sparkles, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface BackgroundEffectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBackground: (background: BackgroundOption) => void;
  currentBackground: string | null;
}

export interface BackgroundOption {
  id: string;
  type: 'none' | 'blur' | 'image' | 'color';
  value: string;
  label: string;
  preview?: string;
}

const defaultBackgrounds: BackgroundOption[] = [
  { id: 'none', type: 'none', value: 'none', label: 'None' },
  { id: 'blur-light', type: 'blur', value: '8px', label: 'Light Blur' },
  { id: 'blur-strong', type: 'blur', value: '16px', label: 'Strong Blur' },
  { id: 'color-dark', type: 'color', value: '#1a1a2e', label: 'Dark' },
  { id: 'color-gradient', type: 'color', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', label: 'Gradient' },
  { id: 'color-office', type: 'color', value: '#2d3436', label: 'Office' },
];

const BackgroundEffectsModal = ({
  isOpen,
  onClose,
  onSelectBackground,
  currentBackground,
}: BackgroundEffectsModalProps) => {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string>(currentBackground || 'none');

  if (!isOpen) return null;

  const handleSelect = (bg: BackgroundOption) => {
    setSelectedId(bg.id);
    onSelectBackground(bg);
    toast({
      description: `Background set to ${bg.label}`,
      duration: 2000,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg mx-4 bg-card rounded-3xl shadow-xl border border-border overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Background Effects</h2>
          </div>
          <Button onClick={onClose} variant="ghost" size="icon" className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Choose a virtual background or blur effect for your video.
          </p>

          <div className="grid grid-cols-3 gap-3">
            {defaultBackgrounds.map((bg) => (
              <button
                key={bg.id}
                onClick={() => handleSelect(bg)}
                className={cn(
                  "relative aspect-video rounded-xl overflow-hidden transition-all duration-300 group",
                  "border-2",
                  selectedId === bg.id 
                    ? "border-primary ring-2 ring-primary/30" 
                    : "border-border/50 hover:border-primary/50"
                )}
              >
                {/* Background Preview */}
                <div 
                  className={cn(
                    "absolute inset-0 flex items-center justify-center",
                    bg.type === 'none' && "bg-secondary",
                    bg.type === 'blur' && "bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm",
                  )}
                  style={
                    bg.type === 'color' 
                      ? { background: bg.value }
                      : bg.type === 'blur'
                        ? { backdropFilter: `blur(${bg.value})` }
                        : undefined
                  }
                >
                  {bg.type === 'none' && (
                    <Ban className="h-6 w-6 text-muted-foreground" />
                  )}
                  {bg.type === 'blur' && (
                    <div className="text-xs font-medium text-foreground/80">Blur</div>
                  )}
                </div>

                {/* Label */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-background/80 to-transparent">
                  <span className="text-xs font-medium text-foreground">{bg.label}</span>
                </div>

                {/* Selected Indicator */}
                {selectedId === bg.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Custom upload hint */}
          <div className="mt-4 p-3 rounded-xl bg-secondary/50 border border-dashed border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Image className="h-4 w-4" />
              <span className="text-xs">Custom image backgrounds coming soon</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex gap-3">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button onClick={onClose} className="flex-1">
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BackgroundEffectsModal;
