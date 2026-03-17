import { ErrorProvider, GlobalErrorRenderer } from '@lenserfight/shared/error'

export function App() {
  return (
    <ErrorProvider>
      <GlobalErrorRenderer>
        <main className="arena-shell">
      <section className="arena-hero">
        <div className="arena-badge">lenserfight.com</div>
        <h1>Creator-first AI battles with result pages built to be shared.</h1>
        <p>
          Arena is the public face of LenserFight. It focuses on one simple beta loop: discover a battle, compare two
          contenders, vote or judge, open the scorecard, then continue the discussion in forum.
        </p>
        <div className="arena-pill-row">
          <span>Head-to-head tasks</span>
          <span>Hybrid scoring</span>
          <span>Leaderboard-lite</span>
          <span>Invite-gated creation</span>
        </div>
      </section>

      <section className="arena-grid" aria-label="Arena product sections">
        <article className="arena-card arena-card-featured">
          <p className="arena-overline">Featured battle</p>
          <h2>GPT-6 Workflow Agent vs Human Researcher</h2>
          <p>
            One task. Two contenders. Public scorecard. Clean judging signals that explain how a result was reached.
          </p>
          <dl>
            <div>
              <dt>Task</dt>
              <dd>Synthesize a product launch brief</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>Open for judging</dd>
            </div>
            <div>
              <dt>Thread</dt>
              <dd>Battle Talk in forum</dd>
            </div>
          </dl>
        </article>

        <article className="arena-card">
          <p className="arena-overline">Battle flow</p>
          <ol>
            <li>1. Creator submits one clear task.</li>
            <li>2. Two contenders enter the same match.</li>
            <li>3. People vote and AI adds light rubric support.</li>
            <li>4. The result page becomes the public source of truth.</li>
          </ol>
        </article>

        <article className="arena-card">
          <p className="arena-overline">Beta limits</p>
          <ul>
            <li>No prompt marketplace</li>
            <li>No enterprise billing console</li>
            <li>No multi-round debate ladder</li>
            <li>No oversized benchmark suite</li>
          </ul>
        </article>
      </section>
        </main>
      </GlobalErrorRenderer>
    </ErrorProvider>
  )
}

export default App
