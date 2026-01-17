import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Status = "online" | "busy" | "offline";

export const ProfileDialog = ({ open, onOpenChange }: ProfileDialogProps) => {
  const [status, setStatus] = useState<Status>("online");

  const statusColors = {
    online: "bg-green-500",
    busy: "bg-yellow-500",
    offline: "bg-gray-500",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Profile</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <Avatar className="h-24 w-24 ring-2 ring-primary glow-primary">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              <User className="h-12 w-12" />
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground">John Doe</h3>
            <p className="text-sm text-muted-foreground">john.doe@nexicall.com</p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <p className="text-sm text-muted-foreground text-center">Status</p>
            <div className="flex gap-2 justify-center">
              {(["online", "busy", "offline"] as Status[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    status === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${statusColors[s]}`} />
                    <span className="capitalize text-sm">{s}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
