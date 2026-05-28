import {
  camelToSnake,
  normalizeJsonStringToSnakeCase,
  snakeToCamel,
  toCamelCaseKeys,
  toSnakeCaseKeys,
} from './keyTransform'

// ---------------------------------------------------------------------------
// camelToSnake
// ---------------------------------------------------------------------------

describe('camelToSnake', () => {
  it('converts simple camelCase', () => {
    expect(camelToSnake('variantId')).toBe('variant_id')
    expect(camelToSnake('productName')).toBe('product_name')
    expect(camelToSnake('isAvailable')).toBe('is_available')
  })

  it('converts multi-word camelCase', () => {
    expect(camelToSnake('createdAtTimestamp')).toBe('created_at_timestamp')
    expect(camelToSnake('userProfileData')).toBe('user_profile_data')
  })

  it('handles acronyms correctly', () => {
    expect(camelToSnake('productSKU')).toBe('product_sku')
    expect(camelToSnake('parseHTMLContent')).toBe('parse_html_content')
    expect(camelToSnake('userID')).toBe('user_id')
  })

  it('is idempotent on already-snake_case keys', () => {
    expect(camelToSnake('variant_id')).toBe('variant_id')
    expect(camelToSnake('product_name')).toBe('product_name')
    expect(camelToSnake('is_available')).toBe('is_available')
  })

  it('does not modify all-uppercase keys', () => {
    expect(camelToSnake('API_KEY')).toBe('API_KEY')
    expect(camelToSnake('MAX_RETRIES')).toBe('MAX_RETRIES')
    expect(camelToSnake('ID')).toBe('ID')
  })

  it('does not modify non-alphabetic-only keys', () => {
    expect(camelToSnake('123')).toBe('123')
    expect(camelToSnake('__')).toBe('__')
  })

  it('does not modify keys containing punctuation', () => {
    expect(camelToSnake('x-api-key')).toBe('x-api-key')
    expect(camelToSnake('meta.version')).toBe('meta.version')
  })

  it('handles single-word lowercase keys', () => {
    expect(camelToSnake('name')).toBe('name')
    expect(camelToSnake('id')).toBe('id')
  })
})

// ---------------------------------------------------------------------------
// snakeToCamel
// ---------------------------------------------------------------------------

describe('snakeToCamel', () => {
  it('converts simple snake_case', () => {
    expect(snakeToCamel('variant_id')).toBe('variantId')
    expect(snakeToCamel('product_name')).toBe('productName')
    expect(snakeToCamel('is_available')).toBe('isAvailable')
  })

  it('converts multi-segment snake_case', () => {
    expect(snakeToCamel('created_at_timestamp')).toBe('createdAtTimestamp')
  })

  it('is idempotent on already-camelCase keys', () => {
    expect(snakeToCamel('variantId')).toBe('variantId')
  })

  it('handles keys without underscores', () => {
    expect(snakeToCamel('name')).toBe('name')
  })
})

// ---------------------------------------------------------------------------
// toSnakeCaseKeys — flat objects
// ---------------------------------------------------------------------------

describe('toSnakeCaseKeys — flat objects', () => {
  it('transforms all keys of a flat object', () => {
    expect(
      toSnakeCaseKeys({
        variantId: 123,
        productName: 'Test',
        isAvailable: true,
      })
    ).toEqual({
      variant_id: 123,
      product_name: 'Test',
      is_available: true,
    })
  })

  it('preserves primitive values unchanged', () => {
    const result = toSnakeCaseKeys({ someKey: 'hello', count: 42, flag: false, nothing: null })
    expect(result).toEqual({ some_key: 'hello', count: 42, flag: false, nothing: null })
  })

  it('does not touch already-snake_case keys', () => {
    expect(toSnakeCaseKeys({ variant_id: 1, product_name: 'x' })).toEqual({
      variant_id: 1,
      product_name: 'x',
    })
  })
})

// ---------------------------------------------------------------------------
// toSnakeCaseKeys — nested objects
// ---------------------------------------------------------------------------

describe('toSnakeCaseKeys — nested objects', () => {
  it('transforms keys recursively', () => {
    expect(
      toSnakeCaseKeys({
        variantId: 123,
        productData: {
          productName: 'Test',
          isAvailable: true,
        },
      })
    ).toEqual({
      variant_id: 123,
      product_data: {
        product_name: 'Test',
        is_available: true,
      },
    })
  })

  it('handles deeply nested objects', () => {
    const input = { levelOne: { levelTwo: { levelThree: { deepKey: 'value' } } } }
    expect(toSnakeCaseKeys(input)).toEqual({
      level_one: { level_two: { level_three: { deep_key: 'value' } } },
    })
  })
})

// ---------------------------------------------------------------------------
// toSnakeCaseKeys — arrays
// ---------------------------------------------------------------------------

