import { useMemo, useState } from 'react'
import {
  buildInputSnapshot,
  parseTemplateParams,
  validateAllParamValues,
} from '@lenserfight/domain/lens-parameters'
import { LensParam, LensVersionParam, FundingSource, GenerativeMediaParams } from '@lenserfight/types'
import { extractParams, resolveUuidRefs, validateParamValues } from '@lenserfight/utils/text'
import { TriggerLabExecutionDTO } from './useLabController'
import type { LocalKeyMeta } from '@lenserfight/types'

// Detect variables from both {{legacy}} and [[modern]] template syntaxes.
// [[modern]] detection delegates to the shared extractParams utility so spaces,
// hyphens, and the optional-marker (!) are handled identically everywhere.
export function extractVariables(content: string): string[] {
  const matches = new Set<string>()
  const re1 = /\{\{(\w+)\}\}/g
  let match: RegExpExecArray | null
  while ((match = re1.exec(content)) !== null) matches.add(match[1])
  for (const p of extractParams(content)) matches.add(p.name)
  return Array.from(matches)
}

/** Map from variable name → optional flag, derived from [[label!]] syntax. */
function extractOptionalMap(content: string): Map<string, boolean> {
  return new Map(parseTemplateParams(content).map((p) => [p.label, p.optional]))
}

export interface SubmitDeps {
  onTriggerStream: (dto: TriggerLabExecutionDTO) => void
  /** Hydrated version parameters for validate/coerce/render. */
  versionParams?: LensVersionParam[]
  /** Active lens version id (for execution + file attachments). */
  versionId?: string
  selectedProviderKey: string
  selectedModelKey: string
  isLocalByok: boolean
  availableLocalKeys?: LocalKeyMeta[]
  selectedLocalKeyId?: string | null
  lensContent: string
  fundingSource?: FundingSource
  selectedKeyRefId?: string | null
  selectedModelInputModalities?: string[]
  output_modality?: 'image' | 'video' | 'audio' | 'music'
  generative_media_params?: GenerativeMediaParams
}

export interface UseLabParamFormResult {
  inputValues: Record<string, unknown>
  fieldErrors: Record<string, string>
  effectiveParams: LensVersionParam[]
  usingVersionParams: boolean
  handleChange: (name: string, value: unknown) => void
  handleMultiselectToggle: (name: string, option: string) => void
  applyImportedValues: (patch: Record<string, unknown>) => void
  handleSubmit: (e: React.FormEvent, deps: SubmitDeps) => void
}

