import { describe, expect, it } from "bun:test";
import { PostgresAdapter } from "./PostgresAdapter";

describe(PostgresAdapter.name, () => {
  describe("url parsing", () => {
    type GlobTestCase = {
      url: string;
      expectation: {
        username: string;
        password: string;
        host: string;
        port?: number;
      };
    };
    it.each<GlobTestCase>([
      {
        url: "postgresql://kim:possible@magicalhost.com:9482/database",
        expectation: {
          username: "kim",
          password: "possible",
          host: "magicalhost.com",
          port: 9482,
        },
      },
      {
        url: "postgresql://user:pass@localhost:5432",
        expectation: {
          username: "user",
          password: "pass",
          host: "localhost",
          port: 5432,
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
          port: 5433,
        },
      },
      {
        url: "postgresql://admin:p%40ssw0rd%21@db-server.io:5432",
        expectation: {
          username: "admin",
          password: "p@ssw0rd!",
          host: "db-server.io",
          port: 5432,
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
          port: 5432,
        },
      },
      {
        url: "postgresql://user:pass@[::1]:5432",
        expectation: {
          username: "user",
          password: "pass",
          host: "::1",
          port: 5432,
        },
      },
      {
        url: "postgresql://user:pass@[2001:db8::1]:5432/db",
        expectation: {
          username: "user",
          password: "pass",
          host: "2001:db8::1",
          port: 5432,
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
          port: 5432,
        },
      },
    ])("$url", async ({ url, expectation }) => {
      // when
      const options = PostgresAdapter.parseUrl(url);
      // then
      expect(options).toEqual(expectation);
    });

    describe("error cases", () => {
      it("throws error for missing username", () => {
        expect(() => {
          PostgresAdapter.parseUrl("postgresql://:password@host.com:5432");
        }).toThrow("Username is required in connection URL");
      });

      it("throws error for missing password", () => {
        expect(() => {
          PostgresAdapter.parseUrl("postgresql://user@host.com:5432");
        }).toThrow("Password is required in connection URL");
      });

      it("throws error for missing host", () => {
        expect(() => {
          PostgresAdapter.parseUrl("postgresql://user:pass@:5432");
        }).toThrow("Invalid URL format");
      });

      it("throws error for invalid protocol", () => {
        expect(() => {
          PostgresAdapter.parseUrl("mysql://user:pass@host.com:3306");
        }).toThrow("Invalid protocol: mysql:. Expected 'postgresql:' or 'postgres:'");
      });

      it("throws error for completely invalid URL", () => {
        expect(() => {
          PostgresAdapter.parseUrl("not a url at all");
        }).toThrow("Invalid URL format");
      });
    });
  });
});
