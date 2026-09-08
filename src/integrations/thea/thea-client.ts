import type { MarkdownFile } from '../../domain/markdown-file';

const THEA_FILES_URL = 'https://www.thea.study/files';
const THEA_SETS_URL = 'https://www.thea.study/sets';
const THEA_ORIGIN = 'https://www.thea.study';

type UploadResponse = {
  id?: unknown;
  processed?: unknown;
  error?: unknown;
};

export class TheaClient {
  async importFile(file: MarkdownFile, setId: string): Promise<{ fileId: string }> {
    const fileId = await this.uploadFile(file);
    await this.attachFileToSet(fileId, setId);
    return { fileId };
  }

  private async uploadFile(file: MarkdownFile): Promise<string> {
    const formData = new FormData();
    formData.append('file', file.blob, file.fileName);
    formData.append('name', file.fileName);
    formData.append('type', 'txt');

    const response = await fetch(THEA_FILES_URL, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: await getTheaRequestHeaders(),
    });

    await assertTheaResponse(response, 'FILE_UPLOAD_FAILED');
    const payload = await parseJson<UploadResponse>(response, 'INCOMPATIBLE_FILE_RESPONSE');

    if (typeof payload.id !== 'string' || payload.id.length === 0) {
      throw new Error('INCOMPATIBLE_FILE_RESPONSE');
    }

    if (payload.processed === false) {
      throw new Error('FILE_NOT_PROCESSED');
    }

    if (payload.error) {
      throw new Error('FILE_PROCESSING_FAILED');
    }

    return payload.id;
  }

  private async attachFileToSet(fileId: string, setId: string): Promise<void> {
    const response = await fetch(`${THEA_SETS_URL}/${encodeURIComponent(setId)}/materials`, {
      method: 'POST',
      body: JSON.stringify({ fileIds: [fileId], setIds: [] }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(await getTheaRequestHeaders()) },
    });

    await assertTheaResponse(response, 'MATERIAL_ATTACH_FAILED');
    await validateMaterialResponse(response);
  }
}

type TheaCookie = {
  name: string;
  value: string;
};

async function getTheaRequestHeaders(): Promise<Record<string, string>> {
  if (typeof chrome === 'undefined' || !chrome.cookies?.getAll) {
    return {};
  }

  const cookies = await new Promise<TheaCookie[]>((resolve) => {
    chrome.cookies.getAll({ url: THEA_ORIGIN }, (items) => resolve(items));
  });
  const csrfCookie = cookies.find(({ name }) =>
    ['XSRF-TOKEN', 'csrf-token', 'csrf_token'].includes(name),
  );

  if (!csrfCookie) {
    return {};
  }

  return buildCsrfHeaders(csrfCookie);
}

export function buildCsrfHeaders(cookie?: TheaCookie): Record<string, string> {
  if (!cookie) {
    return {};
  }

  return { 'X-XSRF-TOKEN': decodeCookieValue(cookie.value) };
}

function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function assertTheaResponse(response: Response, fallback: string): Promise<void> {
  if (response.ok) {
    return;
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('THEA_SESSION_EXPIRED');
  }

  throw new Error(`${fallback}:${response.status}`);
}

async function parseJson<T>(response: Response, errorCode: string): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(errorCode);
  }
}

async function validateMaterialResponse(response: Response): Promise<void> {
  if (response.status === 204) {
    return;
  }

  const body = await response.text();

  if (!body) {
    return;
  }

  try {
    const payload = JSON.parse(body) as { error?: unknown };

    if (payload.error) {
      throw new Error('MATERIAL_ATTACH_REJECTED');
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'MATERIAL_ATTACH_REJECTED') {
      throw error;
    }
  }
}