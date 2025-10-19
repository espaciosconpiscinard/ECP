import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function InvoiceEditor() {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('fields'); // fields, policies, custom, style

  // Estado para nueva política
  const [newPolicy, setNewPolicy] = useState('');
  
  // Estado para nuevo campo personalizado
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  useEffect(() => {
    fetchTemplate();
  }, []);

  const fetchTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/config/invoice-template`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Error al cargar plantilla');
      
      const data = await response.json();
      setTemplate(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/config/invoice-template`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(template)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al guardar');
      }

      setSuccess('✅ Plantilla guardada exitosamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('¿Estás seguro de resetear la plantilla a valores por defecto?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/config/invoice-template/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Error al resetear');

      await fetchTemplate();
      setSuccess('✅ Plantilla reseteada exitosamente');
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleField = (field) => {
    setTemplate({ ...template, [field]: !template[field] });
  };

  const addPolicy = () => {
    if (!newPolicy.trim()) return;
    setTemplate({
      ...template,
      policies: [...template.policies, newPolicy.trim()]
    });
    setNewPolicy('');
  };

  const removePolicy = (index) => {
    setTemplate({
      ...template,
      policies: template.policies.filter((_, i) => i !== index)
    });
  };

  const updatePolicy = (index, value) => {
    const newPolicies = [...template.policies];
    newPolicies[index] = value;
    setTemplate({ ...template, policies: newPolicies });
  };

  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    setTemplate({
      ...template,
      custom_fields: {
        ...template.custom_fields,
        [newFieldName.trim()]: newFieldValue.trim()
      }
    });
    setNewFieldName('');
    setNewFieldValue('');
  };

  const removeCustomField = (fieldName) => {
    const newFields = { ...template.custom_fields };
    delete newFields[fieldName];
    setTemplate({ ...template, custom_fields: newFields });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Cargando editor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Editor de Facturas</h2>
        <p className="text-gray-500 mt-1">Personaliza cómo se ven tus facturas</p>
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

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b">
          <div className="flex space-x-1 p-2">
            <button
              onClick={() => setActiveTab('fields')}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                activeTab === 'fields'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📋 Campos
            </button>
            <button
              onClick={() => setActiveTab('policies')}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                activeTab === 'policies'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📜 Políticas
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                activeTab === 'custom'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              ➕ Campos Personalizados
            </button>
            <button
              onClick={() => setActiveTab('style')}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                activeTab === 'style'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🎨 Estilo
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Tab: Campos */}
          {activeTab === 'fields' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Campos a Mostrar en la Factura</h3>
              <p className="text-sm text-gray-600 mb-4">
                Activa o desactiva los campos que quieres mostrar en tus facturas
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: 'show_customer_name', label: 'Nombre del Cliente' },
                  { key: 'show_customer_phone', label: 'Teléfono del Cliente' },
                  { key: 'show_customer_identification', label: 'Cedula/Pasaporte/RNC' },
                  { key: 'show_villa_code', label: 'Código de Villa' },
                  { key: 'show_villa_description', label: 'Descripción de Villa' },
                  { key: 'show_rental_type', label: 'Tipo de Renta' },
                  { key: 'show_reservation_date', label: 'Fecha de Reservación' },
                  { key: 'show_check_in_time', label: 'Hora Check-in' },
                  { key: 'show_check_out_time', label: 'Hora Check-out' },
                  { key: 'show_guests', label: 'Número de Personas' },
                  { key: 'show_extra_services', label: 'Servicios Extras' },
                  { key: 'show_payment_method', label: 'Método de Pago' },
                  { key: 'show_deposit', label: 'Depósito' }
                ].map(field => (
                  <label key={field.key} className="flex items-center space-x-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template[field.key]}
                      onChange={() => toggleField(field.key)}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="text-gray-700">{field.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Políticas */}
          {activeTab === 'policies' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Políticas y Términos</h3>
              <p className="text-sm text-gray-600 mb-4">
                Agrega, edita o elimina las políticas que aparecerán al final de tus facturas
              </p>

              {/* Lista de políticas */}
              <div className="space-y-2">
                {template.policies.map((policy, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <span className="text-gray-500 mt-2 flex-shrink-0">{index + 1}.</span>
                    <input
                      type="text"
                      value={policy}
                      onChange={(e) => updatePolicy(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => removePolicy(index)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Agregar nueva política */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-2">Agregar Nueva Política</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPolicy}
                    onChange={(e) => setNewPolicy(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addPolicy()}
                    placeholder="Ej: Prohibido fumar en las instalaciones"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={addPolicy}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Campos Personalizados */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Campos Personalizados</h3>
              <p className="text-sm text-gray-600 mb-4">
                Agrega campos adicionales que quieras mostrar en tus facturas (ej: RNC de la empresa, dirección, etc.)
              </p>

              {/* Lista de campos personalizados */}
              <div className="space-y-2">
                {Object.entries(template.custom_fields || {}).map(([key, value]) => (
                  <div key={key} className="flex gap-2 items-center p-3 border rounded bg-gray-50">
                    <div className="flex-1">
                      <div className="font-medium text-gray-700">{key}</div>
                      <div className="text-sm text-gray-500">{value}</div>
                    </div>
                    <button
                      onClick={() => removeCustomField(key)}
                      className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}

                {Object.keys(template.custom_fields || {}).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hay campos personalizados. Agrega uno abajo.
                  </div>
                )}
              </div>

              {/* Agregar nuevo campo */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-2">Agregar Nuevo Campo</h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="Nombre del campo (ej: RNC Empresa)"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    placeholder="Valor por defecto (ej: 123-4567890-1)"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={addCustomField}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Agregar Campo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Estilo */}
          {activeTab === 'style' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Personalización Visual</h3>

              <div className="space-y-4">
                {/* Logo */}
                <div className="p-4 border rounded">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template.show_logo}
                      onChange={() => setTemplate({ ...template, show_logo: !template.show_logo })}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="font-medium">Mostrar Logo</span>
                  </label>
                </div>

                {/* Colores */}
                <div className="p-4 border rounded space-y-3">
                  <h4 className="font-medium">Colores</h4>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Color Principal</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={template.primary_color}
                        onChange={(e) => setTemplate({ ...template, primary_color: e.target.value })}
                        className="w-16 h-10 rounded border"
                      />
                      <input
                        type="text"
                        value={template.primary_color}
                        onChange={(e) => setTemplate({ ...template, primary_color: e.target.value })}
                        placeholder="#2563eb"
                        className="flex-1 px-3 py-2 border rounded"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Color Secundario</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={template.secondary_color}
                        onChange={(e) => setTemplate({ ...template, secondary_color: e.target.value })}
                        className="w-16 h-10 rounded border"
                      />
                      <input
                        type="text"
                        value={template.secondary_color}
                        onChange={(e) => setTemplate({ ...template, secondary_color: e.target.value })}
                        placeholder="#1e40af"
                        className="flex-1 px-3 py-2 border rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Nota al pie */}
                <div className="p-4 border rounded">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nota al Pie de Factura
                  </label>
                  <input
                    type="text"
                    value={template.footer_note || ''}
                    onChange={(e) => setTemplate({ ...template, footer_note: e.target.value })}
                    placeholder="Ej: ¡Gracias por su preferencia!"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          Resetear a Valores por Defecto
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
        >
          💾 Guardar Cambios
        </button>
      </div>
    </div>
  );
}

export default InvoiceEditor;
