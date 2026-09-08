import { useEffect, useMemo, useState } from 'react';
import type {
  GitBookResponse,
  MarkdownDownloadResponse,
  StudyKitResponse,
} from '../shared/messages';
import { buildPageTree, type PageTreeNode } from '../domain/page-tree';
import { createMarkdownFile, type MarkdownFile } from '../domain/markdown-file';
import type { GitBookPage } from '../domain/sitemap-types';
import './app.css';

type ViewState =
  | { status: 'loading' }
  | { status: 'ready'; setId: string }
  | { status: 'unavailable'; message: string };

export function App() {
  const [viewState, setViewState] = useState<ViewState>({ status: 'loading' });
  const [gitBookUrl, setGitBookUrl] = useState('');
  const [pages, setPages] = useState<GitBookPage[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [downloadedFiles, setDownloadedFiles] = useState<Map<string, MarkdownFile>>(new Map());
  const [downloadErrors, setDownloadErrors] = useState<Map<string, string>>(new Map());
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const pageTree = useMemo(() => buildPageTree(pages), [pages]);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_ACTIVE_STUDY_KIT' }, (response: StudyKitResponse) => {
      if (chrome.runtime.lastError) {
        setViewState({ status: 'unavailable', message: 'Não foi possível consultar a aba atual.' });
        return;
      }

      if (response?.ok) {
        setViewState({ status: 'ready', setId: response.context.setId });
        return;
      }

      setViewState({
        status: 'unavailable',
        message:
          response?.reason === 'NO_ACTIVE_TAB'
            ? 'Nenhuma aba ativa foi encontrada.'
            : 'Abra um Study Kit do Thea para continuar.',
      });
    });
  }, []);

  function discoverPages(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsDiscovering(true);
    setDiscoveryError(null);
    setPages([]);
    setSelectedPageIds(new Set());
    setDownloadedFiles(new Map());
    setDownloadErrors(new Map());

    chrome.runtime.sendMessage(
      { type: 'DISCOVER_GITBOOK_PAGES', url: gitBookUrl },
      (response: GitBookResponse) => {
        setIsDiscovering(false);

        if (chrome.runtime.lastError) {
          setDiscoveryError('Não foi possível consultar o sitemap.');
          return;
        }

        if (!response?.ok) {
          setDiscoveryError(getDiscoveryErrorMessage(response?.reason));
          return;
        }

        setPages(response.pages);
      },
    );
  }

  function togglePage(pageId: string) {
    setSelectedPageIds((current) => {
      const next = new Set(current);

      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }

      return next;
    });
  }

  function selectAllPages() {
    setSelectedPageIds(new Set(pages.map((page) => page.id)));
  }

  function clearSelection() {
    setSelectedPageIds(new Set());
  }

  function downloadSelectedPages() {
    const selectedPages = pages.filter((page) => selectedPageIds.has(page.id));

    if (selectedPages.length === 0) {
      return;
    }

    setIsDownloading(true);
    setDownloadedFiles(new Map());
    setDownloadErrors(new Map());

    chrome.runtime.sendMessage(
      { type: 'DOWNLOAD_MARKDOWN_PAGES', pages: selectedPages },
      (response: MarkdownDownloadResponse) => {
        setIsDownloading(false);

        if (chrome.runtime.lastError) {
          setDownloadErrors(
            new Map(selectedPages.map((page) => [page.id, 'Não foi possível baixar o Markdown.'])),
          );
          return;
        }

        if (!response?.ok) {
          setDownloadErrors(new Map(selectedPages.map((page) => [page.id, response?.reason ?? 'Falha no download.'])));
          return;
        }

        const pagesById = new Map(pages.map((page) => [page.id, page]));
        const files = new Map<string, MarkdownFile>();
        const errors = new Map<string, string>();

        for (const result of response.results) {
          const page = pagesById.get(result.pageId);

          if (!page) {
            continue;
          }

          if (result.ok) {
            files.set(page.id, createMarkdownFile(page, result.content));
          } else {
            errors.set(page.id, getDownloadErrorMessage(result.reason));
          }
        }

        setDownloadedFiles(files);
        setDownloadErrors(errors);
      },
    );
  }

  return (
    <main className="panel">
      <header className="header">
        <p className="eyebrow">TheaBridge</p>
        <h1>Importação de conteúdo</h1>
      </header>

      <section className="context" aria-live="polite">
        <p className="label">Study Kit atual</p>
        {viewState.status === 'loading' && <p>Verificando a aba atual...</p>}
        {viewState.status === 'ready' && <p className="set-id">#{viewState.setId}</p>}
        {viewState.status === 'unavailable' && <p>{viewState.message}</p>}
      </section>

      <section className="gitbook-section">
        <form className="gitbook-form" onSubmit={discoverPages}>
          <label className="label" htmlFor="gitbook-url">
            URL do GitBook
          </label>
          <input
            id="gitbook-url"
            type="url"
            value={gitBookUrl}
            onChange={(event) => setGitBookUrl(event.target.value)}
            placeholder="https://workspace.gitbook.io/space"
            required
          />
          <button type="submit" disabled={isDiscovering}>
            {isDiscovering ? 'Carregando páginas...' : 'Carregar páginas'}
          </button>
        </form>

        {discoveryError && (
          <p className="feedback error" role="alert">
            {discoveryError}
          </p>
        )}

        {pages.length > 0 && (
          <div className="pages" aria-live="polite">
            <div className="pages-heading">
              <div>
                <p className="label">Páginas encontradas</p>
                <p className="selection-count">{selectedPageIds.size} selecionada(s)</p>
              </div>
              <span>{pages.length}</span>
            </div>
            <div className="selection-actions">
              <button type="button" onClick={selectAllPages}>
                Selecionar todas
              </button>
              <button type="button" className="secondary-button" onClick={clearSelection}>
                Limpar seleção
              </button>
            </div>
            <button
              type="button"
              className="download-button"
              disabled={selectedPageIds.size === 0 || isDownloading}
              onClick={downloadSelectedPages}
            >
              {isDownloading ? 'Baixando Markdown...' : 'Baixar selecionadas'}
            </button>
            <PageTree
              nodes={pageTree}
              selectedPageIds={selectedPageIds}
              onTogglePage={togglePage}
            />
            {(downloadedFiles.size > 0 || downloadErrors.size > 0) && (
              <div className="download-results" aria-live="polite">
                <p className="label">Resultado do download</p>
                {pages
                  .filter((page) => downloadedFiles.has(page.id) || downloadErrors.has(page.id))
                  .map((page) => (
                    <p key={page.id} className={downloadErrors.has(page.id) ? 'download-error' : 'download-success'}>
                      {downloadErrors.get(page.id) ?? `${downloadedFiles.get(page.id)?.fileName} pronto em memória`}
                    </p>
                  ))}
              </div>
            )}
          </div>
        )}

        {!isDiscovering && !discoveryError && pages.length === 0 && gitBookUrl && (
          <p className="feedback">Nenhuma página foi encontrada no sitemap.</p>
        )}
      </section>
    </main>
  );
}

