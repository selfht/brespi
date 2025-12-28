type Options = {
  cmd: string[];
  env?: Record<string, string | undefined>;
};
type Result = {
  exitCode: number;
  stdout: string;
  stderr: string;
};
export class CommandRunner {
  public static async run({ cmd, env }: Options): Promise<Result> {
    const proc = Bun.spawn({
      cmd,
      env,
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    await proc.exited;
    return {
      exitCode: proc.exitCode!,
      stdout,
      stderr,
    };
  }
}