export function useLabParamForm(
  lensContent: string,
  params?: LensParam[],
  versionParams?: LensVersionParam[],
): UseLabParamFormResult {
  // Resolve [[:uuid]] refs back to [[label]] before extracting variables so the
  // visible-param set stays correct even when the stored body mixes uuid refs with
  // named tokens (e.g. optional [[label!]] tokens a prior save failed to rewrite).
  // Without this, extractVariables() skips uuid refs and drops those params.
  const resolvedContent = useMemo(
    () =>
      versionParams && versionParams.length > 0
        ? resolveUuidRefs(lensContent, versionParams)
        : lensContent,
    [lensContent, versionParams],
  )
  const variables = useMemo(() => extractVariables(resolvedContent), [resolvedContent])
  const usingVersionParams = !!(versionParams && versionParams.length > 0)

  const legacyParamSchemas = useMemo<LensParam[]>(() => {
    if (usingVersionParams) return []
    if (params && params.length > 0) return params
    return variables.map((v) => ({ name: v, type: 'string' as const, required: true, placeholder: `Enter ${v}…` }))
  }, [usingVersionParams, params, variables])

  const optionalMap = useMemo(() => extractOptionalMap(lensContent), [lensContent])

  const effectiveParams = useMemo<LensVersionParam[]>(() => {
    if (usingVersionParams && versionParams) {
      // Content is the source of truth for which params exist.
      // variables[] is already derived from content via the shared extractParams utility.
      // For each content param, use the stored LensVersionParam schema when available;
      // fall back to a plain text-type entry for params added after the lens was saved.
      // If content has no detectable variables (e.g. [[:uuid]] body), keep stored params.
      if (variables.length === 0) return versionParams
      const vpByLabel = new Map(versionParams.map((p) => [p.label, p]))
      return variables.map((name): LensVersionParam => {
        const stored = vpByLabel.get(name)
        if (stored) return stored
        const isOptional = optionalMap.get(name) ?? false
        return {
          id: name, versionId: '', label: name, toolId: name,
          optional: isOptional,
          tool: {
            id: name, key: name, label: name, description: null,
            category: 'input', type: 'text', required: !isOptional,
            minLength: 0, maxLength: 0, placeholder: null, helpText: null,
            validationSchema: {}, options: null, sortOrder: 0,
            isSystem: false, icon: null, color: null,
          },
        }
      })
    }
    return legacyParamSchemas.map((lp) => ({
      id: lp.name,
      versionId: '',
      label: lp.name,
      toolId: lp.name,
      tool: {
        id: lp.name,
        key: lp.name,
        label: lp.name,
        description: lp.description ?? null,
        category: 'input',
        type: lp.type === 'string' ? 'text' : (lp.type as any),
        required: lp.required,
        minLength: 0,
        maxLength: 0,
        placeholder: lp.placeholder ?? null,
        helpText: lp.description ?? null,
        validationSchema: {
          min: lp.min,
          max: lp.max,
        },
        options: lp.options ?? null,
        sortOrder: 0,
        isSystem: false,
        icon: null,
        color: null,
      },
    }))
  }, [usingVersionParams, versionParams, variables, legacyParamSchemas, optionalMap])

  const [inputValues, setInputValues] = useState<Record<string, unknown>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleChange = (name: string, value: unknown) => {
    setInputValues((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => { const next = { ...prev }; delete next[name]; return next })
  }

  const handleMultiselectToggle = (name: string, option: string) => {
    setInputValues((prev) => {
      const current: string[] = Array.isArray(prev[name]) ? (prev[name] as string[]) : []
      const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option]
      return { ...prev, [name]: next }
    })
  }

  const applyImportedValues = (patch: Record<string, unknown>) => {
    setInputValues((prev) => ({ ...prev, ...patch }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(patch)) delete next[key]
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent, deps: SubmitDeps) => {
    e.preventDefault()

    const effectiveProviderKey = deps.isLocalByok
      ? (deps.availableLocalKeys?.find((k) => k.id === deps.selectedLocalKeyId)?.provider ?? '')
      : deps.selectedProviderKey

    if (!effectiveProviderKey || !deps.selectedModelKey) return

    let inputSnapshot: Record<string, unknown>
    const errors: Record<string, string> = {}

    const paramsForSubmit = deps.versionParams ?? effectiveParams

    if (usingVersionParams && paramsForSubmit.length > 0) {
      const validationErrors = validateAllParamValues(
        inputValues,
        paramsForSubmit,
        deps.selectedModelInputModalities,
      )
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors)
        return
      }
      inputSnapshot = buildInputSnapshot(inputValues, paramsForSubmit)
    } else {
      const validationErrors = validateParamValues(inputValues as Record<string, string>, legacyParamSchemas)
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors)
        return
      }
      inputSnapshot =
        legacyParamSchemas.length > 0
          ? Object.fromEntries(
            legacyParamSchemas.map((p) => [p.name, String(inputValues[p.name] ?? p.default ?? '')]),
          )
          : { freeform: String(inputValues['freeform'] ?? '') }
    }

    deps.onTriggerStream({
      providerKey: effectiveProviderKey as 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama',
      modelKey: deps.selectedModelKey,
      lensContent: deps.lensContent,
      inputSnapshot: inputSnapshot as Record<string, string>,
      versionParams: usingVersionParams ? paramsForSubmit : undefined,
      params: usingVersionParams ? undefined : legacyParamSchemas,
      fundingSource: deps.fundingSource,
      byokKeyRefId: deps.fundingSource === 'user_byok_cloud' ? deps.selectedKeyRefId ?? undefined : undefined,
      byokLocalKeyId: deps.fundingSource === 'user_byok_local' ? deps.selectedLocalKeyId ?? undefined : undefined,
      output_modality: deps.output_modality,
      generative_media_params: deps.generative_media_params,
      versionId: deps.versionId,
    })
  }

  return {
    inputValues,
    fieldErrors,
    effectiveParams,
    usingVersionParams,
    handleChange,
    handleMultiselectToggle,
    applyImportedValues,
    handleSubmit,
  }
}
