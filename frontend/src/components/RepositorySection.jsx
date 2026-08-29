import { useEffect, useState, useCallback } from "react";
import { Github, Link2, Loader2, ExternalLink, X, Plug, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function parseRepoUrl(url) {
  const m = url.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
  if (!m) return { owner: null, name: null };
  return { owner: m[1], name: m[2].replace(/\.git$/, "") };
}

export function RepositorySection({ project, onLinked }) {
  const api = useApi();
  const [status, setStatus] = useState(null); // {connected, login}
  const [repos, setRepos] = useState(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await api.githubStatus());
    } catch {
      setStatus({ connected: false });
    }
  }, [api]);

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    try {
      setBusy(true);
      const { url } = await api.githubConnectUrl();
      window.location.assign(url);
    } catch {
      toast.error("Could not start GitHub connect");
      setBusy(false);
    }
  };

  const disconnect = async () => {
    try {
      setBusy(true);
      await api.githubDisconnect();
      setStatus({ connected: false });
      setRepos(null);
      toast.success("GitHub disconnected");
    } catch {
      toast.error("Could not disconnect");
    } finally {
      setBusy(false);
    }
  };

  const loadRepos = async () => {
    try {
      setLoadingRepos(true);
      setRepos(await api.githubRepos());
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not load repositories");
    } finally {
      setLoadingRepos(false);
    }
  };

  const link = async (payload) => {
    try {
      setBusy(true);
      const updated = await api.linkRepo(project.id, payload);
      onLinked(updated);
      setManualUrl("");
      toast.success("Repository linked");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not link repository");
    } finally {
      setBusy(false);
    }
  };

  const linkManual = (e) => {
    e.preventDefault();
    const url = manualUrl.trim();
    if (!url) return;
    const { owner, name } = parseRepoUrl(url);
    link({ repo_url: url, repo_owner: owner, repo_name: name, repo_id: null });
  };

  const unlink = async () => {
    try {
      setBusy(true);
      const updated = await api.unlinkRepo(project.id);
      onLinked(updated);
      toast.success("Repository unlinked");
    } catch {
      toast.error("Could not unlink");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="repository-section" className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Github className="h-5 w-5" strokeWidth={1.5} />
        <h3 className="font-heading text-lg font-bold tracking-tight">Repository</h3>
      </div>

      {project.repo_url ? (
        <div
          data-testid="linked-repo"
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 p-4"
        >
          <a
            href={project.repo_url}
            target="_blank"
            rel="noreferrer"
            data-testid="linked-repo-url"
            className="flex min-w-0 items-center gap-2 font-mono text-sm hover:text-orange-600"
          >
            <Link2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span className="truncate">
              {project.repo_owner && project.repo_name
                ? `${project.repo_owner}/${project.repo_name}`
                : project.repo_url}
            </span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={1.5} />
          </a>
          <Button
            variant="ghost"
            size="sm"
            data-testid="unlink-repo-btn"
            onClick={unlink}
            disabled={busy}
            className="shrink-0 rounded-md text-muted-foreground hover:text-destructive"
          >
            <X className="mr-1 h-4 w-4" strokeWidth={1.5} /> Unlink
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Connect / connected state */}
          <div className="flex flex-wrap items-center gap-2">
            {status?.connected ? (
              <>
                <span
                  data-testid="github-connected"
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm"
                >
                  <Github className="h-4 w-4" strokeWidth={1.5} />
                  {status.login ? `@${status.login}` : "Connected"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="load-repos-btn"
                  onClick={loadRepos}
                  disabled={loadingRepos}
                  className="rounded-md"
                >
                  {loadingRepos ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                  )}
                  Load repositories
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="github-disconnect-btn"
                  onClick={disconnect}
                  disabled={busy}
                  className="rounded-md text-muted-foreground hover:text-destructive"
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                data-testid="github-connect-btn"
                onClick={connect}
                disabled={busy}
                className="rounded-full bg-[#171717] text-white hover:bg-[#171717]/90 dark:bg-white dark:text-[#0A0A0A] dark:hover:bg-white/90"
              >
                <Plug className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Connect GitHub
              </Button>
            )}
          </div>

          {/* Granted repos list */}
          {repos && (
            <div data-testid="repo-list" className="max-h-56 space-y-1 overflow-auto rounded-lg border border-border p-2">
              {repos.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  No granted repositories. Adjust access on GitHub, then reload.
                </p>
              ) : (
                repos.map((r) => (
                  <button
                    key={r.id}
                    data-testid={`repo-option-${r.id}`}
                    onClick={() =>
                      link({ repo_id: r.id, repo_owner: r.owner, repo_name: r.name, repo_url: r.url })
                    }
                    disabled={busy}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left font-mono text-sm transition-colors hover:bg-secondary"
                  >
                    <Github className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{r.owner}/{r.name}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Manual fallback */}
          <form onSubmit={linkManual} className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Or paste a repo URL
            </p>
            <div className="flex gap-2">
              <Input
                data-testid="manual-repo-input"
                placeholder="https://github.com/owner/repo"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                className="focus-visible:ring-orange-500"
              />
              <Button
                type="submit"
                data-testid="manual-repo-link-btn"
                disabled={busy || !manualUrl.trim()}
                variant="outline"
                className="shrink-0 rounded-md"
              >
                Link
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
