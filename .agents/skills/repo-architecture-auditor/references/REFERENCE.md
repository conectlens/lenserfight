# Reference
Check:
- whether `apps/forum` is only composition and routing
- whether `domain` is free from framework and transport concerns
- whether `data` owns persistence and external service access
- whether `features` orchestrate use cases instead of duplicating domain/data logic
- whether `ui` stays reusable and free from feature-specific business rules
- whether `utils` is becoming an ungoverned grab-bag
- whether each library has a clear public API and limited responsibility

Report with:
1. current structure summary
2. violations and risks
3. recommended target boundaries