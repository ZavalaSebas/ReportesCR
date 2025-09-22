import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logout, subscribeToReports } from './firebase';
import MapView from './components/MapView';
import ReportForm from './components/ReportForm';
import ReportList from './components/ReportList';
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
          console.error("Error getting location:", error);
        }
      );
    }

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // Subscribe to reports
    const unsubscribeReports = subscribeToReports((reportsData) => {
      setReports(reportsData);
    });

    return () => unsubscribeReports();
  }, []);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                🇨🇷 Reportes CR
              </h1>
              <span className="ml-2 text-sm text-gray-500 hidden sm:inline">
                Reporta problemas de servicios en Costa Rica
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user.displayName || user.email}
                    </p>
                    <p className="text-xs text-gray-500">Conectado</p>
                  </div>
                  {user.photoURL && (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="h-8 w-8 rounded-full"
                    />
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Iniciar con Google
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="lg:hidden bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-1">
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
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
          
          {/* Map Section */}
          <div className={`lg:col-span-8 ${activeTab !== 'map' ? 'hidden lg:block' : ''}`}>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 lg:mb-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  Mapa de Reportes
                </h2>
                <div className="text-sm text-gray-600">
                  📍 {reports.length} reporte{reports.length !== 1 ? 's' : ''}
                </div>
              </div>
              <MapView reports={reports} userLocation={userLocation} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Report Form */}
            <div className={activeTab !== 'create' ? 'hidden lg:block' : ''}>
              <ReportForm 
                user={user} 
                onReportCreated={() => {
                  // Switch to map view on mobile after creating report
                  if (window.innerWidth < 1024) {
                    setActiveTab('map');
                  }
                }}
              />
            </div>

            {/* Report List */}
            <div className={activeTab !== 'list' ? 'hidden lg:block' : ''}>
              <ReportList reports={reports} user={user} />
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Estadísticas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { type: 'luz', icon: '⚡', label: 'Electricidad' },
              { type: 'agua', icon: '💧', label: 'Agua' },
              { type: 'internet', icon: '🌐', label: 'Internet' },
              { type: 'otros', icon: '🔧', label: 'Otros' }
            ].map(service => {
              const count = reports.filter(r => r.serviceType === service.type).length;
              return (
                <div key={service.type} className="text-center p-4 border border-gray-200 rounded-lg">
                  <div className="text-2xl mb-1">{service.icon}</div>
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600">{service.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>Reportes CR - Plataforma colaborativa para reportar problemas de servicios en Costa Rica</p>
            <p className="mt-1">Desarrollado con React, Firebase y mucho ❤️</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
