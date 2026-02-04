import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Dashboard, type DocumentCard } from './components/Dashboard';
import { SheetEditor } from './components/SheetEditor';
import { WorkbookDashboard } from './components/WorkbookDashboard';
import { Spreadsheet, AppView } from './types';
import { createSpreadsheet, fetchSpreadsheet, fetchSpreadsheetProperties, appendRow, fetchCollaborators, fetchLastModifiedTime, copySpreadsheet, deleteFile, type Collaborator } from './services/sheetsService';
import { Button } from './components/Button';
import { Modal } from './components/Modal';
import { ShieldAlert, PlayCircle, LogOut, X, User, ChevronDown, Settings, Trash2 } from 'lucide-react';
import { GOOGLE_SCOPES, TEMPLATE_SPREADSHEET_ID } from './config';
import type { NewDocumentData } from './components/Dashboard';
import { socketService } from './services/socketService';
import { UserActivityTracker } from './components/UserActivityTracker';
import { authorizedUsers } from './auth';
import { setSession, getSession, clearSession, saveUserProfile, getUserProfile } from './utils/authUtils';

const AVAILABLE_SPREADSHEETS = [
  { id: '1HpvaN82xj75IhTg0ZyeGOBWluivCQdQh9OuDL-nnGgI', name: 'Documentos Principales', description: 'Balance Nacional de Energía y documentos centrales' },
  { id: '1B_WUmGxy6cg-DOz_JbxX7W37VQ_vuN97pkka84V5-qg', name: 'Nuevos Documentos', description: 'Espacio para nuevos reportes y análisis' },
  { id: '1yZtmdCe2VvV-RXtmEhbg-nFhbz-x280K1w8bp8u-fh4', name: 'Documentos Adicionales', description: 'Repositorio extra de documentos' },
  { id: '1lDm596Zmvdlqf-KGq0Iooa1Y5N2UjHhTb-Wr9IV06iY', name: 'Recuperando nombre...', description: 'El nombre del documento se actualizará automáticamente una vez conectado.' }
];

