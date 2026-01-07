import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Dashboard, type DocumentCard } from './components/Dashboard';
import { SheetEditor } from './components/SheetEditor';
import { Spreadsheet, AppView } from './types';
import { createSpreadsheet, fetchSpreadsheet, fetchSpreadsheetProperties, appendRow } from './services/sheetsService';
import { Button } from './components/Button';
import { ShieldAlert, HelpCircle, PlayCircle, HelpCircle as HelpIcon, LogOut, X, User, ChevronDown, Settings } from 'lucide-react';
import { GOOGLE_SCOPES } from './config';
import type { NewDocumentData } from './components/Dashboard';
import { socketService } from './services/socketService';
import { UserActivityTracker } from './components/UserActivityTracker';

const AVAILABLE_SPREADSHEETS = [
  { id: '1HpvaN82xj75IhTg0ZyeGOBWluivCQdQh9OuDL-nnGgI', name: 'Documentos Principales', description: 'Balance Nacional de Energía y documentos centrales' },
  { id: '1B_WUmGxy6cg-DOz_JbxX7W37VQ_vuN97pkka84V5-qg', name: 'Nuevos Documentos', description: 'Espacio para nuevos reportes y análisis' },
  { id: '1yZtmdCe2VvV-RXtmEhbg-nFhbz-x280K1w8bp8u-fh4', name: 'Documentos Adicionales', description: 'Repositorio extra de documentos' }
];

