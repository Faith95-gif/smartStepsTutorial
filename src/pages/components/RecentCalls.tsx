import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Video, Users } from "lucide-react";

const recentCalls = [
  { id: 1, name: "Team Standup", participants: 5, time: "2 hours ago", type: "group" },
  { id: 2, name: "Client Meeting", participants: 2, time: "Yesterday", type: "direct" },
  { id: 3, name: "Project Review", participants: 8, time: "2 days ago", type: "group" },
];

export const RecentCalls = () => {
  return (
    <div className="w-full max-w-2xl">
      <h3 className="text-lg font-semibold text-foreground mb-4">Recent Calls</h3>
      <div className="flex flex-col gap-3">
        {recentCalls.map((call) => (
          <Card
            key={call.id}
            className="glass-effect border-border p-4 hover:border-primary/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 bg-secondary group-hover:bg-primary/20 transition-colors">
                <AvatarFallback className="bg-secondary text-secondary-foreground group-hover:text-primary transition-colors">
                  {call.type === "group" ? <Users className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h4 className="font-medium text-foreground">{call.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {call.participants} participant{call.participants > 1 ? "s" : ""} • {call.time}
                </p>
              </div>
              <Video className="h-5 w-5 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
