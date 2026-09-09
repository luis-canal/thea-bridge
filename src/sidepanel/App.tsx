import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  GitBookResponse,
  ImportJobResponse,
  ImportProgressMessage,
  StudyKitResponse,
} from '../shared/messages';
import type { ImportJobState, ImportPageState } from '../domain/import-job';
import { buildPageTree, type PageTreeNode } from '../domain/page-tree';
import type { GitBookPage } from '../domain/sitemap-types';
import { getSelectionState } from '../domain/selection-state';
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
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [importJob, setImportJob] = useState<ImportJobState | null>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
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
    setImportJob(null);
    setIsSuccessOpen(false);

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

  const selectionState = getSelectionState(pages.length, selectedPageIds.size);

  function toggleAllPages() {
    if (selectionState === 'all') {
      clearSelection();
      return;
    }

    selectAllPages();
  }

  const selectedCount = selectedPageIds.size;
  const importedCount = importJob?.pages.filter(({ status }) => status === 'imported').length ?? 0;
  const importCompleted =
    importJob?.status === 'completed' && importedCount === importJob.pages.length && importJob.pages.length > 0;


  function startImport() {
    if (viewState.status !== 'ready' || selectedPageIds.size === 0) {
      return;
    }

    const selectedPages = pages.filter((page) => selectedPageIds.has(page.id));
    const jobId = crypto.randomUUID();

    setImportJob(null);

    chrome.runtime.sendMessage(
      { type: 'START_IMPORT', jobId, setId: viewState.setId, pages: selectedPages },
      (response: ImportJobResponse) => {
        if (chrome.runtime.lastError) {
          setImportJob(null);
          return;
        }

        if (!response?.ok) {
          return;
        }

        setImportJob(response.state);
      },
    );
  }

  function cancelImport() {
    if (!importJob || importJob.status !== 'running') {
      return;
    }

    chrome.runtime.sendMessage({ type: 'CANCEL_IMPORT', jobId: importJob.jobId });
  }

  function retryPage(pageId: string) {
    if (!importJob || importJob.status === 'running') {
      return;
    }

    chrome.runtime.sendMessage(
      { type: 'RETRY_IMPORT_PAGE', jobId: importJob.jobId, pageId },
      (response: ImportJobResponse) => {
        if (!chrome.runtime.lastError && response?.ok) {
          setImportJob(response.state);
        }
      },
    );
  }

  useEffect(() => {
    const handleImportProgress = (message: ImportProgressMessage) => {
      if (message.type === 'IMPORT_PROGRESS' && importJob?.jobId === message.state.jobId) {
        setImportJob(message.state);
      }
    };

    chrome.runtime.onMessage.addListener(handleImportProgress);
    return () => chrome.runtime.onMessage.removeListener(handleImportProgress);
  }, [importJob?.jobId]);

  useEffect(() => {
    if (importCompleted) {
      setIsSuccessOpen(true);
    }
  }, [importCompleted]);

  return (
    <main className="panel">
      <header className="header">
        <p className="eyebrow">TheaBridge</p>
        <h1>Importar do GitBook</h1>
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

        {!isDiscovering && !discoveryError && pages.length === 0 && !gitBookUrl && (
          <div className="empty-state">
            <p className="empty-state-title">Importar conteúdo do GitBook para seu Study Kit.</p>
            <div className="tip">
              <span className="tip-mark" aria-hidden="true">i</span>
              <p>
                Abra um GitBook e copie a URL da página inicial do conteúdo.
              </p>
            </div>
          </div>
        )}

        {discoveryError && (
          <p className="feedback error" role="alert">
            {discoveryError}
          </p>
        )}

        {pages.length > 0 && (
          <div className="pages" aria-live="polite">
            <div className="pages-heading">
              <p className="page-state">
                <strong>{pages.length}</strong> páginas encontradas
                <span aria-hidden="true"> · </span>
                <strong>{selectedPageIds.size}</strong> selecionadas
              </p>
            </div>
            <SelectAllCheckbox
              state={selectionState}
              onChange={toggleAllPages}
              count={pages.length}
            />
            <button
              type="button"
              className="import-button"
              disabled={
                selectedCount === 0 ||
                importJob?.status === 'running' ||
                viewState.status !== 'ready'
              }
              onClick={startImport}
            >
              {importJob?.status === 'running'
                ? `Importando ${importedCount} de ${importJob.pages.length}...`
                  : getImportButtonLabel(selectedCount)}
            </button>
            {importJob?.status === 'running' && (
              <button type="button" className="cancel-button" onClick={cancelImport}>
                Cancelar importação
              </button>
            )}
            {importJob && <ImportProgress state={importJob} onRetry={retryPage} />}
            <PageTree
              nodes={pageTree}
              selectedPageIds={selectedPageIds}
              onTogglePage={togglePage}
            />
          </div>
        )}

        {!isDiscovering && !discoveryError && pages.length === 0 && gitBookUrl && (
          <p className="empty-state-message">Nenhuma página encontrada.</p>
        )}
      </section>

      {isSuccessOpen && importCompleted && (
        <div className="success-modal-backdrop" role="presentation">
          <section
            className="success-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-modal-title"
          >
            <p className="success-mark" aria-hidden="true">✓</p>
            <h2 id="success-modal-title">Importação concluída</h2>
            <p>O conteúdo foi adicionado ao seu Study Kit.</p>
            <button type="button" onClick={() => setIsSuccessOpen(false)} autoFocus>
              OK
            </button>
          </section>
        </div>
      )}
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
            <PageCard
              page={node.page}
              selected={selectedPageIds.has(node.page.id)}
              onToggle={() => onTogglePage(node.page!.id)}
            />
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

function SelectAllCheckbox({
  state,
  onChange,
  count,
}: {
  state: 'none' | 'partial' | 'all';
  onChange: () => void;
  count: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = state === 'partial';
    }
  }, [state]);

  return (
    <label className="select-all">
      <input
        ref={inputRef}
        type="checkbox"
        checked={state === 'all'}
        onChange={onChange}
        aria-label="Selecionar todo o conteúdo"
      />
      <span
        className={`checkbox-mark${state === 'all' ? ' checkbox-mark-checked' : ''}${
          state === 'partial' ? ' checkbox-mark-partial' : ''
        }`}
        aria-hidden="true"
      />
      <span>Selecionar todo o conteúdo</span>
      <small>{count} páginas</small>
    </label>
  );
}

