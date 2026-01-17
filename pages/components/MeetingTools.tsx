import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Monitor, Circle, MessageSquare, PenTool, MoreHorizontal, Users, Sparkles, MicOff, Hand, BarChart3, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { toast } from "sonner";

const mainTools = [
  { icon: Monitor, label: "Screen Share", action: "screen-share" },
  { icon: Circle, label: "Record", action: "record" },
  { icon: MessageSquare, label: "Chat", action: "chat" },
  { icon: PenTool, label: "Whiteboard", action: "whiteboard" },
  { icon: Users, label: "Breakout", action: "breakout" },
];

const moreTools = [
  { icon: Sparkles, label: "Background Effects", action: "background" },
  { icon: MicOff, label: "Noise Cancellation", action: "noise" },
  { icon: Hand, label: "Raise Hand", action: "raise-hand" },
  { icon: BarChart3, label: "Polls", action: "polls" },
  { icon: FileText, label: "Meeting Notes", action: "notes" },
];

export const MeetingTools = () => {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleToolClick = (action: string, label: string) => {
    if (action === "whiteboard") {
      navigate("/whiteboard");
    } else {
      toast.info(`${label} feature coming soon!`);
    }
  };

  return (
    <>
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 animate-fade-in">
        <h3 className="text-lg font-semibold text-foreground mb-4">Meeting Tools</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {mainTools.map((tool) => (
            <Button
              key={tool.action}
              variant="outline"
              className="flex flex-col h-24 w-full gap-2 hover:bg-secondary hover:border-primary transition-all hover:scale-105"
              onClick={() => handleToolClick(tool.action, tool.label)}
            >
              <tool.icon className="h-6 w-6 text-primary" />
              <span className="text-xs text-foreground">{tool.label}</span>
            </Button>
          ))}

          <Button
            variant="outline"
            className="flex flex-col h-24 w-full gap-2 hover:bg-secondary hover:border-primary transition-all hover:scale-105"
            onClick={() => setDrawerOpen(true)}
          >
            <MoreHorizontal className="h-6 w-6 text-primary" />
            <span className="text-xs text-foreground">More Tools</span>
          </Button>
        </div>
      </Card>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[60vh] rounded-t-3xl border-t border-border shadow-2xl">
          <DrawerHeader className="relative border-b border-border/50 pb-4">
            <DrawerTitle className="text-center text-foreground">More Tools</DrawerTitle>
            <DrawerClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DrawerClose>
          </DrawerHeader>
          
          <div className="p-6 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {moreTools.map((tool) => (
                <Button
                  key={tool.action}
                  variant="outline"
                  className="flex flex-col h-24 w-full gap-2 hover:bg-secondary hover:border-primary transition-all hover:scale-105"
                  onClick={() => {
                    handleToolClick(tool.action, tool.label);
                    setDrawerOpen(false);
                  }}
                >
                  <tool.icon className="h-6 w-6 text-primary" />
                  <span className="text-xs text-foreground text-center">{tool.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};