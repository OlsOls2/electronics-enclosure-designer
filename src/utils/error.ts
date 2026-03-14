export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const trimmed = error.message.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }

  return fallback
}
