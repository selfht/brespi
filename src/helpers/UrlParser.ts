export namespace UrlParser {
  /**
   * postgresql://user:pass@localhost:5432
   */
  type PostgresParts = {
    username: string;
    password: string;
    host: string;
    port?: string;
  };
  export function postgres(url: string): PostgresParts {
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

  /**
   * mariadb://user:pass@localhost:3306
   */
  type MariadbParts = {
    username: string;
    password: string;
    host: string;
    port?: string;
  };
  export function mariadb(url: string): MariadbParts {
    try {
      const parsedUrl = new URL(url);
      // Validate protocol
      if (parsedUrl.protocol !== "mariadb:") {
        throw new Error(`Invalid protocol: ${parsedUrl.protocol}. Expected 'mariadb:'`);
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
