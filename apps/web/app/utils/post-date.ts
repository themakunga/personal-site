export function formatPostDate(
  date: Date | string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Date(date).toLocaleDateString(locale, { ...options, timeZone: 'UTC' })
}
