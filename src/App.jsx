import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logout, subscribeToReports } from './firebase';
import MapView from './components/MapView';
import ReportForm from './components/ReportForm';
import ReportList from './components/ReportList';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reports, setReports] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('map');
  const [isLocationSelectionMode, setIsLocationSelectionMode] = useState(false);
  const [selectedLocationForReport, setSelectedLocationForReport] = useState(null);

  useEffect(() => {
    console.log('App component mounted/updated', {
      user: user ? 'logged in' : 'not logged in',
      loading,
      error
    });
  });

  useEffect(() => {
    console.log('Setting up auth listener...');
    try {
      const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
        setUser(user);
        setLoading(false);
      });

      const loadingTimeout = setTimeout(() => {
        console.log('Loading timeout reached, setting loading to false');
        setLoading(false);
      }, 5000);

      // Get user location
      console.log('Setting up geolocation...');
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Geolocation success:', position.coords.latitude, position.coords.longitude);
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

      return () => {
        console.log('Cleaning up auth listener...');
        unsubscribeAuth();
        clearTimeout(loadingTimeout);
      };
    } catch (error) {
      console.error('Error in auth effect:', error);
      setError('Error inicializando la aplicación: ' + error.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Subscribe to reports regardless of user authentication
    console.log('Setting up reports subscription...');
    try {
      const unsubscribeReports = subscribeToReports((reportsData) => {
        console.log('Reports received:', reportsData?.length || 0);
        setReports(reportsData || []);
      });

      return () => {
        if (unsubscribeReports) {
          console.log('Cleaning up reports subscription...');
          try {
            unsubscribeReports();
          } catch (error) {
            console.error('Error unsubscribing from reports:', error);
          }
        }
      };
    } catch (error) {
      console.error('Error subscribing to reports:', error);
      setReports([]);
      setError('Error cargando reportes: ' + error.message);
    }
  }, []); // Remove user dependency

  const handleLogin = async () => {
    try {
      console.log('Attempting login...');
      setError(null);
      await loginWithGoogle();
    } catch (error) {
      console.error('Error logging in:', error);
      setError('Error al iniciar sesión: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('Attempting logout...');
      setError(null);
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
      setError('Error al cerrar sesión: ' + error.message);
    }
  };

  console.log('About to render. State:', { loading, error, user: !!user });

  if (loading) {
    console.log('App: Rendering loading state');
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando aplicación...</p>
          <p className="mt-2 text-sm text-gray-500">Estado: {loading ? 'Cargando' : 'Listo'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('App: Rendering error state', error);
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition duration-200"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  console.log('App: Rendering main application state');
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100">
      <header className="bg-gradient-to-r from-red-600 to-red-700 shadow-lg">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-white">
                Reportes CR 🇨🇷
              </h1>
              <span className="ml-4 px-3 py-1 bg-white bg-opacity-20 text-white text-sm rounded-full">
                v1.0
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="flex items-center space-x-2">
                    {user.photoURL && (
                      <img 
                        src={user.photoURL} 
                        alt="Foto de perfil"
                        className="w-8 h-8 rounded-full border-2 border-white border-opacity-30"
                      />
                    )}
                    <span className="text-red-100">
                      {user.displayName || user.email}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-white bg-opacity-20 text-white py-2 px-4 rounded-md hover:bg-opacity-30 transition duration-200"
                  >
                    Cerrar Sesión
                  </button>
                </>
              ) : (
                <button
                  onClick={handleLogin}
                  className="bg-white bg-opacity-20 text-white py-2 px-4 rounded-md hover:bg-opacity-30 transition duration-200 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Iniciar Sesión</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-6 sm:px-8 lg:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Main Content - 3 columns */}
          <div className="lg:col-span-3">
            
            {/* Mobile Tab Navigation */}
            <div className="lg:hidden bg-white rounded-lg shadow-sm mb-6">
              <nav className="flex">
                {[
                  { key: 'map', label: 'Mapa', icon: '🗺️' },
                  { key: 'create', label: 'Crear', icon: '➕' },
                  { key: 'list', label: 'Lista', icon: '📋' },
                  { key: 'legend', label: 'Leyenda', icon: '🔍' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex items-center justify-center py-3 text-xs font-medium ${
                      activeTab === tab.key
                        ? 'text-red-600 border-b-2 border-red-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-1">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Map View */}
            <div className={`rounded-xl shadow-xl overflow-hidden ${activeTab !== 'map' ? 'hidden lg:block' : ''}`}>
              {userLocation ? (
                <MapView 
                  reports={reports} 
                  userLocation={userLocation} 
                  isLocationSelectionMode={isLocationSelectionMode}
                  selectedLocation={selectedLocationForReport}
                  onLocationSelect={(location) => {
                    console.log('🟢 Location selected from map:', location);
                    if (location === 'EXIT_SELECTION_MODE') {
                      // Exit selection mode
                      setIsLocationSelectionMode(false);
                      setActiveTab('create');
                      console.log('🟢 Exiting selection mode, returning to form');
                    } else {
                      // Update location but stay in selection mode
                      setSelectedLocationForReport(location);
                      console.log('🟢 Location updated, staying in selection mode');
                    }
                  }}
                />
              ) : (
                <div className="h-96 bg-gray-200 flex items-center justify-center">
                  <p className="text-gray-600">⏳ Esperando ubicación para mostrar mapa...</p>
                </div>
              )}
            </div>

            {/* Reports List */}
            <div className={`rounded-xl shadow-xl mt-6 ${activeTab !== 'list' ? 'hidden lg:block' : ''}`}>
              <ReportList 
                reports={reports} 
                user={user} 
              />
            </div>

            {/* Mobile Map Legend */}
            <div className={`rounded-xl shadow-xl mt-6 bg-white p-6 ${activeTab !== 'legend' ? 'hidden' : 'lg:hidden'}`}>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">🗺️</span>
                Leyenda del Mapa
              </h3>
              
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <strong>¿Qué significan los círculos en el mapa?</strong>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 mb-3">
                    Los círculos coloreados muestran las <strong>áreas afectadas</strong> alrededor de cada reporte. 
                    Cada círculo tiene un radio de aproximadamente 500 metros.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Colores por tipo de servicio:</div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 p-2 bg-red-50 rounded">
                      <div className="w-6 h-6 rounded-full border-2 border-red-600 bg-red-600 bg-opacity-20"></div>
                      <div>
                        <span className="text-sm font-medium text-gray-800">Electricidad</span>
                        <div className="text-xs text-gray-600">Cortes de luz, problemas eléctricos</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded">
                      <div className="w-6 h-6 rounded-full border-2 border-blue-600 bg-blue-600 bg-opacity-20"></div>
                      <div>
                        <span className="text-sm font-medium text-gray-800">Agua</span>
                        <div className="text-xs text-gray-600">Cortes de agua, problemas de abastecimiento</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-2 bg-green-50 rounded">
                      <div className="w-6 h-6 rounded-full border-2 border-green-600 bg-green-600 bg-opacity-20"></div>
                      <div>
                        <span className="text-sm font-medium text-gray-800">Internet</span>
                        <div className="text-xs text-gray-600">Fallas de conexión, problemas de red</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-2 bg-orange-50 rounded">
                      <div className="w-6 h-6 rounded-full border-2 border-orange-600 bg-orange-600 bg-opacity-20"></div>
                      <div>
                        <span className="text-sm font-medium text-gray-800">Otros servicios</span>
                        <div className="text-xs text-gray-600">Teléfono, cable, otros servicios públicos</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-xs text-blue-800">
                    <strong>💡 Tip:</strong> Si ves un círculo cerca de tu ubicación, es posible que también experimentes problemas con ese servicio.
                  </div>
                </div>
              </div>
            </div>
            
          </div>

          {/* Sidebar - 1 column */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Create Report Form */}
            <div className={activeTab !== 'create' ? 'hidden lg:block' : ''}>
              {user ? (
                <ReportForm 
                  user={user} 
                  selectedLocationForReport={selectedLocationForReport}
                  onRequestLocationSelection={() => {
                    console.log('🔴 Button clicked - Activating location selection mode');
                    setIsLocationSelectionMode(true);
                    setActiveTab('map');
                    console.log('🔴 State set - isLocationSelectionMode: true, activeTab: map');
                  }}
                  onReportCreated={() => {
                    console.log('Report created successfully, refreshing view...');
                    // Reset location selection state
                    setSelectedLocationForReport(null);
                    setIsLocationSelectionMode(false);
                    // Switch to map view on mobile after creating report
                    if (window.innerWidth < 1024) {
                      setActiveTab('map');
                    }
                  }}
                />
              ) : (
                <div className="bg-white rounded-xl shadow-xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">➕</span>
                    Crear Reporte
                  </h3>
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-4">🔒</div>
                    <p className="text-gray-600 mb-4">
                      Inicia sesión para crear nuevos reportes
                    </p>
                    <button
                      onClick={handleLogin}
                      className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition duration-200 flex items-center justify-center mx-auto space-x-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>Iniciar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Stats - Desktop only */}
            <div className="hidden lg:block bg-white rounded-xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">📊</span>
                Estado del Sistema
              </h3>
              <div className="space-y-4">
                <div className="bg-red-50 p-3 rounded-lg flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Total reportes:</span>
                  <span className="text-red-600 font-bold text-lg">{reports.length}</span>
                </div>
                <div className="bg-green-50 p-3 rounded-lg flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Tu ubicación:</span>
                  <span className={`font-bold ${userLocation ? 'text-green-600' : 'text-red-600'}`}>
                    {userLocation ? '📍 Detectada' : '❌ No disponible'}
                  </span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Estado:</span>
                  <span className="font-bold text-emerald-600">✅ En línea</span>
                </div>
              </div>
            </div>

            {/* Map Legend - Desktop only */}
            <div className="hidden lg:block bg-white rounded-xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">🗺️</span>
                Leyenda del Mapa
              </h3>
              <div className="space-y-3">
                <div className="text-xs text-gray-600 mb-3">
                  <strong>Áreas Afectadas:</strong> Los círculos muestran las zonas con problemas reportados
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full border-2 border-red-600 bg-red-600 bg-opacity-10"></div>
                    <span className="text-sm text-gray-700">Electricidad</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full border-2 border-blue-600 bg-blue-600 bg-opacity-10"></div>
                    <span className="text-sm text-gray-700">Agua</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full border-2 border-green-600 bg-green-600 bg-opacity-10"></div>
                    <span className="text-sm text-gray-700">Internet</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full border-2 border-orange-600 bg-orange-600 bg-opacity-10"></div>
                    <span className="text-sm text-gray-700">Otros servicios</span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 mt-3 pt-3 border-t">
                  💡 Cada círculo representa un área de ~500m de radio donde podría haber afectaciones
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