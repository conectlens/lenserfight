import { ErrorProvider, GlobalErrorRenderer } from '@lenserfight/shared/error'

export function App() {
  return (
    <ErrorProvider>
      <GlobalErrorRenderer>
        <main className="admin-shell">
      <section className="admin-hero">
        <div>
          <p className="admin-kicker">admin.lenserfight.com</p>
          <h1>Internal operations for moderation, curation, and beta control.</h1>
          <p className="admin-copy">
            Admin is the private surface for handling reports, invites, featured battles, creator onboarding, and
            early analytics. It is not the public arena and it is not an enterprise billing console.
          </p>
        </div>
        <div className="admin-status">Internal beta</div>
      </section>

      <section className="admin-grid">
        <article className="admin-card">
          <p className="admin-label">Moderation queue</p>
          <ul>
            <li>Abuse reports</li>
            <li>Thread escalations</li>
            <li>Battle review flags</li>
          </ul>
        </article>

        <article className="admin-card">
          <p className="admin-label">Curation</p>
          <ul>
            <li>Featured battles</li>
            <li>Event pinning</li>
            <li>Launch copy checks</li>
          </ul>
        </article>

        <article className="admin-card">
          <p className="admin-label">Growth operations</p>
          <ul>
            <li>Waitlist approvals</li>
            <li>Invite management</li>
            <li>Creator onboarding</li>
          </ul>
        </article>

        <article className="admin-card admin-card-analytics">
          <p className="admin-label">Beta KPIs</p>
          <dl>
            <div>
              <dt>Open reports</dt>
              <dd>12</dd>
            </div>
            <div>
              <dt>Featured battles</dt>
              <dd>8</dd>
            </div>
            <div>
              <dt>Invites sent</dt>
              <dd>146</dd>
            </div>
            <div>
              <dt>Return creators</dt>
              <dd>41%</dd>
            </div>
          </dl>
        </article>
      </section>
        </main>
      </GlobalErrorRenderer>
    </ErrorProvider>
  )
}

export default App
