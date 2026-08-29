import { Link } from "react-router-dom";
import { ArrowLeft, Waves, ShieldCheck, FileText, Lock } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

// Clearly-marked placeholder for company/legal details not yet provided.
function PH({ children }) {
  return (
    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[0.85em] text-amber-700 dark:text-amber-400">
      {children}
    </span>
  );
}

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
        <div className="space-y-4 text-base leading-relaxed text-muted-foreground [&_a]:text-orange-600 [&_a:hover]:underline [&_h2]:mt-8 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-foreground [&_li]:ml-1 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6">
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
    <LegalLayout icon={ShieldCheck} title="Privacy Policy" updated="Last updated: 2026 · Placeholder details marked in amber">
      <p data-testid="privacy-content">
        This Privacy Policy explains how Otter Flow ("Otter", "we", "us") handles personal data.
        We aim to write in plain language. We try to align our practices with Vietnam's Personal
        Data Protection Law (Law No. 91/2025/QH15) and its implementing regulations, and with the
        EU General Data Protection Regulation (GDPR) where it applies to you. We do not claim any
        certification or independently verified compliance.
      </p>

      <h2>Who is responsible for your data</h2>
      <p>
        Data controller: <PH>[Legal entity name — to be provided]</PH>, <PH>[registered address — to be provided]</PH>.
        Privacy contact: <PH>[privacy contact email — to be provided]</PH>. If we are required to
        appoint a data protection officer or representative, their details will be added here:{" "}
        <PH>[DPO / representative — if applicable]</PH>.
      </p>

      <h2>What personal data we collect</h2>
      <ul>
        <li><strong>Account identity</strong> (via our authentication provider): your name, email address, and profile image if you provide them when you sign in.</li>
        <li><strong>Content you create</strong>: projects, focus sessions, and next-action capsules (including any text you type, such as a next action, workspace pointer, or "done when" note).</li>
        <li><strong>Product telemetry</strong>: minimal, timestamped events — when a project is opened, a session starts or ends, a capsule is created, and when you click "start". We use these to keep the core loop reliable.</li>
        <li><strong>GitHub connection data</strong> (only if you connect GitHub): your GitHub login, the installation identifier, and minimal metadata for repositories you select (id, owner, name, URL). We also hold GitHub access/refresh tokens, stored encrypted on our servers.</li>
      </ul>
      <p>We do not intentionally collect special-category/sensitive personal data, and we ask that you not store it in your projects.</p>

      <h2>Why we use it, and our legal basis</h2>
      <ul>
        <li><strong>To provide the service</strong> (accounts, projects, the session/capsule loop): performance of our agreement with you / necessary to provide a service you requested.</li>
        <li><strong>GitHub integration</strong>: your consent when you connect, and performance of the service you requested. You can withdraw consent by disconnecting.</li>
        <li><strong>Product telemetry</strong>: our legitimate interest in keeping the product working reliably; where required, we rely on your consent.</li>
        <li><strong>Security and abuse prevention</strong>: our legitimate interest / legal obligations.</li>
        <li><strong>Communications you request</strong>: consent or legitimate interest.</li>
      </ul>

      <h2>GitHub data and permissions</h2>
      <p>
        Otter uses a GitHub App with <strong>Metadata: read-only</strong> and <strong>Contents:
        read-only</strong> permissions, limited to the repositories <strong>you select</strong>
        during installation. We use this access to list the repositories you grant and to let you
        link one to a project. <strong>We do not clone, store, or analyze your repository source
        code.</strong> We store only minimal repo metadata (id, owner, name, URL). GitHub tokens are
        kept server-side, encrypted at rest, and are never exposed to the browser or stored in
        local storage.
      </p>

      <h2>Data minimization</h2>
      <p>
        We collect only what we need to run the features you use, and we keep GitHub scopes to the
        minimum (read-only, selected repositories, metadata only).
      </p>

      <h2>Retention</h2>
      <ul>
        <li>Account and content data are kept while your account is active.</li>
        <li>Deleting a project permanently removes its sessions, capsules, and related telemetry.</li>
        <li>Disconnecting GitHub deletes the stored connection and tokens (and revokes the authorization).</li>
        <li>Short-lived security values (e.g., the OAuth "state" used during GitHub connect) expire quickly.</li>
        <li>If you ask us to delete your account, we delete associated personal data unless we must keep specific records to meet a legal obligation.</li>
      </ul>

      <h2>Service providers (subprocessors) and third parties</h2>
      <p>We share data with providers who help us operate Otter, only as needed:</p>
      <ul>
        <li><strong>Clerk</strong> — authentication and session management (account identity).</li>
        <li><strong>Supabase</strong> — managed PostgreSQL database hosting (stores your app data).</li>
        <li><strong>GitHub</strong> — the integration you choose to connect.</li>
        <li><strong>Hosting/infrastructure provider</strong>: <PH>[provider name — to be provided]</PH>.</li>
      </ul>
      <p>We do not sell your personal data, and we do not use your project data to train AI models.</p>

      <h2>International data transfers</h2>
      <p>
        The providers above may process data outside Vietnam and/or the EEA. Where such transfers
        happen and safeguards are legally required, we rely on appropriate mechanisms (for example,
        standard contractual clauses or a provider's equivalent commitments). The specific transfer
        mechanisms per provider are: <PH>[to be confirmed]</PH>. We have not independently verified
        any provider's certifications.
      </p>

      <h2>Security</h2>
      <p>
        See our <Link to="/security">Security</Link> page for the actual measures in this MVP,
        including server-side secrets, encryption of GitHub tokens at rest, and account-level data
        isolation. No method of transmission or storage is completely secure, and we do not
        guarantee absolute security.
      </p>

      <h2>Cookies and session storage</h2>
      <p>
        Otter uses <strong>essential cookies/session storage only</strong>, set by our
        authentication provider to keep you signed in. We do not use advertising or cross-site
        tracking cookies, so we do not show a consent banner. If this ever changes, we will update
        this policy and request consent where required.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on your location (including under Vietnam's PDPL and the EU GDPR), you may have the
        right to: access your data; correct it; delete it; restrict or object to certain processing;
        data portability; and withdraw consent at any time (without affecting prior processing).
        You can exercise many of these directly in the app (edit or delete projects, disconnect
        GitHub), or contact us at <PH>[privacy contact email — to be provided]</PH>. You may also have
        the right to lodge a complaint with your local data protection authority.
      </p>

      <h2>Account and project deletion</h2>
      <p>
        You can delete any project at any time, which removes its sessions, capsules, and telemetry.
        To delete your entire account and associated data, contact us at{" "}
        <PH>[privacy contact email — to be provided]</PH> (self-serve account deletion is planned).
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy as the product evolves. We will change the "last updated" date and,
        for material changes, provide a more prominent notice where appropriate.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Contact <PH>[privacy contact email — to be provided]</PH>
        {" "}(entity: <PH>[legal entity name — to be provided]</PH>).
      </p>
    </LegalLayout>
  );
}

