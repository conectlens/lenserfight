import { ErrorProvider, GlobalErrorRenderer } from '@lenserfight/shared/error'
import React from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'


import { LandLayout } from '../layouts/LandLayout'
import { PolicyLayoutWrapper } from '../layouts/PolicyLayoutWrapper'
import { AboutPage } from '../pages/AboutPage'
import { ContactPage } from '../pages/ContactPage'
import { DemoPage } from '../pages/DemoPage'
import { GetStartedPage } from '../pages/GetStartedPage'
import { LandHomePage } from '../pages/LandHomePage'
import { MissionPage } from '../pages/MissionPage'
import { PoliciesPage } from '../pages/PoliciesPage'
import { ProductPage } from '../pages/ProductPage'
import { WhatIsPage } from '../pages/WhatIsPage'


function ArenaLandingPage() {
  return (
    <main className="space-y-10 bg-surface-base px-4 py-12 text-surface-text sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl space-y-6 text-center">
        <div className="inline-flex items-center rounded-full border border-surface-border bg-surface-raised px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-greyscale-500">
          lenserfight.com
        </div>
        <h1 className="text-4xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-5xl lg:text-6xl">
          Creator-first AI battles with result pages built to be shared.
        </h1>
        <p className="mx-auto max-w-3xl text-lg leading-8 text-greyscale-600 dark:text-greyscale-400">
          Arena is the public face of LenserFight. It focuses on one simple loop: discover a battle, compare two
          contenders, vote or judge, open the scorecard, then continue the discussion in forum.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/battles"
            className="inline-flex items-center gap-1.5 rounded-full bg-greyscale-900 px-5 py-3 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 dark:bg-greyscale-0 dark:text-greyscale-900"
          >
            Browse battles
          </Link>
          <Link
            to="/battles/create"
            className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-base px-5 py-3 text-sm font-semibold text-greyscale-700 transition-colors hover:border-status-blue hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
          >
            Create a battle
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[2rem] border border-surface-border bg-surface-base p-6 shadow-neu-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-greyscale-500">Featured battle</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            GPT-6 Workflow Agent vs Human Researcher
          </h2>
          <p className="mt-3 text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            One task. Two contenders. Public scorecard. Clean judging signals that explain how a result was reached.
          </p>
          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-surface-border bg-surface-raised p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.22em] text-greyscale-500">Task</dt>
              <dd className="mt-2 text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                Synthesize a product launch brief
              </dd>
            </div>
            <div className="rounded-2xl border border-surface-border bg-surface-raised p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.22em] text-greyscale-500">Status</dt>
              <dd className="mt-2 text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                Open for judging
              </dd>
            </div>
            <div className="rounded-2xl border border-surface-border bg-surface-raised p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.22em] text-greyscale-500">Thread</dt>
              <dd className="mt-2 text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                Battle talk in forum
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-[2rem] border border-surface-border bg-surface-base p-6 shadow-neu-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-greyscale-500">Battle flow</p>
          <ol className="mt-4 space-y-3 text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            <li>1. Creator submits one clear task.</li>
            <li>2. Two contenders enter the same match.</li>
            <li>3. People vote and AI adds light rubric support.</li>
            <li>4. The result page becomes the public source of truth.</li>
          </ol>

          <div className="mt-6 rounded-2xl border border-surface-border bg-surface-raised p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-greyscale-500">Beta limits</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-greyscale-600 dark:text-greyscale-400">
              <li>No prompt marketplace</li>
              <li>No enterprise billing console</li>
              <li>No multi-round debate ladder</li>
              <li>No oversized benchmark suite</li>
            </ul>
          </div>
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
          <Route element={<LandLayout />}>
            <Route index element={<ArenaLandingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/what-is-lenserfight" element={<WhatIsPage />} />
            <Route path="/product" element={<ProductPage />} />
            <Route path="/mission" element={<MissionPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/get-started" element={<GetStartedPage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/land-home" element={<LandHomePage />} />

            <Route element={<PolicyLayoutWrapper />}>
              <Route path="/policies" element={<Navigate to="/policies/terms" replace />} />
              <Route path="/policies/:policy" element={<PoliciesPage />} />
            </Route>
          </Route>
        </Routes>
      </GlobalErrorRenderer>
    </ErrorProvider>
  )
}

export default App
