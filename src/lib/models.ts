export type Role = "CUSTOMER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";
export type DomainStatus =
  | "ACTIVE"
  | "PENDING_REGISTRATION"
  | "PENDING_TRANSFER"
  | "EXPIRED"
  | "SUSPENDED"
  | "LOCKED"
  | "FAILED";
export type HostingStatus =
  | "RUNNING"
  | "PROVISIONING"
  | "SUSPENDED"
  | "TERMINATED"
  | "ERROR"
  | "OFFLINE";
export type ServerStatus = "RUNNING" | "WARNING" | "OFFLINE" | "MAINTENANCE";
export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "VOID";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type ProviderType = "DOMAIN" | "HOSTING" | "DNS" | "PAYMENT" | "NOTIFICATION";
export type ProviderStatus = "CONNECTED" | "DISCONNECTED" | "ERROR";
