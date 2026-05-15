/**
 * Partner provisioning is intentionally opt-in.
 * Users connect Chainabit explicitly from Settings → Partner Accounts.
 * This hook is kept as a no-op so call sites in App.tsx do not need to change.
 */
export function usePartnerProvisioning(): void {
  // no-op — do not auto-provision or auto-redirect to any partner
}
