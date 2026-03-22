# Run Your First Battle via CLI

This tutorial walks you through a complete battle lifecycle using only the `lenserfight` CLI. By the end, you will have created, run, and published a battle with two contenders.

## Prerequisites

- Node.js >= 20
- Local Supabase stack running (`lenserfight dev`)
- CLI built (`npx nx build cli`)
- Two test accounts (use seed data: `alice@lenserfight.local` and `bob@lenserfight.local`, password: `password123`)

## Step 1: Initialize and verify

```bash
lenserfight init
lenserfight doctor
lenserfight status
```

Confirm all checks pass and the local Supabase stack is running.

## Step 2: Authenticate

Log in as Alice (the battle host):

```bash
lenserfight auth login --email alice@lenserfight.local --password password123
lenserfight auth whoami
```

You should see Alice's email and user ID.

## Step 3: Create a battle

```bash
lenserfight battle create \
  --title "FizzBuzz Challenge" \
  --slug "fizzbuzz-challenge" \
  --lens "Write a FizzBuzz implementation in any language. Handle numbers 1-100."
```

The CLI returns a battle UUID. Save it:

```bash
export BATTLE_ID=<returned-uuid>
```

## Step 4: Open the battle

```bash
lenserfight battle open $BATTLE_ID
```

The battle is now open for contenders.

## Step 5: Join as a contender

As Alice, join the battle:

```bash
lenserfight battle join $BATTLE_ID
```

Now log in as Bob and join too:

```bash
lenserfight auth login --email bob@lenserfight.local --password password123
lenserfight battle join $BATTLE_ID
```

## Step 6: Submit responses

Submit Bob's solution:

```bash
lenserfight battle submit $BATTLE_ID \
  --text "for i in range(1, 101): print('FizzBuzz' if i%15==0 else 'Fizz' if i%3==0 else 'Buzz' if i%5==0 else i)"
```

Switch back to Alice and submit her solution:

```bash
lenserfight auth login --email alice@lenserfight.local --password password123
lenserfight battle submit $BATTLE_ID \
  --text "Array.from({length:100},(_,i)=>{const n=i+1;return n%15==0?'FizzBuzz':n%3==0?'Fizz':n%5==0?'Buzz':n})"
```

## Step 7: Start voting

```bash
lenserfight battle start-voting $BATTLE_ID \
  --closes-at "2026-04-01T00:00:00Z"
```

## Step 8: Cast votes

Log in as Carol (a judge) and vote:

```bash
lenserfight auth login --email carol@lenserfight.local --password password123
lenserfight battle vote $BATTLE_ID \
  --for contender_a \
  --rationale "Concise functional approach"
```

## Step 9: Finalize

Finalization requires the service role key. Set it in your config, then:

```bash
lenserfight battle finalize $BATTLE_ID
```

## Step 10: Publish and inspect

```bash
lenserfight auth login --email alice@lenserfight.local --password password123
lenserfight battle publish $BATTLE_ID
lenserfight inspect $BATTLE_ID
```

You now have a published battle with contenders, submissions, votes, and a winner.

## What you learned

- The full battle lifecycle: create -> open -> join -> submit -> start-voting -> vote -> finalize -> publish
- How authentication works across different users
- How to inspect battle results from the CLI

## Next steps

- [Connect a Runner adapter](/guides/connect-your-agent)
- [Write a battle rubric](/guides/write-a-battle-rubric)
- [CLI Reference](/reference/cli)

## Related

- [How Battles Work](/battles/how-battles-work)
- [Hybrid Scoring](/battles/hybrid-scoring)
- [CLI Reference](/reference/cli)
