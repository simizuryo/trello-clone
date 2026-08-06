export const PRIORITY_LABEL = { high: "高", medium: "中", low: "低" };

export function formatDueDate(dueDate) {
  if (!dueDate) return null;
  const [, month, day] = dueDate.split("-");
  return `${Number(month)}/${Number(day)}`;
}
