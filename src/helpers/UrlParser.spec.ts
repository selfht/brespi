import { describe, expect, it } from "bun:test";
import { UrlParser } from "./UrlParser";
import { Test } from "./Test.spec";

describe(UrlParser.name, () => {
  describe(UrlParser.postgres.name, () => {
    const successCollection = Test.createCollection<{
      description: string;
      url: string;
      expectation: {
        username: string;
        password: string;
        host: string;
        port?: string;
      };
    }>("description", [
      {
        description: "basic URL with database",
        url: "postgresql://kim:possible@magicalhost.com:9482/database",
        expectation: {
          username: "kim",
          password: "possible",
          host: "magicalhost.com",
          port: "9482",
        },
      },
      {
        description: "localhost with port",
        url: "postgresql://user:pass@localhost:5432",
        expectation: {
          username: "user",
          password: "pass",
          host: "localhost",
          port: "5432",
        },
      },
      {
        description: "localhost without port",
        url: "postgresql://user:pass@localhost",
        expectation: {
          username: "user",
          password: "pass",
          host: "localhost",
        },
      },
      {
        description: "postgres:// protocol variant",
        url: "postgres://user:pass@db.example.com:5433/mydb",
        expectation: {
          username: "user",
          password: "pass",
          host: "db.example.com",
          port: "5433",
        },
      },
      {
        description: "URL-encoded password",
        url: "postgresql://admin:p%40ssw0rd%21@db-server.io:5432",
        expectation: {
          username: "admin",
          password: "p@ssw0rd!",
          host: "db-server.io",
          port: "5432",
        },
      },
      {
        description: "URL-encoded username and password",
        url: "postgresql://my%2Buser:my%2Bpass@host.com",
        expectation: {
          username: "my+user",
          password: "my+pass",
          host: "host.com",
        },
      },
      {
        description: "IPv4 address",
        url: "postgresql://user:pass@192.168.1.100:5432",
        expectation: {
          username: "user",
          password: "pass",
          host: "192.168.1.100",
          port: "5432",
        },
      },
      {
        description: "IPv6 localhost",
        url: "postgresql://user:pass@[::1]:5432",
        expectation: {
          username: "user",
          password: "pass",
          host: "::1",
          port: "5432",
        },
      },
      {
        description: "IPv6 address with database",
        url: "postgresql://user:pass@[2001:db8::1]:5432/db",
        expectation: {
          username: "user",
          password: "pass",
          host: "2001:db8::1",
          port: "5432",
        },
      },
      {
        description: "URL with query parameters",
        url: "postgresql://user:pass@host.com/database?sslmode=require",
        expectation: {
          username: "user",
          password: "pass",
          host: "host.com",
        },
      },
      {
        description: "URL with multiple query parameters",
        url: "postgres://user:pass@host.com:5432?sslmode=require&connect_timeout=10",
        expectation: {
          username: "user",
          password: "pass",
          host: "host.com",
          port: "5432",
        },
      },
    ]);
    it.each(successCollection.testCases)("success: %s", async (testCase) => {
      const { url, expectation } = successCollection.get(testCase);
      // when
      const parts = UrlParser.postgres(url);
      // then
      expect(parts).toEqual(expectation);
    });

    const errorCollection = Test.createCollection<{
      description: string;
      url: string;
      expectation: {
        error: string;
      };
    }>("description", [
      {
        description: "missing username",
        url: "postgresql://:password@host.com:5432",
        expectation: { error: "Username is required in connection URL" },
      },
      {
        description: "missing password",
        url: "postgresql://user@host.com:5432",
        expectation: { error: "Password is required in connection URL" },
      },
      {
        description: "missing host",
        url: "postgresql://user:pass@:5432",
        expectation: { error: "Invalid URL format" },
      },
      {
        description: "invalid protocol",
        url: "mysql://user:pass@host.com:3306",
        expectation: { error: "Invalid protocol: mysql:. Expected 'postgresql:' or 'postgres:'" },
      },
      {
        description: "not a valid URL",
        url: "not a url at all",
        expectation: { error: "Invalid URL format" },
      },
    ]);
    it.each(errorCollection.testCases)("error: %s", async (testCase) => {
      const { url, expectation } = errorCollection.get(testCase);
      // when
      const action = () => UrlParser.postgres(url);
      // then
      expect(action).toThrow(expectation.error);
    });
  });
});
