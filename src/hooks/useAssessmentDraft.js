import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Serialised writes + database revision checks avoid late requests overwriting newer work.
export default function useAssessmentDraft() {
  const session = useRef(null),
    latest = useRef({}),
    saved = useRef("{}"),
    queue = useRef(Promise.resolve());
  const [answers, setAnswersState] = useState({}),
    [status, setStatus] = useState("Saved"),
    [clock, setClock] = useState(Date.now()),
    [deadline, setDeadline] = useState(null);
  const load = useCallback(async (id) => {
    const { data, error } = await supabase.rpc("assessment_draft", {
      p_assessment: id,
    });
    if (error) throw error;
    session.current = {
      id,
      revision: data.revision,
      offset: Date.parse(data.server_now) - Date.now(),
    };
    latest.current = data.answers || {};
    saved.current = JSON.stringify(latest.current);
    setAnswersState(latest.current);
    setDeadline(data.deadline);
    setStatus("Saved");
  }, []);
  const setAnswers = useCallback((update) => {
    const next = typeof update === "function" ? update(latest.current) : update;
    latest.current = next;
    setAnswersState(next);
    setStatus("Unsaved changes");
  }, []);
  const persist = useCallback(() => {
    const active = session.current,
      snapshot = latest.current,
      text = JSON.stringify(snapshot);
    if (!active) return Promise.resolve();
    const task = queue.current
      .catch(() => {})
      .then(async () => {
        if (session.current !== active || text === saved.current) return;
        setStatus("Saving…");
        const { data, error } = await supabase.rpc("save_assessment_draft", {
          p_assessment: active.id,
          p_answers: snapshot,
          p_revision: active.revision,
        });
        if (error) {
          if (session.current === active)
            setStatus("Not saved — check your connection and retry");
          throw error;
        }
        active.revision = data;
        saved.current = text;
        if (session.current === active)
          setStatus(
            JSON.stringify(latest.current) === text
              ? "Saved"
              : "Unsaved changes",
          );
      });
    queue.current = task;
    return task;
  }, []);
  useEffect(() => {
    if (!session.current || JSON.stringify(answers) === saved.current) return;
    const timer = setTimeout(() => {
      persist().catch(() => {});
    }, 900);
    return () => clearTimeout(timer);
  }, [answers, persist]);
  useEffect(() => {
    const warn = (e) => {
      if (session.current && JSON.stringify(latest.current) !== saved.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const retry = () => {
      persist().catch(() => {});
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("online", retry);
    const tick = setInterval(
      () => setClock(Date.now() + (session.current?.offset || 0)),
      1000,
    );
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("online", retry);
      clearInterval(tick);
    };
  }, [persist]);
  const remaining = deadline
    ? Math.max(0, Math.ceil((Date.parse(deadline) - clock) / 1000))
    : null;
  const close = useCallback(() => {
    session.current = null;
    setDeadline(null);
  }, []);
  return { answers, setAnswers, load, persist, status, remaining, close };
}
