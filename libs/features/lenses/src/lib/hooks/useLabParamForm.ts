import { useMemo, useState } from 'react'
import { LensParam, LensVersionParam, FundingSource, GenerativeMediaParams } from '@lenserfight/types'
import { validateParamValues } from '@lenserfight/utils/text'
import { sanitizeStringInput, validateParamValue } from './useAttachmentValidation'
import { TriggerLabExecutionDTO } from './useLabController'
import type { LocalKeyMeta } from '@lenserfight/types'

// Detect variables from both {{legacy}} and [[modern]] template syntaxes
export function extractVariables(content: string): string[] {
  const matches = new Set<string>()
  const re1 = /\{\{(\w+)\}\}/g
  const re2 = /\[\[(\w+)\]\]/g
  let match: RegExpExecArray | null
  while ((match = re1.exec(content)) !== null) matches.add(match[1])
  while ((match = re2.exec(content)) !== null) matches.add(match[1])
  return Array.from(matches)
}

export interface SubmitDeps {
  onTriggerStream: (dto: TriggerLabExecutionDTO) => void
  versionParams?: LensVersionParam[]
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
  const variables = useMemo(() => extractVariables(lensContent), [lensContent])
  const usingVersionParams = !!(versionParams && versionParams.length > 0)

  const legacyParamSchemas = useMemo<LensParam[]>(() => {
    if (usingVersionParams) return []
    if (params && params.length > 0) return params
    return variables.map((v) => ({ name: v, type: 'string' as const, required: true, placeholder: `Enter ${v}…` }))
  }, [usingVersionParams, params, variables])

  const effectiveParams = useMemo<LensVersionParam[]>(() => {
    if (usingVersionParams && versionParams) return versionParams
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
  }, [usingVersionParams, versionParams, legacyParamSchemas])

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

  const sanitize = (val: unknown): string =>
    typeof val === 'string' ? sanitizeStringInput(val) : String(val ?? '')

  const handleSubmit = (e: React.FormEvent, deps: SubmitDeps) => {
    e.preventDefault()

    const effectiveProviderKey = deps.isLocalByok
      ? (deps.availableLocalKeys?.find((k) => k.id === deps.selectedLocalKeyId)?.provider ?? '')
      : deps.selectedProviderKey

    if (!effectiveProviderKey || !deps.selectedModelKey) return

    let inputSnapshot: Record<string, unknown>
    const errors: Record<string, string> = {}

    if (usingVersionParams && deps.versionParams) {
      for (const p of deps.versionParams) {
        const err = validateParamValue(inputValues[p.label], p, deps.selectedModelInputModalities)
        if (err) errors[p.label] = err
      }
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }
      inputSnapshot = Object.fromEntries(
        deps.versionParams.map((p) => {
          const val = inputValues[p.label] ?? ''
          const sanitized =
            p.tool.type === 'text' || p.tool.type === 'textarea' || p.tool.type === 'url' || p.tool.type === 'json'
              ? sanitize(val)
              : val
          return [p.label, sanitized]
        }),
      )
    } else {
      const validationErrors = validateParamValues(inputValues as Record<string, string>, legacyParamSchemas)
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors)
        return
      }
      inputSnapshot =
        legacyParamSchemas.length > 0
          ? Object.fromEntries(
            legacyParamSchemas.map((p) => [p.name, sanitize(inputValues[p.name] ?? p.default ?? '')]),
          )
          : { freeform: sanitize(inputValues['freeform'] ?? '') }
    }

    deps.onTriggerStream({
      providerKey: effectiveProviderKey as 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama',
      modelKey: deps.selectedModelKey,
      lensContent: deps.lensContent,
      inputSnapshot: inputSnapshot as Record<string, string>,
      params: usingVersionParams ? undefined : legacyParamSchemas,
      fundingSource: deps.fundingSource,
      byokKeyRefId: deps.fundingSource === 'user_byok_cloud' ? deps.selectedKeyRefId ?? undefined : undefined,
      byokLocalKeyId: deps.fundingSource === 'user_byok_local' ? deps.selectedLocalKeyId ?? undefined : undefined,
      output_modality: deps.output_modality,
      generative_media_params: deps.generative_media_params,
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
