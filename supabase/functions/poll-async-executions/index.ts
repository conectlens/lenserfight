// Supabase Edge Function: poll-async-executions
//
// Purpose: Poll async generative-media providers (Sora, Veo, Kling, Suno, Lyria)
// and complete execution.runs when the provider signals done.
//
// Invocation: Called by pg_cron every 30 seconds.
//   SELECT cron.schedule('poll-async-executions', '*/30 * * * * *',
//     $$SELECT net.http_post(url := 'SUPABASE_URL/functions/v1/poll-async-executions',
//       headers := '{"Authorization":"Bearer SERVICE_ROLE_KEY"}')$$);
//
// It calls execution.fn_poll_async_run() to get pending runs, then dispatches
// to the appropriate provider's poll endpoint, and calls
// execution.fn_complete_async_run() on success.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface PendingRun {
  run_id: string;
  provider_task_id: string;
  model_key: string;
  provider_key: string;
  output_modality: string;
  started_at: string;
}

interface PollResult {
  status: 'pending' | 'completed' | 'failed';
  url?: string;
  mimeType?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
}

// ─── Provider poll implementations ───────────────────────────────────────────

async function pollOpenAIVideo(taskId: string, apiKey: string): Promise<PollResult> {
  const res = await fetch(`https://api.openai.com/v1/video/generations/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Sora poll error ${res.status}`);
  const data = await res.json() as { status: string; data?: Array<{ url: string }> };
  if (data.status === 'completed' && data.data?.length) {
    return { status: 'completed', url: data.data[0].url, mimeType: 'video/mp4' };
  }
  if (data.status === 'failed') return { status: 'failed' };
  return { status: 'pending' };
}

async function pollGoogleOperation(operationName: string, apiKey: string): Promise<PollResult> {
  const res = await fetch(
    `https://us-central1-aiplatform.googleapis.com/v1/${operationName}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!res.ok) throw new Error(`Vertex poll error ${res.status}`);
  const data = await res.json() as {
    done?: boolean;
    error?: { message: string };
    response?: {
      generateVideoResponse?: { generatedSamples?: Array<{ video?: { uri: string } }> };
      audioContent?: string;
    };
  };
  if (data.error) return { status: 'failed' };
  if (!data.done) return { status: 'pending' };
  // Veo video
  const samples = data.response?.generateVideoResponse?.generatedSamples ?? [];
  if (samples.length) {
    return { status: 'completed', url: samples[0].video?.uri, mimeType: 'video/mp4' };
  }
  // Lyria audio
  if (data.response?.audioContent) {
    return {
      status: 'completed',
      url: `data:audio/mpeg;base64,${data.response.audioContent}`,
      mimeType: 'audio/mpeg',
    };
  }
  return { status: 'failed' };
}

async function pollKling(taskId: string, apiKey: string): Promise<PollResult> {
  const res = await fetch(`https://api.klingai.com/v1/videos/text2video/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Kling poll error ${res.status}`);
  const data = await res.json() as {
    data: {
      task_status: string;
      task_result?: { videos?: Array<{ url: string; duration: string }> };
    };
  };
  const { task_status, task_result } = data.data;
  if (task_status === 'succeed' && task_result?.videos?.length) {
    return {
      status: 'completed',
      url: task_result.videos[0].url,
      mimeType: 'video/mp4',
      durationSeconds: Number(task_result.videos[0].duration),
    };
  }
  if (task_status === 'failed') return { status: 'failed' };
  return { status: 'pending' };
}

async function pollSuno(taskId: string, apiKey: string): Promise<PollResult> {
  const res = await fetch(`https://api.sunoapi.org/api/get?ids=${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Suno poll error ${res.status}`);
  const data = await res.json() as { clips: Array<{ id: string; status: string; audio_url?: string; duration?: number }> };
  const clip = data.clips?.find((c) => c.id === taskId);
  if (!clip) return { status: 'pending' };
  if (clip.status === 'complete' && clip.audio_url) {
    return { status: 'completed', url: clip.audio_url, mimeType: 'audio/mpeg', durationSeconds: clip.duration };
  }
  if (clip.status === 'error') return { status: 'failed' };
  return { status: 'pending' };
}

// ─── Route to correct poll function ──────────────────────────────────────────

async function pollProvider(run: PendingRun, apiKeys: Record<string, string>): Promise<PollResult> {
  const apiKey = apiKeys[run.provider_key] ?? '';

  switch (run.provider_key) {
    case 'openai': return pollOpenAIVideo(run.provider_task_id, apiKey);
    case 'google': return pollGoogleOperation(run.provider_task_id, apiKey);
    case 'kling': return pollKling(run.provider_task_id, apiKey);
    case 'suno': return pollSuno(run.provider_task_id, apiKey);
    default: throw new Error(`No poll handler for provider: ${run.provider_key}`);
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Collect provider API keys from env
  const apiKeys: Record<string, string> = {
    openai: Deno.env.get('OPENAI_API_KEY') ?? '',
    google: Deno.env.get('GOOGLE_API_KEY') ?? '',
    kling: Deno.env.get('KLING_API_KEY') ?? '',
    suno: Deno.env.get('SUNO_API_KEY') ?? '',
    elevenlabs: Deno.env.get('ELEVENLABS_API_KEY') ?? '',
  };

  // 1. Time out stale runs (> 15 min)
  await supabase.rpc('fn_timeout_stale_runs');

  // 2. Fetch pending async runs
  const { data: pendingRuns, error } = await supabase
    .rpc('fn_poll_async_run', { p_stale_after_seconds: 30, p_limit: 50 });

  if (error) {
    console.error('fn_poll_async_run error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const runs = (pendingRuns ?? []) as PendingRun[];
  const results: Record<string, string> = {};

  for (const run of runs) {
    try {
      const result = await pollProvider(run, apiKeys);

      if (result.status === 'completed' && result.url) {
        await supabase.rpc('fn_complete_async_run', {
          p_run_id: run.run_id,
          p_media_url: result.url,
          p_mime_type: result.mimeType ?? 'application/octet-stream',
          p_bytes: null,
          p_width: result.width ?? null,
          p_height: result.height ?? null,
          p_duration_s: result.durationSeconds ?? null,
        });
        results[run.run_id] = 'completed';
      } else if (result.status === 'failed') {
        await supabase
          .from('execution.runs')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', run.run_id);
        results[run.run_id] = 'failed';
      } else {
        results[run.run_id] = 'still_pending';
      }
    } catch (err) {
      console.error(`Poll error for run ${run.run_id}:`, err);
      results[run.run_id] = `error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return new Response(
    JSON.stringify({ polled: runs.length, results }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
