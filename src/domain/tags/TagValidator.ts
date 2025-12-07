
import { TagNameError, TagSlugError } from './TagErrors';

export class TagValidator {
  private static readonly MIN_NAME_LENGTH = 2;
  private static readonly MAX_NAME_LENGTH = 60;
  private static readonly MIN_SLUG_LENGTH = 2;
  private static readonly MAX_SLUG_LENGTH = 40;

  /**
   * Normalizes the display name:
   * 1. Trim whitespace
   * 2. Collapse multiple spaces
   * 3. (Optional) Unicode normalization could happen here if not doing it in slug generation
   */
  static normalizeName(displayName: string): string {
    if (!displayName) return '';
    return displayName.trim().replace(/\s+/g, ' ');
  }

  /**
   * Generates a canonical slug from the display name.
   * Rules:
   * - Lowercase
   * - Remove accents (Unicode NFD + remove diacritics)
   * - Replace spaces with hyphens
   * - Remove non-alphanumeric chars (except hyphens)
   * - Collapse multiple hyphens
   * - Trim hyphens from start/end
   */
  static generateSlug(displayName: string): string {
    if (!displayName) return '';

    return displayName
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/\s+/g, '-') // Spaces to hyphens
      .replace(/[^a-z0-9-]/g, '') // Remove invalid chars
      .replace(/-+/g, '-') // Collapse hyphens
      .replace(/^-+|-+$/g, ''); // Trim edge hyphens
  }

  static validateDisplayName(name: string): void {
    if (!name) throw new TagNameError("Tag name is required.");
    const len = name.length;
    if (len < this.MIN_NAME_LENGTH || len > this.MAX_NAME_LENGTH) {
      throw new TagNameError(`Tag name must be between ${this.MIN_NAME_LENGTH} and ${this.MAX_NAME_LENGTH} characters.`);
    }
  }

  static validateSlug(slug: string): void {
    if (!slug) throw new TagSlugError("Tag slug cannot be empty.");
    const len = slug.length;
    if (len < this.MIN_SLUG_LENGTH || len > this.MAX_SLUG_LENGTH) {
      throw new TagSlugError(`Tag slug must be between ${this.MIN_SLUG_LENGTH} and ${this.MAX_SLUG_LENGTH} characters.`);
    }
    
    // Strict regex check matching database constraint
    const slugRegex = /^[a-z0-9]+([-][a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
        throw new TagSlugError("Tag slug contains invalid characters or malformed format.");
    }
  }
}
