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

    // Sort by distance (closest first) and take top 5
    return nearby
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  };

  const nearbyReports = getNearbyReports();

  if (!userLocation) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">📍</span>
          Cerca de ti
        </h3>
        <div className="text-center py-4">
          <div className="text-gray-400 text-3xl mb-2">📍</div>
          <p className="text-sm text-gray-600">
            Obteniendo tu ubicación...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">📍</span>
        Cerca de ti
      </h3>

      {nearbyReports.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-gray-400 text-4xl mb-3">✅</div>
          <p className="text-sm text-gray-600 mb-1">
            No hay reportes cerca de ti
          </p>
          <p className="text-xs text-gray-500">
            ¡Todo normal en tu área!
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
                className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ${serviceInfo.color}`}>
                      <span className="text-sm">{serviceInfo.icon}</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`text-sm font-medium ${serviceInfo.color} capitalize truncate`}>
                        {report.serviceType}
                        {isOwnReport && (
                          <span className="ml-1 text-xs text-gray-500">(Tu reporte)</span>
                        )}
                      </h4>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                        {formatTimeAgo(report.createdAt)}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {report.provider && (
                        <span className="font-medium">{report.provider}</span>
                      )}
                      {report.provider && report.locationName && ' • '}
                      {report.locationName}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>📍 {report.distance.toFixed(1)} km</span>
                        {report.confirmations > 0 && (
                          <span>👥 {report.confirmations}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              Mostrando reportes en un radio de 5km
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NearbyReports;