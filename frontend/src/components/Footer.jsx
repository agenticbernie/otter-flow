import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row md:px-8">
        <p>Otter Flow · a calm home for what you build</p>
        <nav className="flex gap-5">
          <Link to="/privacy" className="hover:text-orange-600" data-testid="footer-privacy">Privacy</Link>
          <Link to="/terms" className="hover:text-orange-600" data-testid="footer-terms">Terms</Link>
          <Link to="/security" className="hover:text-orange-600" data-testid="footer-security">Security</Link>
        </nav>
      </div>
    </footer>
  );
}
