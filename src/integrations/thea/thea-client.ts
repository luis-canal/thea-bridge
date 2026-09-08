import type { MarkdownFile } from '../../domain/markdown-file';

const THEA_FILES_URL = 'https://www.thea.study/files';
const THEA_SETS_URL = 'https://www.thea.study/sets';

type UploadResponse = {
  id?: unknown;
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
    });

    await assertTheaResponse(response, 'FILE_UPLOAD_FAILED');
    const payload = await parseJson<UploadResponse>(response, 'INCOMPATIBLE_FILE_RESPONSE');

    if (typeof payload.id !== 'string' || payload.id.length === 0) {
      throw new Error('INCOMPATIBLE_FILE_RESPONSE');
    }

    return payload.id;
  }

  private async attachFileToSet(fileId: string, setId: string): Promise<void> {
    const response = await fetch(`${THEA_SETS_URL}/${encodeURIComponent(setId)}/materials`, {
      method: 'POST',
      body: JSON.stringify({ fileIds: [fileId], setIds: [] }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    await assertTheaResponse(response, 'MATERIAL_ATTACH_FAILED');
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