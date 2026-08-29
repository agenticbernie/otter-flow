import { Link, useNavigate } from "react-router-dom";
import {
  Waves,
  ArrowRight,
  RotateCcw,
  Save,
  Zap,
  Github,
  ShieldCheck,
  Eye,
  KeyRound,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";

function TopNav({ onGetStarted }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-8">
        <Link to="/" className="flex items-center gap-2.5" data-testid="landing-logo">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white">
            <Waves className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="font-heading text-xl font-bold tracking-tight">Otter Flow</span>
        </Link>
        <div className="flex items-center gap-2">
          <a
            href="#how"
            className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:inline-block"
            data-testid="nav-how-it-works"
          >
            How it works
          </a>
          <ThemeToggle />
          <Button
            data-testid="nav-signin-btn"
            onClick={onGetStarted}
            className="rounded-full bg-orange-600 px-5 text-white hover:bg-orange-700"
          >
            Sign in
          </Button>
        </div>
      </div>
    </header>
  );
}

function Step({ icon: Icon, index, title, body }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-orange-500/60">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-orange-600">
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </span>
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Step {index}
        </span>
      </div>
      <h3 className="font-heading text-xl font-bold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function TrustItem({ icon: Icon, text }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-orange-600">
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </span>
      <span className="text-base text-foreground">{text}</span>
    </li>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const goAuth = () => navigate("/sign-in");

  return (
    <div className="min-h-screen bg-background">
      <TopNav onGetStarted={goAuth} />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:px-8 md:pt-24">
        <div className="max-w-3xl">
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-orange-600">
            For solo builders
          </p>
          <h1 className="font-heading text-4xl font-extrabold leading-[1.05] tracking-tighter sm:text-5xl lg:text-6xl">
            Never start from zero again.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Otter Flow remembers the next small step in your project, so when you come back,
            you can start immediately.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              data-testid="hero-get-started-btn"
              onClick={goAuth}
              className="rounded-full bg-orange-600 px-7 py-6 text-base text-white transition-transform hover:bg-orange-700 active:scale-95"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" strokeWidth={2} />
            </Button>
            <Button
              asChild
              variant="outline"
              data-testid="hero-how-it-works-btn"
              className="rounded-full px-7 py-6 text-base"
            >
              <a href="#how">How it works</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Pain */}
      <section className="border-y border-border bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8">
          <div className="max-w-3xl">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              The problem
            </p>
            <p className="font-heading text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
              You open a project and waste time remembering what you were doing, what changed,
              and what to do next.
            </p>
            <p className="mt-4 text-base text-muted-foreground">
              That warm-up tax adds up. Every context switch means re-reading code, re-finding
              your place, and rebuilding momentum before any real work happens.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20 md:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-orange-600">
            How it works
          </p>
          <h2 className="font-heading text-3xl font-extrabold tracking-tighter sm:text-4xl">
            Three simple steps
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Step
            icon={RotateCcw}
            index="1"
            title="Work on your project"
            body="Do your thing. Otter stays out of your way while you build."
          />
          <Step
            icon={Save}
            index="2"
            title="Save one small next action"
            body="Before you stop, jot the single concrete step you'd take next."
          />
          <Step
            icon={Zap}
            index="3"
            title="Return and start immediately"
            body="When you come back, Otter shows that next action first — hit Start Now."
          />
        </div>
      </section>

      {/* GitHub integration */}
      <section className="border-y border-border bg-secondary/30">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-20 md:grid-cols-2 md:px-8">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-orange-600">
              GitHub
            </p>
            <h2 className="font-heading text-3xl font-extrabold tracking-tighter sm:text-4xl">
              Connect the repos you choose
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Link a GitHub repository to a project so your next action can point right where the
              work lives.
            </p>
            <ul className="mt-6 space-y-4">
              <TrustItem icon={Github} text="Only the repositories you select — nothing else." />
              <TrustItem icon={Eye} text="Read-only access to metadata and contents." />
              <TrustItem icon={Ban} text="No source code storage by default." />
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#171717] text-white dark:bg-white dark:text-[#0A0A0A]">
                <Github className="h-6 w-6" strokeWidth={1.5} />
              </span>
              <div>
                <p className="font-heading text-lg font-bold tracking-tight">Selected repos only</p>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Read-only · minimal scope
                </p>
              </div>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              You grant access per repository during install. Otter stores only minimal metadata
              (owner, name, and link) so you can jump straight back in.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-orange-600">
            Trust
          </p>
          <h2 className="font-heading text-3xl font-extrabold tracking-tighter sm:text-4xl">
            Your work stays yours
          </h2>
        </div>
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <TrustItem icon={ShieldCheck} text="We don't sell your data." />
          <TrustItem icon={Ban} text="We don't train AI on your project data." />
          <TrustItem icon={Eye} text="We don't store repository source code by default." />
          <TrustItem icon={KeyRound} text="Minimum GitHub permissions." />
        </ul>
        <p className="mt-8 text-sm text-muted-foreground">
          Read the details in our{" "}
          <Link to="/privacy" className="underline hover:text-orange-600">Privacy</Link>,{" "}
          <Link to="/terms" className="underline hover:text-orange-600">Terms</Link>, and{" "}
          <Link to="/security" className="underline hover:text-orange-600">Security</Link> pages.
        </p>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center md:px-8">
          <h2 className="font-heading text-4xl font-extrabold tracking-tighter sm:text-5xl">
            Make your next start easier.
          </h2>
          <div className="mt-8 flex justify-center">
            <Button
              data-testid="final-cta-btn"
              onClick={goAuth}
              className="rounded-full bg-orange-600 px-8 py-6 text-base text-white transition-transform hover:bg-orange-700 active:scale-95"
            >
              <Github className="mr-2 h-5 w-5" strokeWidth={1.5} />
              Start with GitHub
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
