import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FolderOpen, ArrowUpRight, Loader2 } from "lucide-react";
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

export default function Dashboard() {
  const api = useApi();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      const created = await api.createProject({
        name: name.trim(),
        description: description.trim() || null,
      });
      setProjects((prev) => [created, ...prev]);
      setName("");
      setDescription("");
      setOpen(false);
      toast.success("Project created");
    } catch (e) {
      toast.error("Could not create project");
    } finally {
      setSubmitting(false);
    }
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

        <Dialog open={open} onOpenChange={setOpen}>
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
                  Give your project a name. You can add more later.
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
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  data-testid="submit-project-btn"
                  disabled={submitting || !name.trim()}
                  className="rounded-full bg-orange-600 text-white hover:bg-orange-700"
                >
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create project
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
