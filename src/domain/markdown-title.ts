export function extractMarkdownTitle(markdown: string): string | null {
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    const title = match?.[1]?.trim();

    if (title) {
      return title;
    }
  }

  return null;
}