/**
 * The two Node APIs that src/core/output/output.test.ts uses to write the TextFSM validator's
 * cases (Vitest runs in Node). The app itself never uses them.
 */
declare module 'node:fs' {
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void
  export function writeFileSync(path: string, data: string): void
}
declare const process: { env: Record<string, string | undefined> }
