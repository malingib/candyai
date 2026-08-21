import { supabase } from "@/integrations/supabase/client";

export type ChatwootSyncResult = {
  contact?: { id: number; identifier?: string };
  conversation?: { id: number; uuid: string };
  message?: unknown;
};

async function invoke(action: string, body: Record<string, unknown> = {}): Promise<ChatwootSyncResult> {
  const { data, error } = await supabase.functions.invoke("chatwoot-sync", {
    body: { action, ...body },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as ChatwootSyncResult;
}

export function syncCurrentUserToChatwoot() {
  return invoke("sync_profile");
}

export function createChatwootConversation(customAttributes?: Record<string, unknown>) {
  return invoke("create_conversation", { custom_attributes: customAttributes ?? {} });
}

export function sendChatwootMessage(conversationId: number, content: string, privateNote = false) {
  return invoke("send_message", { conversation_id: conversationId, content, private: privateNote });
}