const App: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string | null>(null);
  const [currentSpreadsheet, setCurrentSpreadsheet] = useState<Spreadsheet | null>(null);
  const [spreadsheetMetadata, setSpreadsheetMetadata] = useState<Record<string, string>>(() => {
    // Load cached metadata on init
    const cached = localStorage.getItem('spreadsheet_metadata_cache');
    return cached ? JSON.parse(cached) : {};
  });
  const [dashboardDocuments, setDashboardDocuments] = useState<DocumentCard[]>([]);
  const [initialDocId, setInitialDocId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  const normalize = (s: string) => (s || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const extractDocuments = (spreadsheet: Spreadsheet) => {
    const docsSheet = spreadsheet.sheets.find(s => normalize(s.properties.title) === 'documentos') || spreadsheet.sheets[0];
    const rowData = docsSheet?.data?.[0]?.rowData;
    if (!rowData || rowData.length < 2) return [];

    const headers = rowData[0]?.values?.map(c => c.formattedValue || c.userEnteredValue?.stringValue || '') || [];
    const headerNorm = headers.map(h => normalize(h));

    const idx = (candidates: string[]) => headerNorm.findIndex(h => candidates.includes(h));

    const idIdx = idx(['id', 'documentoid']);
    const titleIdx = idx(['titulo', 'título', 'nombre'].map(normalize));
    const subtitleIdx = idx(['subtitulo', 'subtítulo'].map(normalize));
    const authorIdx = idx(['autor']);
    const dateIdx = idx(['fecha']);
    const instIdx = idx(['institucion', 'institución'].map(normalize));
    const unitIdx = idx(['unidad']);

    return rowData.slice(1)
      .map((row) => {
        const get = (i: number) => {
          if (i < 0) return '';
          return row.values?.[i]?.formattedValue || row.values?.[i]?.userEnteredValue?.stringValue || '';
        };
        const id = get(idIdx);
        if (!id) return null;
        return {
          id,
          title: get(titleIdx),
          subtitle: get(subtitleIdx),
          author: get(authorIdx),
          date: get(dateIdx),
          institution: get(instIdx),
          unit: get(unitIdx),
        } as DocumentCard;
      })
      .filter((x): x is DocumentCard => Boolean(x));
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!isAuthenticated || token === 'DEMO') return;

      const metadata: Record<string, string> = {};
      for (const sheet of AVAILABLE_SPREADSHEETS) {
        try {
          const props = await fetchSpreadsheetProperties(sheet.id, token);
          if (props && props.title) {
            metadata[sheet.id] = props.title;
          }
        } catch (e) {
          console.error(`Failed to fetch metadata for ${sheet.id}`, e);
        }
      }
      setSpreadsheetMetadata(prev => {
        const updated = { ...prev, ...metadata };
        localStorage.setItem('spreadsheet_metadata_cache', JSON.stringify(updated));
        return updated;
      });
    };

    fetchMetadata();
  }, [isAuthenticated, token]);

  useEffect(() => {
    const loadDashboardDocs = async () => {
      if (!isAuthenticated) return;
      if (currentView !== AppView.DASHBOARD) return;
      if (!token) return;
      if (!selectedSpreadsheetId && token !== 'DEMO') return;

      setLoading(true);
      setError(null);
      try {
        const spreadsheetIdToLoad = token === 'DEMO' ? 'demo-latex-gov' : selectedSpreadsheetId!;
        const data = await fetchSpreadsheet(spreadsheetIdToLoad, token);
        let docs = extractDocuments(data).map(d => ({ ...d, sheetId: spreadsheetIdToLoad }));
        setDashboardDocuments(docs);
      } catch (err: any) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardDocs();
  }, [isAuthenticated, currentView, token, selectedSpreadsheetId]);

  // Load token from local storage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('sheet_token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      // Try to connect socket if possible (would need user info, using dummy for reload)
      const savedUser = localStorage.getItem('user_profile');
      let userData = {
        name: 'Usuario (Reconectado)',
        email: 'user@gob.mx'
      };

      if (savedUser) {
        try {
          userData = JSON.parse(savedUser);
          setCurrentUser(userData);
        } catch (e) { console.error(e); }
      } else {
        setCurrentUser(userData);
      }

      socketService.connect(userData);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    let finalToken = token.trim();

    // Feature: Remove wrapping quotes if user copied them accidentally (e.g. "ya29...")
    if ((finalToken.startsWith('"') && finalToken.endsWith('"')) ||
      (finalToken.startsWith("'") && finalToken.endsWith("'"))) {
      finalToken = finalToken.slice(1, -1);
    }

    // Feature: Auto-extract token if user pastes the full JSON response
    if (finalToken.startsWith('{')) {
      try {
        const json = JSON.parse(finalToken);
        if (json.access_token) {
          finalToken = json.access_token;
        }
      } catch (e) {
        console.log("Not a JSON object, treating as raw string");
      }
    }

    if (finalToken.length > 10) {
      localStorage.setItem('sheet_token', finalToken);
      setToken(finalToken); // Update state to cleaned token
      setIsAuthenticated(true);
      setError(null);
    } else {
      setError("Por favor, ingresa un token de acceso válido.");
    }
  };

  const handleDemoLogin = () => {
    setToken('DEMO');
    setIsAuthenticated(true);
    setError(null);
    const demoUser = { name: 'Usuario Demo', email: 'demo@gob.mx' };
    setCurrentUser(demoUser);
    socketService.connect(demoUser);
  }

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const accessToken = tokenResponse.access_token;
      if (accessToken) {
        localStorage.setItem('sheet_token', accessToken);
        setToken(accessToken);
        setIsAuthenticated(true);
        setError(null);

        // Fetch user info for socket
        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const profile = await res.json();
          const userData = {
            name: profile.name || 'Usuario Google',
            email: profile.email || 'google@gob.mx'
          };

          // Save profile for reload persistence
          localStorage.setItem('user_profile', JSON.stringify(userData));
          setCurrentUser(userData);

          socketService.connect(userData);
        } catch (e) {
          const fallbackUser = { name: 'Usuario Google', email: 'google@gob.mx' };
          setCurrentUser(fallbackUser);
          socketService.connect(fallbackUser);
        }
      }
    },
    onError: (errorResponse) => {
      console.error("Google Login Failed:", errorResponse);
      setError("No se pudo iniciar sesión con Google.");
    },
    scope: GOOGLE_SCOPES,
  });

  const handleLogout = () => {
    socketService.disconnect();
    localStorage.removeItem('sheet_token');
    localStorage.removeItem('user_profile');
    setIsAuthenticated(false);
    setToken('');
    setCurrentSpreadsheet(null);
    setSelectedSpreadsheetId(null);
    setCurrentUser(null);
    setCurrentView(AppView.DASHBOARD);
    setError(null);
  };

  const handleError = (err: any) => {
    const msg = err.message || '';
    if (
      msg.includes('401') ||
      msg.includes('UNAUTHENTICATED') ||
      msg.includes('invalid authentication credentials')
    ) {
      // Token expired - Force logout so user can re-enter it
      localStorage.removeItem('sheet_token');
      setToken('');
      setIsAuthenticated(false);
      setError("Token inválido o expirado. Por favor genera uno nuevo en Google OAuth Playground y asegúrate de copiar solo el 'access_token'.");
    } else {
      // Show other errors (403, 404, etc) in the UI
      setError(msg || "Ocurrió un error inesperado al cargar el documento.");
    }
  };

  const loadSpreadsheet = async (id: string, docId?: string) => {
    setLoading(true);
    setError(null);
    setInitialDocId(docId);
    try {
      const data = await fetchSpreadsheet(id, token);
      setCurrentSpreadsheet(data);
      setCurrentView(AppView.EDITOR);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: NewDocumentData) => {
    setLoading(true);
    setError(null);
    try {
      const spreadsheetId = token === 'DEMO' ? 'demo-latex-gov' : selectedSpreadsheetId!;

      // Order must match the sheet columns: 
      // ID, Titulo, Subtitulo, Autor, Fecha, Institucion, Unidad, NombreCorto, PalabrasClave, Version, 
      // Agradecimientos, Presentacion, ResumenEjecutivo, DatosClave, PortadaRuta, ContraportadaRuta
      const rowValues = [
        data.id,
        data.title,
        data.subtitle,
        data.author,
        data.date,
        data.institution,
        data.unit,
        data.shortName,
        data.keywords,
        data.version,
        data.acknowledgments,
        data.presentation,
        data.executiveSummary,
        data.keyData,
        data.coverPath,
        data.backCoverPath
      ];

      await appendRow(spreadsheetId, 'Documentos', rowValues, token);

      // Refresh dashboard to show the new document
      const sheetData = await fetchSpreadsheet(spreadsheetId, token);
      let docs = extractDocuments(sheetData).map(d => ({ ...d, sheetId: spreadsheetId }));
      setDashboardDocuments(docs);

    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Auth Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white max-w-md w-full rounded-lg shadow-xl p-8 border-t-4 border-[#691C32]">
          <div className="text-center mb-6">
            <h2 className="text-[#691C32] font-bold text-lg uppercase tracking-widest mb-1">Gobierno de México</h2>
            <div className="h-px w-24 bg-[#BC955C] mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-800">Acceso Editor LatexT</h1>
            <p className="text-gray-500 mt-2 text-sm">Ingrese su Token de Google Sheets</p>
          </div>

          <div className="mb-6 space-y-4">
            <Button
              type="button"
              onClick={() => googleLogin()}
              className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
              size="lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Iniciar sesión con Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">O método manual</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center justify-center w-full text-sm font-medium text-[#691C32] hover:underline py-2 rounded-lg transition-colors"
            >
              <HelpCircle size={16} className="mr-2" />
              {showHelp ? 'Ocultar Instrucciones' : '¿Cómo obtener un token?'}
            </button>

            {showHelp && (
              <div className="mt-3 bg-gray-50 p-4 rounded text-sm text-gray-600 border border-gray-200">
                <p className="mb-2 font-semibold">Pasos rápidos:</p>
                <ol className="list-decimal pl-4 space-y-2">
                  <li>Ir a <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noreferrer" className="text-[#691C32] underline">Google OAuth Playground</a>.</li>
                  <li>Seleccionar API: <code>Google Sheets API v4</code> &gt; <code>.../auth/spreadsheets</code>.</li>
                  <li>Clic en "Authorize APIs".</li>
                  <li>Clic en "Exchange authorization code for tokens".</li>
                  <li>Copiar <strong>Access Token</strong> (comienza con <code>ya29...</code>).</li>
                </ol>
                <p className="mt-2 text-xs text-gray-400 italic">Nota: La sesión se guardará en este navegador.</p>
              </div>
            )}
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <textarea
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Pegar token aquí (ya29...) o el JSON completo"
                className="w-full h-24 p-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#691C32] outline-none resize-none font-mono"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded text-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              <Button type="submit" className="w-full" size="lg" variant="burgundy">
                Iniciar Sesión
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={handleDemoLogin}>
                <PlayCircle size={16} className="mr-2" /> Probar Demo
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Loading Overlay
  if (loading) {
    return (
      <div className="fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#691C32] mb-4"></div>
          <p className="text-[#691C32] font-medium">Procesando...</p>
        </div>
      </div>
    );
  }

  // Main Layout
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">

      {/* HEADER GOBIERNO */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logos Area */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase tracking-widest">Gobierno de</span>
              <span className="text-xl font-bold text-[#691C32] leading-none">México</span>
            </div>
            <div className="h-8 w-px bg-gray-300 mx-2"></div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-[#BC955C] leading-none">Energía</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Secretaría de Energía</span>
            </div>
          </div>

          {/* App Title */}
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold text-[#691C32] tracking-tight">Editor LatexT</h1>
          </div>

          {/* Help/Actions */}
          <div className="flex items-center gap-4 relative">
            {isAuthenticated && currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#691C32]/20"
                >
                  <div className="flex flex-col items-end hidden md:flex">
                    <span className="text-sm font-bold text-gray-700 leading-tight">{currentUser.name}</span>
                    <span className="text-[10px] text-gray-500">{currentUser.email}</span>
                  </div>
                  <div className="w-8 h-8 bg-[#691C32] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-3 border-b border-gray-100 md:hidden">
                      <p className="text-sm font-bold text-gray-900">{currentUser.name}</p>
                      <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                    </div>

                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <User size={16} /> Perfil
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <Settings size={16} /> Configuración
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut size={16} /> Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-700 hover:bg-red-50">
                <LogOut size={16} className="mr-2" /> Salir
              </Button>
            )}
          </div>
        </div>
        {/* Gold Bar */}
        <div className="h-1 bg-gob-gold w-full"></div>
      </header>

      {/* Error Banner for Main Layout */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm flex items-start justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex gap-3">
              <ShieldAlert className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-bold">Error de Conexión</p>
                <p>{error}</p>
              </div>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main>
        {/* Workbook Selection Screen */}
        {isAuthenticated && !selectedSpreadsheetId && token !== 'DEMO' && (
          <div className="max-w-5xl mx-auto p-8 animate-in fade-in duration-500">
            <div className="text-center mb-10 mt-8">
              <h2 className="text-3xl font-bold text-gob-guinda">Seleccionar Libro de Trabajo</h2>
              <p className="text-gray-600 mt-3 text-lg">Elige el repositorio de documentos donde deseas trabajar</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
              {AVAILABLE_SPREADSHEETS.map(sheet => (
                <button
                  key={sheet.id}
                  onClick={() => setSelectedSpreadsheetId(sheet.id)}
                  className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-xl hover:border-gob-guinda/30 hover:-translate-y-1 transition-all text-left group flex flex-col items-center text-center h-full"
                >
                  <div className="w-16 h-16 bg-gob-guinda/5 rounded-full flex items-center justify-center text-gob-guinda mb-6 group-hover:bg-gob-guinda group-hover:text-white transition-colors duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
                  </div>
                  <h3 className="font-bold text-xl text-gray-900 group-hover:text-gob-guinda mb-2">
                    {spreadsheetMetadata[sheet.id] || sheet.name}
                  </h3>
                  <p className="text-gray-500 mb-6 flex-1">{sheet.description}</p>
                  <div className="w-full pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded inline-block max-w-full truncate">
                      ID: {sheet.id.substring(0, 8)}...
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dashboard View */}
        {isAuthenticated && (selectedSpreadsheetId || token === 'DEMO') && currentView === AppView.DASHBOARD && (
          <>
            <UserActivityTracker />
            <div className="bg-gray-50 border-b border-gray-200 px-4 md:px-8 py-2 flex items-center justify-between">
              <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
                <span className="uppercase tracking-wider">Libro Actual:</span>
                <span className="text-gob-guinda font-bold">
                  {spreadsheetMetadata[selectedSpreadsheetId!] || AVAILABLE_SPREADSHEETS.find(s => s.id === selectedSpreadsheetId)?.name || (token === 'DEMO' ? 'Modo Demostración' : 'Desconocido')}
                </span>
              </div>
              {token !== 'DEMO' && (
                <button onClick={() => setSelectedSpreadsheetId(null)} className="text-xs text-gray-500 hover:text-gob-guinda flex items-center gap-1 transition-colors">
                  <Settings size={12} /> Cambiar Libro
                </button>
              )}
            </div>
            <Dashboard
              onCreate={handleCreate}
              onOpen={loadSpreadsheet}
              onLogout={handleLogout}
              documents={dashboardDocuments}
            />
          </>
        )}

        {/* Editor View */}
        {currentView === AppView.EDITOR && currentSpreadsheet && (
          <SheetEditor
            spreadsheet={currentSpreadsheet}
            token={token}
            initialDocId={initialDocId}
            onRefresh={() => loadSpreadsheet(currentSpreadsheet.spreadsheetId)}
            onBack={() => {
              setInitialDocId(undefined);
              setCurrentView(AppView.DASHBOARD);
            }}
          />
        )}
      </main>
    </div>
  );
};

export default App;
