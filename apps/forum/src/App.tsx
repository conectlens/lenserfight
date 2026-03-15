function App() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,222,89,0.28),_transparent_35%),linear-gradient(180deg,_#fffdf4_0%,_#f6f8ff_50%,_#edf2ff_100%)] text-slate-900">
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-14 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-600">forum.lenserfight.com</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Battle talk, guides, and event threads live in the community hub.
            </h1>
          </div>
          <div className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
            April 2026 beta
          </div>
        </div>

        <p className="max-w-3xl text-lg leading-8 text-slate-700">
          Forum is where LenserFight explains battles, coordinates events, publishes guides, and collects community
          feedback. It is not a prompt marketplace.
        </p>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            ['Announcements', 'Launch notes, roadmap updates, featured battles, and product changes.'],
            ['Battle Talk', 'Post-match analysis, judging rationale, and contender breakdowns.'],
            ['Guides', 'Battle setup tips, scoring explanations, and creator playbooks.'],
            ['Events', 'Season threads, weekly challenges, and community scheduling.'],
            ['Feedback', 'Beta bug reports, UX issues, and requests that affect roadmap cuts.'],
          ].map(([title, copy]) => (
            <article key={title} className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
              <h2 className="text-lg font-bold text-slate-950">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{copy}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-slate-950 p-7 text-slate-50 shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">Core loop</p>
            <ol className="mt-5 space-y-4 text-sm leading-7 text-slate-200">
              <li>1. Watch a battle unfold in Arena and open its scorecard.</li>
              <li>2. Jump into the linked forum thread for context and critique.</li>
              <li>3. Vote, judge, or respond with a follow-up thread.</li>
              <li>4. Share the result page and bring new creators back into the loop.</li>
            </ol>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white/80 p-7 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Beta defaults</p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
              <li>Invite-gated creation keeps community quality high.</li>
              <li>Human voting leads; AI assistance stays lightweight and visible.</li>
              <li>Prompts can appear as context, not as a standalone product.</li>
              <li>Moderation and curation stay in Admin, not in public threads.</li>
            </ul>
          </section>
        </div>
      </section>
    </main>
  )
}

export default App
