import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function LogoUploader() {
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/config/logo`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Error al cargar logo');
      
      const data = await response.json();
      if (data.logo_data) {
        setLogo(data);
        setLogoPreview(data.logo_data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen no debe superar los 2MB');
      return;
    }

    // Convertir a base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Guardar archivo para subir
    setError('');
  };

  const handleUpload = async () => {
    if (!logoPreview) {
      setError('Por favor selecciona una imagen');
      return;
    }

    setError('');
    setSuccess('');
    setUploading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Obtener el archivo del input
      const fileInput = document.getElementById('logo-input');
      const file = fileInput.files[0];

      const response = await fetch(`${API_URL}/api/config/logo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          logo_data: logoPreview,
          logo_filename: file.name,
          logo_mimetype: file.type
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al subir logo');
      }

      setSuccess('✅ Logo subido exitosamente. Recarga la página para verlo en el header.');
      await fetchLogo();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de eliminar el logo?')) return;

    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/config/logo`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Error al eliminar logo');

      setSuccess('✅ Logo eliminado. Recarga la página para ver los cambios.');
      setLogo(null);
      setLogoPreview(null);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4 flex items-center">
        <span className="text-2xl mr-2">🖼️</span>
        Gestión del Logo
      </h3>

      <p className="text-sm text-gray-600 mb-4">
        Sube tu logo para que aparezca en el header de la aplicación y en las facturas generadas.
      </p>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="space-y-4">
        {/* Logo Preview */}
        {logoPreview && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-2">Vista Previa:</p>
            <img 
              src={logoPreview} 
              alt="Logo preview" 
              className="max-w-xs max-h-32 object-contain mx-auto"
            />
          </div>
        )}

        {/* File Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar Logo
          </label>
          <input
            id="logo-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-1">
            Formatos: JPG, PNG, GIF. Tamaño máximo: 2MB
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleUpload}
            disabled={!logoPreview || uploading}
            className={`px-6 py-2 rounded font-medium ${
              !logoPreview || uploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {uploading ? 'Subiendo...' : '📤 Subir Logo'}
          </button>

          {logo && (
            <button
              onClick={handleDelete}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
            >
              🗑️ Eliminar Logo
            </button>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h5 className="font-semibold text-blue-900 mb-2">💡 Información</h5>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>El logo aparecerá en el header (arriba) de la aplicación</li>
            <li>También se mostrará en todas las facturas que generes</li>
            <li>Recomendamos usar un logo con fondo transparente (PNG)</li>
            <li>Dimensiones ideales: 200x200px o mayor</li>
            <li>Después de subir, recarga la página para ver los cambios</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default LogoUploader;
