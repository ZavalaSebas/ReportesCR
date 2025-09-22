import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

const MapView = ({ reports, userLocation }) => {
  // Default center to Costa Rica coordinates
  const center = userLocation || [9.7489, -83.7534];

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
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>
              <div className="text-center">
                <strong>Tu ubicación</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Report markers */}
        {reports.map((report) => (
          <Marker
            key={report.id}
            position={[report.latitude, report.longitude]}
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
                  
                  {report.description && (
                    <div>
                      <strong>Descripción:</strong> {report.description}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-gray-600">
                      {report.confirmations} confirmación{report.confirmations !== 1 ? 'es' : ''}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(report.createdAt?.toDate?.() || report.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;