/**
 * LenserPolicyPanel — AI Lenser memory and instruction policy.
 *
 * V2: Appears in the Config step when AI Lensers are invited as
 * contenders to any battle (not just lenser_battle format).
 * Re-exports the same UI as LenserBattlePolicyPanel.
 */

export {
  LenserBattlePolicyPanel as LenserPolicyPanel,
  type LenserBattlePolicyPanelProps as LenserPolicyPanelProps,
} from './LenserBattlePolicyPanel'
