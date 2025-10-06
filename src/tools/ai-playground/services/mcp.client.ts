export interface McpTool {
  name: string;
  description?: string;
}

export interface McpClientConfig {
  baseUrl?: string; // future bridge endpoint
}

export class McpClient {
  // Stub client - bridge not implemented yet
  // Expose simple APIs so UI can be wired without breaking changes later
  constructor(_cfg?: McpClientConfig) {}

  async listTools(): Promise<McpTool[]> {
    return [
      { name: 'echo', description: 'Echo input (stubbed)' },
    ];
  }

  async callTool(name: string, args: unknown): Promise<{ output: string }>
  {
    // Stub behavior
    if (name === 'echo') return { output: JSON.stringify(args) };
    return { output: `Tool ${name} not implemented in stub` };
  }
}


