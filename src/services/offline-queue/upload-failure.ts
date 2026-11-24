import { StorageUploadError } from '@/services/r2/r2-storage.service'

const GENERIC_MESSAGE = 'Oscilação na rede. Vamos tentar de novo automaticamente.'

const ROW_LEVEL_SECURITY = '42501'
const CHECK_VIOLATION = '23514'
const FOREIGN_KEY_VIOLATION = '23503'

/** Why an upload failed. */
export interface UploadFailure {
  /** Message for the guest. */
  readonly message: string
  /** Trying again without the guest would fail the same way. */
  readonly isPermanent: boolean
}

function getDatabaseCode(error: unknown): unknown {
  const cause = error instanceof Error ? error.cause : null
  return cause && typeof cause === 'object' && 'code' in cause ? cause.code : null
}

/** Explains a failure without showing internal errors. */
export function describeUploadFailure(error: unknown): UploadFailure {
  if (error instanceof StorageUploadError && error.statusCode) {
    // The server already answers in Portuguese
    const { message, statusCode } = error
    const isPermanent = [400, 401, 403, 413].includes(statusCode)
    if (isPermanent || statusCode === 429) return { message, isPermanent }
  }
  switch (getDatabaseCode(error)) {
    case ROW_LEVEL_SECURITY:
    case CHECK_VIOLATION:
      return {
        message: 'Publicação recusada. Entre com a mesma conta usada para criar este envio.',
        isPermanent: true,
      }
    case FOREIGN_KEY_VIOLATION:
      return {
        message: 'Este desafio não existe mais. Cancele e poste de novo.',
        isPermanent: true,
      }
  }
  return { message: GENERIC_MESSAGE, isPermanent: false }
}

/** Rejects when a promise takes too long, since requests may hang forever. */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}
