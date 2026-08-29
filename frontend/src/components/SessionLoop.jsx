import { useEffect, useState, useCallback, useRef } from "react";
import { Play, Square, Clock, ArrowRight, Loader2, Target, Link2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/api";
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

function fmtElapsed(startIso) {
  const start = new Date(startIso).getTime();
  const secs = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function ActiveSession({ session, onEnd, ending }) {
  const [elapsed, setElapsed] = useState(fmtElapsed(session.started_at));
  useEffect(() => {
    const t = setInterval(() => setElapsed(fmtElapsed(session.started_at)), 1000);
    return () => clearInterval(t);
  }, [session.started_at]);

  return (
    <div
      data-testid="active-session-card"
      className="of-rise rounded-2xl border border-orange-500/40 bg-orange-500/5 p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-orange-600" />
          </span>
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-orange-600">
              Session active
            </p>
            <p
              data-testid="session-elapsed"
              className="font-heading text-3xl font-bold tabular-nums tracking-tight"
            >
              <Clock className="mr-2 inline h-6 w-6 align-[-3px]" strokeWidth={1.5} />
              {elapsed}
            </p>
          </div>
        </div>
        <Button
          data-testid="end-session-btn"
          onClick={onEnd}
          disabled={ending}
          className="rounded-full bg-orange-600 px-6 text-white transition-transform hover:bg-orange-700 active:scale-95"
        >
          <Square className="mr-2 h-4 w-4" strokeWidth={2} />
          End session
        </Button>
      </div>
    </div>
  );
}

function PendingCapsule({ capsule, onStartNow, starting }) {
  return (
    <div
      data-testid="pending-capsule-card"
      className="of-rise rounded-2xl border-2 border-orange-500/50 bg-card p-6 shadow-lg"
    >
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-orange-600">
        Pick up where you left off
      </p>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-white">
          <Target className="h-5 w-5" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Next action
          </p>
          <p
            data-testid="capsule-next-action"
            className="font-heading text-2xl font-bold leading-snug tracking-tight"
          >
            {capsule.next_action}
          </p>

          <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
            {capsule.workspace_pointer && (
              <span className="flex items-center gap-2" data-testid="capsule-workspace-pointer">
                <Link2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span className="break-all">{capsule.workspace_pointer}</span>
              </span>
            )}
            {capsule.done_when && (
              <span className="flex items-center gap-2" data-testid="capsule-done-when">
                <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>Done when: {capsule.done_when}</span>
              </span>
            )}
            {capsule.estimated_minutes != null && (
              <span className="flex items-center gap-2" data-testid="capsule-estimated-minutes">
                <Clock className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>~{capsule.estimated_minutes} min</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <Button
        data-testid="start-now-btn"
        onClick={onStartNow}
        disabled={starting}
        className="mt-6 w-full rounded-full bg-orange-600 text-white transition-transform hover:bg-orange-700 active:scale-95 sm:w-auto sm:px-8"
      >
        {starting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="mr-2 h-4 w-4" strokeWidth={2} />
        )}
        Start now
      </Button>
    </div>
  );
}

function IdleStart({ onStart, starting }) {
  return (
    <div
      data-testid="idle-session-card"
      className="of-rise rounded-2xl border-2 border-dashed border-border/60 p-6 text-center"
    >
      <p className="mb-4 text-sm text-muted-foreground">
        No active session. Start one to begin working on this project.
      </p>
      <Button
        data-testid="start-session-btn"
        onClick={onStart}
        disabled={starting}
        className="rounded-full bg-orange-600 px-8 text-white transition-transform hover:bg-orange-700 active:scale-95"
      >
        {starting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Play className="mr-2 h-4 w-4" strokeWidth={2} />
        )}
        Start session
      </Button>
    </div>
  );
}

export function SessionLoop({ projectId }) {
  const api = useApi();
  const [state, setState] = useState({ active_session: null, pending_capsule: null });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [nextAction, setNextAction] = useState("");
  const [pointer, setPointer] = useState("");
  const [doneWhen, setDoneWhen] = useState("");
  const [minutes, setMinutes] = useState("");
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const s = await api.getSessionState(projectId);
      if (mounted.current) setState(s);
    } catch (e) {
      // handled by caller
    }
  }, [api, projectId]);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleStart = async () => {
    try {
      setBusy(true);
      const session = await api.startSession(projectId);
      setState({ active_session: session, pending_capsule: null });
      api.logEvent("session_started", projectId).catch(() => {});
      toast.success("Session started");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start session");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleEnd = async (e) => {
    e.preventDefault();
    if (!nextAction.trim()) return;
    try {
      setBusy(true);
      const res = await api.endSession(projectId, {
        next_action: nextAction.trim(),
        workspace_pointer: pointer.trim() || null,
        done_when: doneWhen.trim() || null,
        estimated_minutes: minutes ? parseInt(minutes, 10) : null,
      });
      setState({ active_session: null, pending_capsule: res.capsule });
      setEndOpen(false);
      setNextAction("");
      setPointer("");
      setDoneWhen("");
      setMinutes("");
      api.logEvent("session_ended", projectId).catch(() => {});
      api.logEvent("capsule_created", projectId).catch(() => {});
      toast.success("Session ended · next action saved");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not end session");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleStartNow = async () => {
    const cap = state.pending_capsule;
    if (!cap) return;
    api.logEvent("start_clicked", projectId).catch(() => {});
    try {
      setBusy(true);
      const res = await api.startNow(cap.id);
      setState({ active_session: res.session, pending_capsule: null });
      api.logEvent("session_started", projectId).catch(() => {});
      toast.success("Session started");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start session");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading session…
      </div>
    );
  }

  return (
    <div data-testid="session-loop">
      {state.active_session ? (
        <ActiveSession session={state.active_session} onEnd={() => setEndOpen(true)} ending={busy} />
      ) : state.pending_capsule ? (
        <PendingCapsule capsule={state.pending_capsule} onStartNow={handleStartNow} starting={busy} />
      ) : (
        <IdleStart onStart={handleStart} starting={busy} />
      )}

      <Dialog open={endOpen} onOpenChange={setEndOpen}>
        <DialogContent data-testid="end-session-dialog">
          <form onSubmit={handleEnd}>
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl font-bold tracking-tight">
                Leave a next action
              </DialogTitle>
              <DialogDescription>
                Capture one small, concrete thing to do next. You'll see it when you return.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-5">
              <div className="space-y-2">
                <Label htmlFor="next-action">
                  Next action <span className="text-orange-600">*</span>
                </Label>
                <Textarea
                  id="next-action"
                  data-testid="next-action-input"
                  placeholder="e.g. Wire the Start Now button to the API"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  className="focus-visible:ring-orange-500"
                  rows={2}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace-pointer">
                  Workspace pointer <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="workspace-pointer"
                  data-testid="workspace-pointer-input"
                  placeholder="URL or note, e.g. src/components/SessionLoop.jsx"
                  value={pointer}
                  onChange={(e) => setPointer(e.target.value)}
                  className="focus-visible:ring-orange-500"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="done-when">
                    Done when <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="done-when"
                    data-testid="done-when-input"
                    placeholder="e.g. button starts a session"
                    value={doneWhen}
                    onChange={(e) => setDoneWhen(e.target.value)}
                    className="focus-visible:ring-orange-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimated-minutes">
                    Est. minutes <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="estimated-minutes"
                    data-testid="estimated-minutes-input"
                    type="number"
                    min="1"
                    placeholder="e.g. 25"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="focus-visible:ring-orange-500"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                data-testid="save-capsule-btn"
                disabled={busy || !nextAction.trim()}
                className="rounded-full bg-orange-600 text-white hover:bg-orange-700"
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & end session
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
