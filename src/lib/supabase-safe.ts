import { supabase as rawSupabase } from "@/integrations/supabase/client";

export type SupabaseDebugEntry = {
  id: string;
  time: string;
  source: string;
  status: "pending" | "success" | "error" | "disabled";
  detail?: string;
};

type DebugListener = (entries: SupabaseDebugEntry[]) => void;

const MAX_ENTRIES = 25;
const listeners = new Set<DebugListener>();
const entries: SupabaseDebugEntry[] = [];

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const emit = () => {
  const snapshot = [...entries];
  listeners.forEach((listener) => listener(snapshot));
};

const pushEntry = (entry: SupabaseDebugEntry) => {
  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  emit();
};

export const beginSupabaseDebug = (source: string) => {
  const id = createId();
  pushEntry({ id, time: new Date().toLocaleTimeString(), source, status: "pending" });
  return id;
};

const updateEntry = (id: string, patch: Partial<SupabaseDebugEntry>) => {
  const index = entries.findIndex((entry) => entry.id === id);
  if (index === -1) return;
  entries[index] = { ...entries[index], ...patch };
  emit();
};

const formatError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
};

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)
);

export const logSupabaseDebug = (
  source: string,
  status: SupabaseDebugEntry["status"],
  detail?: string,
) => {
  pushEntry({
    id: createId(),
    time: new Date().toLocaleTimeString(),
    source,
    status,
    detail,
  });
};

export const trackSupabaseRequest = async <T>(
  source: string,
  request: Promise<T>,
): Promise<T> => {
  const id = beginSupabaseDebug(source);

  try {
    const result = await request;

    if (
      result &&
      typeof result === "object" &&
      "error" in (result as Record<string, unknown>) &&
      (result as { error?: unknown }).error
    ) {
      updateEntry(id, {
        status: "error",
        detail: formatError((result as { error?: unknown }).error),
      });
    } else {
      updateEntry(id, { status: "success" });
    }

    return result;
  } catch (error) {
    updateEntry(id, { status: "error", detail: formatError(error) });
    throw error;
  }
};

export const subscribeSupabaseDebug = (listener: DebugListener) => {
  listeners.add(listener);
  listener([...entries]);
  return () => listeners.delete(listener);
};

export const finishSupabaseDebug = (
  id: string,
  status: SupabaseDebugEntry["status"],
  detail?: string,
) => {
  updateEntry(id, { status, detail });
};

if (!isSupabaseConfigured) {
  logSupabaseDebug(
    "supabase:init",
    "disabled",
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY",
  );
}

export const supabase = rawSupabase;