export function Terms() {
  return (
    <LegalLayout icon={FileText} title="Terms of Service" updated="Last updated: 2026 · Placeholder details marked in amber">
      <p data-testid="terms-content">
        These Terms govern your use of Otter Flow ("Otter", "we", "us"), provided by{" "}
        <PH>[legal entity name — to be provided]</PH>. By using Otter you agree to these Terms. Please
        also read our <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>What Otter does</h2>
      <p>
        Otter Flow helps solo builders restart long-running projects with less friction. You create
        projects, run focus sessions, and save a small "next action" capsule so that when you return,
        you can start immediately. You can optionally connect selected GitHub repositories.
      </p>

      <h2>Eligibility and your account</h2>
      <p>
        You must be old enough to form a binding contract where you live and able to comply with
        these Terms. You sign in through our authentication provider and are responsible for the
        accuracy of your account information.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>Use Otter lawfully and only for its intended purpose.</li>
        <li>Keep your login credentials and connected accounts secure; you are responsible for activity under your account.</li>
        <li>Don't upload content you have no right to store, and avoid storing sensitive personal data in projects.</li>
      </ul>

      <h2>Ownership of your data</h2>
      <p>
        You own the projects, sessions, and capsules you create. We claim no ownership of your
        content. You grant us only the limited permission needed to host and operate the service for
        you (for example, to store and display your data back to you). We do not use your project
        data to train AI models.
      </p>

      <h2>GitHub integration</h2>
      <ul>
        <li>Connecting GitHub is optional and uses read-only permissions on repositories you select.</li>
        <li>Your use of GitHub remains subject to GitHub's own terms.</li>
        <li>We store only minimal repo metadata and do not store your source code.</li>
        <li>You can disconnect at any time, which revokes authorization and deletes the stored connection.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>
        Don't attempt to access other users' data, disrupt or reverse-engineer the service, or use it
        to break the law or infringe others' rights. Access is scoped to your own account.
      </p>

      <h2>Availability and changes</h2>
      <p>
        Otter is an evolving MVP provided on an "as is" and "as available" basis. Features may change,
        pause, or be discontinued, and we do not promise any specific uptime.
      </p>

      <h2>Termination and deletion</h2>
      <p>
        You may stop using Otter and delete your projects at any time. We may suspend or terminate
        access if you materially breach these Terms or to protect the service or other users.
      </p>

      <h2>Disclaimers</h2>
      <p>
        To the extent permitted by law, Otter is provided without warranties of any kind. We do not
        warrant that the service will be uninterrupted, error-free, or fit for a particular purpose.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by applicable law, and except where liability cannot be
        limited by law, we are not liable for indirect, incidental, special, or consequential
        damages, or for loss of data or profits arising from your use of Otter.
      </p>

      <h2>Your mandatory rights are not waived</h2>
      <p>
        Nothing in these Terms limits or waives any rights you have that cannot be limited or waived
        under mandatory law, including mandatory consumer-protection rights under Vietnamese law and,
        where applicable, EU/EEA consumer and data-protection rights. If any provision conflicts with
        such mandatory rights, that provision does not apply to the extent of the conflict.
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws of <PH>[governing jurisdiction — to be provided]</PH>,
        without prejudice to the mandatory consumer and data-protection rights you enjoy in your
        country of residence. Disputes will be handled by the competent courts of{" "}
        <PH>[venue — to be provided]</PH>, again without removing any mandatory local protections.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms? Contact <PH>[contact email — to be provided]</PH>.
      </p>
    </LegalLayout>
  );
}

