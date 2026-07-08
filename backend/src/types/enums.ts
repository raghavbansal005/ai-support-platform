export const ROLES = ["OWNER", "ADMIN", "AGENT"] as const;
export type Role = (typeof ROLES)[number];

export const DOCUMENT_STATUSES = ["PENDING", "PROCESSING", "INDEXED", "FAILED"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const CHANNELS = ["WIDGET", "WHATSAPP", "EMAIL"] as const;
export type Channel = (typeof CHANNELS)[number];

export const MESSAGE_ROLES = ["USER", "ASSISTANT", "SYSTEM"] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
