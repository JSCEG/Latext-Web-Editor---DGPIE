import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { SheetEditor } from './components/SheetEditor';
import { Spreadsheet, AppView } from './types';
import { createSpreadsheet, fetchSpreadsheet } from './services/sheetsService';
import { Button } from './components/Button';
import { ShieldAlert, HelpCircle, PlayCircle, HelpCircle as HelpIcon, LogOut, X } from 'lucide-react';

const App: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [currentSpreadsheet, setCurrentSpreadsheet] = useState<Spreadsheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Load token from local storage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('sheet_token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    let finalToken = token.trim();

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
  }

  const handleLogout = () => {
    localStorage.removeItem('sheet_token');
    setIsAuthenticated(false);
    setToken('');
    setCurrentSpreadsheet(null);
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
      setError("Tu sesión ha expirado. Por favor ingresa un nuevo token para continuar.");
    } else {
      // Show other errors (403, 404, etc) in the UI
      setError(msg || "Ocurrió un error inesperado al cargar el documento.");
    }
  };

  const loadSpreadsheet = async (id: string) => {
    setLoading(true);
    setError(null);
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

  const handleCreate = async (title: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await createSpreadsheet(title, token);
      await loadSpreadsheet(data.spreadsheetId);
    } catch (err: any) {
      handleError(err);
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

          <div className="mb-6">
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
                  <li>Seleccionar API: <code>spreadsheets</code>.</li>
                  <li>Autorizar e intercambiar código.</li>
                  <li>Copiar <strong>Access Token</strong> (o todo el JSON).</li>
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
                    <PlayCircle size={16} className="mr-2"/> Probar Demo
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
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-700 hover:bg-red-50">
                   <LogOut size={16} className="mr-2"/> Salir
                </Button>
            </div>
        </div>
        {/* Gold Bar */}
        <div className="h-1 bg-[#BC955C] w-full"></div>
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
        {currentView === AppView.DASHBOARD ? (
            <Dashboard onCreate={handleCreate} onOpen={loadSpreadsheet} onLogout={handleLogout} />
        ) : (
            currentSpreadsheet && (
            <SheetEditor 
                spreadsheet={currentSpreadsheet} 
                token={token}
                onRefresh={() => loadSpreadsheet(currentSpreadsheet.spreadsheetId)}
                onBack={() => setCurrentView(AppView.DASHBOARD)}
            />
            )
        )}
      </main>
    </div>
  );
};

export default App;
