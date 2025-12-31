type Options = {
  cmd: string[];
  env?: Record<string, string | undefined>;
};
type Result = {
  exitCode: number;
  stdout: string;
  stderr: string;
  stdall: string;
};
export class CommandRunner {
  public static async run({ cmd, env }: Options): Promise<Result> {
    const proc = Bun.spawn({
      cmd,
      env,
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    const stdallChunks: string[] = [];

    // Read both streams concurrently and capture interleaved output
    await Promise.all([
      (async () => {
        const reader = proc.stdout.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            stdoutChunks.push(text);
            stdallChunks.push(text);
          }
        } finally {
          reader.releaseLock();
        }
      })(),
      (async () => {
        const reader = proc.stderr.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            stderrChunks.push(text);
            stdallChunks.push(text);
          }
        } finally {
          reader.releaseLock();
        }
      })(),
    ]);

    await proc.exited;

    return {
      exitCode: proc.exitCode!,
      stdout: stdoutChunks.join(""),
      stderr: stderrChunks.join(""),
      stdall: stdallChunks.join(""),
    };
  }
}
