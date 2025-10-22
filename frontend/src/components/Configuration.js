import React, { useState, useEffect } from 'react';
import LogoUploader from './LogoUploader';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function Configuration() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newStartNumber, setNewStartNumber] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/config/invoice-counter`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Error al cargar configuración');
      
      const data = await response.json();
      setConfig(data);
      setNewStartNumber(data.current_number);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCounter = async () => {
    setError('');
    setSuccess('');

    const startNum = parseInt(newStartNumber);
    if (isNaN(startNum) || startNum < 1) {
      setError('El número debe ser mayor a 0');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/config/invoice-counter?new_start=${startNum}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al actualizar');
      }

      const data = await response.json();
      setSuccess(data.message);
      if (data.warning) {
        setError(`⚠️ ${data.warning}`);
      }
      
      await fetchConfig();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReset = async () => {
    setError('');
    setSuccess('');

    const startNum = parseInt(newStartNumber);
    if (isNaN(startNum) || startNum < 1) {
      setError('El número debe ser mayor a 0');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/config/reset-invoice-counter?start_number=${startNum}&confirm=true`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al resetear');
      }

      const data = await response.json();
      setSuccess(data.message);
      setShowResetConfirm(false);
      
      await fetchConfig();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Configuración del Sistema</h2>
        <p className="text-gray-500 mt-1">Administra la configuración general de la aplicación</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Logo Uploader */}
      <LogoUploader />

      {/* Import/Export Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <span className="text-2xl mr-2">📥📤</span>
          Importar / Exportar Datos
        </h3>
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">📋 Descargar Plantilla de Importación</h4>
            <p className="text-sm text-gray-700 mb-3">
              Descarga una plantilla Excel con todas las secciones (Clientes, Villas, Reservaciones, Gastos) para llenar offline y luego importar.
            </p>
            <button
              onClick={async () => {
                try {
                  const response = await fetch(`${API_URL}/api/export/template`, {
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                  });
                  if (!response.ok) throw new Error('Error al descargar plantilla');
                  
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'Plantilla_Importacion_Espacios_Con_Piscina.xlsx';
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  
                  alert('✅ Plantilla descargada exitosamente');
                } catch (err) {
                  alert('❌ Error al descargar plantilla: ' + err.message);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              📥 Descargar Plantilla Excel
            </button>
          </div>
          
          <div className="bg-green-50 p-4 rounded-md border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2">📤 Exportar Datos Existentes</h4>
            <p className="text-sm text-gray-700 mb-3">
              Exporta tus datos actuales a Excel para hacer respaldo o edición masiva.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['customers', 'villas', 'reservations', 'expenses'].map(type => {
                const names = {
                  customers: 'Clientes',
                  villas: 'Villas',
                  reservations: 'Reservaciones',
                  expenses: 'Gastos'
                };
                return (
                  <button
                    key={type}
                    onClick={async () => {
                      try {
                        const response = await fetch(`${API_URL}/api/export/${type}`, {
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                          }
                        });
                        if (!response.ok) throw new Error('Error al exportar');
                        
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${names[type]}_Export.xlsx`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                        
                        alert(`✅ ${names[type]} exportados exitosamente`);
                      } catch (err) {
                        alert(`❌ Error al exportar ${names[type]}: ` + err.message);
                      }
                    }}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                  >
                    {names[type]}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-md border border-orange-200 mt-4">
            <h4 className="font-semibold text-orange-900 mb-2">📤 Importar Datos desde Excel</h4>
            <p className="text-sm text-gray-700 mb-3">
              Sube el archivo Excel que llenaste (plantilla descargada arriba) para importar masivamente tus datos históricos.
            </p>
            <p className="text-xs text-red-600 font-semibold mb-3">
              ⚠️ IMPORTANTE: Para reservaciones con owner_price mayor a 0, el sistema creará automáticamente el gasto de "Pago Propietario" en estado PENDIENTE. Luego puedes marcar los que ya pagaste.
            </p>
            <input
              type="file"
              id="import-excel-file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                if (!window.confirm(`¿Estás seguro de importar el archivo "${file.name}"?\n\nEsto creará/actualizará datos en la base de datos.`)) {
                  e.target.value = '';
                  return;
                }
                
                try {
                  const formData = new FormData();
                  formData.append('file', file);
                  
                  const response = await fetch(`${API_URL}/api/import/excel`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                  });
                  
                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Error al importar');
                  }
                  
                  const result = await response.json();
                  
                  alert(result.summary);
                  
                  // Mostrar errores si hay
                  if (result.details) {
                    const allErrors = Object.values(result.details).flatMap(r => r.errors || []);
                    if (allErrors.length > 0) {
                      console.log('Errores de importación:', allErrors);
                    }
                  }
                  
                  e.target.value = ''; // Reset input
                } catch (err) {
                  alert(`❌ Error al importar: ${err.message}`);
                  e.target.value = '';
                }
              }}
            />
            <button
              onClick={() => document.getElementById('import-excel-file').click()}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-medium"
            >
              📥 Seleccionar Archivo Excel para Importar
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Counter Configuration */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <span className="text-2xl mr-2">🔢</span>
          Numeración de Facturas
        </h3>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Próxima Factura:</p>
                <p className="text-3xl font-bold text-blue-600">#{config?.next_invoice || '1600'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Contador Actual:</p>
                <p className="text-2xl font-semibold text-gray-700">{config?.current_number || 1600}</p>
              </div>
            </div>
          </div>

          {/* Update Counter */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3 text-gray-700">Establecer Número Inicial de Factura</h4>
            <p className="text-sm text-gray-600 mb-4">
              Define desde qué número quieres que comiencen las facturas. Esto es útil cuando inicias con datos limpios.
            </p>

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Inicio
                </label>
                <input
                  type="number"
                  min="1"
                  value={newStartNumber}
                  onChange={(e) => setNewStartNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 1600, 1548, etc."
                />
                <p className="text-xs text-gray-500 mt-1">
                  La próxima factura será: #{newStartNumber || '---'}
                </p>
              </div>

              <button
                onClick={handleUpdateCounter}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                Actualizar
              </button>
            </div>
          </div>

          {/* Reset Section */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2 text-gray-700 flex items-center">
              <span className="text-yellow-500 mr-2">⚠️</span>
              Resetear Contador (Avanzado)
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Solo usa esta opción si NO tienes ninguna reservación en el sistema. 
              Si ya tienes reservaciones, usa "Actualizar" en su lugar.
            </p>

            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
              >
                Mostrar Opción de Reset
              </button>
            ) : (
              <div className="bg-yellow-50 border border-yellow-300 rounded p-4">
                <p className="text-sm font-semibold text-yellow-800 mb-3">
                  ⚠️ ¿Estás seguro? Solo hazlo si el sistema está vacío (sin reservaciones).
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                  >
                    Sí, Resetear Contador
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Help Section */}
          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <h5 className="font-semibold text-gray-700 mb-2">📖 Guía de Uso</h5>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li><strong>Actualizar:</strong> Usa esto para cambiar el número inicial en cualquier momento. Las facturas existentes no se modificarán.</li>
              <li><strong>Resetear:</strong> Solo para cuando el sistema esté completamente vacío (sin reservaciones).</li>
              <li><strong>Recomendación:</strong> Establece el número inicial antes de crear tu primera reservación.</li>
              <li><strong>Ejemplo:</strong> Si tu última factura física fue #1547, establece el contador en 1548.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Configuration;
