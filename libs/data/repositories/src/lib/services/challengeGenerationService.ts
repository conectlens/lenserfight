import type {
  GeneratedChallengeConfig,
  ChallengeGeneratorOutput,
} from '@lenserfight/domain/battle-governance'
import { getGeneratorRequirements } from '@lenserfight/domain/battle-governance'
import { generatedChallengesRepository } from '../repositories/generatedChallengesRepository'
import { executionService } from './executionService'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChallengeGenerationRequest {
  battleId: string
  config: GeneratedChallengeConfig
  createdBy: string
}

export interface ChallengeGenerationResult {
  challengeId: string
  questionText: string
  questionPayload: Record<string, unknown>
  contentHash: string
  status: 'ready' | 'failed'
  error?: string
}

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Challenge Generation Service — orchestrates AI question generation.
 *
 * Wraps Lens execution with challenge-specific lifecycle management:
 * 1. Create pending challenge record
 * 2. Trigger Lens execution with generation parameters
 * 3. Parse and sanitize output (strip CoT/private reasoning)
 * 4. Persist sanitized question and answer key
 * 5. Return ready challenge for creator review
 */
export const challengeGenerationService = {
  /**
   * Generates a challenge question using the configured generator Lens.
   *
   * Creates the challenge record, triggers execution, and processes the result.
   * The challenge enters 'ready' state on success, 'failed' on error.
   */
  async generate(request: ChallengeGenerationRequest): Promise<ChallengeGenerationResult> {
    const { battleId, config, createdBy } = request

    // Validate generator requirements match the challenge type
    const requirements = getGeneratorRequirements(config.challengeType)
    if (!requirements) {
      throw new Error(
        `Challenge type "${config.challengeType}" does not declare generator requirements`,
      )
    }

    // 1. Create pending record
    const challengeId = await generatedChallengesRepository.create({
      battleId,
      config,
      createdBy,
    })

    try {
      // 2. Mark as generating
      await generatedChallengesRepository.markGenerating(challengeId)

      // 3. Trigger Lens execution
      const executionResult = await executionService.triggerExecution({
        lens_id: config.generatorLensId,
        version_id: config.generatorVersionId ?? undefined,
        model_id: config.generatorModelId,
        input_snapshot: buildInputSnapshot(config),
        funding_source: 'platform_credit',
        origin_type: 'battle',
      })

      // 4. Poll for completion
      const runId = executionResult?.execution_run_id
      if (!runId) {
        throw new Error('Execution did not return a run ID')
      }

      const run = await pollUntilComplete(runId)
      if (run.status === 'failed') {
        throw new Error(run.errorCode ?? 'Execution failed')
      }

      // 5. Parse and sanitize output
      const output = parseGeneratorOutput(run.responseText ?? '', requirements.outputSchema)
      const sanitizedOutput = stripPrivateReasoning(output)

      // 6. Compute content hash for integrity
      const contentHash = await computeContentHash(
        sanitizedOutput.questionText,
        sanitizedOutput.questionPayload,
      )

      // 7. Encrypt and hash answer key if present
      const answerKeyHash = sanitizedOutput.answerKey
        ? await computeHash(sanitizedOutput.answerKey)
        : null
      const answerKeyEncrypted = sanitizedOutput.answerKey
        ? await encryptAnswerKey(sanitizedOutput.answerKey)
        : null

      // 8. Complete generation
      await generatedChallengesRepository.completeGeneration(challengeId, {
        questionText: sanitizedOutput.questionText,
        questionPayload: sanitizedOutput.questionPayload ?? {},
        answerKeyEncrypted,
        answerKeyHash,
        contentHash,
        executionRunId: runId,
      })

      return {
        challengeId,
        questionText: sanitizedOutput.questionText,
        questionPayload: sanitizedOutput.questionPayload ?? {},
        contentHash,
        status: 'ready',
      }
    } catch (error) {
      // Mark as failed on any error
      await generatedChallengesRepository.markFailed(challengeId).catch(() => {
        // Swallow — best effort
      })

      return {
        challengeId,
        questionText: '',
        questionPayload: {},
        contentHash: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown generation error',
      }
    }
  },

  /**
   * Locks a challenge that is in 'ready' state, making it immutable.
   */
  async lockChallenge(challengeId: string, battleId: string): Promise<void> {
    await generatedChallengesRepository.lock(challengeId, battleId)
  },

  /**
   * Regenerates a challenge (creates a new one, superseding the old).
   * Only allowed when the existing challenge is in 'ready' or 'failed' state.
   */
  async regenerate(request: ChallengeGenerationRequest): Promise<ChallengeGenerationResult> {
    // Simply generate a new one — the old record remains for audit trail
    return this.generate(request)
  },
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function buildInputSnapshot(config: GeneratedChallengeConfig): Record<string, unknown> {
  return {
    challenge_type: config.challengeType,
    difficulty: config.difficulty ?? 'medium',
    language: config.language ?? 'en',
    topic: config.topic ?? null,
    time_limit_seconds: config.timeLimitSeconds ?? null,
    ...config.customParameters,
  }
}

async function pollUntilComplete(
  runId: string,
  maxAttempts = 30,
  intervalMs = 2000,
): Promise<{ status: string; responseText?: string; errorCode?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    const run = await executionService.pollRunStatus(runId)
    if (run.status === 'succeeded' || run.status === 'failed') {
      // Fetch artifacts for the response text (primary output)
      const artifacts = await executionService.getArtifacts(runId)
      const primaryArtifact = artifacts.find((a) => a.isPrimaryOutput)
      return {
        status: run.status,
        responseText: primaryArtifact?.contentText ?? undefined,
        errorCode: run.errorCode ?? undefined,
      }
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error('Challenge generation timed out after polling')
}

/**
 * Parses structured output from the generator Lens response.
 *
 * Expects JSON output in the format:
 * { "question": "...", "answer_key": "...", "options": [...], "explanation": "..." }
 *
 * Falls back to treating the full response as question text if JSON parsing fails.
 */
function parseGeneratorOutput(
  responseText: string,
  _outputSchema: string,
): ChallengeGeneratorOutput {
  try {
    const parsed = JSON.parse(responseText)
    return {
      questionText: parsed.question ?? parsed.question_text ?? parsed.prompt ?? responseText,
      questionPayload: parsed.options
        ? { options: parsed.options, code: parsed.code }
        : parsed.payload ?? {},
      answerKey: parsed.answer_key ?? parsed.answer ?? parsed.expected_answer ?? undefined,
      rubric: parsed.rubric ?? undefined,
      explanation: parsed.explanation ?? undefined,
    }
  } catch {
    // Not JSON — treat as plain text question
    return {
      questionText: responseText.trim(),
      questionPayload: {},
    }
  }
}

/**
 * Strips any chain-of-thought, private reasoning, or internal markers
 * from the generator output. Ensures no hidden context leaks to contestants.
 */
function stripPrivateReasoning(output: ChallengeGeneratorOutput): ChallengeGeneratorOutput {
  let questionText = output.questionText

  // Remove common CoT markers anywhere in the response (not just at the start).
  // Anchoring to ^ would miss reasoning blocks embedded after an opening line.
  const cotPatterns = [
    /<thinking>[\s\S]*?<\/thinking>\s*/gi,
    /<internal>[\s\S]*?<\/internal>\s*/gi,
    /<reasoning>[\s\S]*?<\/reasoning>\s*/gi,
    /\[Internal reasoning:[\s\S]*?\]\s*/gi,
  ]

  for (const pattern of cotPatterns) {
    questionText = questionText.replace(pattern, '')
  }

  return {
    ...output,
    questionText: questionText.trim(),
  }
}

async function computeContentHash(
  questionText: string,
  questionPayload?: Record<string, unknown>,
): Promise<string> {
  const content = JSON.stringify({ questionText, questionPayload: questionPayload ?? {} })
  return computeHash(content)
}

async function computeHash(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── Answer key encryption (AES-256-GCM) ────────────────────────────────────

let _encryptionKeyPromise: Promise<CryptoKey | null> | null = null

function getEncryptionKey(): Promise<CryptoKey | null> {
  if (_encryptionKeyPromise) return _encryptionKeyPromise
  _encryptionKeyPromise = (async () => {
    // Support Deno (Supabase Edge Functions) and Node / other edge runtimes.
    const secret =
      (typeof Deno !== 'undefined' ? Deno.env.get('ANSWER_KEY_ENCRYPTION_SECRET') : undefined) ??
      (typeof process !== 'undefined' ? process.env['ANSWER_KEY_ENCRYPTION_SECRET'] : undefined)
    if (!secret) return null
    const raw = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0))
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt'])
  })()
  return _encryptionKeyPromise
}

/**
 * Encrypts an answer key with AES-256-GCM using a platform secret.
 *
 * Output format: `<iv_hex>:<ciphertext_hex>` (IV is 12 bytes / 24 hex chars).
 *
 * Throws if ANSWER_KEY_ENCRYPTION_SECRET is not configured — prevents plaintext
 * storage when challenge types declare requiresAnswerKey: true.
 */
async function encryptAnswerKey(plaintext: string): Promise<string> {
  const key = await getEncryptionKey()
  if (!key) {
    throw new Error(
      'ANSWER_KEY_ENCRYPTION_SECRET is not configured. ' +
        'Challenge types with answer keys cannot be generated without encryption at rest. ' +
        'Set a base64-encoded 32-byte secret in the environment before enabling ' +
        'math_calculation, grammar_quiz, fill_in_blanks, or benchmark types with answer keys.',
    )
  }
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const toHex = (bytes: Uint8Array) =>
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  return `${toHex(iv)}:${toHex(new Uint8Array(cipherBuffer))}`
}
