import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SimulatorSession,
  decodeSession,
  encodeSession,
  newSession,
} from "./simulatorSession";
const KEY = "poker-academy.table.v1";
export function useSimulatorSession() {
  const [session, setSession] = useState<SimulatorSession | null>(null);
  const current = useRef<SimulatorSession | null>(null);
  const [error, setError] = useState("");
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const next = decodeSession(raw);
        if (active) {
          current.current = next;
          setSession(next);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Your table could not be restored. Stored data is preserved; reset the virtual table to start again.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  const change = useCallback(
    (update: (s: SimulatorSession) => SimulatorSession) => {
      if (!current.current) throw new Error("Table is still loading");
      const next = update(current.current);
      current.current = next;
      setSession(next);
      queue.current = queue.current
        .catch(() => {})
        .then(() => AsyncStorage.setItem(KEY, encodeSession(next)))
        .then(() => setError(""))
        .catch(() =>
          setError(
            "The table could not be saved. Your next action will retry saving this session.",
          ),
        );
    },
    [],
  );
  const reset = useCallback((mode: "free" | "coached" = "free") => {
    const next = newSession(mode);
    current.current = next;
    setSession(next);
    queue.current = queue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(KEY, encodeSession(next)))
      .then(() => setError(""))
      .catch(() => setError("The new table could not be saved."));
  }, []);
  return { session, error, change, reset };
}
