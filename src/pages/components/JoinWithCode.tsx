import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

export const JoinWithCode = () => {
  const [code, setCode] = useState("");

  const handleJoin = () => {
    if (code.trim()) {
      toast.success(`Joining meeting with code: ${code}`);
    } else {
      toast.error("Please enter a meeting code");
    }
  };

  return (
    <Card className="glass-effect border-border p-6 w-full max-w-md">
      <h3 className="text-lg font-semibold text-foreground mb-4">Join with Code</h3>
      <div className="flex gap-2">
        <Input
          placeholder="Enter meeting code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleJoin()}
          className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
        />
        <Button onClick={handleJoin} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <LogIn className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
