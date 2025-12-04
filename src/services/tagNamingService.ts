
export interface TagNameParts {
  name: string;
  slug: string;
  isValid: boolean;
}

export class TagNamingService {
  /**
   * Centralized normalization logic for tags.
   * Enforces rules for whitespace, unicode, slug generation, and validity.
   * This pipeline MUST be used before any tag creation or lookup.
   */
  static normalize(raw: string): TagNameParts {
    if (!raw || typeof raw !== 'string') {
        return { name: '', slug: '', isValid: false };
    }

    // Rule 1: Trim whitespace
    let name = raw.trim();
    
    // Rule 2: Remove leading hash symbols common in UI input
    name = name.replace(/^#+/, '');
    
    // Rule 3: Enforce max length (e.g. 50 chars)
    if (name.length > 50) {
        name = name.substring(0, 50);
    }

    if (!name) return { name: '', slug: '', isValid: false };

    // Rule 4: Unicode Normalization (Compatibility Composition)
    name = name.normalize('NFKC');

    // Rule 5: Slug Generation
    let slug = name.toLowerCase();
    // Replace separators (spaces, underscores) with hyphens
    slug = slug.replace(/[\s_]+/g, '-');
    // Remove non-alphanumeric chars (excluding hyphens)
    slug = slug.replace(/[^a-z0-9-]/g, '');
    // Collapse multiple hyphens
    slug = slug.replace(/-+/g, '-');
    // Trim leading/trailing hyphens
    slug = slug.replace(/^-+|-+$/g, '');

    const isValid = slug.length > 0;

    return {
        name, // Preserves casing for display (e.g. "ReactJS")
        slug, // Normalized for uniqueness (e.g. "reactjs")
        isValid
    };
  }
}
