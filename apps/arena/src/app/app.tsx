import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { ErrorProvider, GlobalErrorRenderer } from '@lenserfight/shared/error'
import { BattlesFeedPage } from '../pages/BattlesFeedPage'
import { BattleDetailPage } from '../pages/BattleDetailPage'
import { BattleResultPage } from '../pages/BattleResultPage'
import { CreateBattlePage } from '../pages/CreateBattlePage'

function ArenaLandingPage() {
  return (
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
        <div className="mt-6 flex gap-3 justify-center flex-wrap">
          <Link
            to="/battles"
            className="inline-flex items-center gap-1 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Browse Battles →
          </Link>
          <Link
            to="/battles/create"
            className="inline-flex items-center gap-1 px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:border-gray-500 transition-colors"
          >
            Create a Battle
          </Link>
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
  )
}

export function App() {
  return (
    <ErrorProvider>
      <GlobalErrorRenderer>
        <Routes>
          <Route path="/" element={<ArenaLandingPage />} />
          <Route path="/battles" element={<BattlesFeedPage />} />
          <Route path="/battles/create" element={<CreateBattlePage />} />
          <Route path="/battles/:slug" element={<BattleDetailPage />} />
          <Route path="/battles/:slug/result" element={<BattleResultPage />} />
        </Routes>
      </GlobalErrorRenderer>
    </ErrorProvider>
  )
}

export default App