export function Security() {
  return (
    <LegalLayout icon={Lock} title="Security" updated="Last updated: 2026">
      <p data-testid="security-content">
        This page describes the <strong>actual security practices in the current MVP</strong>. We
        deliberately do not claim audits, penetration tests, or certifications (such as ISO 27001 or
        SOC 2) that we have not undergone.
      </p>

      <h2>GitHub access is minimal and read-only</h2>
      <ul>
        <li><strong>Minimum permissions</strong>: the GitHub App requests only Metadata and Contents, both <strong>read-only</strong>.</li>
        <li><strong>Selected repositories only</strong>: access is limited to the repositories you choose during installation.</li>
        <li><strong>No source-code storage by default</strong>: we do not clone, store, or analyze your source code. We store only minimal repo metadata (id, owner, name, URL).</li>
      </ul>

      <h2>Secrets stay server-side</h2>
      <ul>
        <li>Authentication secrets and the GitHub Client Secret live only on the server.</li>
        <li>GitHub user tokens are handled server-side and <strong>encrypted at rest</strong>; they are never sent to the browser or stored in local storage.</li>
      </ul>

      <h2>Authorization and ownership isolation</h2>
      <p>
        Every request is authenticated, and all project, session, and capsule data is scoped to your
        account on the server. You can only read or modify your own data.
      </p>

      <h2>Deletion and disconnect controls</h2>
      <ul>
        <li>Deleting a project permanently removes its sessions, capsules, and telemetry.</li>
        <li>Disconnecting GitHub revokes the authorization grant and deletes the stored connection and tokens.</li>
      </ul>

      <h2>Data use commitments</h2>
      <ul>
        <li>We do not sell your data.</li>
        <li>We do not train AI on your private project data.</li>
      </ul>

      <h2>Reporting a concern</h2>
      <p>
        If you believe you've found a security issue, please contact{" "}
        <PH>[security contact email — to be provided]</PH>. No online service can guarantee perfect
        security, but we take reasonable steps to protect your data and will keep this page updated as
        our practices evolve.
      </p>
    </LegalLayout>
  );
}
