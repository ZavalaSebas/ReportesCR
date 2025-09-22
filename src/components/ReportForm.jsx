import React, { useState, useEffect } from 'react';
import { createReport } from '../firebase';

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

const ReportForm = ({ user, onReportCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    serviceType: '',
    provider: '',
    description: ''
  });
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn("No se pudo obtener la ubicación:", error.message);
          // Set default location to San José, Costa Rica
          setUserLocation({
            latitude: 9.9281,
            longitude: -84.0907
          });
          setError('Usando ubicación por defecto (San José). Puedes permitir la geolocalización para mayor precisión.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    } else {
      console.warn("Geolocalización no soportada");
      setUserLocation({
        latitude: 9.9281,
        longitude: -84.0907
      });
      setError('Geolocalización no soportada. Usando ubicación por defecto (San José).');
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Reset provider when service type changes
      ...(name === 'serviceType' && { provider: '' })
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('Debes iniciar sesión para crear un reporte.');
      return;
    }

    if (!userLocation) {
      setError('No se pudo obtener tu ubicación. Intenta nuevamente.');
      return;
    }

    if (!formData.serviceType || !formData.provider) {
      setError('Por favor completa todos los campos obligatorios.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const reportData = {
        title: formData.title || `${formData.serviceType} - ${formData.provider}`,
        serviceType: formData.serviceType,
        provider: formData.provider,
        description: formData.description || '',
        location: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        },
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

        {/* Location Status */}
        <div className="text-sm text-gray-600">
          📍 Ubicación: {userLocation ? '✅ Detectada' : '❌ No disponible'}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !userLocation}
          className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
            loading || !userLocation
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {loading ? 'Creando reporte...' : 'Crear Reporte'}
        </button>
      </form>
    </div>
  );
};

export default ReportForm;