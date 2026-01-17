import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  X, 
  Sparkles, 
  PenTool, 
  Hand, 
  BarChart3, 
  FileText,
  Circle,
} from "lucide-react";

interface MoreToolsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onBackgroundEffects?: () => void;
  onWhiteboard?: () => void;
  onRaiseHand?: () => void;
  onPolls?: () => void;
  onMeetingNotes?: () => void;
  onRecordMeeting?: () => void;
  onNoiseCancellation?: () => void;
  isRecording?: boolean;
}

const MoreToolsPopup = ({
  isOpen,
  onClose,
  onBackgroundEffects,
  onWhiteboard,
  onRaiseHand,
  onPolls,
  onMeetingNotes,
  onRecordMeeting,
  onNoiseCancellation,
  isRecording = false,
}: MoreToolsPopupProps) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300); // Match animation duration
  };

  const tools = [
    {
      id: "background",
      label: "Background Effects",
      icon: Sparkles,
      onClick: onBackgroundEffects,
    },
    {
      id: "whiteboard",
      label: "Whiteboard",
      icon: PenTool,
      onClick: onWhiteboard,
    },
    {
      id: "hand",
      label: "Raise Hand",
      icon: Hand,
      onClick: onRaiseHand,
    },
    {
      id: "polls",
      label: "Polls",
      icon: BarChart3,
      onClick: onPolls,
    },
    {
      id: "notes",
      label: "Meeting Notes",
      icon: FileText,
      onClick: onMeetingNotes,
    },
    {
      id: "record",
      label: isRecording ? "Stop Recording" : "Record Meeting",
      icon: Circle,
      onClick: onRecordMeeting,
      isActive: isRecording,
    }
  ];

  if (!isOpen && !isClosing) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 z-40 bg-black/60 transition-opacity duration-300",
          isClosing ? "opacity-0" : "opacity-100"
        )}
        onClick={handleClose}
      />
      
      {/* Popup Panel */}
      <div 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "bg-[#1a1d2e]",
          "rounded-t-3xl",
          "shadow-2xl",
          "transition-all duration-300",
          isClosing 
            ? "translate-y-full opacity-0 ease-in" 
            : "translate-y-0 opacity-100 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        )}
        style={{
          transitionTimingFunction: isClosing 
            ? 'cubic-bezier(0.4, 0, 1, 1)' 
            : 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-center relative px-6 pt-3 pb-6">
          <h2 className="text-base font-semibold text-white">More Tools</h2>
          <button
            onClick={handleClose}
            className="absolute right-5 top-3 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tools Grid */}
        <div className="px-5 pb-8">
          <div className="grid grid-cols-2 gap-4">
            {tools.map((tool, index) => {
              const isActive = (tool as any).isActive;
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    tool.onClick?.();
                    if (tool.id !== 'record') {
                      handleClose();
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 py-6 px-4",
                    "rounded-2xl",
                    isActive ? "bg-red-500/20" : "bg-[#252840]",
                    "border",
                    isActive ? "border-red-500" : "border-[#2d3250]",
                    "transition-all duration-200",
                    "hover:bg-[#2d3250] hover:border-[#3d4260]",
                    "active:scale-95",
                    isClosing 
                      ? "opacity-0 translate-y-2" 
                      : "opacity-100 translate-y-0"
                  )}
                  style={{
                    transitionDelay: isClosing ? '0ms' : `${index * 50}ms`,
                  }}
                >
                  <tool.icon 
                    className={cn(
                      "h-7 w-7",
                      isActive ? "text-red-500 animate-pulse" : "text-[#8b7ff4]"
                    )} 
                    strokeWidth={1.5}
                    fill={tool.id === 'record' && isActive ? "currentColor" : "none"}
                  />
                  <span className={cn(
                    "text-sm font-medium text-center leading-tight",
                    isActive ? "text-red-400" : "text-white"
                  )}>
                    {tool.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Safe area spacer */}
        <div className="h-6" />
      </div>
    </>
  );
};

export default MoreToolsPopup;