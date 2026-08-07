import { describeShellDanger } from './shell-danger'

describe('describeShellDanger', () => {
  it('flags rm -rf', () => {
    expect(describeShellDanger('rm -rf node_modules')).toMatch(/recursive force delete/)
  })

  it('flags separated -r -f flags', () => {
    expect(describeShellDanger('rm -r -f dist')).toMatch(/recursive force delete/)
  })

  it('flags recursive-only rm as lower severity but still flagged', () => {
    expect(describeShellDanger('rm -r build')).toMatch(/recursive delete/)
  })

  it('does not flag a plain rm', () => {
    expect(describeShellDanger('rm file.txt')).toBeNull()
  })

  it('flags git push --force', () => {
    expect(describeShellDanger('git push origin main --force')).toMatch(/force-push/)
  })

  it('flags git reset --hard', () => {
    expect(describeShellDanger('git reset --hard HEAD~1')).toMatch(/hard reset/)
  })

  it('flags DROP TABLE regardless of case', () => {
    expect(describeShellDanger('psql -c "DROP TABLE users"')).toMatch(/DROP statement/)
  })

  it('does not flag ordinary commands', () => {
    expect(describeShellDanger('ls -la')).toBeNull()
    expect(describeShellDanger('git status')).toBeNull()
    expect(describeShellDanger('npm run build')).toBeNull()
  })
})