const App: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string | null>(null);
  const [currentSpreadsheet, setCurrentSpreadsheet] = useState<Spreadsheet | null>(null);
  const [spreadsheetMetadata, setSpreadsheetMetadata] = useState<Record<string, string>>(() => {
    // Load cached metadata on init
    const cached = localStorage.getItem('spreadsheet_metadata_cache');
    return cached ? JSON.parse(cached) : {};
  });
  const [collaboratorsMap, setCollaboratorsMap] = useState<Record<string, Collaborator[]>>({});
  const [lastModifiedMap, setLastModifiedMap] = useState<Record<string, string>>({});
  const [dashboardDocuments, setDashboardDocuments] = useState<DocumentCard[]>([]);
  const [customSpreadsheets, setCustomSpreadsheets] = useState<{ id: string, name: string, description: string }[]>(() => {
    const saved = localStorage.getItem('custom_spreadsheets');
    return saved ? JSON.parse(saved) : [];
  });
  const [initialDocId, setInitialDocId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; photo?: string } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('Nuevo Documento');

  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string } | null>(null);


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

  const formatRelativeTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-MX');
  };

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
      const collabs: Record<string, Collaborator[]> = {};
      const modified: Record<string, string> = {};

      for (const sheet of AVAILABLE_SPREADSHEETS) {
        try {
          // Fetch Metadata
          const props = await fetchSpreadsheetProperties(sheet.id, token);
          if (props && props.title) {
            metadata[sheet.id] = props.title;
          }

          // Fetch Collaborators
          const users = await fetchCollaborators(sheet.id, token);
          collabs[sheet.id] = users;

          // Fetch Last Modified
          const modTime = await fetchLastModifiedTime(sheet.id, token);
          modified[sheet.id] = modTime;

        } catch (e) {
          console.error(`Failed to fetch metadata/collabs for ${sheet.id}`, e);
        }
      }

      setSpreadsheetMetadata(prev => {
        const updated = { ...prev, ...metadata };
        localStorage.setItem('spreadsheet_metadata_cache', JSON.stringify(updated));
        return updated;
      });
      setCollaboratorsMap(prev => ({ ...prev, ...collabs }));
      setLastModifiedMap(prev => ({ ...prev, ...modified }));
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
    const savedToken = getSession();
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      
      const savedUser = getUserProfile();
      const userData = savedUser || {
        name: 'Usuario (Reconectado)',
        email: 'user@gob.mx'
      };

      if (!savedUser) {
        // Fallback if no user profile but valid token (shouldn't happen often)
        setCurrentUser(userData);
      } else {
        setCurrentUser(savedUser);
      }

      socketService.connect(userData);
    } else {
      // If no valid session, ensure clean state
      setIsAuthenticated(false);
      setToken('');
    }
  }, []);

  const handleEmailPasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authorizedUsers.includes(email.toLowerCase())) {
      // NOTE: This is a placeholder auth system.
      // In a real scenario, you would call a backend endpoint to verify credentials
      // and get a JWT or session token. For now, we'll grant access like a demo user.
      const demoToken = 'DEMO';
      setSession(demoToken, 86400); // 24 hours for demo/test users
      setToken(demoToken); 
      setIsAuthenticated(true);
      setError(null);
      const registeredUser = { name: email.split('@')[0], email: email };
      saveUserProfile(registeredUser);
      setCurrentUser(registeredUser);
      socketService.connect(registeredUser);
    } else {
      setError("El correo electrónico no está registrado o la contraseña es incorrecta.");
    }
  };


  const handleDemoLogin = () => {
    const demoToken = 'DEMO';
    setSession(demoToken, 3600);
    setToken(demoToken);
    setIsAuthenticated(true);
    setError(null);
    const demoUser = { name: 'Usuario Demo', email: 'demo@gob.mx' };
    saveUserProfile(demoUser);
    setCurrentUser(demoUser);
    socketService.connect(demoUser);
  }

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const accessToken = tokenResponse.access_token;
      if (accessToken) {
        setSession(accessToken, tokenResponse.expires_in);
        setToken(accessToken);
        setIsAuthenticated(true);
        setError(null);

        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const profile = await res.json();
          const userData = {
            name: profile.name || 'Usuario Google',
            email: profile.email || 'google@gob.mx',
            photo: profile.picture
          };

          saveUserProfile(userData);
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
    clearSession();
    setIsAuthenticated(false);
    setToken('');
    setEmail('');
    setPassword('');
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
      handleLogout();
      setError("La sesión ha expirado o es inválida. Por favor, inicie sesión de nuevo.");
    } else {
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
      const rowValues = [
        data.id, data.title, data.subtitle, data.author, data.date, data.institution,
        data.unit, data.shortName, data.keywords, data.version, data.acknowledgments,
        data.presentation, data.executiveSummary, data.keyData, data.coverPath, data.backCoverPath
      ];

      await appendRow(spreadsheetId, 'Documentos', rowValues, token);

      const sheetData = await fetchSpreadsheet(spreadsheetId, token);
      let docs = extractDocuments(sheetData).map(d => ({ ...d, sheetId: spreadsheetId }));
      setDashboardDocuments(docs);

    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromTemplate = () => {
    if (!isAuthenticated || token === '') return;
    setNewDocName('Nuevo Documento');
    setCreateModalOpen(true);
  };

  const confirmCreateDocument = async () => {
    if (!newDocName.trim()) return;

    setCreateModalOpen(false);
    setLoading(true);
    try {
      const newSheet = await copySpreadsheet(TEMPLATE_SPREADSHEET_ID, newDocName, token);

      const newCustomSheet = {
        id: newSheet.spreadsheetId,
        name: newDocName,
        description: 'Documento creado desde Plantilla Web LaTeX'
      };

      const updatedCustom = [...customSpreadsheets, newCustomSheet];
      setCustomSpreadsheets(updatedCustom);
      localStorage.setItem('custom_spreadsheets', JSON.stringify(updatedCustom));

      // Select it immediately
      setSelectedSpreadsheetId(newSheet.spreadsheetId);

    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSpreadsheet = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setItemToDelete({ id, name });
    setDeleteModalOpen(true);
  };

  const confirmDeleteDocument = async () => {
    if (!itemToDelete) return;
    setDeleteModalOpen(false);

    setLoading(true);
    try {
      await deleteFile(itemToDelete.id, token);

      const updatedCustom = customSpreadsheets.filter(s => s.id !== itemToDelete.id);
      setCustomSpreadsheets(updatedCustom);
      localStorage.setItem('custom_spreadsheets', JSON.stringify(updatedCustom));

    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
      setItemToDelete(null);
    }
  };

  const filteredSpreadsheets = [...AVAILABLE_SPREADSHEETS, ...customSpreadsheets].filter(sheet => {
    const metadata = spreadsheetMetadata[sheet.id] || sheet.name;
    const description = sheet.description;
    const query = searchQuery.toLowerCase();
    return metadata.toLowerCase().includes(query) || description.toLowerCase().includes(query);
  });

  if (!isAuthenticated) {
    return (
      <div className="bg-gray-50 flex flex-col items-center justify-center p-4 transition-colors duration-300 min-h-screen font-sans">
        <main className="w-full max-w-[400px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200/50">
          <div className="h-1.5 w-full bg-[#6A1B31]"></div>
          <div className="px-8 pt-10 pb-12 flex flex-col items-center">
            <div className="text-center mb-8">
              <span className="block text-[10px] tracking-[0.2em] font-bold text-[#6A1B31] mb-1 uppercase">Gobierno de México</span>
              <div className="w-12 h-0.5 bg-[#6A1B31]/20 mx-auto mb-4"></div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Editor LatexT</h1>
              <p className="text-sm text-gray-500">Inicie sesión para acceder a su cuenta</p>
            </div>

            <Button
              onClick={() => googleLogin()}
              className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 py-3.5 px-4 rounded-xl shadow-sm active:scale-[0.98] transition-all hover:bg-gray-50"
            >
              <span className="text-sm font-semibold text-gray-700">Iniciar sesión con Google</span>
            </Button>

            <div className="w-full flex items-center my-8">
              <div className="flex-grow h-px bg-gray-200"></div>
              <span className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">O usuario registrado</span>
              <div className="flex-grow h-px bg-gray-200"></div>
            </div>

            <form onSubmit={handleEmailPasswordLogin} className="w-full space-y-4">
              <div className="space-y-3">
                <div className="relative group">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Correo Electrónico</label>
                  <input
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-[#6A1B31]/20 focus:border-[#6A1B31] outline-none transition-all"
                    placeholder="ejemplo@correo.gob.mx"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="relative group">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Contraseña</label>
                  <input
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-[#6A1B31]/20 focus:border-[#6A1B31] outline-none transition-all"
                    placeholder="••••••••"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                  <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end">
                <a className="text-xs font-medium text-[#6A1B31] hover:underline decoration-[#6A1B31]/30" href="#">
                  ¿Olvidé mi contraseña?
                </a>
              </div>
              <Button
                type="submit"
                className="w-full bg-[#6A1B31] text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-[#6A1B31]/20 active:scale-[0.98] transition-all hover:opacity-95"
              >
                Iniciar Sesión
              </Button>
            </form>

            <div className="w-full mt-6">
              <Button
                onClick={handleDemoLogin}
                className="w-full bg-[#6A1B31] text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-[#6A1B31]/20 active:scale-[0.98] transition-all hover:opacity-95"
              >
                <PlayCircle size={16} />
                Probar Demo
              </Button>
            </div>
          </div>
        </main>
        <footer className="mt-8 text-center px-6">
          <p className="text-xs text-gray-400 leading-relaxed">
            Este es un sistema institucional.<br />
            Subsecretaría de Planeación y Transición Energética<br />
            © 2024 Gobierno de México · Dirección General de Tecnologías
          </p>
        </footer>
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
      {!(isAuthenticated && !selectedSpreadsheetId && token !== 'DEMO') && (
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
      )}

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
          <WorkbookDashboard
            user={currentUser}
            documents={filteredSpreadsheets.map(sheet => ({
              id: sheet.id,
              name: spreadsheetMetadata[sheet.id] || sheet.name,
              description: sheet.description,
              updatedAt: lastModifiedMap[sheet.id] ? formatRelativeTime(lastModifiedMap[sheet.id]) : 'Cargando...',
              collaborators: collaboratorsMap[sheet.id] || [],
              isCustom: customSpreadsheets.some(cs => cs.id === sheet.id),
              status: 'Activo' // Placeholder, logic handled inside component for now
            }))}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpen={setSelectedSpreadsheetId}
            onCreate={handleCreateFromTemplate}
            onDelete={(id, name) => {
              setItemToDelete({ id, name });
              setDeleteModalOpen(true);
            }}
            onLogout={handleLogout}
          />
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

      {/* CREATE MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Crear Nuevo Documento"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>Cancelar</Button>
            <Button onClick={confirmCreateDocument} className="bg-[#6A1B31] text-white hover:bg-[#521324]">
              Crear Documento
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Se creará una copia de la <strong>Plantilla Web LaTeX</strong> en su Google Drive.
          </p>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Nombre del Documento</label>
            <input
              autoFocus
              type="text"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#6A1B31]/20 focus:border-[#6A1B31] outline-none"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmCreateDocument();
              }}
            />
          </div>
        </div>
      </Modal>

      {/* DELETE MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Eliminar Documento"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancelar</Button>
            <Button onClick={confirmDeleteDocument} className="bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/20">
              Sí, Eliminar Permanentemente
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3 text-red-800">
            <ShieldAlert className="shrink-0" size={20} />
            <div className="text-sm">
              <p className="font-bold mb-1">¿Está absolutamente seguro?</p>
              <p>Esta acción eliminará <strong>{itemToDelete?.name}</strong> de su lista y moverá el archivo a la papelera de Google Drive.</p>
            </div>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default App;