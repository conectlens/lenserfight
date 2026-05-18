# GRASP & OOAD Design Checklist

Apply before implementing any solution. Flag violations before writing code.

## GRASP Principles

### 1. Information Expert
Assign responsibility to the class/module that has the required data.

- [ ] Does the code that makes a decision have access to the data it needs?
- [ ] Is the decision delegated to a module that must reach far outside its own boundary?
- [ ] Would moving this logic closer to the data reduce coupling?

### 2. Creator
The object that uses, aggregates, or contains another is responsible for creating it.

- [ ] Is the factory/constructor placed in a module that aggregates or closely uses the new object?
- [ ] Is object creation leaking into modules that only consume it?

### 3. Controller
One module or class acts as the entry point for a use case or system event.

- [ ] Is there a single controller class/function per use case?
- [ ] Is domain logic scattered across route handlers, UI event handlers, or utility functions?
- [ ] Would extracting a service/command handler clean up the responsibility?

### 4. Low Coupling
Minimize dependencies between modules.

- [ ] Does the fix introduce a new import across layer boundaries without justification?
- [ ] Does the change create a circular dependency?
- [ ] Can this module be tested in isolation without mocking many unrelated things?

### 5. High Cohesion
Keep related things together; split unrelated things.

- [ ] Does the modified module do one thing well?
- [ ] Is the fix adding behavior that belongs in a different module?
- [ ] Are there unrelated responsibilities now living in the same file?

### 6. Polymorphism
Use polymorphism to handle variation, not if-chains on type flags.

- [ ] Is there a type switch or `if (type === ...)` that could be replaced with a strategy or variant?
- [ ] Does the domain model express variation explicitly through types/interfaces?

### 7. Pure Fabrication
Introduce a service class when no natural domain object is the right owner.

- [ ] Is the logic being forced into a domain entity where it does not naturally belong?
- [ ] Would a service, repository, or use-case class be a better home?

### 8. Indirection
Introduce an intermediary to reduce direct coupling.

- [ ] Is there a direct dependency on a volatile detail (e.g., Supabase client in domain code)?
- [ ] Would a repository interface or adapter isolate the domain from infrastructure?

### 9. Protected Variation
Wrap volatile points behind stable interfaces.

- [ ] Is an external API, third-party SDK, or database detail used directly in business logic?
- [ ] Would an interface or adapter protect business logic from future changes?

---

## OOAD Responsibility Assignment

### Single Responsibility
- [ ] Each class/module has exactly one reason to change
- [ ] Business rules are not duplicated across layers
- [ ] UI does not contain business logic
- [ ] Domain does not contain persistence logic

### Open/Closed
- [ ] New behavior added by extension (new file, new implementation), not by modifying stable core
- [ ] Business rules extensible without touching callers

### Liskov Substitution
- [ ] Subtypes do not weaken contracts of their parents
- [ ] No surprises when a concrete type is used where an interface type is expected

### Interface Segregation
- [ ] Interfaces are focused; no module is forced to depend on methods it does not use

### Dependency Inversion
- [ ] High-level modules depend on abstractions, not on low-level implementations
- [ ] Domain depends on interfaces, not on Supabase/HTTP/storage SDKs directly

---

## Red Flags (Stop and Rethink)

- Domain logic in UI components or route handlers
- Supabase client imported in domain or feature layer
- Business rules duplicated across `libs/domain`, `libs/features`, and `apps/`
- Service method with 5+ unrelated responsibilities
- Entity that knows how to serialize itself to HTTP or database format
- Frontend-only validation for a business rule that must be server-enforced
- RLS policy bypassed or weakened to "make something work"
- Hardcoded magic strings or IDs in business logic
- Temp fix comment in code ("fix this properly later")
