import { render } from 'ink'

import { loadOnboardingSnapshot } from '../../lib/onboarding/state'
import { createStableWriteStream } from '../ink-io-proxy'

import { Repl } from './Repl'
import { OnboardingScreen } from './screens/OnboardingScreen'

/** Renders the first-run onboarding screen once and resolves when the user dismisses it (any key). */
function runOnboarding(io: { stdout: NodeJS.WriteStream; stderr: NodeJS.WriteStream }): Promise<void> {
  return new Promise((resolve) => {
    const instance = render(<OnboardingScreen onDone={() => { resolve(); instance.unmount() }} />, {
      ...io,
      exitOnCtrlC: false,
    })
  })
}

/**
 * Mounts the REPL once for the whole interactive session and resolves with
 * an exit code when the user quits (Ctrl+C while idle, or /quit). Unlike the
 * old per-command mount/unmount loop, Ink stays mounted throughout — a
 * dispatched command's captured output streams into the transcript instead
 * of the whole screen being torn down and rebuilt.
 *
 * Rendered against createStableWriteStream() wrappers rather than
 * process.stdout/stderr directly: stream-capture.ts's captureStd() reassigns
 * those streams' .write property for the duration of a dispatched command so
 * the command's own output can be captured into the transcript instead of
 * printing raw — if Ink rendered through the same mutable property, its own
 * frame updates would get captured (and silently dropped) too, freezing the
 * screen instead of showing live progress.
 */
export async function runInkRepl(): Promise<number> {
  const io = { stdout: createStableWriteStream(process.stdout), stderr: createStableWriteStream(process.stderr) }

  if (loadOnboardingSnapshot()?.status !== 'complete') {
    await runOnboarding(io)
  }

  return new Promise((resolve) => {
    const instance = render(
      <Repl
        onQuit={(code) => {
          resolve(code)
          instance.unmount()
        }}
      />,
      { ...io, exitOnCtrlC: false },
    )
  })
}
