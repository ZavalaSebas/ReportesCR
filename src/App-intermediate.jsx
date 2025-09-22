import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logout, subscribeToReports } from './firebase';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('map');

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
      setUser(user);
      setLoading(false);
    });

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn("No se pudo obtener la ubicación:", error.message);
          // Set default location to San José, Costa Rica if geolocation fails
          setUserLocation([9.9281, -84.0907]);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    } else {
      console.warn("Geolocalización no soportada, usando ubicación por defecto");
      // Set default location to San José, Costa Rica
      setUserLocation([9.9281, -84.0907]);
    }

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // Subscribe to reports only when we have a user
    let unsubscribeReports = null;
    
    if (user) {
      try {
        unsubscribeReports = subscribeToReports((reportsData) => {
          console.log('Reports received:', reportsData?.length || 0);
          setReports(reportsData || []);
        });
      } catch (error) {
        console.error('Error subscribing to reports:', error);
        setReports([]);
      }
    } else {
      setReports([]);
    }

    return () => {
      if (unsubscribeReports) {
        unsubscribeReports();
      }
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Error logging in:', error);
      alert('Error al iniciar sesión. Intenta nuevamente.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Reportes CR 🇨🇷
            </h1>
            <p className="text-gray-600">
              Reporta fallas de servicios públicos en Costa Rica
            </p>
          </div>

          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Iniciar Sesión
          </h2>
          <p className="text-center text-gray-600 mb-6">
            Inicia sesión para reportar y confirmar fallas de servicios
          </p>
          <button
            onClick={handleLogin}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition duration-200 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Reportes CR 🇨🇷
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.displayName || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition duration-200"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Content */}
          <div className="lg:col-span-8">
            {/* Mobile Tab Navigation */}
            <div className="lg:hidden bg-white rounded-lg shadow-sm mb-6">
              <nav className="flex">
                {[
                  { key: 'map', label: 'Mapa', icon: '🗺️' },
                  { key: 'create', label: 'Crear', icon: '➕' },
                  { key: 'list', label: 'Lista', icon: '📋' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex items-center justify-center py-3 text-sm font-medium ${
                      activeTab === tab.key
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Map View - Placeholder */}
            <div className={`bg-white rounded-lg shadow-md ${activeTab !== 'map' ? 'hidden lg:block' : ''}`}>
              <div className="h-96 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-6xl mb-4">🗺️</div>
                  <h3 className="text-lg font-medium mb-2">Mapa de Reportes</h3>
                  <p>El mapa se cargará aquí</p>
                  <p className="text-sm mt-2">Reportes encontrados: {reports.length}</p>
                  {userLocation && (
                    <p className="text-xs text-green-600 mt-1">
                      📍 Ubicación: {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Reports List - Placeholder */}
            <div className={`bg-white rounded-lg shadow-md ${activeTab !== 'list' ? 'hidden lg:block' : ''}`}>
              <div className="p-6">
                <h3 className="text-lg font-medium mb-4">Lista de Reportes</h3>
                {reports.length > 0 ? (
                  <div className="space-y-4">
                    {reports.slice(0, 5).map((report, index) => (
                      <div key={report.id || index} className="border-l-4 border-blue-500 pl-4 py-2">
                        <h4 className="font-medium">{report.title || `${report.serviceType} - ${report.provider}`}</h4>
                        <p className="text-sm text-gray-600">{report.description}</p>
                        <p className="text-xs text-gray-500">
                          Por: {report.userName} • Confirmaciones: {report.confirmations || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-2">📋</div>
                    <p>No hay reportes disponibles</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Create Report Form - Placeholder */}
            <div className={activeTab !== 'create' ? 'hidden lg:block' : ''}>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Crear Nuevo Reporte</h2>
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-2">➕</div>
                  <p>Formulario de reporte</p>
                  <p className="text-sm mt-2">Se cargará aquí</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="hidden lg:block bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Estadísticas</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total de reportes:</span>
                  <span className="font-medium">{reports.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tu ubicación:</span>
                  <span className="font-medium text-green-600">
                    {userLocation ? '📍 Detectada' : '❌ No disponible'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className="font-medium text-green-600">✅ Conectado</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;