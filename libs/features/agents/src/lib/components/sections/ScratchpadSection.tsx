import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type {
  AgentMemoryProfileRecord,
  AgentModelProfileRecord,
  ScratchpadRunMetadata,
  ScratchpadRunRecord,
} from '@lenserfight/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  type NodeProps,
  type Connection,
  type Edge,
  type Node
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Bot, Brain, Cpu, Play, Sparkles, Terminal, History, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { EmptyPanel } from '../EmptyPanel'

import { formatDateTime } from './_shared'
import { SectionPage } from './SectionPage'

// --- Custom Nodes ---

const WorkbenchNode = ({ data, selected }: NodeProps) => {
  const Icon = data.iconType === 'instruction' ? Sparkles :
    data.iconType === 'model' ? Cpu : Bot;

  return (
    <div className={`px-4 py-3 shadow-xl rounded-xl border bg-white dark:bg-[#121212] transition-all min-w-[220px]
      ${selected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-amber-500 !border-2 !border-white dark:!border-[#121212]" />
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center 
          ${data.iconType === 'agent' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
            data.iconType === 'instruction' ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400' :
              'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'}`}>
          <Icon size={20} />
        </div>
        <div>
          <div className="text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase">{data.typeLabel as string}</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{data.label as string}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-amber-500 !border-2 !border-white dark:!border-[#121212]" />
    </div>
  )
}

const nodeTypes = { workbench: WorkbenchNode }

export const ScratchpadSection: React.FC = () => {
  const {
    profile,
    bootstrap,
    bootstrapState,
    isOwner,
    defaultInstructionBinding,
    modelBindings,
  } = useAgentWorkspace()
  const queryClient = useQueryClient()

  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendingRunId, setPendingRunId] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState('')
  const [activeTab, setActiveTab] = useState<'workbench' | 'history'>('workbench')

  const runs = useQuery<ScratchpadRunRecord[]>({
    queryKey: queryKeys.agents.scratchpadRuns(bootstrap?.ai_lenser_id ?? ''),
    queryFn: () => agentWorkspaceService.listScratchpadRuns(bootstrap!.ai_lenser_id),
    enabled: isOwner && !!bootstrap?.ai_lenser_id,
    staleTime: 5_000,
  })

  const memoryProfiles =
    (bootstrap?.profiles.memory as AgentMemoryProfileRecord[] | undefined) ?? []
  const modelProfiles =
    (bootstrap?.profiles.models as AgentModelProfileRecord[] | undefined) ?? []

  useEffect(() => {
    if (selectedModelId) return
    const defaultModelId =
      modelBindings.find((binding) => binding.is_default)?.model_id ??
      modelProfiles.find((model) => model.is_default)?.model_id ??
      modelProfiles[0]?.model_id ??
      ''
    setSelectedModelId(defaultModelId ?? '')
  }, [modelBindings, modelProfiles, selectedModelId])

  const selectedModelProfile =
    modelProfiles.find((model) => model.model_id === selectedModelId) ?? null

  const initialNodes = useMemo<Node[]>(
    () =>
      [
        {
          id: 'agent',
          type: 'workbench',
          position: { x: 250, y: 300 },
          data: { label: profile.display_name || `@${profile.handle}`, typeLabel: 'Agent Node', iconType: 'agent' },
        },
        defaultInstructionBinding
          ? {
            id: 'instruction',
            type: 'workbench',
            position: { x: 50, y: 50 },
            data: {
              label: `Lens ${defaultInstructionBinding.lens_id.slice(0, 8)}`,
              typeLabel: 'Instruction Context',
              iconType: 'instruction'
            },
          }
          : null,
        selectedModelProfile
          ? {
            id: 'model',
            type: 'workbench',
            position: { x: 450, y: 50 },
            data: {
              label: selectedModelProfile.name,
              typeLabel: 'LLM Engine',
              iconType: 'model'
            },
          }
          : null,
      ].filter(Boolean) as Node[],
    [defaultInstructionBinding, profile.display_name, profile.handle, selectedModelProfile]
  )

  const initialEdges = useMemo<Edge[]>(
    () =>
      [
        defaultInstructionBinding
          ? { id: 'instruction-agent', source: 'instruction', target: 'agent', animated: true, style: { stroke: '#a855f7', strokeWidth: 2 } }
          : null,
        selectedModelProfile
          ? { id: 'model-agent', source: 'model', target: 'agent', animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } }
          : null,
      ].filter(Boolean) as Edge[],
    [defaultInstructionBinding, selectedModelProfile]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  )

  const invalidateRuns = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.scratchpadRuns(bootstrap?.ai_lenser_id ?? ''),
    })

  const startRun = useMutation({
    mutationFn: () => {
      const metadata: ScratchpadRunMetadata = {
        instruction_lens_id: defaultInstructionBinding?.lens_id ?? null,
        instruction_version_id: defaultInstructionBinding?.version_id ?? null,
        canvas_state: {
          nodes: nodes.map((node) => ({
            id: node.id,
            x: node.position.x,
            y: node.position.y,
            label: String((node.data as { label?: string } | undefined)?.label ?? node.id),
          })),
          edges: edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
          })),
        },
      }

      return agentWorkspaceService.createScratchpadRun({
        ai_lenser_id: bootstrap!.ai_lenser_id,
        prompt: prompt.trim(),
        model_id: selectedModelId || null,
        metadata,
      })
    },
    onSuccess: (run) => {
      setPendingRunId(run.id)
      setPrompt('')
      setError(null)
      invalidateRuns()
    },
    onError: (cause) => {
      setError((cause as Error).message ?? 'Run failed')
    },
  })

  const completeRun = useMutation({
    mutationFn: (runId: string) =>
      agentWorkspaceService.completeScratchpadRun({
        run_id: runId,
        output: "Mock output for completion. The executor is not wired here.",
        status: 'completed',
      }),
    onSuccess: () => {
      setPendingRunId(null)
      invalidateRuns()
    },
  })

  const promote = useMutation({
    mutationFn: ({
      runId,
      memoryProfileId,
    }: {
      runId: string
      memoryProfileId: string
    }) => agentWorkspaceService.promoteScratchpadToMemory(runId, memoryProfileId),
    onSuccess: invalidateRuns,
  })

  if (!isOwner) {
    return (
      <SectionPage
        eyebrow="Drafts"
        title="Private workbench"
        description="Drafts are the owner-only solo workbench for testing prompts, tools, instructions, and early automation ideas before they become reusable workflows or shared team assets."
      >
        <EmptyPanel
          icon={<Brain size={20} />}
          title="Drafts are owner-only"
          description="Public viewers can inspect the agent overview, but only the owner can use the private workbench for drafts and experiments."
        />
      </SectionPage>
    )
  }

  if (bootstrapState.kind === 'loading') {
    return (
      <SectionPage eyebrow="Drafts" title="Loading workbench...">
        <div className="h-96 animate-pulse rounded-[24px] border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-700" />
      </SectionPage>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] overflow-hidden shadow-sm font-sans">

      {/* Top Navbar */}
      <div className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 bg-gray-50 dark:bg-[#111] shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-amber-500/20 text-amber-600 flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Drafts Workbench</h2>
            <p className="text-[10px] uppercase tracking-widest text-gray-500">Workspace / {profile.handle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {pendingRunId && (
            <button
              onClick={() => completeRun.mutate(pendingRunId)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 dark:text-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 rounded-lg transition-colors shadow-sm"
            >
              <CheckCircle2 size={14} className="text-green-500" />
              Complete Run {pendingRunId.slice(0, 6)}
            </button>
          )}
          <button className="px-3 py-1.5 text-xs font-semibold bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg transition-colors">
            Save Draft
          </button>
          <button
            onClick={() => startRun.mutate()}
            disabled={startRun.isPending || !prompt.trim()}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:hover:bg-amber-500 shadow-sm shadow-amber-500/20"
          >
            <Play size={14} className="fill-current" />
            {startRun.isPending ? 'Executing...' : 'Run Workbench'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-14 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] flex flex-col items-center py-4 gap-4 shrink-0 z-10 shadow-sm">
          <button className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 text-amber-600 hover:ring-2 ring-amber-500/50 transition-all group relative">
            <Bot size={20} />
            <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none font-medium">Agent Node</span>
          </button>
          <button className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 text-purple-500 hover:text-purple-600 hover:ring-2 ring-purple-500/50 transition-all group relative">
            <Sparkles size={20} />
            <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none font-medium">Instruction Node</span>
          </button>
          <button className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 text-blue-500 hover:text-blue-600 hover:ring-2 ring-blue-500/50 transition-all group relative">
            <Cpu size={20} />
            <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none font-medium">Model Node</span>
          </button>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 relative bg-gray-50 dark:bg-[#0a0a0a]">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              className="bg-gray-50 dark:bg-[#0a0a0a]"
              minZoom={0.5}
              maxZoom={2}
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="rgba(148, 163, 184, 0.4)" />
              <Controls className="dark:!bg-[#111] dark:!border-gray-800 dark:!text-gray-300 shadow-md" />
              <MiniMap className="dark:!bg-[#111] dark:!border-gray-800 shadow-md rounded-xl overflow-hidden" maskColor="rgba(0,0,0,0.4)" />
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        {/* Right Inspector */}
        <div className="w-[340px] border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] flex flex-col shrink-0 overflow-hidden z-10 shadow-sm">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50 dark:bg-[#111]">
            <button
              className={`flex-1 py-3.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'workbench' ? 'border-amber-500 text-amber-600 dark:text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              onClick={() => setActiveTab('workbench')}
            >
              <div className="flex items-center justify-center gap-2"><Terminal size={14} /> Inspector</div>
            </button>
            <button
              className={`flex-1 py-3.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'history' ? 'border-amber-500 text-amber-600 dark:text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              onClick={() => setActiveTab('history')}
            >
              <div className="flex items-center justify-center gap-2"><History size={14} /> History</div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
            {activeTab === 'workbench' && (
              <>
                {/* Context Metadata */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                  <div className="bg-gray-100 dark:bg-[#1a1a1a] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <span>Active Binding</span>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                  <div className="p-3 space-y-3 bg-white dark:bg-[#111]">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Sparkles size={14} className="text-purple-500" /> Instruction Lens</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{defaultInstructionBinding?.lens_id.slice(0, 8) || 'None'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Terminal size={14} className="text-gray-400" /> Version Hash</span>
                      <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                        {defaultInstructionBinding?.version_id?.slice(0, 8) || 'latest'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Configuration Area */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 pl-1">Model Override</label>
                  <div className="relative">
                    <select
                      value={selectedModelId}
                      onChange={e => setSelectedModelId(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500/50 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Workspace Default</option>
                      {modelProfiles.map(m => <option key={m.id} value={m.model_id ?? ''}>{m.name}</option>)}
                    </select>
                    <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none rotate-90" />
                  </div>
                </div>

                {/* Prompt Area */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 pl-1">Test Prompt</label>
                  <textarea
                    rows={6}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500/50 outline-none resize-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 shadow-inner"
                    placeholder="Describe the prompt, test case, or tool call you want this agent to execute..."
                  />
                </div>

              </>
            )}

            {activeTab === 'history' && (
              <div className="space-y-3">
                {runs.isLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700" />)}
                  </div>
                ) : runs.data?.length ? (
                  runs.data.map(run => (
                    <div key={run.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0a0a] hover:border-amber-500/50 dark:hover:border-amber-500/50 transition-colors group relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-gray-200 dark:bg-gray-800 group-hover:bg-amber-500 transition-colors" />
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase">Run {run.id.slice(0, 6)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${run.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' :
                            run.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                          {run.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed">{run.prompt}</p>

                      {run.status === 'completed' && memoryProfiles.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
                          <select
                            onChange={(event) => {
                              const memoryProfileId = event.target.value
                              if (!memoryProfileId) return
                              promote.mutate({ runId: run.id, memoryProfileId })
                              event.currentTarget.value = ''
                            }}
                            defaultValue=""
                            className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300 outline-none cursor-pointer"
                          >
                            <option value="">+ Promote to memory</option>
                            {memoryProfiles.map((profileRecord) => (
                              <option key={profileRecord.id} value={profileRecord.id}>
                                {profileRecord.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <EmptyPanel
                    icon={<History size={20} />}
                    title="No execution history"
                    description="Run the first prompt from the workbench to seed a private history."
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Debug Console */}
      <div className="h-[220px] border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505] shrink-0 flex flex-col z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-none">
        <div className="h-10 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 bg-gray-50 dark:bg-[#111] shrink-0">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-gray-500" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-gray-600 dark:text-gray-400">Execution Console</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-gray-700 dark:text-gray-300 space-y-2">
          <div className="text-gray-400 dark:text-gray-600">[{new Date().toLocaleTimeString()}] System: Workbench initialized and ready.</div>

          {error && (
            <div className="flex gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-2 rounded border border-red-200 dark:border-red-500/20">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>[{new Date().toLocaleTimeString()}] Error: {error}</span>
            </div>
          )}

          {pendingRunId && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>[{new Date().toLocaleTimeString()}] System: Executing run {pendingRunId.slice(0, 8)}... Waiting for output stream.</span>
            </div>
          )}

          {!pendingRunId && !error && (
            <div className="text-gray-400 dark:text-gray-600">[{new Date().toLocaleTimeString()}] System: Waiting for input...</div>
          )}

          {runs.data?.[0]?.status === 'completed' && (
            <div className="text-green-600 dark:text-green-400">
              [{new Date(runs.data[0].started_at).toLocaleTimeString()}] System: Run {runs.data[0].id.slice(0, 8)} completed successfully.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