function PageCard({
  page,
  selected,
  onToggle,
}: {
  page: GitBookPage;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <label className={`page-card${selected ? ' page-card-selected' : ''}`}>
      <input type="checkbox" checked={selected} onChange={onToggle} />
      <span className="checkbox-mark" aria-hidden="true" />
      <span className="page-details">
        <strong>{page.title}</strong>
        <span>{page.path}</span>
      </span>
    </label>
  );
}

function ImportProgress({ state, onRetry }: { state: ImportJobState; onRetry: (pageId: string) => void }) {
  const completed = state.pages.filter(({ status }) => status === 'imported').length;

  return (
    <div className="import-progress" aria-live="polite">
      <div className="progress-heading">
        <p className="label">Progresso da importação</p>
        <span>{completed}/{state.pages.length}</span>
      </div>
      <ul>
        {state.pages.map((pageState) => (
          <ImportProgressRow key={pageState.page.id} pageState={pageState} onRetry={onRetry} />
        ))}
      </ul>
    </div>
  );
}

function ImportProgressRow({ pageState, onRetry }: { pageState: ImportPageState; onRetry: (pageId: string) => void }) {
  const status = getImportStatusLabel(pageState);

  return (
    <li className={pageState.status === 'failed' ? 'progress-failed' : undefined}>
      <div>
        <strong>{pageState.page.title}</strong>
        <span>{status}</span>
        {pageState.fileId && <small>fileId: {pageState.fileId}</small>}
      </div>
      {pageState.status === 'failed' && (
        <button type="button" className="retry-button" onClick={() => onRetry(pageState.page.id)}>
          Tentar novamente
        </button>
      )}
    </li>
  );
}

function getImportStatusLabel(pageState: ImportPageState): string {
  if (pageState.status === 'pending') return 'Aguardando';
  if (pageState.status === 'processing') return `Processando: ${pageState.stage}`;
  if (pageState.status === 'imported') return 'Importada';
  if (pageState.status === 'cancelled') return 'Cancelada';
  return `Falhou: ${getImportErrorMessage(pageState.error ?? 'IMPORT_FAILED')}`;
}

function getImportButtonLabel(selectedCount: number): string {
  if (selectedCount === 0) {
    return 'Importar selecionadas';
  }

  return `Importar ${selectedCount} ${selectedCount === 1 ? 'página' : 'páginas'}`;
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

function getImportErrorMessage(reason: string): string {
  if (reason === 'THEA_SESSION_EXPIRED') {
    return 'A sessão do Thea expirou. Abra o Thea e entre novamente.';
  }

  if (reason === 'INCOMPATIBLE_FILE_RESPONSE') {
    return 'O Thea retornou uma resposta de upload incompatível.';
  }

  if (reason === 'FILE_NOT_PROCESSED') {
    return 'O Thea ainda está processando o arquivo. Tente importar novamente em alguns segundos.';
  }

  if (reason === 'FILE_PROCESSING_FAILED') {
    return 'O Thea não conseguiu processar o arquivo enviado.';
  }

  if (reason.startsWith('FILE_UPLOAD_FAILED:')) {
    return `O arquivo não pôde ser enviado ao Thea (${getHttpStatus(reason)}).`;
  }

  if (reason.startsWith('MATERIAL_ATTACH_FAILED:')) {
    return `O arquivo foi enviado, mas não pôde ser associado ao Study Kit (${getHttpStatus(reason)}).`;
  }

  if (reason === 'MATERIAL_ATTACH_REJECTED') {
    return 'O Thea rejeitou a associação do arquivo ao Study Kit.';
  }

  return 'Não foi possível importar a página.';
}

function getHttpStatus(reason: string): string {
  return reason.split(':').at(-1) ?? 'status desconhecido';
}
