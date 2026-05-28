import { battlesRepository } from '@lenserfight/data/repositories'
import type { BattleTemplateRecord } from '@lenserfight/data/repositories'
import { handleRateLimitError } from '@lenserfight/shared/error'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Globe, Lock, Plus } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

const QUERY_KEY = ['admin', 'battle-templates']

export function TemplateManagementPanel() {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ templateId: '', title: '', slug: '' })

  const { data: templates = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => battlesRepository.listBattleTemplates(),
  })

  const togglePublic = useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      battlesRepository.toggleBattleTemplatePublic(id, isPublic),
    onSuccess: (_, { isPublic }) => {
      toast.success(isPublic ? 'Template published' : 'Template unpublished')
      qc.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: handleRateLimitError,
  })

  const createBattle = useMutation({
    mutationFn: () =>
      battlesRepository.createBattleFromTemplate(form.templateId, form.title, form.slug),
    onSuccess: (battleId) => {
      toast.success(`Battle created (${battleId.slice(0, 8)}…)`)
      setCreating(false)
      setForm({ templateId: '', title: '', slug: '' })
    },
    onError: handleRateLimitError,
  })

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-yellow-400" />
          <h2 className="text-sm font-semibold text-greyscale-100">Battle Templates</h2>
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-yellow-500 px-3 py-1 text-xs font-semibold text-gray-900 hover:bg-yellow-400"
        >
          <Plus size={12} />
          New battle from template
        </button>
      </div>

      {creating && (
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 space-y-3">
          <p className="text-xs font-semibold text-greyscale-400">Create battle from template</p>
          <select
            value={form.templateId}
            onChange={(e) => setForm((f) => ({ ...f, templateId: e.target.value }))}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-greyscale-100"
          >
            <option value="">Select a template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Battle title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-greyscale-100"
          />
          <input
            type="text"
            placeholder="Slug (url-safe)"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-greyscale-100"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!form.templateId || !form.title || !form.slug || createBattle.isPending}
              onClick={() => createBattle.mutate()}
              className="rounded-lg bg-yellow-500 px-3 py-1 text-xs font-semibold text-gray-900 disabled:opacity-50"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-lg border border-gray-700 px-3 py-1 text-xs text-greyscale-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-greyscale-500">Loading templates…</p>
      ) : templates.length === 0 ? (
        <p className="text-xs text-greyscale-500">No templates found.</p>
      ) : (
        <ul className="space-y-2">
          {templates.map((t: BattleTemplateRecord) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-gray-800 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-greyscale-100">{t.title}</p>
                {t.description && (
                  <p className="truncate text-xs text-greyscale-500">{t.description}</p>
                )}
              </div>
              <div className="ml-4 flex items-center gap-2">
                <span className={`text-xs ${t.is_public ? 'text-emerald-400' : 'text-greyscale-500'}`}>
                  {t.is_public ? <Globe size={12} /> : <Lock size={12} />}
                </span>
                <button
                  type="button"
                  disabled={togglePublic.isPending}
                  onClick={() => togglePublic.mutate({ id: t.id, isPublic: !t.is_public })}
                  className="rounded-lg border border-gray-700 px-2 py-0.5 text-xs text-greyscale-400 hover:text-greyscale-100 disabled:opacity-50"
                >
                  {t.is_public ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
