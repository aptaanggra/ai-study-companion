import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, FlaskConical, GraduationCap, LineChart, ScanLine } from "lucide-react";
import type { ReactNode } from "react";

const links = [
  { to: "/", label: "Beranda", icon: GraduationCap },
  { to: "/chat", label: "Diskusi Sains", icon: FlaskConical },
  { to: "/essay", label: "Soal Esai", icon: BookOpen },
  { to: "/analyze", label: "Analisa Tugas", icon: ScanLine },
  { to: "/progress", label: "Progres", icon: LineChart },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-primary/15 grid place-items-center">
              <span className="font-display text-primary text-sm">E</span>
            </div>
            <span className="font-display text-base text-foreground">EduMandiri</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => {
              const active = l.to === "/" ? path === "/" : path.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 pb-24">{children}</main>
      <nav className="md:hidden fixed bottom-3 left-3 right-3 z-40 soft-card px-2 py-1.5 flex justify-between">
        {links.map((l) => {
          const Icon = l.icon;
          const active = l.to === "/" ? path === "/" : path.startsWith(l.to);
          return (
            <Link
              key={l.to}
              to={l.to}
              className={`flex-1 flex flex-col items-center py-1 rounded-lg text-[10px] ${
                active ? "text-primary bg-secondary/70" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4 mb-0.5" />
              {l.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
