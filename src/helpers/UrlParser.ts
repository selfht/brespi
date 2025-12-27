type PostgresParts = {
  username: string;
  password: string;
  host: string;
  port?: string;
};

type S3Parts = {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  region?: string;
};

export class UrlParser {
  /**
   * postgresql://user:pass@localhost:5432
   */
  public static postgres(url: string): PostgresParts {
    try {
      const parsedUrl = new URL(url);
      // Validate protocol
      if (parsedUrl.protocol !== "postgresql:" && parsedUrl.protocol !== "postgres:") {
        throw new Error(`Invalid protocol: ${parsedUrl.protocol}. Expected 'postgresql:' or 'postgres:'`);
      }
      // Extract username and password
      const username = decodeURIComponent(parsedUrl.username);
      const password = decodeURIComponent(parsedUrl.password);
      if (!username) {
        throw new Error("Username is required in connection URL");
      }
      if (!password) {
        throw new Error("Password is required in connection URL");
      }
      // Extract host (strip brackets from IPv6 addresses)
      let host = parsedUrl.hostname;
      if (!host) {
        throw new Error("Host is required in connection URL");
      }
      // Remove brackets from IPv6 addresses
      if (host.startsWith("[") && host.endsWith("]")) {
        host = host.slice(1, -1);
      }
      // Extract port (if specified)
      const port = parsedUrl.port;
      return {
        username,
        password,
        host,
        port: port || undefined,
      };
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Invalid URL format: ${error.message}`);
      }
      throw error;
    }
  }
}
