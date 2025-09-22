import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Simple click handler component
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      onLocationSelect({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng
      });
    },
  });
  return null;
};

const LocationPicker = ({ 
  currentLocation, 
  selectedLocation, 
  onLocationSelect,
  isOpen,
  onClose 
}) => {
  const [tempLocation, setTempLocation] = useState(selectedLocation || currentLocation);

  if (!isOpen) return null;

  const center = tempLocation || currentLocation || [9.7489, -83.7534];

  const handleConfirm = () => {
    if (tempLocation) {
      onLocationSelect(tempLocation);
    }
    onClose();
  };

  const handleUseCurrentLocation = () => {
    if (currentLocation) {
      setTempLocation(currentLocation);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              📍 Seleccionar Ubicación
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Haz clic en el mapa para seleccionar la ubicación exacta
          </p>
        </div>

        {/* Map */}
        <div className="h-96">
          {isOpen && (
            <MapContainer
              center={center}
              zoom={15}
              className="w-full h-full"
              key={`map-${isOpen}`}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapClickHandler onLocationSelect={setTempLocation} />

              {/* Current location marker (blue) */}
              {currentLocation && (
                <Marker position={[currentLocation.latitude, currentLocation.longitude]} />
              )}

              {/* Selected location marker (red) */}
              {tempLocation && (
                <Marker position={[tempLocation.latitude, tempLocation.longitude]} />
              )}
            </MapContainer>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-gray-200">
          <div className="space-y-3">
            
            {/* Location info */}
            {tempLocation && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                📍 Ubicación seleccionada: {tempLocation.latitude.toFixed(6)}, {tempLocation.longitude.toFixed(6)}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 justify-end">
              {currentLocation && (
                <button
                  onClick={handleUseCurrentLocation}
                  className="px-4 py-2 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
                >
                  � Usar ubicación actual
                </button>
              )}
              
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              
              <button
                onClick={handleConfirm}
                disabled={!tempLocation}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  tempLocation
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                ✓ Confirmar
              </button>
            </div>

            {/* Simple instructions */}
            <div className="text-xs text-gray-500 text-center">
              💡 Haz clic en cualquier punto del mapa para seleccionar esa ubicación
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;