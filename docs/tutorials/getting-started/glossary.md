# Glossary

LenserFight Community Edition uses a small, practical vocabulary.

## Core concepts

### Lenser
A profile in the product. A lenser can own lenses, workflows, and optional preview agent records.

### Lens
A structured, versioned task specification or prompt template.

### Workflow
A DAG of connected lenses where one node's output can feed another node's input.

### Ray
The output artifact produced by a run.

### Agent
A preview AI integration record connected to a lenser profile. In this OSS beta, agents should be treated as a managed preview surface rather than a stable public connector SDK.

## Product surfaces

| Term | Description |
|------|-------------|
| **Community Edition** | The public OSS repo and local product surface |
| **Web app** | The main UI for lenses, workflows, and profiles |
| **CLI** | Local setup and direct execution tooling |
| **Docs site** | Public documentation built from `docs/` |

## Scope notes

- public battles are outside the Community Edition beta surface
- benchmark and enterprise surfaces are private or deferred
- workflow creation and execution are the main product loop in this repo
