import { Link } from "react-router-dom";
import { ArrowLeft, Waves, ShieldCheck, FileText, Lock } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

function LegalLayout({ icon: Icon, title, updated, children }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80" data-testid="legal-home-link">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white">
              <Waves className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="font-heading text-xl font-bold tracking-tight">Otter Flow</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          data-testid="legal-back-link"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Back to app
        </Link>
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-orange-600">
            <Icon className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="font-heading text-4xl font-extrabold tracking-tighter">{title}</h1>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {updated}
            </p>
          </div>
        </div>
        <div className="space-y-5 text-base leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-foreground [&_strong]:text-foreground">
          {children}
        </div>
        <LegalNav />
      </main>
    </div>
  );
}

function LegalNav() {
  return (
    <nav className="mt-12 flex gap-4 border-t border-border pt-6 text-sm">
      <Link to="/privacy" className="hover:text-orange-600" data-testid="nav-privacy">Privacy</Link>
      <Link to="/terms" className="hover:text-orange-600" data-testid="nav-terms">Terms</Link>
      <Link to="/security" className="hover:text-orange-600" data-testid="nav-security">Security</Link>
    </nav>
  );
}

export function Privacy() {
  return (
    <LegalLayout icon={ShieldCheck} title="Privacy" updated="Last updated: 2026" >
      <p data-testid="privacy-content">
        Otter Flow is a workspace for solo builders. We collect only what we need to run the
        product: your account identity (via our authentication provider), the projects,
        sessions, and next-action capsules you create, and minimal product telemetry
        (when a project is opened, a session starts or ends, and a capsule is created).
      </p>
      <h2>What we do not do</h2>
      <p>
        <strong>We do not sell your data.</strong> <strong>We do not train AI on your project
        data.</strong> <strong>We do not store your repository source code.</strong> When you
        connect GitHub, we read only the minimal repository metadata you select (id, owner,
        name, and URL) so you can link a repo to a project. We never clone, store, or analyze
        your source code.
      </p>
      <h2>GitHub tokens</h2>
      <p>
        GitHub access is handled entirely server-side. Tokens are encrypted at rest and are
        never exposed to the browser or stored in local storage. You can disconnect GitHub at
        any time, which revokes the authorization and deletes the stored connection.
      </p>
      <h2>Your controls</h2>
      <p>
        You can delete a project at any time, which permanently removes its sessions, capsules,
        and related telemetry. You can disconnect GitHub at any time. You only ever have access
        to your own data.
      </p>
    </LegalLayout>
  );
}

export function Terms() {
  return (
    <LegalLayout icon={FileText} title="Terms" updated="Last updated: 2026">
      <p data-testid="terms-content">
        By using Otter Flow you agree to use it for lawful purposes and to keep your account
        secure. Otter Flow is provided on an "as is" basis for the current MVP without warranties
        of any kind.
      </p>
      <h2>Your content</h2>
      <p>
        You retain ownership of the projects, sessions, and capsules you create. You are
        responsible for the content you store. We do not claim rights over your data and we do
        not use it to train AI models.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Do not attempt to access other users' data or disrupt the service. Access is scoped to
        your own account; unauthorized access attempts are prohibited.
      </p>
      <h2>Changes</h2>
      <p>
        As this is an evolving MVP, features and these terms may change. Continued use after
        changes constitutes acceptance.
      </p>
    </LegalLayout>
  );
}

export function Security() {
  return (
    <LegalLayout icon={Lock} title="Security" updated="Last updated: 2026">
      <p data-testid="security-content">
        Security is built into how Otter Flow handles your data and integrations.
      </p>
      <h2>Data isolation</h2>
      <p>
        Every request is authenticated and scoped to your account. All project, session, and
        capsule queries are filtered by your user id on the server, so you can only ever read or
        modify your own data.
      </p>
      <h2>Secrets stay server-side</h2>
      <p>
        Authentication secrets, the GitHub Client Secret, and GitHub user tokens live only on the
        server. GitHub tokens are <strong>encrypted at rest</strong> and are never sent to the
        browser or stored in local storage.
      </p>
      <h2>Repository code</h2>
      <p>
        We request only <strong>read-only Metadata and Contents</strong> permissions and store
        only minimal repo metadata (id, owner, name, URL). <strong>We do not clone, store, or
        analyze your repository source code.</strong>
      </p>
      <h2>Deletion</h2>
      <p>
        Deleting a project permanently removes its sessions, capsules, and telemetry. Disconnecting
        GitHub revokes the authorization grant and deletes the stored connection.
      </p>
    </LegalLayout>
  );
}
