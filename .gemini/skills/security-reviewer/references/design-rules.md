Apply when design quality affects security.

GRASP / OOAD security rules
- Information Expert: place security decisions with the component that owns the needed facts.
- Controller: controllers orchestrate requests; they should not own deep authorization or invariants.
- Low Coupling: avoid spreading policy logic across controllers, services, decorators, and interceptors.
- High Cohesion: keep authn, authz, validation, auditing, and transactional integrity in focused components.
- Protected Variations: isolate provider-specific trust logic behind adapters/boundaries.
- Indirection: use guards/policies/services to decouple route handling from security decisions.
- Pure Fabrication: shared security utilities are acceptable if ownership stays explicit.
- Polymorphism: use strategy/adapters for provider differences, not conditional sprawl.

Review prompts
- Is the security-critical rule owned by one clear component?
- Would changing a permission model require edits in many places?
- Is a controller making domain-security decisions that belong in a service/policy?
- Are there hidden side effects in interceptors/decorators?
- Are security abstractions narrow and testable?