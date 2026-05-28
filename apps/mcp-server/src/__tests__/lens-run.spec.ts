import { resolveTemplate } from '../tools/lens/lens-run';

const params = [
  { id: 'aaaaaaaa-0000-0000-0000-000000000001', label: 'Topic', optional: false },
  { id: 'aaaaaaaa-0000-0000-0000-000000000002', label: 'Language', optional: false },
  { id: 'aaaaaaaa-0000-0000-0000-000000000003', label: 'Tone', optional: true },
];

const body =
  'Review [[:aaaaaaaa-0000-0000-0000-000000000001]] code in [[:aaaaaaaa-0000-0000-0000-000000000002]] with tone [[:aaaaaaaa-0000-0000-0000-000000000003]].';

describe('resolveTemplate', () => {
  it('substitutes all provided params', () => {
    const { resolved, missing, used } = resolveTemplate(body, params, {
      Topic: 'TypeScript',
      Language: 'English',
      Tone: 'formal',
    });
    expect(resolved).toBe('Review TypeScript code in English with tone formal.');
    expect(missing).toHaveLength(0);
    expect(used).toEqual(expect.arrayContaining(['Topic', 'Language', 'Tone']));
  });

  it('returns missing for required params with no value', () => {
    const { missing } = resolveTemplate(body, params, { Topic: 'Go' });
    expect(missing).toContain('Language');
    expect(missing).not.toContain('Topic');
  });

  it('replaces optional param token with empty string when not provided', () => {
    const { resolved, missing } = resolveTemplate(body, params, {
      Topic: 'Python',
      Language: 'French',
    });
    expect(resolved).toBe('Review Python code in French with tone .');
    expect(missing).toHaveLength(0);
  });

  it('matches labels case-insensitively', () => {
    const { resolved, missing } = resolveTemplate(body, params, {
      topic: 'Rust',
      LANGUAGE: 'German',
    });
    expect(resolved).toContain('Rust');
    expect(resolved).toContain('German');
    expect(missing).toHaveLength(0);
  });

  it('ignores unknown keys in values', () => {
    const { missing } = resolveTemplate(body, params, {
      Topic: 'Java',
      Language: 'Spanish',
      UnknownParam: 'should be ignored',
    });
    expect(missing).toHaveLength(0);
  });

  it('returns all required labels in missing when no values provided', () => {
    const { missing } = resolveTemplate(body, params, {});
    expect(missing).toContain('Topic');
    expect(missing).toContain('Language');
    expect(missing).not.toContain('Tone');
  });
});
