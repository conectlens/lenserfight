# Security Checklist

## Inspect First

- `apps/mobile/src/providers/session/*`
- `apps/mobile/src/guards/*`
- `apps/mobile/src/navigation/*`
- `apps/mobile/src/config/*`
- `libs/ui/components/src/lib/*`
- `libs/ui/theme/src/lib/*`
- any new storage, networking, or permission code

## Questions to Answer

- Is sensitive data stored safely and intentionally?
- Are auth/session states validated before protected navigation?
- Are network requests and errors sanitized?
- Are permissions requested only when needed?
- Are logs, crash reports, and analytics free of secrets or tokens?
- Are deep links and external URLs constrained?

## Report Template

1. `Finding`
2. `Severity`
3. `Evidence`
4. `Impact`
5. `Recommended fix`
6. `Verification`
