import type { SupabaseLikeRpcClient } from './client'

export class TemplateClient {
  constructor(private readonly rpcClient: SupabaseLikeRpcClient) {}

  /**
   * Render a template's task_prompt with the supplied variable values.
   * Calls `public.fn_battles_render_prompt` (SECURITY DEFINER, EXEC granted
   * to anon + authenticated). Required variables that are missing raise
   * 22023 — the SDK surfaces the server error verbatim.
   */
  async renderPrompt(
    templateId: string,
    variables: Record<string, string> = {},
  ): Promise<string> {
    const { data, error } = await this.rpcClient.rpc('fn_battles_render_prompt', {
      p_template_id: templateId,
      p_variables: variables,
    })
    if (error) {
      throw new Error(
        `@lenserfight/sdk: renderPrompt failed — ${JSON.stringify(error)}`,
      )
    }
    return typeof data === 'string' ? data : ''
  }
}
