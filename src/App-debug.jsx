import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logout } from './firebase';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('App: Rendering login state');
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

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

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

  console.log('App: Rendering main application state');
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-white">
                Reportes CR 🇨🇷
              </h1>
              <span className="ml-4 px-3 py-1 bg-white bg-opacity-20 text-white text-sm rounded-full">
                Debug
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-blue-100">
                {user.displayName || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="bg-white bg-opacity-20 text-white py-2 px-4 rounded-md hover:bg-opacity-30 transition duration-200"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-6 sm:px-8 lg:px-12 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            ¡Aplicación funcionando! 🎉
          </h2>
          <p className="text-gray-600">
            Usuario conectado: {user.displayName || user.email}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Esta es la versión simplificada para debugging
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;