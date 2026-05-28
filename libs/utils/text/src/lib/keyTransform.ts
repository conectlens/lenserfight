/**
 * Key transformation utilities for normalizing JSON payloads between
 * camelCase (frontend convention) and snake_case (API/DB convention).
 */

function hasAlphabeticCharacter(key: string): boolean {
  return /[A-Za-z]/.test(key)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function transformArrayItems<T>(items: T[], transform: (value: unknown) => unknown): T[] {
  let result: T[] | undefined

  for (let index = 0; index < items.length; index += 1) {
    const originalItem = items[index]
    const transformedItem = transform(originalItem) as T

    if (!result && transformedItem === originalItem) continue

    if (!result) {
      result = items.slice(0, index)
    }

    result.push(transformedItem)
  }

  return result ?? items
}

function transformObjectKeys<T extends Record<string, unknown>>(
  input: T,
  transformKey: (key: string) => string,
  transformValue: (value: unknown) => unknown
): T {
  const entries = Object.entries(input)
  let result: Record<string, unknown> | undefined

  for (let index = 0; index < entries.length; index += 1) {
    const [originalKey, originalValue] = entries[index]
    const nextKey = transformKey(originalKey)
    const nextValue = transformValue(originalValue)

    if (!result && nextKey === originalKey && nextValue === originalValue) continue

    if (!result) {
      result = {}
      for (let copyIndex = 0; copyIndex < index; copyIndex += 1) {
        const [previousKey, previousValue] = entries[copyIndex]
        result[previousKey] = previousValue
      }
    }

    result[nextKey] = nextValue
  }

  return (result ?? input) as T
}

function transformKeysDeep<T>(value: T, transformKey: (key: string) => string): T {
  if (Array.isArray(value)) {
    return transformArrayItems(value, (item) => transformKeysDeep(item, transformKey)) as T
  }

  if (isPlainObject(value)) {
    return transformObjectKeys(value, transformKey, (item) => transformKeysDeep(item, transformKey))
  }

  return value
}

/**
 * Converts a single camelCase key to snake_case.
 *
 * Rules:
 * - Already snake_case keys are returned unchanged (idempotent).
 * - All-uppercase keys (e.g. API_KEY, MAX_RETRIES) are returned unchanged.
 * - Non-alphabetic-only keys (e.g. "123", "__") are returned unchanged.
 * - Consecutive uppercase sequences are treated as acronyms:
 *   productSKU → product_sku, parseHTMLContent → parse_html_content
 */
export function camelToSnake(key: string): string {
  if (!hasAlphabeticCharacter(key)) return key

  // Already snake_case: all lowercase letters, digits, underscores
  if (/^[a-z\d_]+$/.test(key)) return key

  // All-uppercase constant (e.g. API_KEY, MAX_VALUE)
  if (/^[A-Z\d_]+$/.test(key)) return key

  // Preserve keys with punctuation/symbols that are not valid camelCase identifiers.
  if (/[^A-Za-z\d_]/.test(key)) return key

  return (
    key
      // Uppercase letter following a lowercase letter or digit: fooBar → foo_Bar
      .replace(/([a-z\d])([A-Z])/g, '$1_$2')
      // Uppercase run before a lowercase letter: parseHTMLContent → parse_HTML_Content → parse_html_content
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
      .toLowerCase()
  )
}

/**
 * Converts a single snake_case key to camelCase.
 *
 * Examples: variant_id → variantId, product_name → productName
 */
export function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase())
}

/**
 * Recursively transforms all keys of a plain object (or array of objects)
 * from camelCase to snake_case. Values are not modified.
 *
 * - Handles arbitrarily nested objects and arrays.
 * - Preserves primitives (string, number, boolean, null) as-is.
 * - Idempotent: running twice produces the same result.
 */
export function toSnakeCaseKeys<T>(value: T): T {
  return transformKeysDeep(value, camelToSnake)
}

/**
 * Recursively transforms all keys of a plain object (or array of objects)
 * from snake_case to camelCase. Values are not modified.
 *
 * Useful for normalizing API/DB responses back to frontend conventions.
 */
export function toCamelCaseKeys<T>(value: T): T {
  return transformKeysDeep(value, snakeToCamel)
}

/**
 * Normalizes a JSON string by converting object keys from camelCase to snake_case.
 *
 * Invalid JSON is returned unchanged so the caller can decide how to handle it.
 */
export function normalizeJsonStringToSnakeCase(json: string): string {
  try {
    const parsed: unknown = JSON.parse(json)
    const normalized = toSnakeCaseKeys(parsed)
    return normalized === parsed ? json : JSON.stringify(normalized)
  } catch {
    return json
  }
}
