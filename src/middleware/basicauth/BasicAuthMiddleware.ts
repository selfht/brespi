import { Env } from "@/Env";
import { ServerError } from "@/errors/ServerError";
import { MiddlewareHandler } from "../MiddlewareHandler";

type Credentials = {
  username: string;
  password: string;
};

type HashedCredentials = {
  username: string;
  passwordHash: string;
};

export class BasicAuthMiddleware implements MiddlewareHandler {
  private enabled?: boolean;
  private hashedCredentials?: HashedCredentials[];

  public constructor(private readonly env: Env.Private) {}

  public async initializeFromDisk() {
    const htpasswd = Bun.file(this.env.X_BRESPI_HTPASSWD);
    if (await htpasswd.exists()) {
      const content = await htpasswd.text();
      this.enabled = true;
      this.hashedCredentials = content
        .split("\n")
        .filter((line) => line.includes(":"))
        .map((line) => line.split(":", 2))
        .map(([username, passwordHash]) => ({ username, passwordHash }));
    } else {
      this.enabled = false;
    }
  }

  public async apply(request: Request, next: () => Promise<Response>): Promise<Response> {
    if (typeof this.enabled !== "boolean") {
      throw new Error(`Please call \`${"initializeFromDisk" satisfies keyof typeof this}\` first`);
    }
    if (this.enabled) {
      const { accessGranted } = await this.authenticate(request.headers);
      if (!accessGranted) {
        return Response.json(ServerError.unauthorized().json(), {
          status: 401,
          headers: { "WWW-Authenticate": "Basic" },
        });
      }
    }
    return await next();
  }

  private async authenticate(headers: Headers): Promise<{ accessGranted: boolean }> {
    const credentials = this.extractBasicAuthCredentials(headers);
    if (!credentials) {
      return { accessGranted: false };
    }
    const validCredentials = await this.validateCredentials(credentials);
    if (!validCredentials) {
      return { accessGranted: false };
    }
    return { accessGranted: true };
  }

  private extractBasicAuthCredentials(headers: Headers): Credentials | undefined {
    try {
      const auth = headers.get("Authorization");
      if (auth) {
        const prefix = "Basic ";
        if (auth.toLowerCase().startsWith(prefix.toLowerCase())) {
          const b64Credentials = auth.slice(prefix.length);
          if (b64Credentials.length > 0) {
            const plaintextCredentials = Buffer.from(b64Credentials, "base64").toString("utf-8");
            if (plaintextCredentials.includes(":")) {
              const [username, password] = plaintextCredentials.split(":", 2);
              return { username, password };
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  private async validateCredentials(credentials: Credentials): Promise<boolean> {
    if (!this.hashedCredentials) {
      throw new Error(`Please call \`${"initializeFromDisk" satisfies keyof typeof this}\` first`);
    }
    for (const { username, passwordHash } of this.hashedCredentials) {
      if (credentials.username === username) {
        if (await Bun.password.verify(credentials.password, passwordHash)) {
          return true;
        }
      }
    }
    return false;
  }
}
