export namespace TestUtils {
  type Collection<T> = {
    testCases: string[];
    get: (key: string) => T;
  };
  export function createCollection<T>(keyProp: keyof T, testCases: T[]): Collection<T> {
    const collection = new Map<string, T>();
    testCases.forEach((testCase) => {
      let key = "";
      for (let i = 0; true; i++) {
        key = i === 0 ? `${testCase[keyProp]}` : `${testCase[keyProp]} (${i + 1})`;
        if (!collection.has(key)) {
          break;
        }
      }
      collection.set(key, testCase);
    });
    return {
      testCases: [...collection.keys()],
      get: (key) => collection.get(key)!,
    };
  }

  export async function waitUntil<T>(
    fn: () => T | Promise<T>,
    condition: (result: T) => boolean,
    { timeout = 5000, interval = 25 }: { timeout?: number; interval?: number } = {},
  ): Promise<T> {
    const startTime = Date.now();
    while (true) {
      const result = await fn();
      if (condition(result)) {
        return result;
      }
      if (Date.now() - startTime >= timeout) {
        throw new Error(`waitUntil timeout after ${timeout}ms`);
      }
      await sleep(interval);
    }
  }

  export function sleep(milliseconds: number) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
