import { useEffect, useState, useCallback } from "react";
import { Github, Link2, Loader2, ExternalLink, X, Plug, RefreshCw, Search, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

function parseRepoUrl(url) {
  const m = url.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
  if (!m) return { owner: null, name: null };
  return { owner: m[1], name: m[2].replace(/\.git$/, "") };
}

export function RepositorySection({ project, onLinked }) {
  const api = useApi();
  const [status, setStatus] = useState(null); // {connected, login, installation_id, needs_setup}
  const [repos, setRepos] = useState(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [reposError, setReposError] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [comboOpen, setComboOpen] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const s = await api.githubStatus();
      setStatus(s);
      return s;
    } catch {
      setStatus({ connected: false });
      return { connected: false };
    }
  }, [api]);

  const loadRepos = useCallback(async () => {
    try {
      setLoadingRepos(true);
      setReposError("");
      const list = await api.githubRepos();
      setRepos(list);
    } catch (e) {
      const msg = e?.response?.data?.detail || "Could not load repositories";
      setReposError(msg);
      toast.error(msg);
      setRepos(null);
    } finally {
      setLoadingRepos(false);
    }
  }, [api]);

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Immediately refresh after GitHub callback (?github=connected|error)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gh = params.get("github");
    if (gh) {
      console.info("[github] RepositorySection callback landing", gh);
      const fetchWithRetry = async (attempt = 0) => {
        const s = await loadStatus();
        console.info("[github] RepositorySection status after callback", s);
        if (s?.connected && !s.needs_setup) loadRepos();
        else if (gh === "connected" && !s?.connected && attempt < 2) {
          setTimeout(() => fetchWithRetry(attempt + 1), 800);
        }
      };
      fetchWithRetry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-load repos when status becomes connected and setup complete
  useEffect(() => {
    if (status?.connected && !status.needs_setup && repos === null && !loadingRepos && !reposError) {
      loadRepos();
    }
  }, [status, repos, loadingRepos, reposError, loadRepos]);

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
      setReposError("");
      toast.success("GitHub disconnected");
    } catch {
      toast.error("Could not disconnect");
    } finally {
      setBusy(false);
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

  const filtered = (repos || []).filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return `${r.owner}/${r.name}`.toLowerCase().includes(q);
  });

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
          {/* Status header */}
          {status === null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking GitHub…
            </div>
          ) : !status.connected ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-muted-foreground">
                  <Github className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <div>
                  <p className="text-sm font-medium leading-none">GitHub not connected</p>
                  <p className="mt-1 text-xs text-muted-foreground">Connect to link a repository</p>
                </div>
              </div>
              <Button
                data-testid="github-connect-btn"
                onClick={connect}
                disabled={busy}
                className="shrink-0 rounded-full bg-[#171717] text-white hover:bg-[#171717]/90 dark:bg-white dark:text-[#0A0A0A] dark:hover:bg-white/90"
              >
                <Plug className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Connect GitHub
              </Button>
            </div>
          ) : status.needs_setup ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3" data-testid="github-needs-setup">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-amber-600">
                    <Github className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                  <div>
                    <p className="text-sm font-medium leading-none">
                      {status.login ? `@${status.login} — finish setup` : "Finish GitHub setup"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Installation required to access repositories.</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button variant="ghost" size="sm" data-testid="github-disconnect-btn" onClick={disconnect} disabled={busy} className="h-8 rounded-md text-muted-foreground">Disconnect</Button>
                  <Button
                    size="sm"
                    data-testid="github-finish-setup-btn"
                    onClick={connect}
                    disabled={busy}
                    className="shrink-0 rounded-full bg-[#171717] text-white hover:bg-[#171717]/90 dark:bg-white dark:text-[#0A0A0A] dark:hover:bg-white/90"
                  >
                    <Plug className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                    Finish setup
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-testid="github-connected"
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-mono"
              >
                <Github className="h-4 w-4" strokeWidth={1.5} />
                {status.login ? `@${status.login}` : "Connected"}
              </span>
              <Button
                variant="outline"
                size="sm"
                data-testid="github-manage-access-btn"
                onClick={connect}
                disabled={busy}
                className="rounded-md"
              >
                Manage access
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
            </div>
          )}

          {/* Connected and setup complete -> searchable selector */}
          {status?.connected && !status.needs_setup && (
            <>
              {loadingRepos ? (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading repositories…
                </div>
              ) : reposError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3" data-testid="github-repos-error">
                  <p className="text-sm text-destructive">{reposError}</p>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 rounded-md" data-testid="load-repos-btn" onClick={loadRepos}>Try again</Button>
                    <Button variant="ghost" size="sm" className="h-8 rounded-md" onClick={loadRepos}><RefreshCw className="mr-1.5 h-4 w-4" />Retry</Button>
                  </div>
                </div>
              ) : repos && repos.length === 0 ? (
                <div className="rounded-lg border border-border bg-secondary/30 px-3 py-3" data-testid="github-empty">
                  <p className="text-sm text-muted-foreground">No repositories found. Grant access to a repository on GitHub.</p>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 rounded-md" data-testid="load-repos-btn" onClick={loadRepos}><RefreshCw className="mr-1.5 h-4 w-4" />Reload</Button>
                    <Button variant="ghost" size="sm" className="h-8 rounded-md" data-testid="github-manage-access-btn" onClick={connect}>Manage access</Button>
                  </div>
                </div>
              ) : repos && repos.length > 0 ? (
                <div className="space-y-2">
                  <Popover open={comboOpen} onOpenChange={setComboOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={comboOpen} data-testid="repo-combobox-trigger" className="w-full justify-between rounded-lg bg-background font-normal">
                        <span className="flex items-center gap-2 truncate">
                          <Github className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Select repository…</span>
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command shouldFilter={false}>
                        <div className="flex items-center border-b px-3">
                          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                          <input
                            data-testid="repo-search-input"
                            placeholder="Search repositories…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="flex h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            autoFocus
                          />
                        </div>
                        <CommandList>
                          {filtered.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground" data-testid="repo-empty">No results</div>
                          ) : (
                            <CommandGroup>
                              {filtered.map((r) => (
                                <CommandItem
                                  key={r.id}
                                  data-testid={`repo-option-${r.id}`}
                                  value={`${r.owner}/${r.name}`}
                                  onSelect={() => {
                                    setComboOpen(false);
                                    setQuery("");
                                    link({ repo_id: r.id, repo_owner: r.owner, repo_name: r.name, repo_url: r.url });
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Github className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <span className="flex-1 truncate font-mono text-sm">{r.owner}/{r.name}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" data-testid="load-repos-btn" onClick={loadRepos} disabled={loadingRepos} className="h-8 rounded-md">
                      {loadingRepos ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />} Reload
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {/* Manual fallback - always available unless needs_setup */}
          {(!status?.needs_setup) && (
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
          )}
        </div>
      )}
    </div>
  );
}
