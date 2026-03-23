# Performance Checklist

## Inspect First

- `apps/mobile/src/layouts/*`
- `apps/mobile/src/navigation/*`
- `apps/mobile/src/components/*`
- `apps/mobile/src/theme/*`
- `libs/ui/components/src/lib/*`
- `libs/ui/theme/src/lib/*`
- any data fetching, lists, animations, or subscriptions

## Questions to Answer

- Are renders scoped to the smallest useful surface?
- Are effects cleaned up and not recreating work unnecessarily?
- Are navigation transitions and guards doing extra work?
- Are requests deduplicated and cached where practical?
- Are large assets, images, or lists virtualized or deferred?
- Is the code trading maintainability for tiny micro-optimizations?

## Report Template

1. `Issue`
2. `Impact`
3. `Fix`
4. `Verification`