type PageTreeProps = {
  nodes: PageTreeNode[];
  selectedPageIds: Set<string>;
  onTogglePage: (pageId: string) => void;
};

function PageTree({ nodes, selectedPageIds, onTogglePage }: PageTreeProps) {
  return (
    <ul className="page-tree">
      {nodes.map((node) => (
        <li key={node.path}>
          {node.page ? (
            <label className="page-row">
              <input
                type="checkbox"
                checked={selectedPageIds.has(node.page.id)}
                onChange={() => onTogglePage(node.page!.id)}
              />
              <span className="page-details">
                <strong>{node.page.title}</strong>
                <span>{node.page.path}</span>
              </span>
            </label>
          ) : (
            <p className="tree-folder">{node.name}</p>
          )}
          {node.children.length > 0 && (
            <PageTree
              nodes={node.children}
              selectedPageIds={selectedPageIds}
              onTogglePage={onTogglePage}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function getDiscoveryErrorMessage(reason?: string): string {
  if (reason === 'INVALID_GITBOOK_URL') {
    return 'Informe uma URL HTTPS de um espaço GitBook válido.';
  }

  if (reason?.startsWith('SITEMAP_REQUEST_FAILED:')) {
    return 'Não foi possível acessar o sitemap desse GitBook.';
  }

  return 'Não foi possível carregar as páginas do GitBook.';
}

function getDownloadErrorMessage(reason: string): string {
  if (reason.startsWith('MARKDOWN_REQUEST_FAILED:')) {
    return 'A página não pôde ser baixada.';
  }

  if (reason === 'INVALID_MARKDOWN_CONTENT') {
    return 'A resposta da página não contém Markdown válido.';
  }

  return 'Falha ao baixar esta página.';
}