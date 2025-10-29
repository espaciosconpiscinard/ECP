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
  
  // Quotation Terms States
  const [quotationTerms, setQuotationTerms] = useState([]);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [newTerm, setNewTerm] = useState('');

  useEffect(() => {
    fetchConfig();
    fetchTemplatesInfo();
    fetchQuotationTerms();
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


  // Quotation Terms Functions
  const fetchQuotationTerms = async () => {
    setLoadingTerms(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/config/quotation-terms`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuotationTerms(data.terms || []);
      }
    } catch (err) {
      console.error('Error al cargar términos:', err);
    } finally {
      setLoadingTerms(false);
    }
  };

  const handleAddTerm = () => {
    if (newTerm.trim()) {
      setQuotationTerms([...quotationTerms, newTerm.trim()]);
      setNewTerm('');
    }
  };

  const handleRemoveTerm = (index) => {
    const updatedTerms = quotationTerms.filter((_, i) => i !== index);
    setQuotationTerms(updatedTerms);
  };

  const handleSaveTerms = async () => {
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/config/quotation-terms`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ terms: quotationTerms })
      });

      if (!response.ok) {
        throw new Error('Error al guardar términos');
      }

      setSuccess('✅ Términos de cotizaciones guardados exitosamente');
      await fetchQuotationTerms();
    } catch (err) {
      setError(`❌ ${err.message}`);
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

      {/* Backup/Restore Section - COMPLETE DATABASE */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg shadow-lg p-6 mb-6 border-2 border-red-300">
        <h3 className="text-2xl font-bold mb-2 flex items-center text-red-900">
          <span className="text-3xl mr-3">💾</span>
          Backup y Restauración Completa
        </h3>
        <p className="text-sm text-red-700 mb-4">
          ⚠️ <strong>Sistema de Respaldo Total:</strong> Descarga TODOS tus datos en un solo archivo JSON y restáuralos cuando necesites.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Download Backup */}
          <div className="bg-white p-4 rounded-lg border-2 border-green-300">
            <h4 className="font-bold text-green-800 mb-2 flex items-center">
              <span className="text-xl mr-2">⬇️</span>
              Descargar Backup Completo
            </h4>
            <p className="text-xs text-gray-600 mb-3">
              Incluye: Usuarios, Clientes, Villas, Reservaciones, Gastos, Categorías, Configuraciones, etc.
            </p>
            <button
              onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  const response = await fetch(`${API_URL}/api/backup/download`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  
                  if (!response.ok) throw new Error('Error al descargar backup');
                  
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'backup.json';
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                  
                  alert('✅ Backup descargado exitosamente! Guárdalo en un lugar seguro.');
                } catch (err) {
                  alert('❌ Error al descargar backup: ' + err.message);
                }
              }}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              📥 Descargar Backup Ahora
            </button>
          </div>

          {/* Restore Backup */}
          <div className="bg-white p-4 rounded-lg border-2 border-orange-300">
            <h4 className="font-bold text-orange-800 mb-2 flex items-center">
              <span className="text-xl mr-2">⬆️</span>
              Restaurar desde Backup
            </h4>
            <p className="text-xs text-red-600 mb-3">
              ⚠️ <strong>CUIDADO:</strong> Esto ELIMINARÁ todos los datos actuales y los reemplazará con el backup.
            </p>
            <input
              type="file"
              accept=".json"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                if (!window.confirm(`⚠️ ADVERTENCIA CRÍTICA ⚠️\n\n¿Estás SEGURO de restaurar "${file.name}"?\n\nEsto eliminará TODOS los datos actuales:\n- Usuarios\n- Clientes\n- Villas\n- Reservaciones\n- Gastos\n- Configuraciones\n\nY los reemplazará con los datos del backup.\n\n¿Continuar?`)) {
                  e.target.value = '';
                  return;
                }
                
                try {
                  const token = localStorage.getItem('token');
                  const formData = new FormData();
                  formData.append('file', file);
                  
                  const response = await fetch(`${API_URL}/api/backup/restore`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                  });
                  
                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Error al restaurar');
                  }
                  
                  const result = await response.json();
                  
                  let message = `✅ Backup restaurado exitosamente!\n\n`;
                  message += `Fecha del backup: ${result.backup_date}\n\n`;
                  message += `Colecciones restauradas:\n`;
                  result.restored.forEach(r => {
                    message += `- ${r.collection}: ${r.documents} documentos\n`;
                  });
                  
                  alert(message);
                  
                  // Recargar página
                  window.location.reload();
                } catch (err) {
                  alert('❌ Error al restaurar backup: ' + err.message);
                }
                
                e.target.value = '';
              }}
              className="w-full px-4 py-3 border-2 border-orange-400 rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-700"
            />
          </div>
        </div>
        
        {/* Info Section */}
        <div className="mt-4 bg-blue-50 p-3 rounded border border-blue-200">
          <h5 className="font-semibold text-blue-900 text-sm mb-1">💡 ¿Cuándo usar Backup/Restore?</h5>
          <ul className="text-xs text-gray-700 space-y-1">
            <li>✅ <strong>Antes de actualizaciones importantes</strong> - Descarga backup de seguridad</li>
            <li>✅ <strong>Migrar a otro servidor</strong> - Descarga en servidor A, restaura en servidor B</li>
            <li>✅ <strong>Recuperación de desastres</strong> - Si se borran datos por error</li>
            <li>✅ <strong>Respaldo periódico</strong> - Descarga semanal/mensual para historial</li>
          </ul>
        </div>
      </div>

      {/* RESET SYSTEM - DANGER ZONE */}
      <div className="bg-gradient-to-r from-red-100 to-red-200 rounded-lg shadow-lg p-6 mb-6 border-4 border-red-600">
        <h3 className="text-2xl font-bold mb-2 flex items-center text-red-900">
          <span className="text-3xl mr-3">🚨</span>
          ZONA DE PELIGRO: Borrar Todo el Sistema
        </h3>
        <p className="text-sm text-red-800 font-semibold mb-4">
          ⚠️ <strong>EXTREMADAMENTE PELIGROSO:</strong> Este botón eliminará PERMANENTEMENTE todos los datos del sistema.
        </p>
        
        <div className="bg-white p-5 rounded-lg border-4 border-red-500">
          <h4 className="font-bold text-red-900 mb-3 text-lg flex items-center">
            <span className="text-2xl mr-2">💣</span>
            Reset Completo del Sistema
          </h4>
          
          <div className="bg-red-50 p-4 rounded border-2 border-red-300 mb-4">
            <p className="text-sm text-red-900 font-semibold mb-2">⚠️ ESTO ELIMINARÁ PERMANENTEMENTE:</p>
            <ul className="text-xs text-red-800 space-y-1 list-disc list-inside">
              <li>✗ Todos los clientes</li>
              <li>✗ Todas las villas</li>
              <li>✗ Todas las reservaciones</li>
              <li>✗ Todos los gastos</li>
              <li>✗ Todas las categorías</li>
              <li>✗ Todos los servicios</li>
              <li>✗ Todos los propietarios</li>
              <li>✗ Todas las facturas</li>
              <li>✗ Todas las configuraciones</li>
              <li>✗ Usuarios empleados (admins se mantienen)</li>
            </ul>
            <p className="text-xs text-red-900 font-bold mt-2">
              ✅ SE MANTIENE: Solo cuentas de administrador
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-red-900 mb-1">
                Código de Administrador (requerido):
              </label>
              <input
                type="text"
                id="reset-admin-code"
                placeholder="Ingresa código secreto de admin"
                className="w-full px-3 py-2 border-2 border-red-400 rounded text-sm uppercase"
                maxLength={10}
              />
              <p className="text-xs text-gray-600 mt-1">Necesitas el código secreto usado para crear administradores</p>
            </div>

            <button
              onClick={async () => {
                const code = document.getElementById('reset-admin-code').value.trim();
                
                if (!code) {
                  alert('⚠️ Debes ingresar el código de administrador');
                  return;
                }
                
                // Triple confirmación
                if (!window.confirm(`🚨 ADVERTENCIA CRÍTICA 🚨\n\n¿Estás ABSOLUTAMENTE SEGURO de borrar TODO el sistema?\n\nEsto eliminará:\n- Todos los clientes\n- Todas las villas\n- Todas las reservaciones\n- Todos los gastos\n- Todo excepto admins\n\n¿CONTINUAR?`)) {
                  return;
                }
                
                if (!window.confirm(`⚠️ SEGUNDA CONFIRMACIÓN ⚠️\n\n¿REALMENTE quieres eliminar TODOS los datos?\n\nEsta acción es IRREVERSIBLE.\n\nSolo se mantendrán las cuentas de administrador.\n\n¿CONTINUAR?`)) {
                  return;
                }
                
                const finalConfirm = prompt('⚠️ CONFIRMACIÓN FINAL ⚠️\n\nEscribe exactamente: BORRAR TODO\n\nPara confirmar la eliminación completa:');
                
                if (finalConfirm !== 'BORRAR TODO') {
                  alert('❌ Acción cancelada. No se escribió correctamente.');
                  return;
                }
                
                try {
                  const token = localStorage.getItem('token');
                  const response = await fetch(`${API_URL}/api/system/reset-all?admin_code=${encodeURIComponent(code)}`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Error al resetear sistema');
                  }
                  
                  const result = await response.json();
                  
                  let message = `✅ SISTEMA RESETEADO COMPLETAMENTE\n\n`;
                  message += `⚠️ ${result.warning}\n\n`;
                  message += `Datos eliminados:\n`;
                  result.deleted.forEach(d => {
                    message += `- ${d.collection}: ${d.deleted} documentos\n`;
                  });
                  
                  alert(message);
                  
                  // Limpiar campo
                  document.getElementById('reset-admin-code').value = '';
                  
                  // Recargar página
                  window.location.href = '/';
                } catch (err) {
                  alert(`❌ Error: ${err.message}\n\nSi el código es incorrecto, verifica que sea el mismo usado para crear administradores.`);
                }
              }}
              className="w-full px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-lg border-4 border-red-800 shadow-lg"
            >
              🗑️ BORRAR TODO EL SISTEMA (IRREVERSIBLE)
            </button>
          </div>

          <div className="mt-4 bg-yellow-50 p-3 rounded border border-yellow-400">
            <h5 className="font-semibold text-yellow-900 text-sm mb-1">💡 Recomendación antes de usar:</h5>
            <p className="text-xs text-gray-700">
              <strong>1. DESCARGA BACKUP COMPLETO</strong> (arriba) antes de resetear<br/>
              <strong>2. GUARDA EL BACKUP</strong> en lugar seguro<br/>
              <strong>3. VERIFICA</strong> que tienes el código de administrador correcto<br/>
              <strong>4. ENTONCES</strong> puedes resetear si realmente lo necesitas
            </p>
          </div>
        </div>
      </div>

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
              </div>

              <div className="flex gap-3 items-end">
                <div className="flex-1">
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

      {/* Quotation Terms Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800">📋 Términos y Condiciones de Cotizaciones</h3>
        <p className="text-sm text-gray-600 mb-4">
          Configura los términos y condiciones que aparecerán al final de cada cotización impresa.
        </p>

        {loadingTerms ? (
          <div className="text-center py-4 text-gray-500">Cargando términos...</div>
        ) : (
          <>
            {/* Current Terms List */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">Términos Actuales:</h4>
              {quotationTerms.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay términos configurados</p>
              ) : (
                <ul className="space-y-2">
                  {quotationTerms.map((term, index) => (
                    <li key={index} className="flex items-start gap-2 bg-gray-50 p-3 rounded border">
                      <span className="flex-shrink-0 text-blue-600 font-bold">{index + 1}.</span>
                      <span className="flex-1 text-sm text-gray-700">{term}</span>
                      <button
                        onClick={() => handleRemoveTerm(index)}
                        className="flex-shrink-0 text-red-600 hover:text-red-800 font-bold"
                        title="Eliminar término"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Add New Term */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">Agregar Nuevo Término:</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTerm()}
                  placeholder="Ej: Esta cotización es válida por 30 días..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button
                  onClick={handleAddTerm}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                >
                  + Agregar
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveTerms}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                💾 Guardar Términos
              </button>
            </div>

            {/* Help */}
            <div className="mt-4 bg-blue-50 p-3 rounded text-sm text-blue-800">
              <strong>💡 Tip:</strong> Estos términos se mostrarán automáticamente al final de cada cotización cuando se imprima.
              Puedes agregar políticas de pago, condiciones de cancelación, validez de la cotización, etc.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Configuration;
