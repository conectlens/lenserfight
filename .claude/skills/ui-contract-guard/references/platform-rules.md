# Platform Rules

- Do not import DOM-only APIs into native exports.
- Do not import React Native primitives into web-only entrypoints.
- Keep tokens and component contracts above platform implementation details.
- Prefer composition over inheritance for visual variants.
- Extract accessibility helpers when the same rules repeat across components.
- Route all visual decisions through the shared design contract, not local
  constants.
- Keep the web/native split behind protected variations instead of duplicated
  public APIs.
