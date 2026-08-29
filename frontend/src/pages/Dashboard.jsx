import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FolderOpen, ArrowUpRight, Loader2, Github, Plug, Search, Check, ChevronsUpDown, X } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

function ProjectCard({ project, index, onOpen }) {
  return (
    <button
      data-testid={`project-card-${project.id}`}
      onClick={() => onOpen(project.id)}
      style={{ animationDelay: `${index * 60}ms` }}
      className="of-rise group flex flex-col items-start rounded-xl border border-border bg-card p-6 text-left transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-orange-500/60 hover:shadow-lg"
    >
      <div className="mb-4 flex w-full items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-orange-600">
          <FolderOpen className="h-5 w-5" strokeWidth={1.5} />
        </span>
        <ArrowUpRight
          className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          strokeWidth={1.5}
        />
      </div>
      <h3 className="font-heading text-xl font-bold tracking-tight">
        {project.name}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
        {project.description || "No description"}
      </p>
    </button>
  );
}

function RepoSelector({ status, repos, loadingRepos, reposError, selected, onSelect, onRetry, onConnect, onDisconnect, connecting }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  if (status === null) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking GitHub…
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="rounded-lg border border-border bg-secondary/30 p-3">
        <div className="flex items-center justify-between gap-3">
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
            size="sm"
            data-testid="create-modal-connect-github"
            onClick={onConnect}
            disabled={connecting}
            className="shrink-0 rounded-full bg-[#171717] text-white hover:bg-[#171717]/90 dark:bg-white dark:text-[#0A0A0A] dark:hover:bg-white/90"
          >
            {connecting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plug className="mr-1.5 h-4 w-4" strokeWidth={1.5} />}
            Connect
          </Button>
        </div>
      </div>
    );
  }

  // connected but installation incomplete -> needs setup
  if (status.needs_setup) {
    return (
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
            <Button size="sm" variant="ghost" data-testid="github-disconnect-btn" onClick={onDisconnect} className="h-8 rounded-md text-muted-foreground">
              Disconnect
            </Button>
            <Button
              size="sm"
              data-testid="create-modal-finish-setup"
              onClick={onConnect}
              disabled={connecting}
              className="shrink-0 rounded-full bg-[#171717] text-white hover:bg-[#171717]/90 dark:bg-white dark:text-[#0A0A0A] dark:hover:bg-white/90"
            >
              {connecting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plug className="mr-1.5 h-4 w-4" strokeWidth={1.5} />}
              Finish setup
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // connected and setup complete
  if (loadingRepos) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading repositories…
      </div>
    );
  }

  if (reposError) {
    // if error is due to missing installation, show finish-setup variant
    const isSetupError = reposError.toLowerCase().includes("not connected") || reposError.toLowerCase().includes("install");
    if (isSetupError) {
      return (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3" data-testid="github-needs-setup">
          <p className="text-sm text-amber-700 dark:text-amber-400">{reposError}</p>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" size="sm" className="h-8 rounded-md" data-testid="create-modal-retry-repos" onClick={onRetry}>Try again</Button>
            <Button size="sm" data-testid="create-modal-finish-setup" onClick={onConnect} disabled={connecting} className="h-8 rounded-full bg-[#171717] text-white">Finish setup</Button>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <p className="text-sm text-destructive">{reposError}</p>
        <Button variant="outline" size="sm" className="mt-2 h-8 rounded-md" data-testid="create-modal-retry-repos" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (repos && repos.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-secondary/30 px-3 py-3" data-testid="github-empty">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs font-mono">
            <Github className="h-3.5 w-3.5" strokeWidth={1.5} />{status.login ? `@${status.login}` : "Connected"}
          </span>
          <Button variant="ghost" size="sm" data-testid="github-disconnect-btn" onClick={onDisconnect} className="ml-auto h-7 rounded-md text-xs text-muted-foreground">Disconnect</Button>
        </div>
        <p className="text-sm text-muted-foreground">No repositories found. Grant access to a repository on GitHub, then reload.</p>
        <div className="mt-2 flex gap-2">
          <Button variant="outline" size="sm" className="h-8 rounded-md" data-testid="create-modal-retry-repos" onClick={onRetry}>Reload</Button>
          <Button variant="ghost" size="sm" className="h-8 rounded-md" data-testid="create-modal-manage-access" onClick={onConnect}>Manage access</Button>
        </div>
      </div>
    );
  }

  const filtered = (repos || []).filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return `${r.owner}/${r.name}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 font-mono">
          <Github className="h-3.5 w-3.5" strokeWidth={1.5} />{status.login ? `@${status.login}` : "Connected"}
        </span>
        <Button variant="ghost" size="sm" data-testid="github-disconnect-btn" onClick={onDisconnect} className="ml-auto h-7 rounded-md text-xs text-muted-foreground hover:text-destructive">Disconnect</Button>
        <Button variant="ghost" size="sm" data-testid="github-manage-access-btn" onClick={onConnect} className="h-7 rounded-md text-xs">Manage access</Button>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            data-testid="repo-combobox-trigger"
            className="w-full justify-between rounded-lg bg-background font-normal hover:bg-background"
          >
            <span className="flex items-center gap-2 truncate">
              <Github className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              {selected ? (
                <span className="font-mono text-sm truncate">{selected.owner}/{selected.name}</span>
              ) : (
                <span className="text-sm text-muted-foreground">Select repository…</span>
              )}
            </span>
            {selected ? (
              <span
                role="button"
                tabIndex={0}
                data-testid="clear-repo-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(null);
                  }
                }}
                className="ml-2 rounded-sm p-1 hover:bg-secondary"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </span>
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            )}
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
                  {filtered.map((r) => {
                    const isSelected = selected?.id === r.id;
                    return (
                      <CommandItem
                        key={r.id}
                        data-testid={`repo-option-${r.id}`}
                        value={`${r.owner}/${r.name}`}
                        onSelect={() => {
                          onSelect(r);
                          setQuery("");
                          setOpen(false);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Github className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                        <span className="flex-1 truncate font-mono text-sm">{r.owner}/{r.name}</span>
                        {isSelected && <Check className="h-4 w-4 shrink-0 text-orange-600" strokeWidth={2} />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="selected-repo-hint">
          <Check className="h-3.5 w-3.5 text-orange-600" strokeWidth={2} />
          Will link <span className="font-mono text-foreground">{selected.owner}/{selected.name}</span> on create
        </p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const api = useApi();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // GitHub selector state
  const [ghStatus, setGhStatus] = useState(null);
  const [repos, setRepos] = useState(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [reposError, setReposError] = useState("");
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setProjects(await api.getProjects());
    } catch (e) {
      toast.error("Could not load projects");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGhStatus = useCallback(async () => {
    try {
      setReposError("");
      const s = await api.githubStatus();
      setGhStatus(s);
      return s;
    } catch {
      setGhStatus({ connected: false });
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
      setReposError(e?.response?.data?.detail || "Could not load repositories");
      setRepos(null);
    } finally {
      setLoadingRepos(false);
    }
  }, [api]);

  const handleDisconnect = useCallback(async () => {
    try {
      await api.githubDisconnect();
      setGhStatus({ connected: false });
      setRepos(null);
      setSelectedRepo(null);
      toast.success("GitHub disconnected");
    } catch {
      toast.error("Could not disconnect");
    }
  }, [api]);

  // Handle GitHub callback redirect (?github=connected|error) immediately after OAuth/install
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gh = params.get("github");
    if (gh === "connected") toast.success("GitHub connected");
    else if (gh === "error") toast.error("GitHub connection failed");
    if (gh) {
      window.history.replaceState({}, "", window.location.pathname);
      // eagerly refresh status so modal never shows stale Connect button
      loadGhStatus().then((s) => {
        if (s?.connected && !s.needs_setup) loadRepos();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When modal opens, check connection and auto-load repos if connected and setup complete
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const s = await loadGhStatus();
      if (!cancelled && s?.connected && !s.needs_setup) {
        await loadRepos();
      } else if (!cancelled && s?.connected && s.needs_setup) {
        setRepos(null);
      }
    })();
    return () => { cancelled = true; };
  }, [open, loadGhStatus, loadRepos]);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const { url } = await api.githubConnectUrl();
      window.location.assign(url);
    } catch {
      toast.error("Could not start GitHub connect");
      setConnecting(false);
    }
  };

  const handleSelectRepo = (r) => {
    setSelectedRepo(r);
    if (r) {
      setName(r.name);
    } else {
      // clearing does not auto-clear name to avoid surprising user; keep as-is
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedRepo(null);
    setReposError("");
  };

  const handleOpenChange = (v) => {
    setOpen(v);
    if (!v) {
      // delay reset slightly to avoid flicker during close animation
      setTimeout(() => resetForm(), 200);
    }
  };

  const doCreate = async (withGithub) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (submitting) return;
    try {
      setSubmitting(true);
      const created = await api.createProject({
        name: trimmed,
        description: description.trim() || null,
      });

      // Optimistically add to list and reset UI immediately; linking is secondary
      setProjects((prev) => [created, ...prev]);
      toast.success("Project created");

      const shouldLink = withGithub && selectedRepo;
      if (shouldLink) {
        try {
          await api.linkRepo(created.id, {
            repo_id: selectedRepo.id,
            repo_owner: selectedRepo.owner,
            repo_name: selectedRepo.name,
            repo_url: selectedRepo.url,
          });
          // update local list with linked repo (avoid refetch)
          setProjects((prev) => prev.map((p) => p.id === created.id ? { ...p, repo_id: selectedRepo.id, repo_owner: selectedRepo.owner, repo_name: selectedRepo.name, repo_url: selectedRepo.url } : p));
          toast.success("Repository linked");
        } catch (e) {
          toast.error(e?.response?.data?.detail || "Project created, but repository could not be linked. You can link it from the project page.");
        }
      }

      setOpen(false);
      resetForm();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not create project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await doCreate(true);
  };

  const handleCreateWithoutGithub = async (e) => {
    e.preventDefault();
    await doCreate(false);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-orange-600">
            Your workspace
          </p>
          <h1 className="font-heading text-4xl font-extrabold tracking-tighter sm:text-5xl">
            Projects
          </h1>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button
              data-testid="create-project-btn"
              className="rounded-full bg-orange-600 px-5 text-white transition-transform hover:bg-orange-700 active:scale-95"
            >
              <Plus className="mr-1.5 h-4 w-4" strokeWidth={2} />
              New project
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="create-project-dialog">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl font-bold tracking-tight">
                  Create a project
                </DialogTitle>
                <DialogDescription>
                  Give your project a name. You can add more later. Linking a GitHub repo is optional.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    data-testid="project-name-input"
                    placeholder="e.g. Otter Flow"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="focus-visible:ring-orange-500"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="description"
                    data-testid="project-description-input"
                    placeholder="What is this project about?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="focus-visible:ring-orange-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    GitHub repository <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <RepoSelector
                    status={ghStatus}
                    repos={repos}
                    loadingRepos={loadingRepos}
                    reposError={reposError}
                    selected={selectedRepo}
                    onSelect={handleSelectRepo}
                    onRetry={loadRepos}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    connecting={connecting}
                  />
                  {ghStatus?.connected && repos && repos.length > 0 && (
                    <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                      {selectedRepo ? "You can change the selection or create without linking." : "Choose a repo or leave empty to skip."}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  data-testid="create-without-github-btn"
                  onClick={handleCreateWithoutGithub}
                  disabled={submitting || !name.trim()}
                  className="rounded-full"
                >
                  Create without GitHub
                </Button>
                <Button
                  type="submit"
                  data-testid="submit-project-btn"
                  disabled={submitting || !name.trim()}
                  className="rounded-full bg-orange-600 text-white hover:bg-orange-700"
                >
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {selectedRepo ? "Create & link" : "Create project"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-10">
        {loading ? (
          <div
            data-testid="projects-loading"
            className="flex items-center gap-2 text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" /> Loading projects…
          </div>
        ) : projects.length === 0 ? (
          <div
            data-testid="empty-state"
            className="rounded-2xl border-2 border-dashed border-border/60 p-16 text-center"
          >
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-orange-600">
              <FolderOpen className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <h3 className="font-heading text-xl font-bold tracking-tight">
              No projects yet
            </h3>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              Create your first project to start building in flow.
            </p>
          </div>
        ) : (
          <div
            data-testid="projects-grid"
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {projects.map((p, i) => (
              <ProjectCard
                key={p.id}
                project={p}
                index={i}
                onOpen={(id) => navigate(`/projects/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
