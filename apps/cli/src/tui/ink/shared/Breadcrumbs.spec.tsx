import { render } from 'ink-testing-library'

import { HOME_FRAME } from '../state/types'

import { Breadcrumbs } from './Breadcrumbs'

describe('Breadcrumbs', () => {
  it('renders a single frame with no separator', () => {
    const { lastFrame } = render(<Breadcrumbs trail={[HOME_FRAME]} />)
    expect(lastFrame()).toContain('Home')
  })

  it('joins multiple frames with an arrow separator', () => {
    const { lastFrame } = render(<Breadcrumbs trail={[HOME_FRAME, { id: 'agents', title: 'Agents' }]} />)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Home')
    expect(frame).toContain('Agents')
    expect(frame).toContain('→')
  })

  it('appends the extra segment after the trail', () => {
    const { lastFrame } = render(<Breadcrumbs trail={[HOME_FRAME]} extra="Row detail" />)
    expect(lastFrame()).toContain('Row detail')
  })
})
