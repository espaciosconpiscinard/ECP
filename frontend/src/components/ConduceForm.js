import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X } from 'lucide-react';

const ConduceForm = ({ conduce, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    recipient_name: '',
    recipient_type: 'customer',
    delivery_address: '',
    delivery_date: new Date().toISOString().split('T')[0],
    items: [],
    notes: '',
    internal_notes: '',
    status: 'pending'
  });

  useEffect(() => {
    if (conduce) {
      setFormData(conduce);
    }
  }, [conduce]);

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        description: '',
        quantity: 1,
        unit: 'unidad'
      }]
    });
  };

  const updateItem = (index, field, value) => {
    const updated = [...formData.items];
    updated[index][field] = value;
    setFormData({ ...formData, items: updated });
  };

  const removeItem = (index) => {
    const updated = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updated });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      alert('Debe agregar al menos un ítem');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nombre del Destinatario *</Label>
          <Input
            value={formData.recipient_name}
            onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
            required
            placeholder="Nombre completo"
          />
        </div>
        <div>
          <Label>Tipo de Destinatario *</Label>
          <select
            value={formData.recipient_type}
            onChange={(e) => setFormData({ ...formData, recipient_type: e.target.value })}
            className="w-full p-2 border rounded"
            required
          >
            <option value="customer">Cliente</option>
            <option value="employee">Empleado</option>
            <option value="supplier">Suplidor</option>
          </select>
        </div>
        <div>
          <Label>Fecha de Entrega *</Label>
          <Input
            type="date"
            value={formData.delivery_date}
            onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Estado</Label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="pending">Pendiente</option>
            <option value="delivered">Entregado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      <div>
        <Label>Dirección de Entrega</Label>
        <Input
          value={formData.delivery_address}
          onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
          placeholder="Dirección completa"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Ítems a Entregar *</Label>
          <Button type="button" size="sm" onClick={addItem}>+ Agregar Ítem</Button>
        </div>
        {formData.items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No hay ítems. Haga clic en "Agregar Ítem" para comenzar.</p>
        ) : (
          <div className="space-y-2">
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <Input
                  placeholder="Descripción del ítem"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  className="col-span-6"
                  required
                />
                <Input
                  type="number"
                  placeholder="Cantidad"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  className="col-span-2"
                  required
                />
                <select
                  value={item.unit}
                  onChange={(e) => updateItem(index, 'unit', e.target.value)}
                  className="col-span-3 p-2 border rounded"
                >
                  <option value="unidad">Unidad</option>
                  <option value="caja">Caja</option>
                  <option value="kg">Kilogramo</option>
                  <option value="lb">Libra</option>
                  <option value="litro">Litro</option>
                  <option value="galon">Galón</option>
                  <option value="metro">Metro</option>
                  <option value="paquete">Paquete</option>
                </select>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => removeItem(index)}
                  className="col-span-1"
                >
                  <X size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label>Notas</Label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full p-2 border rounded"
          rows="2"
          placeholder="Notas visibles en el conduce"
        />
      </div>

      <div>
        <Label>Nota Interna (Solo Sistema)</Label>
        <textarea
          value={formData.internal_notes}
          onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
          className="w-full p-2 border rounded bg-yellow-50"
          rows="2"
          placeholder="Nota interna que no se imprime"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Guardar Conduce</Button>
      </div>
    </form>
  );
};

export default ConduceForm;