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
  };
}
