const DEFAULT_BASE_URL = "http://127.0.0.1:8000";

const BASE_URL_KEY = "api_base_url";
const TOKEN_KEY = "api_token";
const USER_KEY = "api_user";

export function getBaseUrl(): string {
  if (typeof window === "undefined") return DEFAULT_BASE_URL;
  return localStorage.getItem(BASE_URL_KEY) || DEFAULT_BASE_URL;
}

export function setBaseUrl(url: string) {
  localStorage.setItem(BASE_URL_KEY, url.replace(/\/$/, ""));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export interface StoredUser {
  id: number;
  username: string;
  email: string;
  created_at: string;
  is_banned: boolean;
}

export function getUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUser(user: StoredUser | null) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  raw?: boolean;
  auth?: boolean;
};

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { body, raw, auth = true, headers, ...rest } = opts;
  const url = `${getBaseUrl()}${path}`;
  const h = new Headers(headers || {});
  if (auth) {
    const token = getToken();
    if (token) h.set("Authorization", `Bearer ${token}`);
  }

  let finalBody: BodyInit | undefined;
  if (body !== undefined) {
    if (raw) {
      finalBody = body as BodyInit;
    } else if (body instanceof FormData) {
      finalBody = body;
    } else {
      h.set("Content-Type", "application/json");
      finalBody = JSON.stringify(body);
    }
  }

  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers: h, body: finalBody });
  } catch (e) {
    throw new ApiError(
      `Network error: cannot reach ${url}. Check API base URL in Settings.`,
      0,
      e,
    );
  }

  const ct = res.headers.get("content-type") || "";
  let payload: unknown = null;
  if (ct.includes("application/json")) {
    payload = await res.json().catch(() => null);
  } else {
    payload = await res.text().catch(() => null);
  }

  if (!res.ok) {
    const msg =
      (payload && typeof payload === "object" && "detail" in payload
        ? typeof (payload as { detail: unknown }).detail === "string"
          ? ((payload as { detail: string }).detail)
          : JSON.stringify((payload as { detail: unknown }).detail)
        : null) || res.statusText || "Request failed";
    throw new ApiError(msg, res.status, payload);
  }

  return payload as T;
}

// ------- Typed endpoint helpers -------

export interface ScheduleCreate {
  recipient_email: string;
  subject: string;
  body: string;
  scheduled_time: string;
  status?: string;
  interval?: number | null;
  recurring?: boolean;
  timezone?: string | null;
}

export interface ScheduleResponse extends ScheduleCreate {
  id: number;
  created_at: string;
}

export interface ContactCreate {
  id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
}

export interface ContactResponse {
  id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
}

export interface ContactUpdate {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
}

export interface TemplateCreate {
  title: string;
  subject: string;
  body: string;
}

export interface TemplateResponse {
  id: number;
  title: string;
  subject: string;
  body: string;
  is_deleted: boolean;
}

export interface TemplateUpdate {
  title?: string | null;
  subject?: string | null;
  body?: string | null;
}

export interface BroadcastModel {
  subject: string;
  body: string;
  target_type?: "all" | "list";
  list_id?: number | null;
  is_draft?: boolean;
  recurring?: boolean;
}

export interface ContactListResponse {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
  member_count?: number;
}

export interface ContactListCreate {
  name: string;
  description?: string | null;
}

export interface ContactListUpdate {
  name?: string | null;
  description?: string | null;
}

export interface ListMemberResponse {
  list_id: number;
  contact_id: number;
  contact: ContactResponse;
  added_at: string;
}

export interface UserRead extends StoredUser {
  access_token?: string | null;
  token_type?: string | null;
}

