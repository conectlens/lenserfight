// Isolated on purpose: `import.meta.url` is invalid syntax under the
// commonjs module target apps/cli/tsconfig.spec.json uses for ts-jest (it's
// a TS1343 compile error, not just a lint issue — Jest never even reaches
// runtime). Every other file needs the value but must stay CommonJS-parseable
// for tests, so this is the one file allowed to contain the literal token;
// every module that needs it imports currentScriptUrl instead. Specs that
// (transitively) reach it call jest.mock('.../current-script-url', ...) so
// ts-jest never has to transform this file's real source.
export const currentScriptUrl = import.meta.url;
