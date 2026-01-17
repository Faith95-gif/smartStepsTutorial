import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const Index = () => {
  const navigate = useNavigate();
  const [meetingId, setMeetingId] = useState("");

  const handleCreateMeeting = () => {
    const newMeetingId = `meeting_${Date.now()}`;
    navigate(`/meeting?id=${newMeetingId}&host=true`);
  };

  const handleJoinMeeting = () => {
    if (meetingId.trim()) {
      navigate(`/meeting?id=${meetingId}`);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="w-full max-w-2xl p-12 bg-card rounded-3xl shadow-2xl border border-border">
        <div className="text-center mb-12">
          <h1 className="mb-4 text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Video Conferencing
          </h1>
          <p className="text-xl text-muted-foreground">Connect with anyone, anywhere</p>
        </div>

        <div className="space-y-6">
          <div className="p-8 bg-muted/50 rounded-2xl">
            <h2 className="text-2xl font-semibold mb-4">Start a New Meeting</h2>
            <Button 
              onClick={handleCreateMeeting}
              size="lg"
              className="w-full h-14 text-lg"
            >
              Create Meeting
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <div className="p-8 bg-muted/50 rounded-2xl">
            <h2 className="text-2xl font-semibold mb-4">Join a Meeting</h2>
            <div className="flex gap-3">
              <Input
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                placeholder="Enter meeting ID"
                className="h-14 text-lg"
                onKeyPress={(e) => e.key === 'Enter' && handleJoinMeeting()}
              />
              <Button
                onClick={handleJoinMeeting}
                size="lg"
                className="h-14 px-8"
                disabled={!meetingId.trim()}
              >
                Join
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
