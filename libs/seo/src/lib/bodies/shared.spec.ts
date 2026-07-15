import { describe, expect, it } from 'vitest'
import { renderEntityBody } from './shared'

describe('renderEntityBody', () => {
  it('renders the h1 and summary, escaping user content', () => {
    const html = renderEntityBody({
      h1: '<script>x</script>Lens',
      summary: 'A "great" lens',
    })
    expect(html).toContain('<h1>&lt;script&gt;x&lt;/script&gt;Lens</h1>')
    expect(html).toContain('A &quot;great&quot; lens')
  })

  it('renders facts as a definition list with escaped values', () => {
    const html = renderEntityBody({
      h1: 'X',
      summary: 'y',
      facts: [{ label: 'Author', value: '<b>evil</b>' }],
    })
    expect(html).toContain('<dt>Author</dt><dd>&lt;b&gt;evil&lt;/b&gt;</dd>')
  })

  it('renders internal links so crawlers can walk the graph', () => {
    const html = renderEntityBody({
      h1: 'X',
      summary: 'y',
      links: [{ href: '/lenser/ada', label: 'Ada' }],
    })
    expect(html).toContain('<a href="/lenser/ada">Ada</a>')
  })

  it('omits empty blocks', () => {
    const html = renderEntityBody({ h1: 'X', summary: 'y' })
    expect(html).not.toContain('<dl>')
    expect(html).not.toContain('<nav')
  })
})
