import { Link } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { Waves } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Navbar() {
  return (
    <header
      data-testid="navbar"
      className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-8">
        <Link
          to="/"
          data-testid="brand-link"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white">
            <Waves className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="font-heading text-xl font-bold tracking-tight">
            Otter Flow
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}
