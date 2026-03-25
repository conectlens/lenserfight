export function AuthFormError({ message }: { message?: string | null }) {
  if (!message) return null

  return <p className="mt-1 text-xs font-medium text-red-500">{message}</p>
}
