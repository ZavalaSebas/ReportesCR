import React from 'react';

const NearbyReports = ({ reports, userLocation, user }) => {
  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  };

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Hace tiempo';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 60) {
      return `Hace ${diffMinutes}m`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours}h`;
    } else {
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return `Hace ${diffDays}d`;
    }
  };

  // Get service icon and color
  const getServiceInfo = (serviceType) => {
    const serviceInfo = {
      luz: { icon: '⚡', color: 'text-red-600' },
      agua: { icon: '💧', color: 'text-blue-600' },
      internet: { icon: '🌐', color: 'text-green-600' },
      otros: { icon: '🔧', color: 'text-purple-600' }
    };

    const type = serviceType?.toLowerCase();
    return serviceInfo[type] || { icon: '📋', color: 'text-gray-600' };
  };

  // Get nearby reports (within 5km)
  const getNearbyReports = () => {
    if (!userLocation || !reports.length) return [];

    const [userLat, userLon] = userLocation;
    const nearby = [];

    reports.forEach(report => {
      if (report.location?.latitude && report.location?.longitude) {
        const distance = calculateDistance(
          userLat, 
          userLon, 
          report.location.latitude, 
          report.location.longitude
        );

        // Only include reports within 5km and from last 48 hours
        const reportDate = report.createdAt?.toDate ? report.createdAt.toDate() : new Date(report.createdAt);
        const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

        if (distance <= 5 && reportDate >= twoDaysAgo) {
          nearby.push({
            ...report,
            distance: distance
          });
        }
      }
    });

    // Sort by distance (closest first) and take top 3
    return nearby
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  };

  const nearbyReports = getNearbyReports();

  if (!userLocation) {
    return (
      <div className="modern-card p-6">
        <h3 className="heading-secondary mb-6 flex items-center">
          <span className="mr-3 w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-sm">📍</span>
          Cerca de ti
        </h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📍</span>
          </div>
          <div className="loading-shimmer h-4 w-32 mx-auto rounded mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            Obteniendo tu ubicación...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-card p-6">
      <h3 className="heading-secondary mb-6 flex items-center">
        <span className="mr-3 w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-sm">📍</span>
        Cerca de ti
      </h3>

      {nearbyReports.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Todo normal en tu área
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            No hay reportes de servicios en un radio de 5km
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {nearbyReports.map((report) => {
            const serviceInfo = getServiceInfo(report.serviceType);
            const isOwnReport = user && report.userId === user.uid;
            
            return (
              <div
                key={report.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${serviceInfo.color} group-hover:scale-110 transition-transform duration-200`}>
                      <span className="text-base font-medium">{serviceInfo.icon}</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`text-sm font-bold ${serviceInfo.color} capitalize`}>
                        {report.serviceType}
                        {isOwnReport && (
                          <span className="ml-2 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded-full">Tu reporte</span>
                        )}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                        {formatTimeAgo(report.createdAt)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 font-medium">
                      {report.provider && (
                        <span className="text-gray-900 dark:text-gray-100">{report.provider}</span>
                      )}
                      {report.provider && report.locationName && (
                        <span className="text-gray-500 dark:text-gray-400"> • </span>
                      )}
                      <span className="text-gray-600 dark:text-gray-300">{report.locationName}</span>
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-medium text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-full">
                          📍 {report.distance.toFixed(1)} km
                        </span>
                        {report.confirmations > 0 && (
                          <span className="text-xs font-medium text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                            👥 {report.confirmations}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          <div className="mt-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-600 dark:text-gray-300 text-center font-medium">
              📡 Radio de búsqueda: 5 kilómetros
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NearbyReports;