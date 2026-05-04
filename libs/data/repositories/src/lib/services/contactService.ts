import { CreateContactDTO } from '@lenserfight/types'
import { createContactRepository } from '../factory'


const repo = createContactRepository()

export const contactService = {
  submitMessage: async (data: Omit<CreateContactDTO, 'user_agent'>): Promise<void> => {
    // 1. Validate Email (matching the SQL Constraint)
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    if (!emailRegex.test(data.email)) {
      throw new Error('Please enter a valid email address.')
    }

    // 2. Validate KVKK
    if (!data.kvkk_approved) {
      throw new Error('You must agree to the privacy policy (KVKK) to proceed.')
    }

    // 3. Prepare DTO
    const dto: CreateContactDTO = {
      ...data,
      user_agent: navigator.userAgent,
    }

    // 4. Submit
    await repo.submitMessage(dto)
  },
}
