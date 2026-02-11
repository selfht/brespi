import { describe, expect, it } from "bun:test";
import { UrlParser } from "./UrlParser";

describe("UrlParser", () => {
  describe(UrlParser.postgresql.name, () => {
    const successCases: Array<{
      url: string;
      expectation: {
        username: string;
        password: string;
        host: string;
        port?: string;
      };
    }> = [
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
    ];
    for (const { url, expectation } of successCases) {
      it(url, async () => {
        // when
        const parts = UrlParser.postgresql(url);
        // then
        expect(parts).toEqual(expectation);
      });
    }

    const errorCases: Array<{
      description: string;
      url: string;
      error: string;
    }> = [
      {
        description: "missing username",
        url: "postgresql://:password@host.com:5432",
        error: "Username is required in connection URL",
      },
      {
        description: "missing password",
        url: "postgresql://user@host.com:5432",
        error: "Password is required in connection URL",
      },
      {
        description: "missing host",
        url: "postgresql://user:pass@:5432",
        error: "Invalid URL format",
      },
      {
        description: "invalid protocol",
        url: "mariadb://user:pass@host.com:3306",
        error: "Invalid protocol: mariadb:. Expected 'postgresql:' or 'postgres:'",
      },
      {
        description: "invalid URL",
        url: "not a url at all",
        error: "Invalid URL format",
      },
    ];
    for (const { description, url, error } of errorCases) {
      it(`error: ${description}`, async () => {
        // when
        const action = () => UrlParser.postgresql(url);
        // then
        expect(action).toThrow(error);
      });
    }
  });

  describe(UrlParser.mariadb.name, () => {
    const successCases: Array<{
      url: string;
      expectation: {
        username: string;
        password: string;
        host: string;
        port?: string;
      };
    }> = [
      {
        url: "mariadb://kim:possible@magicalhost.com:3306/database",
        expectation: {
          username: "kim",
          password: "possible",
          host: "magicalhost.com",
          port: "3306",
        },
      },
      {
        url: "mariadb://user:pass@localhost:3306",
        expectation: {
          username: "user",
          password: "pass",
          host: "localhost",
          port: "3306",
        },
      },
      {
        url: "mariadb://user:pass@localhost",
        expectation: {
          username: "user",
          password: "pass",
          host: "localhost",
        },
      },
      {
        url: "mariadb://user:pass@db.example.com:3307/mydb",
        expectation: {
          username: "user",
          password: "pass",
          host: "db.example.com",
          port: "3307",
        },
      },
      {
        url: "mariadb://admin:p%40ssw0rd%21@db-server.io:3306",
        expectation: {
          username: "admin",
          password: "p@ssw0rd!",
          host: "db-server.io",
          port: "3306",
        },
      },
      {
        url: "mariadb://my%2Buser:my%2Bpass@host.com",
        expectation: {
          username: "my+user",
          password: "my+pass",
          host: "host.com",
        },
      },
      {
        url: "mariadb://user:pass@192.168.1.100:3306",
        expectation: {
          username: "user",
          password: "pass",
          host: "192.168.1.100",
          port: "3306",
        },
      },
      {
        url: "mariadb://user:pass@[::1]:3306",
        expectation: {
          username: "user",
          password: "pass",
          host: "::1",
          port: "3306",
        },
      },
      {
        url: "mariadb://user:pass@[2001:db8::1]:3306/db",
        expectation: {
          username: "user",
          password: "pass",
          host: "2001:db8::1",
          port: "3306",
        },
      },
      {
        url: "mariadb://user:pass@host.com/database?ssl=true",
        expectation: {
          username: "user",
          password: "pass",
          host: "host.com",
        },
      },
      {
        url: "mysql://user:pass@localhost:3306/database",
        expectation: {
          username: "user",
          password: "pass",
          host: "localhost",
          port: "3306",
        },
      },
    ];
    for (const { url, expectation } of successCases) {
      it(url, async () => {
        // when
        const parts = UrlParser.mariadb(url);
        // then
        expect(parts).toEqual(expectation);
      });
    }

    const errorCases: Array<{
      description: string;
      url: string;
      error: string;
    }> = [
      {
        description: "missing username",
        url: "mariadb://:password@host.com:3306",
        error: "Username is required in connection URL",
      },
      {
        description: "missing password",
        url: "mariadb://user@host.com:3306",
        error: "Password is required in connection URL",
      },
      {
        description: "missing host",
        url: "mariadb://user:pass@:3306",
        error: "Invalid URL format",
      },
      {
        description: "invalid protocol",
        url: "postgresql://user:pass@host.com:5432",
        error: "Invalid protocol: postgresql:. Expected 'mariadb:' or 'mysql:'",
      },
      {
        description: "invalid URL",
        url: "not a url at all",
        error: "Invalid URL format",
      },
    ];
    for (const { description, url, error } of errorCases) {
      it(`error: ${description}`, async () => {
        // when
        const action = () => UrlParser.mariadb(url);
        // then
        expect(action).toThrow(error);
      });
    }
  });
});
