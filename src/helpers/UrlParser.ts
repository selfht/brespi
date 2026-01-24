export namespace UrlParser {
  /**
   * postgresql://user:pass@localhost:5432
   * postgres://user:pass@localhost:5432
   */
  export function postgres(url: string): ConnectionParts {
    return parse(url, ["postgresql:", "postgres:"]);
  }

  /**
   * mariadb://user:pass@localhost:3306
   * mysql://user:pass@localhost:3306
   */
  export function mariadb(url: string): ConnectionParts {
    return parse(url, ["mariadb:", "mysql:"]);
  }

  type ConnectionParts = {
    username: string;
    password: string;
    host: string;
    port?: string;
  };
  function parse(url: string, allowedProtocols: string[]): ConnectionParts {
    try {
      const parsedUrl = new URL(url);
      // Validate protocol
      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        const expected = allowedProtocols.map((p) => `'${p}'`).join(" or ");
        throw new Error(`Invalid protocol: ${parsedUrl.protocol}. Expected ${expected}`);
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
