const THEA_ORIGIN = 'https://www.thea.study';

export type StudyKitContext = {
  setId: string;
  url: string;
};

export function parseStudyKitUrl(value: string): StudyKitContext | null {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.origin !== THEA_ORIGIN) {
    return null;
  }

  const segments = url.pathname.split('/').filter(Boolean);

  if (segments.length !== 2 || segments[0] !== 'smartStudy' || !segments[1]) {
    return null;
  }

  return {
    setId: segments[1],
    url: url.toString(),
  };
}