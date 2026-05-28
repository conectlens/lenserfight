# Performance Checklist

## Query safety
- hard limit present
- explicit order present
- pagination strategy defined
- narrow select list
- no accidental eager relation explosion
- no client-side filtering of huge result sets

## React safety
- no giant arrays retained in top-level state
- no expensive derived maps each render
- virtualization considered for long lists
- detail data loaded after summary data

## Supabase safety
- RPC/view payload reviewed
- indexes match filters and sort
- no “select *” on large entities