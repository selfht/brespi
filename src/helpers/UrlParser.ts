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

  /**
   * s3+http(s)://<accessKeyId>:<secretAccessKey>@<host>:<port>/<bucket>?region=<region>
   */
  public static s3(url: string): S3Parts {
    try {
      const parsedUrl = new URL(url);
      // Validate protocol
      if (!parsedUrl.protocol.startsWith("s3+http")) {
        throw new Error(`Invalid protocol: ${parsedUrl.protocol}. Expected 's3+http:' or 's3+https:'`);
      }
      // Extract credentials
      const accessKeyId = decodeURIComponent(parsedUrl.username);
      const secretAccessKey = decodeURIComponent(parsedUrl.password);
      if (!accessKeyId) {
        throw new Error("Access Key ID is required in S3 URL");
      }
      if (!secretAccessKey) {
        throw new Error("Secret Access Key is required in S3 URL");
      }
      // Extract host and port
      const host = parsedUrl.hostname;
      if (!host) {
        throw new Error("Host is required in S3 URL");
      }
      // Determine the actual protocol (http or https)
      const actualProtocol = parsedUrl.protocol === "s3+https:" ? "https" : "http";
      const port = parsedUrl.port || (actualProtocol === "https" ? "443" : "80");
      const endpoint = `${actualProtocol}://${host}:${port}`;
      // Extract bucket from pathname
      const bucket = parsedUrl.pathname.replace(/^\//, "").replace(/\/$/, "");
      if (!bucket) {
        throw new Error("Bucket name is required in S3 URL path");
      }
      // Extract region from query parameters (optional)
      const region = parsedUrl.searchParams.get("region") || undefined;
      return {
        accessKeyId,
        secretAccessKey,
        bucket,
        endpoint,
        region,
      };
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Invalid S3 URL format: ${error.message}`);
      }
      throw error;
    }
  }
}
