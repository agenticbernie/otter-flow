import { SignIn } from "@clerk/clerk-react";
import { Waves } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function SignInPage() {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute right-6 top-6 z-10">
        <ThemeToggle />
      </div>

      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-16 px-6 py-16 md:px-8 lg:grid-cols-2">
        <div className="of-rise">
          <div className="mb-6 flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white">
              <Waves className="h-6 w-6" strokeWidth={2} />
            </span>
            <span className="font-heading text-2xl font-bold tracking-tight">
              Otter Flow
            </span>
          </div>
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-orange-600">
            For solo builders
          </p>
          <h1 className="font-heading text-4xl font-extrabold leading-[1.05] tracking-tighter sm:text-5xl lg:text-6xl">
            A calm home for
            <br />
            everything you build.
          </h1>
          <p className="mt-6 max-w-md text-base text-muted-foreground">
            Organize your projects, keep your focus, and let the busywork drift
            downstream. Sign in to get into your flow.
          </p>
        </div>

        <div className="flex justify-center of-rise lg:justify-end">
          <div data-testid="signin-container" className="w-full max-w-md">
            <SignIn routing="hash" signUpUrl="#/sign-up" />
          </div>
        </div>
      </div>
    </div>
  );
}
