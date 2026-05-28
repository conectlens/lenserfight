import type { IExecutionProvider, ExecutionInput, ExecutionResult, MediaType } from '../execution.types'

/**
 * Pdf Export Provider — Implements `kind:pdf` nodes.
 *
 * Contract:
 *   • Input prompt MUST be a JSON manifest produced by the upstream PDF Export
 *     Lens:
 *       {
 *         title: string,
 *         sections: Array<{ heading?: string; body: string }>,
 *         citations?: Array<{ marker: string; source: string; url?: string }>,
 *         metadata?: Record<string, unknown>
 *       }
 *   • The provider lays the manifest out onto standard pages using the
 *     `pdf-lib` runtime (pure JS, works in browser + node) and returns a blob
 *     URL plus a byte count. Upstream callers (the workflow engine, lab UI) are
 *     responsible for uploading the blob to media.objects storage and writing
 *     the execution.artifact_medias row — see
 *     docs/reference/workflows/execution-engine.md §PDF Artifacts.
 *   • If the prompt is not valid JSON the provider treats the entire prompt as
 *     a single unstructured section so workflows remain resilient to upstream
 *     formatting errors.
 *
 * Accepted `modelId`s:
 *   • `pdf-export/default` — A4, 11pt body, H1/H2 headings, page numbers.
 *   • `pdf-export/letter`  — US Letter, same typography.
 */

type PdfSection = { heading?: string | null; body: string }

interface PdfManifest {
  title?: string
  sections?: PdfSection[]
  citations?: Array<{ marker?: string; source?: string; url?: string }>
  metadata?: Record<string, unknown>
}

const PAGE_SIZES: Record<string, [number, number]> = {
  'pdf-export/default': [595.28, 841.89], // A4 (72dpi)
  'pdf-export/letter': [612, 792],
}

export class PdfExportProvider implements IExecutionProvider {
  readonly id = 'pdf-export'
  readonly supportedMediaTypes: MediaType[] = ['pdf']

  async execute(modelId: string, input: ExecutionInput, signal?: AbortSignal): Promise<ExecutionResult> {
    const start = Date.now()
    signal?.throwIfAborted?.()
    const manifest = parseManifest(input.prompt)
    const [pageWidth, pageHeight] = PAGE_SIZES[modelId] ?? PAGE_SIZES['pdf-export/default']

    // Dynamic import keeps pdf-lib out of every bundle that doesn't render PDFs.
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')

    const doc = await PDFDocument.create()
    doc.setTitle(manifest.title ?? 'LenserFight Export')
    doc.setCreator('LenserFight · kind:pdf')
    doc.setProducer('pdf-export/default')

    const body = await doc.embedFont(StandardFonts.Helvetica)
    const bold = await doc.embedFont(StandardFonts.HelveticaBold)
    const margin = 56
    const lineHeight = 15
    const headingLine = 22

    let page = doc.addPage([pageWidth, pageHeight])
    let cursorY = pageHeight - margin

    const writeLine = (text: string, font: typeof body | typeof bold, size: number) => {
      if (cursorY < margin + size) {
        page = doc.addPage([pageWidth, pageHeight])
        cursorY = pageHeight - margin
      }
      page.drawText(text, {
        x: margin,
        y: cursorY,
        size,
        font,
        color: rgb(0.12, 0.12, 0.14),
      })
      cursorY -= size === 18 ? headingLine : lineHeight
    }

    const wrap = (text: string, font: typeof body | typeof bold, size: number, maxWidth: number): string[] => {
      const words = text.split(/\s+/).filter(Boolean)
      const lines: string[] = []
      let current = ''
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word
        if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
          if (current) lines.push(current)
          current = word
        } else {
          current = candidate
        }
      }
      if (current) lines.push(current)
      return lines
    }

    const usableWidth = pageWidth - margin * 2

    if (manifest.title) {
      writeLine(manifest.title, bold, 18)
      cursorY -= 6
    }

    const sections = manifest.sections?.length ? manifest.sections : [{ body: input.prompt }]
    for (const section of sections) {
      if (section.heading) {
        writeLine(section.heading, bold, 13)
      }
      for (const rawLine of section.body.split(/\n+/)) {
        for (const line of wrap(rawLine, body, 11, usableWidth)) {
          writeLine(line, body, 11)
        }
      }
      cursorY -= 6
    }

    if (manifest.citations?.length) {
      writeLine('Citations', bold, 13)
      manifest.citations.forEach((cite, i) => {
        const marker = cite.marker ? `[${cite.marker}]` : `[${i + 1}]`
        const text = `${marker} ${cite.source ?? ''} ${cite.url ?? ''}`.trim()
        for (const line of wrap(text, body, 10, usableWidth)) {
          writeLine(line, body, 10)
        }
      })
    }

    const bytes = await doc.save()
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(blob)
      : `data:application/pdf;base64,${bufferToBase64(bytes)}`

    return {
      mediaType: 'pdf',
      url,
      mimeType: 'application/pdf',
      bytes: bytes.byteLength,
      durationMs: Date.now() - start,
      data: {
        manifest,
        pageCount: doc.getPageCount(),
      },
      metadata: {
        modelId,
        pageCount: doc.getPageCount(),
        byteLength: bytes.byteLength,
      },
    }
  }
}

function parseManifest(prompt: string): PdfManifest {
  const trimmed = prompt.trim()
  if (!trimmed.startsWith('{')) return { sections: [{ body: trimmed }] }
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (parsed && typeof parsed === 'object') return parsed as PdfManifest
  } catch {
    // Fall through to raw prompt.
  }
  return { sections: [{ body: trimmed }] }
}

function bufferToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return typeof btoa === 'function' ? btoa(binary) : binary
}
