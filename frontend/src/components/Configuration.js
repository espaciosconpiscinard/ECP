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
  const [templatesInfo, setTemplatesInfo] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchTemplatesInfo();
  }, []);

  const fetchTemplatesInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/import/templates/info`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplatesInfo(data.templates || []);
      }
    } catch (err) {
      console.error('Error al cargar info de plantillas:', err);
    }
  };

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

  const downloadTemplate = async (templateKey, filename) => {
    try {
      setLoadingTemplates(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/import/template/${templateKey}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Error al descargar plantilla');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert(`✅ Plantilla "${filename}" descargada exitosamente`);
    } catch (err) {
      alert(`❌ Error al descargar: ${err.message}`);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleImportFile = async (templateKey, file) => {
    if (!file) return;
    
    if (!window.confirm(`¿Importar "${file.name}"?\n\nEsto agregará/actualizará datos en la base de datos.`)) {
      return;
    }
    
    try {
      setLoadingTemplates(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_URL}/api/import/${templateKey}`, {
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
      alert(`✅ Importación exitosa!\n\n${result.summary || result.message}`);
      
      // Recargar info de plantillas para actualizar contadores
      await fetchTemplatesInfo();
    } catch (err) {
      alert(`❌ Error al importar: ${err.message}`);
    } finally {
      setLoadingTemplates(false);
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

      {/* Import/Export Section - Hierarchical */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <span className="text-2xl mr-2">📥📤</span>
          Importar Datos - Sistema Jerárquico
        </h3>
        
        <div className="bg-blue-50 p-4 rounded-md border-2 border-blue-300 mb-6">
          <h4 className="font-bold text-blue-900 mb-2">ℹ️ Instrucciones Importantes</h4>
          <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
            <li><strong>Sigue el orden</strong>: Descarga y completa las plantillas en el orden indicado (1→6)</li>
            <li><strong>Listas desplegables</strong>: Las plantillas incluyen dropdowns automáticos con tus datos actuales</li>
            <li><strong>Paso por paso</strong>: Completa y carga cada paso antes de continuar al siguiente</li>
            <li><strong>Validaciones</strong>: Excel te ayudará con listas y formatos correctos</li>
          </ol>
        </div>
        
        {/* Plantillas Jerárquicas */}
        <div className="space-y-4">
          {templatesInfo.map((template) => {
            const templateConfigs = {
              'customers': { key: 'customers', filename: 'Paso_1_Clientes.xlsx' },
              'villa_categories': { key: 'villa-categories', filename: 'Paso_2_Categorias_Villas.xlsx' },
              'villas': { key: 'villas', filename: 'Paso_3_Villas.xlsx' },
              'services': { key: 'services', filename: 'Paso_4_Servicios_Extra.xlsx' },
              'expense_categories': { key: 'expense-categories', filename: 'Paso_5_Categorias_Gastos.xlsx' },
              'reservations': { key: 'reservations', filename: 'Paso_6_Reservaciones.xlsx' }
            };
            
            const templateConfig = templateConfigs[template.key];
            if (!templateConfig) return null;
            
            return (
              <div key={template.key} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-lg">
                        {template.step}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">
                          {template.icon} {template.name}
                          {template.required && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Obligatorio</span>}
                        </h4>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-3">
                      <div className="text-sm">
                        <span className="font-semibold text-gray-700">Registros actuales:</span>
                        <span className="ml-2 px-2 py-1 bg-gray-100 rounded font-mono">{template.count}</span>
                      </div>
                      
                      {template.depends_on && (
                        <div className="text-xs text-orange-600">
                          <span className="font-semibold">Requiere:</span> {template.depends_on.map(d => templatesInfo.find(t => t.key === d)?.name).filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => downloadTemplate(templateConfig.key, templateConfig.filename)}
                      disabled={loadingTemplates}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm disabled:opacity-50 whitespace-nowrap"
                    >
                      📥 Descargar Plantilla
                    </button>
                    
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            handleImportFile(templateConfig.key, file);
                            e.target.value = '';
                          }
                        }}
                        disabled={loadingTemplates}
                      />
                      <div className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm text-center disabled:opacity-50">
                        📤 Importar Archivo
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Sección de Exportar Datos Existentes */}
        <div className="mt-6 bg-green-50 p-4 rounded-md border border-green-200">
          <h4 className="font-semibold text-green-900 mb-2">📤 Exportar Datos Existentes (Respaldo)</h4>
          <p className="text-sm text-gray-700 mb-3">
            Exporta tus datos actuales a Excel para hacer respaldo.
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
        
        {/* Old Template Section - Keep for backward compatibility */}
        <div className="mt-6 bg-gray-50 p-4 rounded-md border border-gray-300">
          <h4 className="font-semibold text-gray-700 mb-2">📋 Plantilla Completa (Método Antiguo)</h4>
          <p className="text-sm text-gray-600 mb-3">
            Plantilla con todas las secciones en un solo archivo (método anterior).
          </p>
          <div className="flex space-x-2">
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
                  a.download = 'Plantilla_Completa.xlsx';
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  
                  alert('✅ Plantilla descargada');
                } catch (err) {
                  alert('❌ Error: ' + err.message);
                }
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium text-sm"
            >
              📥 Descargar
            </button>
            
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  
                  if (!window.confirm(`¿Importar "${file.name}"?`)) {
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
                    await fetchTemplatesInfo();
                    e.target.value = '';
                  } catch (err) {
                    alert(`❌ Error: ${err.message}`);
                    e.target.value = '';
                  }
                }}
              />
              <div className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium text-sm text-center">
                📤 Importar
              </div>
            </label>
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
