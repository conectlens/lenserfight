export class McpError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details: unknown = {}
  ) {
    super(message);
    this.name = 'McpError';
  }
}
