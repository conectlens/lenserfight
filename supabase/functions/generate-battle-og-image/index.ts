// Supabase Edge Function: generate-battle-og-image
//
// Purpose: Generate a social share OG image for a published battle result.
// Invoked via pg_net from fn_battles_publish_internal after status → published.
// Uploads PNG to Supabase Storage bucket "battle-og-images" and updates og_image_url.
// Requires: app.supabase_url, app.service_role_key in db settings (passed via pg_net headers).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import satori from 'https://esm.sh/satori@0.10.14'
import { Resvg } from 'https://esm.sh/@resvg/resvg-wasm@2.6.2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const STORAGE_BUCKET = 'battle-og-images'

interface RequestPayload {
  battle_id: string
  title: string
  winner_name: string | null
  contender_a_name: string
  contender_b_name: string
}

// Inter font — loaded once per isolate
let fontData: ArrayBuffer | null = null

async function loadFont(): Promise<ArrayBuffer> {
  if (fontData) return fontData
  const res = await fetch(
    'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
  )
  fontData = await res.arrayBuffer()
  return fontData
}

function buildOgElement(
  title: string,
  contenderAName: string,
  contenderBName: string,
  winnerName: string | null
) {
  const winnerLabel = winnerName ? `Winner: ${winnerName}` : 'Draw'
  const isAWinner = winnerName === contenderAName
  const isBWinner = winnerName === contenderBName

  return {
    type: 'div',
    props: {
      style: {
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)',
        padding: '60px 80px',
        fontFamily: 'Inter',
      },
      children: [
        // Brand badge
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              marginBottom: 32,
            },
            children: [
              {
                type: 'span',
                props: {
                  style: {
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#f5c518',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    background: 'rgba(245,197,24,0.12)',
                    padding: '6px 16px',
                    borderRadius: 20,
                    border: '1px solid rgba(245,197,24,0.3)',
                  },
                  children: 'LenserFight Battle Result',
                },
              },
            ],
          },
        },
        // Title
        {
          type: 'h1',
          props: {
            style: {
              fontSize: 48,
              fontWeight: 800,
              color: '#ffffff',
              textAlign: 'center',
              margin: '0 0 40px 0',
              lineHeight: 1.2,
              maxWidth: 900,
            },
            children: title,
          },
        },
        // Contenders row
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 32,
              marginBottom: 40,
            },
            children: [
              // Contender A
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '20px 36px',
                    background: isAWinner
                      ? 'rgba(245,197,24,0.15)'
                      : 'rgba(255,255,255,0.05)',
                    borderRadius: 16,
                    border: isAWinner
                      ? '2px solid rgba(245,197,24,0.6)'
                      : '1px solid rgba(255,255,255,0.1)',
                    minWidth: 220,
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: {
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#666',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          marginBottom: 8,
                        },
                        children: 'Contender A',
                      },
                    },
                    {
                      type: 'span',
                      props: {
                        style: {
                          fontSize: 22,
                          fontWeight: 700,
                          color: isAWinner ? '#f5c518' : '#fff',
                        },
                        children: contenderAName,
                      },
                    },
                    ...(isAWinner
                      ? [
                          {
                            type: 'span',
                            props: {
                              style: {
                                fontSize: 11,
                                color: '#f5c518',
                                marginTop: 6,
                                fontWeight: 600,
                              },
                              children: '🏆 Winner',
                            },
                          },
                        ]
                      : []),
                  ],
                },
              },
              // VS divider
              {
                type: 'span',
                props: {
                  style: {
                    fontSize: 28,
                    fontWeight: 900,
                    color: '#444',
                  },
                  children: 'VS',
                },
              },
              // Contender B
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '20px 36px',
                    background: isBWinner
                      ? 'rgba(245,197,24,0.15)'
                      : 'rgba(255,255,255,0.05)',
                    borderRadius: 16,
                    border: isBWinner
                      ? '2px solid rgba(245,197,24,0.6)'
                      : '1px solid rgba(255,255,255,0.1)',
                    minWidth: 220,
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: {
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#666',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          marginBottom: 8,
                        },
                        children: 'Contender B',
                      },
                    },
                    {
                      type: 'span',
                      props: {
                        style: {
                          fontSize: 22,
                          fontWeight: 700,
                          color: isBWinner ? '#f5c518' : '#fff',
                        },
                        children: contenderBName,
                      },
                    },
                    ...(isBWinner
                      ? [
                          {
                            type: 'span',
                            props: {
                              style: {
                                fontSize: 11,
                                color: '#f5c518',
                                marginTop: 6,
                                fontWeight: 600,
                              },
                              children: '🏆 Winner',
                            },
                          },
                        ]
                      : []),
                  ],
                },
              },
            ],
          },
        },
        // Outcome pill
        {
          type: 'div',
          props: {
            style: {
              fontSize: 18,
              fontWeight: 700,
              color: '#0f0f0f',
              background: '#f5c518',
              padding: '10px 28px',
              borderRadius: 40,
            },
            children: winnerLabel,
          },
        },
      ],
    },
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let payload: RequestPayload
  try {
    payload = await req.json() as RequestPayload
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { battle_id, title, winner_name, contender_a_name, contender_b_name } = payload

  if (!battle_id || !title) {
    return new Response('Missing battle_id or title', { status: 400 })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Supabase credentials not configured — skipping OG generation')
    return new Response(JSON.stringify({ skipped: true, reason: 'no_credentials' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const font = await loadFont()

    const element = buildOgElement(
      title,
      contender_a_name,
      contender_b_name,
      winner_name
    )

    const svg = await satori(element, {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: font,
          weight: 400,
          style: 'normal',
        },
      ],
    })

    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 1200 },
    })
    const pngData = resvg.render()
    const pngBuffer = pngData.asPng()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const storagePath = `${battle_id}.png`
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, pngBuffer, {
        contentType: 'image/png',
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError.message)
      return new Response(
        JSON.stringify({ error: 'upload_failed', message: uploadError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath)

    const ogImageUrl = publicUrlData.publicUrl

    const { error: updateError } = await supabase
      .schema('battles')
      .from('battles')
      .update({ og_image_url: ogImageUrl })
      .eq('id', battle_id)

    if (updateError) {
      console.error('DB update error:', updateError.message)
      return new Response(
        JSON.stringify({ error: 'db_update_failed', message: updateError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ og_image_url: ogImageUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('OG image generation error:', message)
    return new Response(
      JSON.stringify({ error: 'generation_failed', message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
