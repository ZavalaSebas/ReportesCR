import React, { useState } from 'react';
import { confirmReport } from '../firebase';

const serviceColors = {
  luz: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
  agua: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  internet: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  otros: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
  // Default fallback color for any unrecognized service types
  default: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
};

// Helper function to get service color safely
const getServiceColor = (serviceType) => {
  if (!serviceType) return serviceColors.default;
  
  // Normalize service type: trim whitespace and convert to lowercase
  const normalizedType = serviceType.toString().trim().toLowerCase();
  
  // Handle edge cases for "otros"
  if (normalizedType === 'otros' || normalizedType === 'otro' || normalizedType.includes('otro')) {
    return serviceColors.otros;
  }
  
  return serviceColors[normalizedType] || serviceColors.default;
};

const serviceIcons = {
  luz: '⚡',
  agua: '💧',
  internet: '🌐',
  otros: '🔧'
};

// Helper function to get service icon safely
const getServiceIcon = (serviceType) => {
  if (!serviceType) return '📋'; // Default icon
  
  // Normalize service type to lowercase for matching
  const normalizedType = serviceType.toLowerCase();
  return serviceIcons[normalizedType] || '📋'; // Default icon for unrecognized types
};

// Helper function to format provider display
const formatProviders = (providerString) => {
  if (!providerString) return 'Proveedor no especificado';
  
  // Check if it contains multiple providers (merged)
  if (providerString.includes(' + ')) {
    const providers = providerString.split(' + ');
    return {
      isMerged: true,
      providers: providers,
      displayText: `${providers.length} proveedores: ${providerString}`
    };
  }
  
  return {
    isMerged: false,
    providers: [providerString],
    displayText: providerString
  };
};

const ReportList = ({ reports, user }) => {
  const [confirmingReports, setConfirmingReports] = useState(new Set());
  const [confirmedReports, setConfirmedReports] = useState(new Set());

  const handleConfirmReport = async (reportId) => {
    // Check if user already confirmed this report in this session
    if (confirmedReports.has(reportId)) {
      alert('Ya confirmaste este reporte en esta sesión.');
      return;
    }

    // If user is logged in, check if they confirmed it before
    if (user) {
      const report = reports.find(r => r.id === reportId);
      if (report?.confirmed_by?.includes(user.uid)) {
        alert('Ya confirmaste este reporte anteriormente.');
        return;
      }
    }

    setConfirmingReports(prev => new Set([...prev, reportId]));

    try {
      // Pass user.uid if available, null otherwise (anonymous confirmation)
      await confirmReport(reportId, user?.uid || null);
      setConfirmedReports(prev => new Set([...prev, reportId]));
      alert('¡Gracias por confirmar el reporte!');
    } catch (error) {
      console.error('Error confirming report:', error);
      alert('Error al confirmar el reporte. Intenta nuevamente.');
    } finally {
      setConfirmingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Fecha no disponible';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      return 'Hace menos de 1 hora';
    } else if (diffHours < 24) {
      return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-CR');
    }
  };

  if (reports.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Reportes Recientes</h2>
        <div className="text-center py-8">
          <div className="text-gray-400 dark:text-gray-500 text-5xl mb-4">📋</div>
          <p className="text-gray-600 dark:text-gray-300">No hay reportes disponibles aún.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">¡Sé el primero en reportar un problema!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        Reportes Recientes ({reports.length})
      </h2>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {reports.map((report) => {
          const isConfirming = confirmingReports.has(report.id);
          const userConfirmed = user && report.confirmed_by?.includes(user.uid);
          const isOwnReport = user && report.userId === user.uid;

          return (
            <div
              key={report.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-900"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getServiceIcon(report.serviceType)}</span>
                  <div>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full border ${
                      getServiceColor(report.serviceType)
                    }`}>
                      {report.serviceType?.charAt(0).toUpperCase() + report.serviceType?.slice(1)}
                    </span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(report.createdAt)}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Proveedor{formatProviders(report.provider).isMerged ? 'es' : ''}: </span>
                  {formatProviders(report.provider).isMerged ? (
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded p-2 mt-1">
                      <div className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                        {formatProviders(report.provider).providers.length} proveedores afectados:
                      </div>
                      <div className="space-y-1">
                        {formatProviders(report.provider).providers.map((provider, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{provider}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-600 dark:text-gray-300">{report.provider}</span>
                  )}
                </div>

                {report.locationName && (
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Ubicación: </span>
                    <span className="text-gray-600 dark:text-gray-300">{report.locationName}</span>
                  </div>
                )}

                {report.description && (
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Descripción: </span>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">{report.description}</p>
                  </div>
                )}

                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">Reportado por: </span>
                  {report.userName || report.userEmail}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    👥 {report.confirmations || 0} confirmación{(report.confirmations || 0) !== 1 ? 'es' : ''}
                  </span>
                </div>

                {!isOwnReport && (
                  <button
                    onClick={() => handleConfirmReport(report.id)}
                    disabled={isConfirming || userConfirmed || confirmedReports.has(report.id)}
                    className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${
                      userConfirmed || confirmedReports.has(report.id)
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 cursor-not-allowed'
                        : isConfirming
                        ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                    }`}
                  >
                    {isConfirming ? 'Confirmando...' : 
                     (userConfirmed || confirmedReports.has(report.id)) ? '✓ Confirmado' : 'Confirmar'}
                  </button>
                )}

                {isOwnReport && (
                  <span className="px-3 py-1 text-sm rounded-md bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {user ? 'Tu reporte' : 'Reporte propio'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportList;