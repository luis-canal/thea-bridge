const MARKDOWN_QUERY = {
  displayAgentInstructions: 'false',
  markdownSource: 'page-action',
};

export function buildMarkdownUrl(pageUrl: string): string {
  const url = new URL(pageUrl);
  url.pathname = `${url.pathname.replace(/\/+$/, '')}.md`;
  url.search = new URLSearchParams(MARKDOWN_QUERY).toString();
  url.hash = '';
  return url.toString();
}