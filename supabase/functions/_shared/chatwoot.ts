type ChatwootConfig = {
  baseUrl: string;
  accountId: string;
  accessToken: string;
  inboxId: number;
};

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function getChatwootConfig(): ChatwootConfig {
  const inboxId = Number(required("CHATWOOT_INBOX_ID"));
  if (!Number.isInteger(inboxId) || inboxId <= 0) throw new Error("CHATWOOT_INBOX_ID must be a positive integer");
  return {
    baseUrl: required("CHATWOOT_BASE_URL").replace(/\/$/, ""),
    accountId: required("CHATWOOT_ACCOUNT_ID"),
    accessToken: required("CHATWOOT_API_ACCESS_TOKEN"),
    inboxId,
  };
}

export async function chatwootRequest<T>(
  config: ChatwootConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "api_access_token": config.accessToken,
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    throw new Error(`Chatwoot ${response.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }
  return body as T;
}

export type ChatwootContact = {
  id: number;
  identifier?: string;
  name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  custom_attributes?: Record<string, unknown>;
};

export async function findContact(config: ChatwootConfig, identifier: string): Promise<ChatwootContact | null> {
  const result = await chatwootRequest<{ payload?: ChatwootContact[] }>(
    config,
    `/api/v1/accounts/${config.accountId}/contacts?sort=-last_activity_at&page=1`,
  );
  return (result.payload ?? []).find((contact) => contact.identifier === identifier) ?? null;
}

export async function upsertContact(
  config: ChatwootConfig,
  input: {
    identifier: string;
    name?: string | null;
    email?: string | null;
    phone_number?: string | null;
    custom_attributes?: Record<string, unknown>;
  },
): Promise<ChatwootContact> {
  const existing = await findContact(config, input.identifier);
  if (existing) {
    await chatwootRequest(config, `/api/v1/accounts/${config.accountId}/contacts/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return { ...existing, ...input };
  }

  const created = await chatwootRequest<{ id: number; payload?: ChatwootContact[] }>(
    config,
    `/api/v1/accounts/${config.accountId}/contacts`,
    { method: "POST", body: JSON.stringify({ ...input, inbox_id: config.inboxId }) },
  );
  const contact = created.payload?.[0] ?? { id: created.id, ...input };
  return contact as ChatwootContact;
}

export async function createConversation(
  config: ChatwootConfig,
  contactId: number,
  sourceId: string,
  customAttributes: Record<string, unknown> = {},
) {
  return chatwootRequest<{ id: number; uuid: string }>(
    config,
    `/api/v1/accounts/${config.accountId}/conversations`,
    {
      method: "POST",
      body: JSON.stringify({
        source_id: sourceId,
        inbox_id: config.inboxId,
        contact_id: contactId,
        status: "open",
        custom_attributes: customAttributes,
      }),
    },
  );
}

export async function sendMessage(
  config: ChatwootConfig,
  conversationId: number,
  content: string,
  privateNote = false,
) {
  return chatwootRequest(
    config,
    `/api/v1/accounts/${config.accountId}/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        content,
        message_type: "outgoing",
        private: privateNote,
        content_type: "text",
      }),
    },
  );
}
