import setupCommand from './setup'

export default {
  ...setupCommand,
  meta: {
    name: 'onboard',
    description:
      'Guided onboarding for local setup, cloud setup, and the developer journey checklist.',
  },
}
