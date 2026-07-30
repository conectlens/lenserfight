import { ExportEnvelopeFactory, type ExportContext } from '@lenserfight/domain/exports'
import { describe, expect, it } from 'vitest'


import { WorkflowMarkdownSerializer } from './workflow'

const owner: ExportContext = {
  userId: 'u1',
  tenantId: 't1',
  via: 'web',
  host: 'lenserfight.local',
  isOwner: true,
  isAuthenticated: true,
}

describe('WorkflowMarkdownSerializer', () => {
  it('renders an ordered AI-readable plan without internal identifiers', async () => {
    const factory = new ExportEnvelopeFactory()
    const researchId = '27b67cd7-401b-4682-b321-c844ecfc6898'
    const pdfId = '48d61374-e27c-42bf-a87e-ff9df2f17829'
    const env = await factory.build({
      kind: 'workflow',
      data: {
        id: '670db934-a77b-4262-a7a0-7d2e0228517d',
        title: 'Research to Image',
        nodes: [
          {
            id: pdfId,
            ordinal: 0,
            label: 'PDF Export Lens',
            lens_id: '40000000-0001-0009-0001-000000000001',
            version_id: '40000000-0001-0009-0002-000000000001',
            config: {
              model_id: 'gemini-2.5-flash',
              funding_source: 'user_byok_local',
              key_ref_id: 'cloud-key-ref',
              local_key_id: 'local-key-ref',
              param_overrides: {
                title: 'Security Considerations in AI-Robotics',
                content: `[[${researchId}.result]]`,
                optional: '',
              },
            },
          },
          {
            id: researchId,
            ordinal: 1,
            label: 'Research Lens',
            lens_id: '40000000-0001-0003-0001-000000000001',
            config: {
              param_overrides: {
                topic: 'AI and robotics',
                context: 'https://arxiv.org/example',
              },
            },
          },
        ],
        edges: [
          {
            source_node_id: researchId,
            target_node_id: pdfId,
            source_output_key: 'output',
            target_param_label: 'input',
          },
        ],
      },
      ctx: owner,
    })

    const serializer = new WorkflowMarkdownSerializer()
    const output = await serializer.serialize(env, { visibility: env.visibility })

    expect(output.indexOf('### Step 1: Research Lens')).toBeLessThan(
      output.indexOf('### Step 2: PDF Export Lens'),
    )
    expect(output).toContain('`Topic`: `AI and robotics`')
    expect(output).toContain('{{steps.research-lens.result}}')
    expect(output).toContain('`Model`: `gemini-2.5-flash`')
    expect(output).not.toContain(researchId)
    expect(output).not.toContain(pdfId)
    expect(output).not.toContain('40000000-0001-0009-0001-000000000001')
    expect(output).not.toContain('funding_source')
    expect(output).not.toContain('cloud-key-ref')
    expect(output).not.toContain('local-key-ref')
    expect(output).not.toContain('_empty_')
  })

  it('disambiguates duplicate labels and hides unresolved node identifiers', async () => {
    const factory = new ExportEnvelopeFactory()
    const env = await factory.build({
      kind: 'workflow',
      data: {
        id: 'workflow-id',
        title: 'Duplicate labels',
        nodes: [
          { id: 'node-a', ordinal: 0, label: 'Research Lens' },
          {
            id: 'node-b',
            ordinal: 1,
            label: 'Research Lens',
            config: {
              param_overrides: {
                known: '[[node-a.result]]',
                missing: '[[missing-node.result]]',
              },
            },
          },
        ],
        edges: [],
      },
      ctx: owner,
    })

    const serializer = new WorkflowMarkdownSerializer()
    const output = await serializer.serialize(env, { visibility: env.visibility })

    expect(output).toContain('`steps.research-lens`')
    expect(output).toContain('`steps.research-lens-2`')
    expect(output).toContain('{{steps.research-lens.result}}')
    expect(output).toContain('{{steps.unresolved.result}}')
    expect(output).not.toContain('missing-node')
  })
})
