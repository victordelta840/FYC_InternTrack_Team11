// dotenv is used at CLI entry; typeorm-ts-node-commonjs runs data-source.ts directly.
declare module 'dotenv' {
  export function config(options?: { path?: string }): { parsed?: Record<string, string> };
}
