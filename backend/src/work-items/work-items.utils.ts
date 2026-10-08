export function generateWorkItemPrefix(projectName: string): string {
  const words = projectName
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ''))
    .filter((w) => w.length > 0);

  // Fallback if no alphabetic characters at all
  if (words.length === 0) return 'WRK';

  let prefix: string;
  if (words.length >= 3) {
    prefix = words[0][0] + words[1][0] + words[2][0];
  } else if (words.length === 2) {
    prefix = words[0].slice(0, 2) + words[1][0];
  } else {
    prefix = words[0].slice(0, 3).padEnd(3, words[0][0]);
  }

  return prefix.toUpperCase();
}
