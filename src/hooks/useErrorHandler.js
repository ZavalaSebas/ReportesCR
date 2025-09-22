import { useEffect } from 'react';

export const useErrorHandler = (setAppError) => {
  useEffect(() => {
    // Global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      setAppError('Error inesperado en la aplicación. Por favor recarga la página.');
    };

    // Global error handler for JavaScript errors
    const handleError = (event) => {
      console.error('Global error:', event.error);
      setAppError('Error inesperado en la aplicación. Por favor recarga la página.');
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [setAppError]);
};