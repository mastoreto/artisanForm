// Shared React Compiler (Rust, oxc-transform-react) settings for the library
// build, the playground and Storybook.
//   ARTISAN_COMPILER=off  disables the compiler (used to compare behavior)
//   ARTISAN_COMPILER_LOG=1  prints compiler diagnostics (dev tool only)
// target '18' emits `react-compiler-runtime`, which works on React 18 and 19.
export const reactCompiler =
  process.env.ARTISAN_COMPILER === 'off'
    ? false
    : {
        target: '18' as const,
        logDiagnostics: process.env.ARTISAN_COMPILER_LOG === '1',
      };
