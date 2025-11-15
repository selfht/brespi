export class PostgresAdapter {
  public backup(options: PostgresAdapter.BackupCommand): Promise<PostgresAdapter.BackupResult> {
    if (options.databases === "*") {
      // Backup all databases
    } else {
      // Backup specific databases
    }
    throw new Error("Not implemented");
  }
}

export namespace PostgresAdapter {
  export interface BackupCommand {
    databases: "*" | string[];
  }
  export interface BackupResult {
    databases: Array<
      | {
          name: string;
          success: true;
          size: number;
          path: string;
        }
      | {
          name: string;
          success: false;
          error: string;
        }
    >;
  }
}
