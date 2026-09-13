declare module "bun:test" {
  interface Matchers<T = unknown> {
    toHaveBeenCalledOnce(): void;
    toEqual(expected: unknown): void;
    toMatchObject(expected: unknown): void;
  }
}
