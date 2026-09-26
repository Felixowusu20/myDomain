export class MessagingError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "invalid") {
    super(message);
    this.name = "MessagingError";
    this.status = status;
    this.code = code;
  }
}
