import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logout, subscribeToReports, confirmReport, mergeProviderToReport } from './firebase';
import MapView from './components/MapView';
import ReportForm from './components/ReportForm';
import ReportList from './components/ReportList';
import ServiceStatus from './components/ServiceStatus';
import NearbyReports from './components/NearbyReports';
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
  const [currentFormData, setCurrentFormData] = useState({
    serviceType: '',
    provider: '',
    title: '',
    description: ''
  });

  // Antispam system for non-logged users
  const STORAGE_KEY = 'reportesCR_confirmedReports';
  
  const getConfirmedReports = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading confirmed reports from localStorage:', error);
      return [];
    }
  };
  
  const addConfirmedReport = (reportId) => {
    try {
      const confirmed = getConfirmedReports();
      if (!confirmed.includes(reportId)) {
        confirmed.push(reportId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(confirmed));
      }
    } catch (error) {
      console.error('Error saving confirmed report to localStorage:', error);
    }
  };
  
  const hasConfirmedReport = (reportId) => {
    const confirmed = getConfirmedReports();
    return confirmed.includes(reportId);
  };

  // Function to calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Return distance in meters
  };

  // Smart location selection with intelligent merging/confirmation
  const handleSmartLocationSelection = async (selectedLocation, clickedReport, allReports) => {
    console.log('🧠 Smart location selection:', { 
      selectedLocation, 
      clickedReport, 
      currentFormData,
      allReports: allReports.length 
    });
    
    // Validate that we have current form data
    if (!currentFormData.serviceType || !currentFormData.provider) {
      alert('⚠️ Por favor selecciona el tipo de servicio y proveedor antes de marcar la ubicación');
      return;
    }
    
    const EXACT_LOCATION_THRESHOLD = 50; // meters for "exact same location"
    const { latitude, longitude } = selectedLocation;
    
    // Find reports at the exact same location (within 50m threshold)
    const sameLocationReports = allReports.filter(report => {
      const reportLat = report.latitude || report.location?.latitude;
      const reportLng = report.longitude || report.location?.longitude;
      
      if (!reportLat || !reportLng) return false;
      
      const distance = calculateDistance(latitude, longitude, reportLat, reportLng);
      return distance <= EXACT_LOCATION_THRESHOLD;
    });
    
    console.log('📍 Found reports at same location:', sameLocationReports.length);
    
    if (sameLocationReports.length > 0) {
      // Check for same service + same provider (using current form data)
      const exactMatch = sameLocationReports.find(report => 
        report.serviceType === currentFormData.serviceType && 
        report.provider === currentFormData.provider
      );
      
      if (exactMatch) {
        console.log('✅ Exact match found (same service + provider) - confirming existing report');
        try {
          await confirmReport(exactMatch.id, user?.uid || null);
          alert('✅ Reporte confirmado exitosamente - se encontró un reporte idéntico');
          setIsLocationSelectionMode(false);
          setActiveTab('create');
          return;
        } catch (error) {
          console.error('Error confirming exact match:', error);
          if (error.message.includes('already confirmed')) {
            alert('⚠️ Ya has confirmado este reporte anteriormente');
            setIsLocationSelectionMode(false);
            setActiveTab('create');
            return;
          } else {
            alert('❌ Error al confirmar el reporte. Creando uno nuevo...');
          }
        }
      }
      
      // Check for same service but different provider (using current form data)
      const sameServiceMatch = sameLocationReports.find(report => 
        report.serviceType === currentFormData.serviceType && 
        report.provider !== currentFormData.provider &&
        !report.provider.includes(currentFormData.provider) // Don't merge if already included
      );
      
      if (sameServiceMatch) {
        console.log('🔄 Same service, different provider - merging providers');
        try {
          const mergedProvider = await mergeProviderToReport(
            sameServiceMatch.id, 
            currentFormData.provider, 
            user?.uid || null
          );
          alert(`✅ Proveedor fusionado exitosamente!\nReporte actualizado: ${currentFormData.serviceType} - ${mergedProvider}`);
          setIsLocationSelectionMode(false);
          setActiveTab('create');
          return;
        } catch (error) {
          console.error('Error merging provider:', error);
          if (error.message.includes('already included')) {
            alert('⚠️ Este proveedor ya está incluido en el reporte');
            setIsLocationSelectionMode(false);
            setActiveTab('create');
            return;
          } else {
            alert('❌ Error al fusionar proveedor. Creando reporte separado...');
          }
        }
      }
    }
    
    // Use the selected location for new report (either no conflicts or different service/provider)
    console.log('📍 Using selected location for new report');
    setSelectedLocationForReport(selectedLocation);
    setIsLocationSelectionMode(false);
    setActiveTab('create');
  };

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
    <div className="min-h-screen gradient-bg">
      <header className="glass-card border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="w-full px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 lg:py-6">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-red-600 to-red-700 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl flex-shrink-0">
                <span className="text-white font-bold text-lg sm:text-2xl">🇨🇷</span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold heading-primary truncate">
                  ReportesCR
                </h1>
                <p className="text-gray-600 dark:text-gray-300 font-medium text-xs sm:text-sm hidden sm:block">Sistema Nacional de Reportes</p>
              </div>
              <span className="hidden lg:inline-block ml-2 px-2 sm:px-3 py-1 bg-gradient-to-r from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/30 text-red-700 dark:text-red-300 text-xs font-semibold rounded-full border border-red-200 dark:border-red-700 flex-shrink-0">
                BETA v1.0
              </span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {user ? (
                <>
                  <div className="flex items-center space-x-2 sm:space-x-3 bg-white/10 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg sm:rounded-xl px-2 sm:px-4 py-1 sm:py-2 border border-gray-200 dark:border-gray-600">
                    {user.photoURL && (
                      <img 
                        src={user.photoURL} 
                        alt="Foto de perfil"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-gray-300 dark:border-gray-600 shadow-md"
                      />
                    )}
                    <div className="hidden sm:block">
                      <span className="text-gray-800 dark:text-gray-200 font-semibold text-sm block">
                        {user.displayName || 'Usuario'}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 text-xs">
                        {user.email}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 sm:py-2.5 sm:px-5 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 text-sm sm:text-base"
                  >
                    <span className="hidden sm:inline">Cerrar Sesión</span>
                    <span className="sm:hidden">Salir</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleLogin}
                  className="btn-primary flex items-center space-x-1 sm:space-x-2 font-semibold text-sm sm:text-base px-3 sm:px-4"
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
        
        {/* Service Status Cards */}
        <ServiceStatus reports={reports} />
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Main Content - 3 columns */}
          <div className="lg:col-span-3">
            
            {/* Mobile Tab Navigation */}
            <div className="lg:hidden modern-card mb-6 p-1">
              <nav className="flex rounded-lg bg-gray-50 dark:bg-gray-800">
                {[
                  { key: 'map', label: 'Mapa', icon: '🗺️' },
                  { key: 'create', label: 'Crear', icon: '➕' },
                  { key: 'legend', label: 'Leyenda', icon: '🔍' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex items-center justify-center py-3 px-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                      activeTab === tab.key
                        ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-md'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <span className="mr-1">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Map View */}
            <div className={`modern-card overflow-hidden ${activeTab !== 'map' ? 'hidden lg:block' : ''}`}>
              {userLocation ? (
                <MapView 
                  reports={reports} 
                  userLocation={userLocation} 
                  isLocationSelectionMode={isLocationSelectionMode}
                  selectedLocation={selectedLocationForReport}
                  user={user}
                  hasConfirmedReport={hasConfirmedReport}
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
                  onSmartLocationSelect={handleSmartLocationSelection}
                  onConfirmReport={async (report) => {
                    console.log('🟢 Confirming report:', report);
                    
                    // Check antispam for non-logged users
                    if (!user && hasConfirmedReport(report.id)) {
                      alert('⚠️ Ya has confirmado este reporte anteriormente desde este dispositivo');
                      return;
                    }
                    
                    try {
                      await confirmReport(report.id, user?.uid || null);
                      
                      // Add to localStorage for non-logged users
                      if (!user) {
                        addConfirmedReport(report.id);
                      }
                      
                      // Show success message
                      alert('✅ Reporte confirmado exitosamente');
                    } catch (error) {
                      console.error('Error confirming report:', error);
                      if (error.message.includes('already confirmed')) {
                        alert('⚠️ Ya has confirmado este reporte anteriormente');
                      } else {
                        alert('❌ Error al confirmar el reporte. Inténtalo de nuevo.');
                      }
                    }
                  }}
                />
              ) : (
                <div className="h-80 md:h-96 lg:h-[500px] bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-lg">
                  <p className="text-gray-600 dark:text-gray-300">⏳ Esperando ubicación para mostrar mapa...</p>
                </div>
              )}
            </div>

            {/* Reports List - Shown below map on mobile only */}
            <div className={`modern-card mt-6 ${activeTab === 'map' ? 'lg:hidden' : 'hidden'}`}>
              <ReportList 
                reports={reports} 
                user={user} 
              />
            </div>

            {/* Reports List - Desktop version in original position */}
            <div className="hidden lg:block modern-card mt-6">
              <ReportList 
                reports={reports} 
                user={user} 
              />
            </div>

            {/* Stats and Map Legend - Desktop only, below reports list, only when logged in */}
            {user && (
              <div className="hidden lg:grid lg:grid-cols-2 gap-6 mt-6">
                {/* Stats */}
                <div className="modern-card p-6">
                  <h3 className="heading-secondary mb-6 flex items-center">
                    <span className="mr-3 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm">📊</span>
                    Estado del Sistema
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-xl flex justify-between items-center border-l-4 border-red-500">
                      <span className="text-gray-700 font-semibold">Total reportes</span>
                      <span className="text-red-600 font-bold text-xl">{reports.length}</span>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl flex justify-between items-center border-l-4 border-green-500">
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

                {/* Map Legend */}
                <div className="bg-white rounded-xl shadow-xl p-6">
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
            )}

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
            
            {/* Nearby Reports - Hidden on mobile when in create tab */}
            <div className={activeTab !== 'create' ? 'block' : 'hidden lg:block'}>
              <NearbyReports 
                reports={reports} 
                userLocation={userLocation} 
                user={user} 
              />
            </div>
            
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
                  onFormDataChange={(formData) => {
                    console.log('📝 Form data changed:', formData);
                    setCurrentFormData(formData);
                  }}
                  onReportCreated={() => {
                    console.log('Report created successfully, refreshing view...');
                    // Reset location selection state
                    setSelectedLocationForReport(null);
                    setIsLocationSelectionMode(false);
                    // Reset form data
                    setCurrentFormData({
                      serviceType: '',
                      provider: '',
                      title: '',
                      description: ''
                    });
                    // Switch to map view on mobile after creating report
                    if (window.innerWidth < 1024) {
                      setActiveTab('map');
                    }
                  }}
                />
              ) : (
                <div className="modern-card p-6">
                  <h3 className="heading-secondary mb-6 flex items-center">
                    <span className="mr-3 w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center text-white text-sm">➕</span>
                    Crear Reporte
                  </h3>
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <span className="text-2xl">�</span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">
                      Acceso Requerido
                    </h4>
                    <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                      Inicia sesión con tu cuenta de Google para crear reportes y ayudar a tu comunidad
                    </p>
                    <button
                      onClick={handleLogin}
                      className="btn-primary w-full"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>Iniciar Sesión con Google</span>
                    </button>
                  </div>
                </div>
              )}
            </div>


            
            {/* Stats - Desktop only, in sidebar when NOT logged in */}
            {!user && (
              <div className="hidden lg:block modern-card p-6">
                <h3 className="heading-secondary mb-6 flex items-center">
                  <span className="mr-3 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm">📊</span>
                  Estado del Sistema
                </h3>
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-xl flex justify-between items-center border-l-4 border-red-500">
                    <span className="text-gray-700 font-semibold">Total reportes</span>
                    <span className="text-red-600 font-bold text-xl">{reports.length}</span>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl flex justify-between items-center border-l-4 border-green-500">
                    <span className="text-gray-700 font-semibold">Tu ubicación</span>
                    <span className={`font-bold ${userLocation ? 'text-green-600' : 'text-red-600'}`}>
                      {userLocation ? '📍 Detectada' : '❌ No disponible'}
                    </span>
                  </div>
                  <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-4 rounded-xl flex justify-between items-center border-l-4 border-emerald-500">
                    <span className="text-gray-700 font-semibold">Estado del servicio</span>
                    <span className="font-bold text-emerald-600 status-online px-2 py-1 rounded-lg">✅ En línea</span>
                  </div>
                </div>
              </div>
            )}

            {/* Map Legend - Desktop only, in sidebar when NOT logged in */}
            {!user && (
              <div className="hidden lg:block modern-card p-6">
                <h3 className="heading-secondary mb-6 flex items-center">
                  <span className="mr-3 w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm">🗺️</span>
                  Leyenda del Mapa
                </h3>
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg border-l-4 border-gray-400">
                    <p className="text-sm text-gray-700 font-medium">
                      <strong>Áreas Afectadas:</strong> Los círculos muestran zonas con problemas reportados
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-2 service-electricidad rounded-lg">
                      <div className="w-5 h-5 rounded-full border-2 border-red-600 bg-red-600 bg-opacity-20 flex-shrink-0"></div>
                      <span className="text-sm font-medium text-gray-800">Electricidad</span>
                    </div>
                    <div className="flex items-center space-x-3 p-2 service-agua rounded-lg">
                      <div className="w-5 h-5 rounded-full border-2 border-blue-600 bg-blue-600 bg-opacity-20 flex-shrink-0"></div>
                      <span className="text-sm font-medium text-gray-800">Agua</span>
                    </div>
                    <div className="flex items-center space-x-3 p-2 service-internet rounded-lg">
                      <div className="w-5 h-5 rounded-full border-2 border-green-600 bg-green-600 bg-opacity-20 flex-shrink-0"></div>
                      <span className="text-sm font-medium text-gray-800">Internet</span>
                    </div>
                    <div className="flex items-center space-x-3 p-2 service-otros rounded-lg">
                      <div className="w-5 h-5 rounded-full border-2 border-purple-600 bg-purple-600 bg-opacity-20 flex-shrink-0"></div>
                      <span className="text-sm font-medium text-gray-800">Otros servicios</span>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="text-xs text-blue-800">
                      <strong>💡 Consejo:</strong> Cada círculo representa un radio de ~500m donde podría haber afectaciones.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;