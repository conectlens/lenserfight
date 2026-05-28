# React / Vite Performance Review

## Scope
- **Changed files:**
- **Routes / components reviewed:**
- **Device / network target:** (e.g. Moto G Power, slow 4G)
- **Build type reviewed:** Development | Production build

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
- **Failure mode:** <observable symptom — jank, OOM, slow LCP, layout shift, network waterfall>
- **Fix:**
  ```tsx
  // before

  // after
  ```
- **Verification:** <how to confirm — bundle analysis, React Profiler, Lighthouse>

---

*(repeat block for each additional finding)*

## Bundle impact

| Change | Before | After | Delta |
|--------|--------|-------|-------|
| | | | |

## Remediation priorities

| Priority | Finding | Expected gain | Risk of fix | Verification |
|----------|---------|--------------|-------------|-------------|
| 1 | | | | |

## Validation plan

- Run `pnpm nx run web:build` and check bundle output sizes
- Run `pnpm nx run web:test` for unit coverage
- Profile with React DevTools Profiler on a **production** build
- Run Lighthouse against the production build
- Acceptable thresholds: ≥58fps, <500KB initial JS, LCP <2.5s, CLS <0.1, TBT <200ms on slow 4G
