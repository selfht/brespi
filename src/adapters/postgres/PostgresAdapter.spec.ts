import { Test } from "@/helpers/Test.spec";
import { Step } from "@/models/Step";
import { describe, expect, it } from "bun:test";
import { PostgresAdapter } from "./PostgresAdapter";

describe(PostgresAdapter.name, async () => {
  const { commandHelper } = Test.MockRegistry;
  const adapter = new PostgresAdapter(await Test.env(), commandHelper);

  describe("url parsing", () => {
    async function performSimpleBackup(url: string) {
      // given
      process.env.DATABASE_URL = url;
      commandHelper.execute.mockResolvedValue({
        exitCode: 0,
        stdout: JSON.stringify({
          timestamp: "",
          backupDir: "",
          databases: [],
        }),
        stderr: "",
      });
      // when
      const step: Partial<Step.PostgresBackup> = {
        connectionUrlReference: "DATABASE_URL",
        databaseSelection: {
          strategy: "all",
        },
      };
      await adapter.backup(step as Step.PostgresBackup);
    }

    type SuccessTestCase = {
      url: string;
      expectation: {
        username: string;
        password: string;
        host: string;
        port?: string;
      };
    };
    it.each<SuccessTestCase>([
      {
        url: "postgresql://kim:possible@magicalhost.com:9482/database",
        expectation: {
          username: "kim",
          password: "possible",
          host: "magicalhost.com",
          port: "9482",
        },
      },
      {
        url: "postgresql://user:pass@localhost:5432",
        expectation: {
          username: "user",
          password: "pass",
          host: "localhost",
          port: "5432",
        },
      },
      {
        url: "postgresql://user:pass@localhost",
        expectation: {
          username: "user",
          password: "pass",
          host: "localhost",
        },
      },
      {
        url: "postgres://user:pass@db.example.com:5433/mydb",
        expectation: {
          username: "user",
          password: "pass",
          host: "db.example.com",
          port: "5433",
        },
      },
      {
        url: "postgresql://admin:p%40ssw0rd%21@db-server.io:5432",
        expectation: {
          username: "admin",
          password: "p@ssw0rd!",
          host: "db-server.io",
          port: "5432",
        },
      },
      {
        url: "postgresql://my%2Buser:my%2Bpass@host.com",
        expectation: {
          username: "my+user",
          password: "my+pass",
          host: "host.com",
        },
      },
      {
        url: "postgresql://user:pass@192.168.1.100:5432",
        expectation: {
          username: "user",
          password: "pass",
          host: "192.168.1.100",
          port: "5432",
        },
      },
      {
        url: "postgresql://user:pass@[::1]:5432",
        expectation: {
          username: "user",
          password: "pass",
          host: "::1",
          port: "5432",
        },
      },
      {
        url: "postgresql://user:pass@[2001:db8::1]:5432/db",
        expectation: {
          username: "user",
          password: "pass",
          host: "2001:db8::1",
          port: "5432",
        },
      },
      {
        url: "postgresql://user:pass@host.com/database?sslmode=require",
        expectation: {
          username: "user",
          password: "pass",
          host: "host.com",
        },
      },
      {
        url: "postgres://user:pass@host.com:5432?sslmode=require&connect_timeout=10",
        expectation: {
          username: "user",
          password: "pass",
          host: "host.com",
          port: "5432",
        },
      },
    ])("success $url", async ({ url, expectation }) => {
      // when
      await performSimpleBackup(url);
      // then
      type ExecuteArg = Parameters<typeof commandHelper.execute>[0];
      expect(commandHelper.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          env: expect.objectContaining({
            PGHOST: expectation.host,
            PGPORT: expectation.port,
            PGUSER: expectation.username,
            PGPASSWORD: expectation.password,
          }),
        } satisfies Partial<ExecuteArg>),
      );
    });

    type ErrorTestCase = {
      url: string;
      expectation: {
        error: string;
      };
    };
    it.each<ErrorTestCase>([
      {
        url: "postgresql://:password@host.com:5432",
        expectation: { error: "Username is required in connection URL" },
      },
      {
        url: "postgresql://user@host.com:5432",
        expectation: { error: "Password is required in connection URL" },
      },
      {
        url: "postgresql://user:pass@:5432",
        expectation: { error: "Invalid URL format" },
      },
      {
        url: "mysql://user:pass@host.com:3306",
        expectation: { error: "Invalid protocol: mysql:. Expected 'postgresql:' or 'postgres:'" },
      },
      {
        url: "not a url at all",
        expectation: { error: "Invalid URL format" },
      },
    ])("error $url", async ({ url, expectation }) => {
      // when
      const action = () => performSimpleBackup(url);
      // then
      expect(action()).rejects.toThrow(expectation.error);
    });
  });
});
