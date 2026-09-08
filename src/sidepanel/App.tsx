import { useEffect, useState } from 'react';
import type { GitBookResponse, StudyKitResponse } from '../shared/messages';
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
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

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
              <p className="label">Páginas encontradas</p>
              <span>{pages.length}</span>
            </div>
            <ul>
              {pages.map((page) => (
                <li key={page.id}>
                  <a href={page.url} target="_blank" rel="noreferrer">
                    <strong>{page.title}</strong>
                    <span>{page.path}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isDiscovering && !discoveryError && pages.length === 0 && gitBookUrl && (
          <p className="feedback">Nenhuma página foi encontrada no sitemap.</p>
        )}
      </section>
    </main>
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