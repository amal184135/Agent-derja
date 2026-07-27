export function formatUpdatedAt(dateStr: string): string {
  const hasTZ = /Z$|[+-]\d{2}:\d{2}$/.test(dateStr);
  const date = new Date(hasTZ ? dateStr : dateStr + "Z");

  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) {
    return `Today at ${time}`;
  }

  if (isSameDay(date, yesterday)) {
    return `Yesterday at ${time}`;
  }

  const dateOnly = date.toLocaleDateString("en-GB"); // e.g. 22/07/2026
  return `${dateOnly} at ${time}`;
}