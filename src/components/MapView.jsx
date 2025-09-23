import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
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

// Component to handle map clicks for location selection
const MapClickHandler = ({ isLocationSelectionMode, onLocationSelect }) => {
  useMapEvents({
    click(e) {
      console.log('🖱️ Map clicked - Selection mode:', isLocationSelectionMode);
      if (isLocationSelectionMode && onLocationSelect) {
        const { lat, lng } = e.latlng;
        console.log('📍 Calling onLocationSelect with:', { latitude: lat, longitude: lng });
        onLocationSelect({
          latitude: lat,
          longitude: lng
        });
      }
    },
  });
  return null;
};

// Custom icon for selected location (larger and different color)
const selectedLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [32, 52],
  iconAnchor: [16, 52],
  popupAnchor: [1, -44],
  shadowSize: [52, 52]
});

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

const MapView = ({ 
  reports, 
  userLocation, 
  isLocationSelectionMode = false, 
  onLocationSelect = null,
  selectedLocation = null,
  user = null,
  onConfirmReport = null,
  onSmartLocationSelect = null,
  hasConfirmedReport = null
}) => {
  // Debug logging
  console.log('🗺️ MapView props:', { 
    isLocationSelectionMode, 
    hasOnLocationSelect: !!onLocationSelect,
    selectedLocation,
    user: !!user
  });

  // Function to handle smart confirmation/location selection
  const handleSmartConfirmation = (report, latitude, longitude) => {
    if (isLocationSelectionMode && onSmartLocationSelect && user) {
      // User is in location selection mode - use smart logic
      console.log('🧠 Using smart location selection logic');
      onSmartLocationSelect({ latitude, longitude }, report, reports);
      return;
    }

    if (isLocationSelectionMode && onLocationSelect && user) {
      // Fallback to simple location selection
      onLocationSelect({ latitude, longitude });
      return;
    }

    // Should not reach here since buttons are conditional
    console.log('No action taken - unexpected state');
  };

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
    <div className="w-full h-64 md:h-96 lg:h-[500px] rounded-lg overflow-hidden shadow-lg relative">
      {/* Selection mode indicator */}
      {isLocationSelectionMode && (
        <div className="absolute top-4 left-4 right-4 z-[1000] bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">📍 Haz clic donde quieras marcar la ubicación</span>
            <button
              onClick={() => {
                console.log('✅ Exiting selection mode');
                if (onLocationSelect) {
                  // Signal to exit selection mode
                  onLocationSelect('EXIT_SELECTION_MODE');
                }
              }}
              className="bg-purple-700 hover:bg-purple-800 px-3 py-1 rounded text-xs font-medium transition-colors ml-4"
            >
              ✓ Listo
            </button>
          </div>
        </div>
      )}
      
      <MapContainer
        center={center}
        zoom={userLocation ? 13 : 8}
        className="w-full h-full"
        style={{ 
          cursor: isLocationSelectionMode ? 'crosshair' : 'grab'
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Map click handler for location selection */}
        <MapClickHandler 
          isLocationSelectionMode={isLocationSelectionMode}
          onLocationSelect={onLocationSelect}
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

        {/* Selected location marker (for location selection mode) */}
        {isLocationSelectionMode && selectedLocation && (
          <Marker 
            position={[selectedLocation.latitude, selectedLocation.longitude]}
            icon={selectedLocationIcon}
          >
            <Popup>
              <div className="text-center">
                <strong>📍 Ubicación seleccionada</strong>
                <br />
                <small>Lat: {selectedLocation.latitude.toFixed(6)}</small>
                <br />
                <small>Lng: {selectedLocation.longitude.toFixed(6)}</small>
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
              >
                {/* Popup for circles (always show for interaction) */}
                <Popup>
                  <div className="p-2 text-center">
                    <div className="mb-3">
                      <span className={`font-bold ${serviceColors[report.serviceType]} capitalize`}>
                        Zona afectada - {report.serviceType}
                      </span>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatProviders(report.provider).isMerged ? (
                          <div className="bg-yellow-50 p-2 rounded">
                            <div className="font-medium text-yellow-800 mb-1">
                              {formatProviders(report.provider).providers.length} proveedores afectados:
                            </div>
                            <div className="space-y-1">
                              {formatProviders(report.provider).providers.map((provider, index) => (
                                <div key={index} className="flex items-center justify-center space-x-1">
                                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                                  <span className="text-xs">{provider}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          report.provider
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {/* Confirmation button (always visible) */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          console.log('🎯 Confirming from circle:', report);
                          
                          // Check if user already confirmed this report (for logged users)
                          if (user && report.confirmed_by && report.confirmed_by.includes(user.uid)) {
                            alert('⚠️ Ya has confirmado este reporte anteriormente');
                            return;
                          }
                          
                          // Check antispam for non-logged users
                          if (!user && hasConfirmedReport && hasConfirmedReport(report.id)) {
                            alert('⚠️ Ya has confirmado este reporte anteriormente desde este dispositivo');
                            return;
                          }
                          
                          if (onConfirmReport) {
                            onConfirmReport(report);
                          }
                        }}
                        disabled={
                          (user && report.confirmed_by && report.confirmed_by.includes(user.uid)) ||
                          (!user && hasConfirmedReport && hasConfirmedReport(report.id))
                        }
                        className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                          (user && report.confirmed_by && report.confirmed_by.includes(user.uid)) ||
                          (!user && hasConfirmedReport && hasConfirmedReport(report.id))
                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {(user && report.confirmed_by && report.confirmed_by.includes(user.uid)) ||
                         (!user && hasConfirmedReport && hasConfirmedReport(report.id))
                          ? '✅ Ya confirmado'
                          : '✅ Confirmar este reporte'
                        }
                      </button>
                      
                      {/* Location selection button (only in selection mode) */}
                      {isLocationSelectionMode && user && onLocationSelect && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('🎯 Using location from circle:', { latitude, longitude, report });
                            handleSmartConfirmation(report, latitude, longitude);
                          }}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                        >
                          📍 Marcar aquí mi reporte
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Circle>
              
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
                        <strong>Proveedor{formatProviders(report.provider).isMerged ? 'es' : ''}:</strong>
                        <div className={`${formatProviders(report.provider).isMerged ? 'bg-yellow-50 p-2 rounded mt-1' : ''}`}>
                          {formatProviders(report.provider).isMerged ? (
                            <div className="space-y-1">
                              {formatProviders(report.provider).providers.map((provider, index) => (
                                <div key={index} className="flex items-center space-x-1">
                                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                  <span>{provider}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-600">{report.provider}</span>
                          )}
                        </div>
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
                      
                      {/* Smart confirmation/selection buttons */}
                      <div className="pt-2 border-t mt-2 space-y-2">
                        {/* Confirmation button (always visible) */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            console.log('🎯 Confirming existing report:', report);
                            
                            // Check if user already confirmed this report (for logged users)
                            if (user && report.confirmed_by && report.confirmed_by.includes(user.uid)) {
                              alert('⚠️ Ya has confirmado este reporte anteriormente');
                              return;
                            }
                            
                            // Check antispam for non-logged users
                            if (!user && hasConfirmedReport && hasConfirmedReport(report.id)) {
                              alert('⚠️ Ya has confirmado este reporte anteriormente desde este dispositivo');
                              return;
                            }
                            
                            if (onConfirmReport) {
                              onConfirmReport(report);
                            }
                          }}
                          disabled={
                            (user && report.confirmed_by && report.confirmed_by.includes(user.uid)) ||
                            (!user && hasConfirmedReport && hasConfirmedReport(report.id))
                          }
                          className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                            (user && report.confirmed_by && report.confirmed_by.includes(user.uid)) ||
                            (!user && hasConfirmedReport && hasConfirmedReport(report.id))
                              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {(user && report.confirmed_by && report.confirmed_by.includes(user.uid)) ||
                           (!user && hasConfirmedReport && hasConfirmedReport(report.id))
                            ? '✅ Ya confirmado'
                            : '✅ Confirmar este reporte'
                          }
                        </button>
                        
                        {/* Location selection button (only in selection mode) */}
                        {isLocationSelectionMode && user && onLocationSelect && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('🎯 Using location from popup:', { latitude, longitude, report });
                              handleSmartConfirmation(report, latitude, longitude);
                            }}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                          >
                            📍 Usar esta ubicación
                          </button>
                        )}
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