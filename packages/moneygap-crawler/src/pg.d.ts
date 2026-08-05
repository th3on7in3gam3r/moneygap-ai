declare module "pg" {
  export class Client {
    constructor(config: { connectionString: string });
    connect(): Promise<void>;
    query(
      sql: string,
      params?: unknown[],
    ): Promise<{ rows: Record<string, unknown>[] }>;
    end(): Promise<void>;
  }
  const pg: { Client: typeof Client };
  export default pg;
}
