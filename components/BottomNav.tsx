import { Home, Calendar, Video, User, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Calendar, label: "Schedule", path: "/schedule" },
  { icon: Video, label: "Meeting", path: "/meeting" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      {/* Solid background with blur */}
      <div className="bg-card/95 backdrop-blur-xl border-t border-border">
        <div className="flex items-center justify-around px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300",
                  "min-w-[4.5rem] relative group",
                  isActive
                    ? "text-nav-active"
                    : "text-nav-inactive hover:text-foreground"
                )}
              >
                {/* Active indicator glow */}
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-primary/10 glow-primary" />
                )}

                {/* Icon container */}
                <div
                  className={cn(
                    "relative z-10 p-2 rounded-lg transition-all duration-300",
                    isActive
                      ? "gradient-primary text-primary-foreground scale-110"
                      : "group-hover:bg-secondary"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "relative z-10 text-xs font-medium transition-all duration-300",
                    isActive && "text-primary"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
