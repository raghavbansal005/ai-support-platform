import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "./api";

export function useAuthGuard() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      navigate("/login", { replace: true });
    } else {
      setReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ready;
}
