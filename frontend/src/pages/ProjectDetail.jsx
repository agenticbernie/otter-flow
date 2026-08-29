import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/api";
import { SessionLoop } from "@/components/SessionLoop";
import { RepositorySection } from "@/components/RepositorySection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const p = await api.getProject(id);
      setProject(p);
      api.logEvent("project_opened", id).catch(() => {});
    } catch (e) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gh = params.get("github");
    if (gh === "connected") toast.success("GitHub connected");
    else if (gh === "error") toast.error("GitHub connection failed");
    if (gh) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const openEdit = () => {
    setName(project.name);
    setDescription(project.description || "");
    setEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSaving(true);
      const updated = await api.updateProject(id, {
        name: name.trim(),
        description: description.trim(),
      });
      setProject(updated);
      setEditOpen(false);
      toast.success("Project updated");
    } catch (e) {
      toast.error("Could not update project");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.deleteProject(id);
      toast.success("Project deleted");
      navigate("/");
    } catch (e) {
      toast.error("Could not delete project");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading project…
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div data-testid="project-not-found" className="text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Project not found
        </h1>
        <p className="mt-2 text-muted-foreground">
          It may have been removed, or you don't have access.
        </p>
        <Button
          onClick={() => navigate("/")}
          className="mt-6 rounded-full bg-orange-600 text-white hover:bg-orange-700"
        >
          Back to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="of-rise">
      <Button
        variant="ghost"
        data-testid="back-to-dashboard-btn"
        onClick={() => navigate("/")}
        className="mb-8 -ml-2 rounded-md text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
        Dashboard
      </Button>

      <div className="mb-10">
        <SessionLoop projectId={id} />
      </div>

      <div className="border-b border-border pb-10">
        <div className="flex items-start justify-between gap-4">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-orange-600">
            Project
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              data-testid="edit-project-btn"
              onClick={openEdit}
              className="rounded-md"
            >
              <Pencil className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="delete-project-btn"
                  className="rounded-md text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent data-testid="delete-confirm-dialog">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-heading text-xl font-bold tracking-tight">
                    Delete this project?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    "{project.name}" will be permanently removed. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="cancel-delete-btn">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    data-testid="confirm-delete-btn"
                    disabled={deleting}
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <h1
          data-testid="project-name"
          className="font-heading text-5xl font-extrabold leading-none tracking-tighter sm:text-6xl"
        >
          {project.name}
        </h1>
        <p
          data-testid="project-description"
          className="mt-6 max-w-2xl text-lg text-muted-foreground"
        >
          {project.description || "No description provided."}
        </p>
      </div>

      <div className="mt-10">
        <RepositorySection project={project} onLinked={setProject} />
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent data-testid="edit-project-dialog">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl font-bold tracking-tight">
                Edit project
              </DialogTitle>
              <DialogDescription>Update the name or description.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-5">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  data-testid="edit-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="focus-visible:ring-orange-500"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">
                  Description <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="edit-description"
                  data-testid="edit-description-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="focus-visible:ring-orange-500"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                data-testid="save-project-btn"
                disabled={saving || !name.trim()}
                className="rounded-full bg-orange-600 text-white hover:bg-orange-700"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