export const apiClient = {
  // Auth
  signup: (data: { username: string; email: string; password: string }) =>
    api<UserRead>("/auth/signup", { method: "POST", body: data, auth: false }),
  login: (data: { email: string; password: string }) =>
    api<UserRead>("/auth/login", { method: "POST", body: data, auth: false }),
  logout: () => api<unknown>("/auth/logout", { method: "POST" }),
  initiateReset: (email: string) =>
    api<unknown>("/auth/initiate-reset-password", {
      method: "POST",
      body: { email },
      auth: false,
    }),
  resetPassword: (code: string, new_password: string) =>
    api<unknown>("/auth/reset-password", {
      method: "POST",
      body: { code, new_password },
      auth: false,
    }),
  changePassword: (old_password: string, new_password: string) =>
    api<unknown>(
      `/auth/change-password?old_password=${encodeURIComponent(old_password)}&new_password=${encodeURIComponent(new_password)}`,
      { method: "POST" },
    ),

  verifyOtp: (email: string, code: string) =>
    api<unknown>("/auth/verify_otp", { method: "POST", body: { email, code }, auth: false }),
  deleteAccount: () => api<unknown>("/auth/me", { method: "DELETE" }),

  // Emails
  listEmails: () => api<ScheduleResponse[]>("/emails/"),
  filterEmails: (params: { status?: string | null; time_filter?: string | null } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.time_filter) q.set("time_filter", params.time_filter);
    const s = q.toString();
    return api<ScheduleResponse[]>(`/emails/filter${s ? `?${s}` : ""}`);
  },
  emailStats: () => api<EmailStatusResponse>("/emails/stats"),
  getEmail: (id: number) => api<ScheduleResponse>(`/emails/${id}`),
  createEmail: (data: ScheduleCreate) =>
    api<ScheduleResponse>("/emails/", { method: "POST", body: data }),
  updateEmail: (id: number, data: ScheduleCreate) =>
    api<ScheduleResponse>(`/emails/${id}`, { method: "PUT", body: data }),
  patchEmail: (id: number, data: EmailScheduleUpdate) =>
    api<ScheduleResponse>(`/emails/${id}`, { method: "PATCH", body: data }),
  cancelEmail: (id: number) => api<unknown>(`/emails/${id}/cancel`, { method: "POST" }),
  retryEmail: (id: number) => api<unknown>(`/emails/${id}/retry`, { method: "POST" }),
  deleteEmail: (id: number) => api<unknown>(`/emails/${id}`, { method: "DELETE" }),

  // Contacts
  listContacts: () => api<ContactResponse[]>("/contacts"),
  createContact: (data: ContactCreate) =>
    api<unknown>("/contacts", { method: "POST", body: data }),
  fetchContactByEmail: (email: string) =>
    api<unknown>(`/contacts/email/${encodeURIComponent(email)}`, { method: "POST" }),
  fetchContactsByLastName: (last_name: string) =>
    api<ContactResponse[] | unknown>(
      `/contacts/lastname/${encodeURIComponent(last_name)}`,
    ),
  updateContact: (id: number, data: ContactUpdate) =>
    api<unknown>(`/contacts/${id}`, { method: "PUT", body: data }),
  importContactsTemplate: () => api<unknown>("/contacts/import/template"),
  importContacts: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api<unknown>("/contacts/import", { method: "POST", body: fd });
  },

  // Lists (contact segments)
  listLists: () => api<ContactListResponse[]>("/contacts/list"),
  createList: (data: ContactListCreate) =>
    api<ContactListResponse>("/contacts/list", { method: "POST", body: data }),
  getList: (id: number) => api<ContactListResponse>(`/contacts/lists/${id}`),
  updateList: (id: number, data: ContactListUpdate) =>
    api<ContactListResponse>(`/contacts/lists/${id}`, { method: "PUT", body: data }),
  deleteList: (id: number) =>
    api<unknown>(`/contacts/lists/${id}`, { method: "DELETE" }),
  listMembers: (id: number) =>
    api<ListMemberResponse[]>(`/contacts/lists/${id}/members`),
  addContactToList: (listId: number, contactId: number) =>
    api<unknown>(`/contacts/lists/${listId}/members`, {
      method: "POST",
      body: { contact_id: contactId },
    }),
  removeContactFromList: (listId: number, contactId: number) =>
    api<unknown>(`/contacts/lists/${listId}/members/${contactId}`, { method: "DELETE" }),

  // Templates
  listTemplates: () => api<TemplateResponse[]>("/templates"),
  createTemplate: (data: TemplateCreate) =>
    api<TemplateResponse>("/templates", { method: "POST", body: data }),
  updateTemplate: (id: number, data: TemplateUpdate) =>
    api<TemplateResponse>(`/templates/${id}`, { method: "PUT", body: data }),
  deleteTemplate: (id: number) =>
    api<unknown>(`/templates/${id}`, { method: "DELETE" }),

  // Campaigns
  createSequence: (data: CampaignSequenceCreate) =>
    api<CampaignSequenceResponse>("/campaigns/create-sequence", {
      method: "POST",
      body: data,
    }),


  // Broadcast
  sendBroadcast: (data: BroadcastModel) =>
    api<unknown>("/broadcast/send", { method: "POST", body: data }),

  // Calendar (unauthenticated per spec)
  calendar: () => api<unknown>("/calendar/", { auth: false }),
};