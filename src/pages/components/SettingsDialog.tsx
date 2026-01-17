import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Settings</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="text-foreground">Enable Notifications</Label>
            <Switch id="notifications" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="camera" className="text-foreground">Camera by Default</Label>
            <Switch id="camera" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="mic" className="text-foreground">Microphone by Default</Label>
            <Switch id="mic" defaultChecked />
          </div>
          <div className="space-y-2">
            <Label htmlFor="volume" className="text-foreground">Volume</Label>
            <Slider id="volume" defaultValue={[75]} max={100} step={1} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
