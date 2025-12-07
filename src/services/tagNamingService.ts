
import { TagValidator } from '../domain/tags/TagValidator';

/**
 * @deprecated Use TagValidator or tagService.processUserInput directly.
 * Kept for backward compatibility during migration.
 */
export class TagNamingService {
  static normalize(raw: string) {
    try {
        const name = TagValidator.normalizeName(raw);
        const slug = TagValidator.generateSlug(name);
        TagValidator.validateDisplayName(name);
        TagValidator.validateSlug(slug);
        
        return { name, slug, isValid: true };
    } catch (e) {
        return { name: '', slug: '', isValid: false };
    }
  }
}
