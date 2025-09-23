import React from 'react';

const ServiceStatus = ({ reports }) => {
  // Calculate service status based on reports
  const calculateServiceStatus = () => {
    const services = {
      luz: { name: 'Electricidad', icon: '⚡', count: 0, color: 'red' },
      agua: { name: 'Agua', icon: '💧', count: 0, color: 'blue' },
      internet: { name: 'Internet', icon: '🌐', count: 0, color: 'green' },
      otros: { name: 'Otros', icon: '🔧', count: 0, color: 'purple' }
    };

    // Count reports by service type from the last 24 hours
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    reports.forEach(report => {
      const reportDate = report.createdAt?.toDate ? report.createdAt.toDate() : new Date(report.createdAt);
      
      // Only count recent reports (last 24 hours)
      if (reportDate >= oneDayAgo) {
        const serviceType = report.serviceType?.toLowerCase();
        if (services[serviceType]) {
          services[serviceType].count++;
        }
      }
    });

    return services;
  };

  const getStatusLevel = (count) => {
    if (count === 0) return 'normal';
    if (count <= 2) return 'menor';
    if (count <= 5) return 'moderado';
    return 'critico';
  };

  const getStatusText = (count) => {
    if (count === 0) return 'Normal';
    if (count <= 2) return 'Menor';
    if (count <= 5) return 'Moderado';
    return 'Crítico';
  };

  const getStatusColors = (level, baseColor) => {
    const colorMap = {
      normal: {
        red: 'bg-green-50 border-green-200 text-green-700',
        blue: 'bg-green-50 border-green-200 text-green-700',
        green: 'bg-green-50 border-green-200 text-green-700',
        purple: 'bg-green-50 border-green-200 text-green-700'
      },
      menor: {
        red: 'bg-red-50 border-red-200 text-red-700',
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        green: 'bg-green-50 border-green-200 text-green-700',
        purple: 'bg-purple-50 border-purple-200 text-purple-700'
      },
      moderado: {
        red: 'bg-red-100 border-red-300 text-red-800',
        blue: 'bg-blue-100 border-blue-300 text-blue-800',
        green: 'bg-green-100 border-green-300 text-green-800',
        purple: 'bg-purple-100 border-purple-300 text-purple-800'
      },
      critico: {
        red: 'bg-red-200 border-red-400 text-red-900',
        blue: 'bg-blue-200 border-blue-400 text-blue-900',
        green: 'bg-green-200 border-green-400 text-green-900',
        purple: 'bg-purple-200 border-purple-400 text-purple-900'
      }
    };

    return colorMap[level][baseColor] || colorMap.normal[baseColor];
  };

  const getStatusBadgeColor = (level) => {
    const colorMap = {
      normal: 'bg-green-100 text-green-800',
      menor: 'bg-yellow-100 text-yellow-800',
      moderado: 'bg-orange-100 text-orange-800',
      critico: 'bg-red-100 text-red-800'
    };
    return colorMap[level] || colorMap.normal;
  };

  const services = calculateServiceStatus();

  return (
    <div className="mb-8">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
          <span className="text-white text-lg">🏠</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Estado de Servicios Públicos
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Monitoreo en tiempo real de incidencias</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(services).map(([key, service]) => {
          const level = getStatusLevel(service.count);
          const statusText = getStatusText(service.count);
          
          return (
            <div
              key={key}
              className={`modern-card p-4 transition-all duration-300 hover:scale-105 ${
                getStatusColors(level, service.color)
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 bg-white bg-opacity-50 rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-2xl">{service.icon}</span>
                </div>
                <h3 className="font-bold text-base">{service.name}</h3>
                <span className={`px-3 py-1.5 text-sm font-semibold rounded-full shadow-sm ${getStatusBadgeColor(level)}`}>
                  {statusText}
                </span>
                <div className="text-sm font-medium opacity-90">
                  {service.count === 0 ? (
                    '✅ Sin reportes'
                  ) : (
                    `⚠️ ${service.count} reporte${service.count > 1 ? 's' : ''}`
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-sm text-gray-600 text-center font-medium">
          📊 Datos actualizados cada minuto • Últimas 24 horas
        </div>
      </div>
    </div>
  );
};

export default ServiceStatus;