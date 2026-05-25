jest.mock('expo/src/winter/ImportMetaRegistry', () => ({
  ImportMetaRegistry: {
    get url() {
      return null
    },
  },
}))

// expo@56 installs `fetch` as a lazy property getter in runtime.native.ts.
// That getter tries to require('./fetch') -> ExpoFetchModule -> requireNativeModule,
// which fails with "import outside scope" in Jest. Replace the getter with a plain
// jest.fn() before any test render triggers it.
const _fetchDescriptor = Object.getOwnPropertyDescriptor(global, 'fetch')
if (_fetchDescriptor?.get) {
  Object.defineProperty(global, 'fetch', {
    value: jest.fn(),
    configurable: true,
    writable: true,
  })
}

if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (object) => JSON.parse(JSON.stringify(object))
}
