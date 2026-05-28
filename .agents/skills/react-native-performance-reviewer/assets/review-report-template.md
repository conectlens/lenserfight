# React Native / Expo Go Performance Review

## Scope
- **Changed files:**
- **Screens / components reviewed:**
- **Device target:** (e.g. Android mid-range 2GB RAM / iOS 14+)
- **Build type reviewed:** Development | Release | Production build

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| Info | 0 |

## Findings

### [FINDING-1] <Short title>
- **Severity:** critical | high | medium | low | info
- **Location:** `<file>:<lines>`
- **Risk:** <what breaks and when>
- **Failure mode:** <observable symptom — jank, OOM kill, ANR, crash, dropped frames>
- **Fix:**
  ```tsx
  // before

  // after
  ```
- **Verification:** <how to confirm — profiler, device log, test>

---

*(repeat block for each additional finding)*

## Remediation priorities

| Priority | Finding | Expected gain | Risk of fix | Verification |
|----------|---------|--------------|-------------|-------------|
| 1 | | | | |

## Validation plan

- Run `pnpm nx run mobile:test` for unit coverage
- Run `pnpm nx run mobile:build` for release build integrity
- Profile with Flipper / React DevTools Profiler on a **release** build
- Confirm memory ceiling using Android Profiler or Xcode Instruments
- Acceptable thresholds: ≥58fps, <150MB RSS on mid-range device, <3s cold start
