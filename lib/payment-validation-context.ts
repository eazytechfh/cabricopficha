export function shouldValidatePayments(context: string) {
  return context !== "editClient"
}
