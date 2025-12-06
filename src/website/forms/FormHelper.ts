export namespace FormHelper {
  export async function snoozeBeforeSubmit(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
