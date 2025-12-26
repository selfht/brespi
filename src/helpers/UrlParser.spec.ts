import { describe, expect, it } from "bun:test";
import { UrlParser } from "./UrlParser";

describe(UrlParser.name, () => {
  describe(UrlParser.postgres.name, () => {
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
      const parts = UrlParser.postgres(url);
      // then
      expect(parts).toEqual(expectation);
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
      const action = () => UrlParser.postgres(url);
      // then
      expect(action).toThrow(expectation.error);
    });
  });

  describe(UrlParser.s3.name, () => {
    type SuccessTestCase = {
      url: string;
      expectation: {
        accessKeyId: string;
        secretAccessKey: string;
        bucket: string;
        endpoint: string;
        region?: string;
      };
    };
    it.each<SuccessTestCase>([
      {
        url: "s3+https://AKIAIOSFODNN7EXAMPLE:wJalrXUtnFEMI%2FK7MDENG%2FbPxRfiCYEXAMPLEKEY@s3.amazonaws.com:443/my-backups?region=us-east-1",
        expectation: {
          accessKeyId: "AKIAIOSFODNN7EXAMPLE",
          secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
          bucket: "my-backups",
          endpoint: "https://s3.amazonaws.com:443",
          region: "us-east-1",
        },
      },
      {
        url: "s3+https://mykey:mysecret@s3.amazonaws.com/production-backups?region=eu-west-1",
        expectation: {
          accessKeyId: "mykey",
          secretAccessKey: "mysecret",
          bucket: "production-backups",
          endpoint: "https://s3.amazonaws.com:443",
          region: "eu-west-1",
        },
      },
      {
        url: "s3+http://admin:password123@minio:9000/backups",
        expectation: {
          accessKeyId: "admin",
          secretAccessKey: "password123",
          bucket: "backups",
          endpoint: "http://minio:9000",
        },
      },
      {
        url: "s3+http://key:secret@localhost/test-bucket",
        expectation: {
          accessKeyId: "key",
          secretAccessKey: "secret",
          bucket: "test-bucket",
          endpoint: "http://localhost:80",
        },
      },
      {
        url: "s3+https://key:secret@s3.us-west-2.amazonaws.com/my-bucket",
        expectation: {
          accessKeyId: "key",
          secretAccessKey: "secret",
          bucket: "my-bucket",
          endpoint: "https://s3.us-west-2.amazonaws.com:443",
        },
      },
      {
        url: "s3+http://user%40example:p%40ssw0rd%21@192.168.1.100:9000/bucket-name?region=local",
        expectation: {
          accessKeyId: "user@example",
          secretAccessKey: "p@ssw0rd!",
          bucket: "bucket-name",
          endpoint: "http://192.168.1.100:9000",
          region: "local",
        },
      },
      {
        url: "s3+https://key:secret@s3.amazonaws.com:9999/my-bucket?region=ap-southeast-1",
        expectation: {
          accessKeyId: "key",
          secretAccessKey: "secret",
          bucket: "my-bucket",
          endpoint: "https://s3.amazonaws.com:9999",
          region: "ap-southeast-1",
        },
      },
    ])("success $url", ({ url, expectation }) => {
      // when
      const parts = UrlParser.s3(url);
      // then
      expect(parts).toEqual(expectation);
    });

    type ErrorTestCase = {
      url: string;
      expectation: {
        error: string;
      };
    };
    it.each<ErrorTestCase>([
      {
        url: "s3+https://:secret@host.com:9000/bucket?region=us-east-1",
        expectation: { error: "Access Key ID is required in S3 URL" },
      },
      {
        url: "s3+https://key@host.com:9000/bucket?region=us-east-1",
        expectation: { error: "Secret Access Key is required in S3 URL" },
      },
      {
        url: "s3+https://key:secret@:9000/bucket",
        expectation: { error: "Invalid S3 URL format" },
      },
      {
        url: "s3+https://key:secret@host.com:9000",
        expectation: { error: "Bucket name is required in S3 URL path" },
      },
      {
        url: "s3+https://key:secret@host.com:9000/",
        expectation: { error: "Bucket name is required in S3 URL path" },
      },
      {
        url: "https://key:secret@host.com:9000/bucket",
        expectation: { error: "Invalid protocol: https:. Expected 's3+http:' or 's3+https:'" },
      },
      {
        url: "s3://key:secret@host.com:9000/bucket",
        expectation: { error: "Invalid protocol: s3:. Expected 's3+http:' or 's3+https:'" },
      },
      {
        url: "not a valid url",
        expectation: { error: "Invalid S3 URL format" },
      },
    ])("error $url", ({ url, expectation }) => {
      // when
      const action = () => UrlParser.s3(url);
      // then
      expect(action).toThrow(expectation.error);
    });
  });
});
