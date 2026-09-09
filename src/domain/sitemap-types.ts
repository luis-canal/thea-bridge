export type GitBookPage = {
  id: string;
  title: string;
  titleSource: 'gitbook' | 'path-fallback';
  url: string;
  path: string;
};