describe('toSnakeCaseKeys — arrays', () => {
  it('transforms keys in an array of objects', () => {
    expect(
      toSnakeCaseKeys([
        { itemId: 1, itemName: 'A' },
        { itemId: 2, itemName: 'B' },
      ])
    ).toEqual([
      { item_id: 1, item_name: 'A' },
      { item_id: 2, item_name: 'B' },
    ])
  })

  it('handles arrays nested inside objects', () => {
    expect(
      toSnakeCaseKeys({
        orderItems: [{ productId: 1 }, { productId: 2 }],
      })
    ).toEqual({
      order_items: [{ product_id: 1 }, { product_id: 2 }],
    })
  })

  it('handles arrays of primitives without modification', () => {
    expect(toSnakeCaseKeys({ tagList: [1, 2, 3] })).toEqual({ tag_list: [1, 2, 3] })
  })
})

// ---------------------------------------------------------------------------
// toSnakeCaseKeys — mixed / edge cases
// ---------------------------------------------------------------------------

describe('toSnakeCaseKeys — edge cases', () => {
  it('is idempotent (running twice produces the same result)', () => {
    const input = { variantId: 1, productData: { productName: 'x' } }
    const once = toSnakeCaseKeys(input)
    const twice = toSnakeCaseKeys(once)
    expect(once).toEqual(twice)
  })

  it('preserves all-uppercase keys', () => {
    expect(toSnakeCaseKeys({ API_KEY: 'secret', MAX_RETRIES: 3 })).toEqual({
      API_KEY: 'secret',
      MAX_RETRIES: 3,
    })
  })

  it('handles mixed naming formats in the same object', () => {
    expect(
      toSnakeCaseKeys({
        camelCase: 1,
        snake_case: 2,
        API_KEY: 3,
        productSKU: 'abc',
      })
    ).toEqual({
      camel_case: 1,
      snake_case: 2,
      API_KEY: 3,
      product_sku: 'abc',
    })
  })

  it('returns primitives as-is', () => {
    expect(toSnakeCaseKeys('hello')).toBe('hello')
    expect(toSnakeCaseKeys(42)).toBe(42)
    expect(toSnakeCaseKeys(null)).toBe(null)
    expect(toSnakeCaseKeys(true)).toBe(true)
  })

  it('handles empty object and empty array', () => {
    expect(toSnakeCaseKeys({})).toEqual({})
    expect(toSnakeCaseKeys([])).toEqual([])
  })

  it('reuses object references when no keys need normalization', () => {
    const input = { variant_id: 1, nested: { product_name: 'x' }, flags: ['a', 'b'] }
    const result = toSnakeCaseKeys(input)

    expect(result).toBe(input)
    expect(result.nested).toBe(input.nested)
    expect(result.flags).toBe(input.flags)
  })
})

// ---------------------------------------------------------------------------
// toCamelCaseKeys (reverse transformation)
// ---------------------------------------------------------------------------

describe('toCamelCaseKeys', () => {
  it('transforms flat snake_case keys to camelCase', () => {
    expect(
      toCamelCaseKeys({
        variant_id: 123,
        product_name: 'Test',
        is_available: true,
      })
    ).toEqual({
      variantId: 123,
      productName: 'Test',
      isAvailable: true,
    })
  })

  it('transforms nested objects recursively', () => {
    expect(
      toCamelCaseKeys({
        product_data: {
          product_name: 'Test',
          is_available: true,
        },
      })
    ).toEqual({
      productData: {
        productName: 'Test',
        isAvailable: true,
      },
    })
  })

  it('transforms arrays of objects', () => {
    expect(
      toCamelCaseKeys([
        { item_id: 1, item_name: 'A' },
        { item_id: 2, item_name: 'B' },
      ])
    ).toEqual([
      { itemId: 1, itemName: 'A' },
      { itemId: 2, itemName: 'B' },
    ])
  })

  it('round-trips with toSnakeCaseKeys', () => {
    const original = { variantId: 1, productData: { productName: 'x' } }
    expect(toCamelCaseKeys(toSnakeCaseKeys(original))).toEqual(original)
  })
})

describe('normalizeJsonStringToSnakeCase', () => {
  it('normalizes nested JSON payloads', () => {
    expect(
      normalizeJsonStringToSnakeCase(
        JSON.stringify({
          variantId: 123,
          productData: {
            productSKU: 'sku-1',
            items: [{ itemId: 1 }],
          },
        })
      )
    ).toBe(
      JSON.stringify({
        variant_id: 123,
        product_data: {
          product_sku: 'sku-1',
          items: [{ item_id: 1 }],
        },
      })
    )
  })

  it('returns invalid JSON unchanged', () => {
    expect(normalizeJsonStringToSnakeCase('{invalid')).toBe('{invalid')
  })

  it('returns unchanged JSON text when no keys need normalization', () => {
    const json = JSON.stringify({ variant_id: 1, product_name: 'x' })
    expect(normalizeJsonStringToSnakeCase(json)).toBe(json)
  })
})
