export class TagDomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TagDomainError'
  }
}

export class TagNameError extends TagDomainError {
  constructor(message = 'Invalid tag name') {
    super(message)
    this.name = 'TagNameError'
  }
}

export class TagSlugError extends TagDomainError {
  constructor(message = 'Invalid tag slug') {
    super(message)
    this.name = 'TagSlugError'
  }
}

export class TagAlreadyExistsError extends TagDomainError {
  constructor(slug: string) {
    super(`Tag with slug "${slug}" already exists`)
    this.name = 'TagAlreadyExistsError'
  }
}
