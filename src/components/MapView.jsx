import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different service types
const createIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const serviceIcons = {
  luz: createIcon('red'),
  agua: createIcon('blue'),
  internet: createIcon('green'),
  otros: createIcon('orange')
};

const serviceColors = {
  luz: 'text-red-600',
  agua: 'text-blue-600', 
  internet: 'text-green-600',
  otros: 'text-orange-600'
};

// Circle colors and styles for each service type
const circleStyles = {
  luz: {
    color: '#dc2626', // red-600
    fillColor: '#dc2626',
    fillOpacity: 0.3, // More visible
    weight: 3,
    radius: 800 // Larger for testing
  },
  agua: {
    color: '#2563eb', // blue-600
    fillColor: '#2563eb',
    fillOpacity: 0.3,
    weight: 3,
    radius: 800
  },
  internet: {
    color: '#16a34a', // green-600
    fillColor: '#16a34a',
    fillOpacity: 0.3,
    weight: 3,
    radius: 800
  },
  otros: {
    color: '#ea580c', // orange-600
    fillColor: '#ea580c',
    fillOpacity: 0.3,
    weight: 3,
    radius: 800
  }
};

const MapView = ({ reports, userLocation }) => {
  // Default center to Costa Rica coordinates
  const center = userLocation || [9.7489, -83.7534];

  // Don't render if we don't have proper coordinates
  if (!center || !Array.isArray(center) || center.length !== 2) {
    return (
      <div className="w-full h-64 md:h-96 lg:h-[500px] rounded-lg overflow-hidden shadow-lg bg-gray-200 flex items-center justify-center">
        <p className="text-gray-600">Cargando mapa...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64 md:h-96 lg:h-[500px] rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        center={center}
        zoom={userLocation ? 13 : 8}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* User location marker */}
        {userLocation && Array.isArray(userLocation) && userLocation.length === 2 && (
          <Marker position={userLocation}>
            <Popup>
              <div className="text-center">
                <strong>Tu ubicación</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Report markers and circles */}
        {reports && Array.isArray(reports) && reports.map((report) => {
          console.log('Processing report for map:', {
            id: report.id,
            lat: report.latitude,
            lng: report.longitude,
            location: report.location,
            serviceType: report.serviceType
          });
          
          // Try different ways to get coordinates
          let latitude, longitude;
          
          if (report.latitude && report.longitude) {
            latitude = report.latitude;
            longitude = report.longitude;
          } else if (report.location && report.location.latitude && report.location.longitude) {
            latitude = report.location.latitude;
            longitude = report.location.longitude;
          } else {
            console.warn('Report missing coordinates:', report);
            return null;
          }
          
          // Validate coordinates are numbers
          if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            console.warn('Invalid coordinates for report:', report.id, latitude, longitude);
            return null;
          }
          
          const position = [latitude, longitude];
          const circleStyle = circleStyles[report.serviceType] || circleStyles.otros;
          
          console.log('Rendering circle and marker at:', position, 'with style:', circleStyle);
          
          return (
            <React.Fragment key={report.id}>
              {/* Affected area circle */}
              <Circle
                center={position}
                radius={circleStyle.radius}
                pathOptions={{
                  color: circleStyle.color,
                  fillColor: circleStyle.fillColor,
                  fillOpacity: circleStyle.fillOpacity,
                  weight: circleStyle.weight
                }}
              />
              
              {/* Report marker */}
              <Marker
                position={position}
                icon={serviceIcons[report.serviceType] || serviceIcons.otros}
              >
                <Popup>
                  <div className="p-2 max-w-xs">
                    <div className="flex items-center mb-2">
                      <span className={`font-bold text-lg ${serviceColors[report.serviceType]} capitalize`}>
                        {report.serviceType}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div>
                        <strong>Proveedor:</strong> {report.provider}
                      </div>
                      
                      {report.locationName && (
                        <div>
                          <strong>Ubicación:</strong> {report.locationName}
                        </div>
                      )}
                      
                      {report.description && (
                        <div>
                          <strong>Descripción:</strong> {report.description}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-gray-600">
                          {report.confirmations || 0} confirmación{(report.confirmations || 0) !== 1 ? 'es' : ''}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(report.createdAt?.toDate?.() || report.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;