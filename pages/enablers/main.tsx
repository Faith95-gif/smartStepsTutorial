import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Video, User, Settings, HelpCircle, Calendar } from "lucide-react";
import { ProfileDialog } from "@/components/ProfileDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { HelpDialog } from "@/components/HelpDialog";
import { RecentCalls } from "@/components/RecentCalls";
import { JoinWithCode } from "@/components/JoinWithCode";
import { MeetingTools } from "@/components/MeetingTools";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const handleStartCall = () => {
    toast.success("Starting a new call...");
    navigate("/meeting");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background with glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center min-h-screen p-6">
        {/* Header */}
        <header className="w-full max-w-6xl flex justify-between items-center mb-12 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center glow-primary">
              <Video className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">NexiCall</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setProfileOpen(true)}
              className="text-foreground hover:text-primary hover:bg-secondary"
            >
              <User className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="text-foreground hover:text-primary hover:bg-secondary"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHelpOpen(true)}
              className="text-foreground hover:text-primary hover:bg-secondary"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex flex-col items-center gap-8 flex-1 w-full max-w-6xl">
          {/* Hero section */}
          <div className="flex flex-col items-center gap-6 my-8 animate-fade-in">
            <h2 className="text-5xl md:text-6xl font-bold text-center text-foreground">
              Connect Instantly
            </h2>
            <p className="text-xl text-muted-foreground text-center max-w-2xl">
              High-quality video calls for teams and individuals
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Button
                onClick={handleStartCall}
                size="lg"
                className="gradient-primary text-primary-foreground hover:opacity-90 text-lg px-8 py-6 glow-primary transition-all hover:scale-105"
              >
                <Video className="mr-2 h-5 w-5" />
                Start Call
              </Button>
              
              <Button
                onClick={() => navigate("/schedule")}
                size="lg"
                variant="outline"
                className="text-foreground border-border hover:border-primary hover:bg-secondary text-lg px-8 py-6 transition-all hover:scale-105"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Schedule Meeting
              </Button>
            </div>
          </div>

          {/* Join with code */}
          <div className="animate-fade-in">
            <JoinWithCode />
          </div>

          {/* Meeting Tools */}
          <div className="w-full max-w-3xl animate-fade-in">
            <MeetingTools />
          </div>

          {/* Recent calls */}
          <div className="w-full flex justify-center animate-fade-in">
            <RecentCalls />
          </div>
        </main>
      </div>

      {/* Dialogs */}
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
};

export default Index;