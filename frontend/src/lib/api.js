import axios from "axios";
import { useAuth } from "@clerk/clerk-react";
import { useCallback } from "react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function useApi() {
  const { getToken } = useAuth();

  const request = useCallback(
    async (method, path, data) => {
      const token = await getToken();
      const res = await axios({
        method,
        url: `${API}${path}`,
        data,
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    [getToken]
  );

  return {
    getProjects: () => request("get", "/projects"),
    getProject: (id) => request("get", `/projects/${id}`),
    createProject: (payload) => request("post", "/projects", payload),
    updateProject: (id, payload) => request("put", `/projects/${id}`, payload),
    deleteProject: (id) => request("delete", `/projects/${id}`),
    getSessionState: (pid) => request("get", `/projects/${pid}/session-state`),
    startSession: (pid) => request("post", `/projects/${pid}/sessions/start`),
    endSession: (pid, capsule) => request("post", `/projects/${pid}/sessions/end`, capsule),
    startNow: (capsuleId) => request("post", `/capsules/${capsuleId}/start-now`),
    logEvent: (type, projectId) => request("post", "/events", { type, project_id: projectId || null }),
    githubStatus: () => request("get", "/github/status"),
    githubConnectUrl: () => request("post", "/github/connect-url"),
    githubRepos: () => request("get", "/github/repos"),
    githubDisconnect: () => request("delete", "/github/disconnect"),
    linkRepo: (pid, payload) => request("post", `/projects/${pid}/link-repo`, payload),
    unlinkRepo: (pid) => request("delete", `/projects/${pid}/repo`),
  };
}
