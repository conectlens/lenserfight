import { Badge, Card, Accordion } from '@lenserfight/ui/components'
import { ArrowRight, Bug, MessagesSquare, ShieldAlert, LifeBuoy, NotebookText } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'


const SUPPORT_CHANNELS = [
  {
    icon: LifeBuoy,
    title: 'General support',
    description: 'Use the community forum or open a question in GitHub Discussions for product help.',
    href: 'https://github.com/conectlens/lenserfight/discussions',
    label: 'GitHub Discussions',
  },
  {
    icon: Bug,
    title: 'Bug reports',
    description: 'File a GitHub issue with the affected route, expected behavior, and screenshots.',
    href: 'https://github.com/conectlens/lenserfight/issues',
    label: 'GitHub Issues',
  },
  {
    icon: ShieldAlert,
    title: 'Security matters',
    description: 'Follow the security policy and report sensitive issues privately before publishing details.',
    href: '/policies/acceptable-use',
    label: 'Read policy',
  },
]

export const ContactPage: React.FC = () => {
  return (
    <div className="bg-surface-base text-surface-text">
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="space-y-4 text-center">
          <Badge color="gray" variant="outline">
            Contact
          </Badge>
          <h1 className="text-4xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-5xl">
            Talk to the team, report an issue, or ask for help.
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-greyscale-600 dark:text-greyscale-400">
            We keep the support path simple: community questions in the forum, bugs in GitHub, and policy
            references in the legal section.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {SUPPORT_CHANNELS.map(({ icon: Icon, title, description, href, label }) => (
            <Card key={title} className="flex h-full flex-col justify-between space-y-5 p-6">
              <div className="space-y-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-raised text-[var(--cl-yellow-500)]">
                  <Icon size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-greyscale-900 dark:text-greyscale-50">{title}</h2>
                  <p className="mt-2 text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                    {description}
                  </p>
                </div>
              </div>
              <a
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-base px-4 py-2 text-sm font-semibold text-greyscale-700 transition-colors hover:border-primary-yellow-500 hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
              >
                {label} <ArrowRight size={16} />
              </a>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="space-y-4 p-6">
            <Badge color="yellow" variant="outline">
              Best practice
            </Badge>
            <h2 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
              What to include when you contact us
            </h2>
            <ul className="space-y-3 text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
              <li>• The route or page where you saw the issue.</li>
              <li>• What you expected to happen.</li>
              <li>• What actually happened, plus screenshots or logs if available.</li>
              <li>• Whether the issue is public, private, or security-sensitive.</li>
            </ul>
          </Card>

          <Card className="space-y-5 p-6">
            <Badge color="yellow" variant="outline">
              Quick answers
            </Badge>
            <Accordion type="single" className="rounded-2xl">
              <Accordion.Item title="Where do I ask product questions?" icon={<MessagesSquare size={16} />}>
                Use GitHub Discussions or the forum for anything that needs a human answer before you file a bug.
              </Accordion.Item>
              <Accordion.Item title="Where do I report bugs?" icon={<Bug size={16} />}>
                Open a GitHub issue with reproduction steps and let us know which battle or lens page is affected.
              </Accordion.Item>
              <Accordion.Item title="Where do I read policies?" icon={<NotebookText size={16} />}>
                The policy pages live in the legal section and cover terms, privacy, cookies, and acceptable use.
              </Accordion.Item>
            </Accordion>
          </Card>
        </div>

        <div className="mt-12 rounded-[2rem] border border-surface-border bg-[linear-gradient(135deg,rgba(255,222,89,0.16),rgba(40,123,255,0.08),transparent)] p-8 text-center shadow-neu-1 dark:bg-[linear-gradient(135deg,rgba(255,222,89,0.1),rgba(40,123,255,0.05),transparent)]">
          <h2 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            Need to see the product in action first?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            The demo and public result pages are the fastest way to understand how comparison, voting, and sharing
            work together.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 rounded-full bg-greyscale-900 px-5 py-3 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 dark:bg-greyscale-0 dark:text-greyscale-900"
            >
              View demo
            </Link>
            <Link
              to="/battles"
              className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-base px-5 py-3 text-sm font-semibold text-greyscale-700 transition-colors hover:border-primary-yellow-500 hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
            >
              Browse battles
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
