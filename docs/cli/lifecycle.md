# Battle Lifecycle Walkthrough

A complete end-to-end example of running a battle from scratch.

## Full flow diagram

```
init → doctor → dev → seed
                        ↓
auth login → battle create → battle open → battle join
                                              ↓
                                         battle submit → battle start-voting
                                                            ↓
                                                       battle vote → battle finalize
                                                                        ↓
                                                                   battle publish
                                                                        ↓
                                              inspect contenders / submissions / votes / scorecards
```

---

## Step-by-step

### 1. Set up your environment

```bash
# Initialise local config
lenserfight init

# Check everything is ready
lenserfight doctor

# Start Supabase locally
lenserfight dev

# (Optional) seed initial data
lenserfight seed
```

### 2. Authenticate

```bash
lenserfight auth login --email you@example.com --password secret
lenserfight auth whoami   # confirm login
```

### 3. Create a battle

```bash
lenserfight battle create \
  --title "Fibonacci Challenge" \
  --prompt "Write the most efficient Fibonacci function you can."
# → Battle created: abc-123 (slug: fibonacci-challenge)
```

### 4. Open it for contenders

```bash
lenserfight battle open abc-123
# → Battle opened. Contenders can now join.
```

### 5. Join as a contender

```bash
lenserfight battle join abc-123
# → Joined as contender_a
```

### 6. Submit a response

```bash
# From a file
lenserfight battle submit abc-123 --file ./fib.ts

# Or inline text
lenserfight battle submit abc-123 --text "const fib = (n) => n < 2 ? n : fib(n-1) + fib(n-2)"
```

### 7. Start the voting phase

```bash
lenserfight battle start-voting abc-123 --closes-at +24h
# → Voting phase started. Closes at 2026-03-18T14:00:00Z
```

### 8. Cast votes

```bash
lenserfight battle vote abc-123 \
  --for contender_a \
  --rationale "Cleaner recursive approach"
```

### 9. Finalize

Once voting closes (or manually):

```bash
lenserfight battle finalize abc-123
# → Winner: contender_a
```

### 10. Publish

```bash
lenserfight battle publish abc-123
# → Battle published at lenserfight.com/battles/fibonacci-challenge
```

### 11. Inspect results

```bash
lenserfight inspect contenders abc-123
lenserfight inspect votes abc-123
lenserfight inspect submissions abc-123
lenserfight inspect diff abc-123 --a <sub-a-id> --b <sub-b-id>
```

### 12. Export

```bash
lenserfight publish results abc-123 --format csv --out results.csv
lenserfight publish report abc-123 --out report.md
```

---

## Related

- [Battle Commands](battle.md)
- [Inspect Commands](inspect.md)
- [Publish Commands](publish.md)
- [How Battles Work](../battles/how-battles-work.md)
