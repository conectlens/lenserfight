import { CheckCircle, Mail, HelpCircle, Check, AlertCircle } from 'lucide-react'
import React, { useState, useEffect } from 'react'

import { Button } from '@lenserfight/ui/components'
import { useLenser } from '@lenserfight/features/profile'
import { contactService } from '@lenserfight/data/repositories'
import { InputField } from '@lenserfight/features/auth'
import { PublicSection } from '../components/PublicSection'

export const ContactPage: React.FC = () => {
  const { lenser } = useLenser()
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('General Inquiry')
  const [message, setMessage] = useState('')
  const [kvkkApproved, setKvkkApproved] = useState(false)

  // Pre-fill email if logged in
  useEffect(() => {
    // Note: We don't have email in Lenser object directly (it's in Auth User),
    // but if we extended LenserContext to expose User email we could prefill.
    // For now, we prefill name if available.
    if (lenser?.display_name) {
      setName(lenser.display_name)
    }
  }, [lenser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await contactService.submitMessage({
        name,
        email,
        subject,
        message,
        kvkk_approved: kvkkApproved,
      })
      setSent(true)
      // Reset sensitive fields
      setMessage('')
      setKvkkApproved(false)
    } catch (err: any) {
      setError(err.message || 'Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicSection
      title="Contact Us"
      subtitle="Questions about the ecosystem? We are here to help."
      centered
    >
      <div className="max-w-lg mx-auto mt-8">
        {sent ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-2xl p-10 text-center animate-in fade-in zoom-in">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-800/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Message Sent</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              We've received your inquiry and will get back to you shortly.
            </p>
            <Button variant="ghost" onClick={() => setSent(false)} className="w-auto">
              Send another message
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-2xl border border-gray-200 dark:border-gray-700 text-left space-y-6 shadow-sm"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <InputField
                label="Name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <InputField
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject
              </label>
              <div className="relative">
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer"
                >
                  <option>General Inquiry</option>
                  <option>Partnership Opportunities</option>
                  <option>Technical Support</option>
                  <option>Legal / Privacy</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none resize-none placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="How can we help you?"
                required
              ></textarea>
            </div>

            {/* KVKK / Consent Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center mt-0.5">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={kvkkApproved}
                    onChange={(e) => setKvkkApproved(e.target.checked)}
                  />
                  <div className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 peer-checked:bg-gray-900 dark:peer-checked:bg-white peer-checked:border-gray-900 dark:peer-checked:border-white peer-focus:ring-2 peer-focus:ring-primary/50 transition-all"></div>
                  <Check
                    className="w-3.5 h-3.5 text-white dark:text-gray-900 absolute left-[3px] top-[3px] opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                    strokeWidth={3.5}
                  />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 leading-tight">
                  I agree to the processing of my personal data in accordance with the{' '}
                  <a
                    href="/legal/privacy"
                    target="_blank"
                    className="text-gray-900 dark:text-gray-200 hover:underline font-medium"
                  >
                    Privacy Policy
                  </a>{' '}
                  (KVKK).
                </span>
              </label>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <Button
              type="submit"
              isLoading={loading}
              className="w-full h-12 text-base font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200"
            >
              Send Message
            </Button>
          </form>
        )}

        <div className="mt-12 flex flex-col md:flex-row justify-center items-center gap-6 md:gap-12 text-sm font-medium text-gray-500 dark:text-gray-400">
          <a
            href="mailto:support@lenserfight.com"
            className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Mail size={18} /> support@lenserfight.com
          </a>
          <span className="hidden md:block w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></span>
          <a
            href="/faq"
            className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white transition-colors cursor-not-allowed opacity-50"
            title="Coming Soon"
          >
            <HelpCircle size={18} /> FAQ Knowledge Base
          </a>
        </div>
      </div>
    </PublicSection>
  )
}
