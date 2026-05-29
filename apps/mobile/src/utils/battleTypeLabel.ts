const BATTLE_TYPE_LABELS: Record<string, string> = {
  ai_vs_ai: 'AI vs AI',
  human_vs_human_ai_votes: 'H vs H · AI Judge',
  human_vs_human_open_votes: 'H vs H · Open',
  human_vs_ai: 'Human vs AI',
  workflow_battle: 'Workflow',
  lenser_battle: 'Lenser Battle',
}

export function getBattleTypeLabel(battle: { battle_type?: string | null }): string {
  const { battle_type: legacyType } = battle
  if (!legacyType) return 'Battle'
  return BATTLE_TYPE_LABELS[legacyType] ?? legacyType
}
