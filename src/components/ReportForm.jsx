import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createReport } from '../firebase';

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

// Function to get location name from coordinates
const getLocationName = async (latitude, longitude) => {
  try {
    // Try with multiple APIs
    
    // Option 1: Try BigDataCloud (no API key required, CORS friendly)
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('🌍 BigDataCloud response:', data);
        
        if (data && (data.locality || data.city || data.countryName)) {
          const parts = [];
          
          if (data.locality) parts.push(data.locality);
          if (data.city && data.city !== data.locality) parts.push(data.city);
          if (data.principalSubdivision) parts.push(data.principalSubdivision);
          if (data.countryName) parts.push(data.countryName);
          
          const formattedName = parts.length > 0 ? parts.join(', ') : data.localityInfo?.administrative?.[0]?.name || 'Ubicación encontrada';
          console.log('✅ Location name from BigDataCloud:', formattedName);
          return formattedName;
        }
      }
    } catch (error) {
      console.warn('BigDataCloud API failed:', error);
    }
    
    // Option 2: Try Nominatim as fallback
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=es`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('🗺️ Nominatim response:', data);
        
        if (data && data.display_name) {
          const address = data.address || {};
          const parts = [];
          
          if (address.road) parts.push(address.road);
          if (address.neighbourhood || address.suburb) parts.push(address.neighbourhood || address.suburb);
          if (address.city || address.town || address.village) parts.push(address.city || address.town || address.village);
          if (address.state) parts.push(address.state);
          
          const formattedName = parts.length > 0 ? parts.join(', ') : data.display_name;
          console.log('✅ Location name from Nominatim:', formattedName);
          return formattedName;
        }
      }
    } catch (error) {
      console.warn('Nominatim API failed:', error);
    }
    
    // Fallback to coordinates if all APIs fail
    console.warn('⚠️ All geocoding APIs failed, using coordinates');
    return `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
    
  } catch (error) {
    console.error('Error getting location name:', error);
    return `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
  }
};

const serviceTypes = [
  { value: 'luz', label: 'Electricidad' },
  { value: 'agua', label: 'Agua' },
  { value: 'internet', label: 'Internet' },
  { value: 'otros', label: 'Otros servicios' }
];

const providers = {
  luz: ['ICE', 'CNFL', 'ESPH', 'JASEC', 'COOPELESCA', 'COOPEGUANACASTE', 'Otro'],
  agua: ['AyA', 'ESPH', 'ASADAS', 'Municipalidad', 'Otro'],
  internet: ['ICE/Kolbi', 'Claro', 'Movistar', 'Tigo', 'Cable Tica', 'Otro'],
  otros: ['Otro']
};

const ReportForm = ({ user, onReportCreated, selectedLocationForReport, onRequestLocationSelection, onFormDataChange }) => {
  const [formData, setFormData] = useState({
    title: '',
    serviceType: '',
    provider: '',
    description: ''
  });
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [detectedLocationName, setDetectedLocationName] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [loadingLocationName, setLoadingLocationName] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle location selected from main map
  useEffect(() => {
    if (selectedLocationForReport) {
      console.log('🔄 Processing location from main map:', selectedLocationForReport);
      setSelectedLocation(selectedLocationForReport);
      setLoadingLocationName(true);
      
      getLocationName(selectedLocationForReport.latitude, selectedLocationForReport.longitude)
        .then(locationName => {
          console.log('📍 Location name obtained:', locationName);
          setSelectedLocationName(locationName || 'Ubicación seleccionada desde mapa');
        })
        .catch(error => {
          console.error('Error getting location name:', error);
          setSelectedLocationName('Ubicación seleccionada desde mapa');
        })
        .finally(() => {
          setLoadingLocationName(false);
        });
    }
  }, [selectedLocationForReport]);

  // Notify parent of form data changes
  useEffect(() => {
    if (onFormDataChange) {
      onFormDataChange(formData);
    }
  }, [formData, onFormDataChange]);

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setDetectedLocation(location);
          
          // Get location name
          setLoadingLocationName(true);
          const locationName = await getLocationName(location.latitude, location.longitude);
          setDetectedLocationName(locationName || 'Ubicación detectada');
          setLoadingLocationName(false);
          
          // Use detected location as default if no location is selected
          if (!selectedLocation) {
            setSelectedLocation(location);
            setSelectedLocationName(locationName || 'Ubicación detectada');
          }
        },
        async (error) => {
          console.warn("No se pudo obtener la ubicación:", error.message);
          // Set default location to San José, Costa Rica
          const defaultLocation = {
            latitude: 9.9281,
            longitude: -84.0907
          };
          setDetectedLocation(defaultLocation);
          
          // Get name for default location
          setLoadingLocationName(true);
          const locationName = await getLocationName(defaultLocation.latitude, defaultLocation.longitude);
          setDetectedLocationName(locationName || 'San José, Costa Rica (por defecto)');
          setLoadingLocationName(false);
          
          if (!selectedLocation) {
            setSelectedLocation(defaultLocation);
            setSelectedLocationName(locationName || 'San José, Costa Rica (por defecto)');
          }
          setError('Usando ubicación por defecto (San José). Puedes seleccionar la ubicación exacta en el mapa.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    } else {
      console.warn("Geolocalización no soportada");
      const defaultLocation = {
        latitude: 9.9281,
        longitude: -84.0907
      };
      setDetectedLocation(defaultLocation);
      setDetectedLocationName('San José, Costa Rica (por defecto)');
      
      if (!selectedLocation) {
        setSelectedLocation(defaultLocation);
        setSelectedLocationName('San José, Costa Rica (por defecto)');
      }
      setError('Geolocalización no soportada. Usando ubicación por defecto (San José).');
    }
  }, [selectedLocation]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value,
        // Reset provider when service type changes
        ...(name === 'serviceType' && { provider: '' })
      };
      
      // Auto-generate title based on service type if title is empty
      if (name === 'serviceType' && value && !prev.title.trim()) {
        const serviceLabel = serviceTypes.find(s => s.value === value)?.label || value;
        newData.title = `Corte de ${serviceLabel}`;
      }
      
      return newData;
    });
  };

  const handleLocationSelect = async (location) => {
    setSelectedLocation(location);
    setLoadingLocationName(true);
    
    try {
      const locationName = await getLocationName(location.latitude, location.longitude);
      setSelectedLocationName(locationName || 'Ubicación seleccionada');
    } catch (error) {
      console.error('Error getting location name:', error);
      setSelectedLocationName('Ubicación seleccionada');
    } finally {
      setLoadingLocationName(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('Debes iniciar sesión para crear un reporte.');
      return;
    }

    if (!(selectedLocation || detectedLocation)) {
      setError('No se pudo obtener tu ubicación. Por favor selecciona una ubicación en el mapa.');
      return;
    }

    if (!formData.serviceType || !formData.provider) {
      setError('Por favor completa todos los campos obligatorios.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const finalLocation = selectedLocation || detectedLocation;
      const finalLocationName = selectedLocation ? selectedLocationName : detectedLocationName;
      
      const reportData = {
        title: formData.title || `${formData.serviceType} - ${formData.provider}`,
        serviceType: formData.serviceType,
        provider: formData.provider,
        description: formData.description || '',
        // Store coordinates in both formats for compatibility
        latitude: finalLocation.latitude,
        longitude: finalLocation.longitude,
        location: {
          latitude: finalLocation.latitude,
          longitude: finalLocation.longitude
        },
        locationName: finalLocationName || 'Ubicación no disponible',
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email,
        createdAt: new Date(),
        confirmations: 0,
        confirmed_by: []
      };

      console.log('Creating report with data:', reportData);
      await createReport(reportData);
      
      // Reset form
      setFormData({
        title: '',
        serviceType: '',
        provider: '',
        description: ''
      });

      // Clear any previous errors and show success message
      setError('');
      setSuccess('¡Reporte creado exitosamente! 🎉');

      // Notify parent component
      if (onReportCreated) {
        onReportCreated();
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);

    } catch (error) {
      console.error('Error creating report:', error);
      setError('Error al crear el reporte. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Crear Reporte</h2>
        <p className="text-gray-600">Debes iniciar sesión para crear reportes.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Crear Nuevo Reporte</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Título del Reporte
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Ej: Corte de luz en San José Centro"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Opcional - se generará automáticamente si no se especifica</p>
        </div>

        {/* Service Type */}
        <div>
          <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Servicio *
          </label>
          <select
            id="serviceType"
            name="serviceType"
            value={formData.serviceType}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecciona un servicio</option>
            {serviceTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Provider */}
        {formData.serviceType && (
          <div>
            <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-1">
              Proveedor *
            </label>
            <select
              id="provider"
              name="provider"
              value={formData.provider}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecciona un proveedor</option>
              {providers[formData.serviceType]?.map(provider => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción (Opcional)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            placeholder="Describe el problema que estás experimentando..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Location Section */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Ubicación del Problema *
          </label>
          
          <div className="space-y-3">
            {/* Current location display */}
            <div className="bg-white p-3 rounded border">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-700">
                  {selectedLocation ? 'Ubicación seleccionada:' : 'Ubicación detectada:'}
                </div>
                <div className="flex space-x-2">
                  {onRequestLocationSelection && (
                    <button
                      type="button"
                      onClick={() => {
                        console.log('🔴 ReportForm button clicked - calling onRequestLocationSelection');
                        onRequestLocationSelection();
                      }}
                      className="text-sm px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    >
                      🗺️ Marcar en mapa
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowMapSelector(!showMapSelector)}
                    className={`text-sm px-3 py-1 rounded transition-colors ${
                      showMapSelector 
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {showMapSelector ? '📋 Ocultar mapa local' : '� Ajustar aquí'}
                  </button>
                </div>
              </div>
              
              {/* Location name */}
              <div className="mb-2">
                {loadingLocationName ? (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    <span>Obteniendo dirección...</span>
                  </div>
                ) : (
                  <div className="text-sm font-medium text-gray-800">
                    📍 {selectedLocation ? selectedLocationName : detectedLocationName}
                  </div>
                )}
              </div>
              
              {/* Coordinates */}
              <div className="text-xs text-gray-500">
                Coordenadas: {(selectedLocation || detectedLocation)?.latitude.toFixed(6)}, {(selectedLocation || detectedLocation)?.longitude.toFixed(6)}
              </div>
              
              {detectedLocation && selectedLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLocation(null);
                    setSelectedLocationName('');
                  }}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                >
                  � Volver a ubicación GPS
                </button>
              )}
            </div>

            {/* Interactive Map Selector */}
            {showMapSelector && (
              <div className="bg-white rounded border overflow-hidden">
                <div className="p-3 bg-gray-50 border-b">
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    Haz clic en el mapa para seleccionar la ubicación exacta
                  </div>
                  <div className="text-xs text-gray-500">
                    💡 Puedes hacer zoom y arrastrar para encontrar el lugar exacto
                  </div>
                </div>
                
                <div className="h-64">
                  <MapContainer
                    center={[
                      (selectedLocation || detectedLocation)?.latitude || 9.7489,
                      (selectedLocation || detectedLocation)?.longitude || -83.7534
                    ]}
                    zoom={16}
                    className="w-full h-full"
                    key={`map-${showMapSelector}`}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    <MapClickHandler onLocationSelect={handleLocationSelect} />

                    {/* GPS detected location (blue marker) */}
                    {detectedLocation && !selectedLocation && (
                      <Marker 
                        position={[detectedLocation.latitude, detectedLocation.longitude]} 
                      />
                    )}

                    {/* User selected location (red marker) */}
                    {selectedLocation && (
                      <Marker 
                        position={[selectedLocation.latitude, selectedLocation.longitude]} 
                      />
                    )}
                  </MapContainer>
                </div>
                
                <div className="p-2 bg-gray-50 border-t text-xs text-gray-600 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {detectedLocation && !selectedLocation && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Ubicación GPS</span>
                      </div>
                    )}
                    {selectedLocation && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>Ubicación seleccionada</span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setShowMapSelector(false)}
                    className="text-red-600 hover:text-red-700 font-medium"
                  >
                    ✓ Confirmar ubicación
                  </button>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              💡 <strong>Tip:</strong> Usa <strong>"Marcar en mapa"</strong> para seleccionar directamente en el mapa principal, o <strong>"Ajustar aquí"</strong> para usar el mapa local
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !(selectedLocation || detectedLocation)}
          className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
            loading || !(selectedLocation || detectedLocation)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700'
          } text-white`}
        >
          {loading ? 'Creando reporte...' : 'Crear Reporte'}
        </button>
      </form>
    </div>
  );
};

export default ReportForm;