import React, { useState, useEffect } from 'react';
import { getVillas, getExtraServices } from '../api/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, Check } from 'lucide-react';

const QuotationForm = ({ quotation, onSubmit, onCancel }) => {
  const [villas, setVillas] = useState([]);
  const [extraServices, setExtraServices] = useState([]);
  const [formData, setFormData] = useState({
    customer_name: '',  // Texto libre para nombre del cliente
    villa_id: '',
    villa_code: '',
    villa_description: '',
    villa_location: '',
    quotation_date: new Date().toISOString().split('T')[0],
    validity_days: 30,
    check_in_time: '',
    check_out_time: '',
    guests: 0,
    base_price: 0,
    owner_price: 0,
    extra_services: [],
    extra_services_total: 0,
    subtotal: 0,
    discount: 0,
    include_itbis: false,
    itbis_amount: 0,
    total_amount: 0,
    currency: 'DOP',
    notes: '',
    internal_notes: '',
    status: 'pending'
  });
  const [selectedServices, setSelectedServices] = useState([]);

  useEffect(() => {
    fetchData();
    if (quotation) {
      const services = quotation.extra_services || [];
      setSelectedServices(services);
      const totals = calculateTotals(quotation, services);
      setFormData({ ...quotation, ...totals });
    }
  }, [quotation]);

  const fetchData = async () => {
    try {
      const [villasRes, servicesRes] = await Promise.all([
        getVillas(),
        getExtraServices()
      ]);
      setVillas(villasRes.data);
      setExtraServices(servicesRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const calculateTotals = (data, services) => {
    const extraServicesTotal = services.reduce((sum, s) => sum + (s.total || 0), 0);
    const subtotal = data.base_price + extraServicesTotal;
    const afterDiscount = subtotal - data.discount;
    const itbisAmount = data.include_itbis ? afterDiscount * 0.18 : 0;
    const total = afterDiscount + itbisAmount;

    return {
      extra_services_total: extraServicesTotal,
      subtotal,
      itbis_amount: itbisAmount,
      total_amount: total
    };
  };

  const handleVillaChange = (villaId) => {
    const villa = villas.find(v => v.id === villaId);
    if (villa) {
      const newData = {
        ...formData,
        villa_id: villaId,
        villa_code: villa.code,
        villa_description: villa.description || '',
        villa_location: villa.location || '',
        check_in_time: villa.default_check_in_time || '',
        check_out_time: villa.default_check_out_time || '',
        base_price: 0,
        owner_price: 0
      };
      const totals = calculateTotals(newData, selectedServices);
      setFormData({ ...newData, ...totals });
    }
  };

  const addService = () => {
    setSelectedServices([...selectedServices, {
      service_id: '',
      service_name: '',
      description: '',  // Campo para descripción del servicio
      supplier_id: '',
      supplier_name: '',
      supplier_cost: 0,
      quantity: 1,
      unit_price: 0,
      total: 0
    }]);
  };

  const updateService = (index, field, value) => {
    const updated = [...selectedServices];
    updated[index][field] = value;
    
    if (field === 'service_id') {
      const service = extraServices.find(s => s.id === value);
      if (service) {
        updated[index].service_name = service.name;
        updated[index].description = service.description || '';  // Cargar descripción del servicio
        updated[index].supplier_id = '';
        updated[index].supplier_name = '';
        updated[index].unit_price = 0;
        updated[index].total = 0;
        // Si el servicio solo tiene un suplidor, seleccionarlo automáticamente
        if (service.suppliers && service.suppliers.length === 1) {
          const supplier = service.suppliers[0];
          updated[index].supplier_id = supplier.supplier_id;
          updated[index].supplier_name = supplier.supplier_name;
          updated[index].supplier_cost = supplier.cost;
          updated[index].unit_price = supplier.client_price;
          updated[index].total = supplier.client_price * updated[index].quantity;
        }
      }
    } else if (field === 'supplier_id') {
      const service = extraServices.find(s => s.id === updated[index].service_id);
      if (service && value) {
        const supplier = service.suppliers?.find(sup => sup.supplier_id === value);
        if (supplier) {
          updated[index].supplier_name = supplier.supplier_name;
          updated[index].supplier_cost = supplier.cost;
          updated[index].unit_price = supplier.client_price;
          updated[index].total = supplier.client_price * updated[index].quantity;
        }
      }
    } else if (field === 'quantity') {
      updated[index].total = updated[index].unit_price * updated[index].quantity;
    } else if (field === 'unit_price') {
      updated[index].total = updated[index].unit_price * updated[index].quantity;
    }
    
    setSelectedServices(updated);
    
    // Recalcular totales después de actualizar servicios
    const totals = calculateTotals(formData, updated);
    setFormData(prev => ({ ...prev, ...totals }));
  };

  const removeService = (index) => {
    const updated = selectedServices.filter((_, i) => i !== index);
    setSelectedServices(updated);
    const totals = calculateTotals(formData, updated);
    setFormData({ ...formData, ...totals });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validación: el nombre del cliente es obligatorio
    if (!formData.customer_name || formData.customer_name.trim() === '') {
      alert('El nombre del cliente es obligatorio');
      return;
    }
    
    onSubmit({ ...formData, extra_services: selectedServices });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-800">
        {quotation ? 'Editar Cotización' : 'Nueva Cotización'}
      </h2>

      {/* Nombre del Cliente y Fecha */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nombre del Cliente *</Label>
          <Input
            type="text"
            value={formData.customer_name}
            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            placeholder="Ingresa el nombre del cliente..."
            required
          />
        </div>
        <div>
          <Label>Fecha Cotización *</Label>
          <Input
            type="date"
            value={formData.quotation_date}
            onChange={(e) => setFormData({ ...formData, quotation_date: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Villa */}
      <div>
        <Label>Villa (Opcional)</Label>
        <select
          value={formData.villa_id}
          onChange={(e) => handleVillaChange(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">Sin villa</option>
          {villas.map(v => (
            <option key={v.id} value={v.id}>{v.code} - {v.name}</option>
          ))}
        </select>
      </div>

      {/* Precios y Detalles - Solo mostrar si hay villa seleccionada */}
      {formData.villa_id && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Huéspedes</Label>
              <Input
                type="number"
                value={formData.guests}
                onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Días de Validez</Label>
              <Input
                type="number"
                value={formData.validity_days}
                onChange={(e) => setFormData({ ...formData, validity_days: parseInt(e.target.value) || 30 })}
              />
            </div>
            <div>
              <Label>Precio al Cliente</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.base_price}
                onChange={(e) => {
                  const newData = { ...formData, base_price: parseFloat(e.target.value) || 0 };
                  const totals = calculateTotals(newData, selectedServices);
                  setFormData({ ...newData, ...totals });
                }}
              />
            </div>
            <div>
              <Label>Precio al Propietario</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.owner_price}
                onChange={(e) => setFormData({ ...formData, owner_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Horarios */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Hora Entrada</Label>
              <Input
                type="text"
                value={formData.check_in_time}
                onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                placeholder="9:00 AM"
              />
            </div>
            <div>
              <Label>Hora Salida</Label>
              <Input
                type="text"
                value={formData.check_out_time}
                onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
                placeholder="8:00 PM"
              />
            </div>
          </div>
        </>
      )}

      {/* Servicios */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <Label>Servicios</Label>
          <Button type="button" size="sm" onClick={addService}>+ Agregar Servicio</Button>
        </div>
        {selectedServices.map((service, index) => {
          const serviceData = extraServices.find(s => s.id === service.service_id);
          return (
            <div key={index} className="grid grid-cols-6 gap-2 mb-2 items-center">
              <select
                value={service.service_id}
                onChange={(e) => updateService(index, 'service_id', e.target.value)}
                className="p-2 border rounded col-span-2"
              >
                <option value="">Seleccionar servicio</option>
                {extraServices.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {service.service_id && serviceData?.suppliers?.length > 0 && (
                <select
                  value={service.supplier_id || ''}
                  onChange={(e) => updateService(index, 'supplier_id', e.target.value)}
                  className="p-2 border rounded col-span-2"
                >
                  <option value="">Seleccionar suplidor</option>
                  {serviceData.suppliers.map(sup => (
                    <option key={sup.supplier_id} value={sup.supplier_id}>
                      {sup.supplier_name} - RD${sup.client_price}
                    </option>
                  ))}
                </select>
              )}
              {(!service.service_id || !serviceData?.suppliers?.length) && (
                <div className="col-span-2"></div>
              )}
              <Input
                type="number"
                placeholder="Cant."
                value={service.quantity}
                onChange={(e) => updateService(index, 'quantity', parseInt(e.target.value) || 1)}
                className="text-center"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">${service.total.toFixed(2)}</span>
                <Button type="button" size="sm" variant="destructive" onClick={() => removeService(index)}>
                  <X size={14} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Descuentos e ITBIS */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Descuento</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.discount}
            onChange={(e) => {
              const newData = { ...formData, discount: parseFloat(e.target.value) || 0 };
              const totals = calculateTotals(newData, selectedServices);
              setFormData({ ...newData, ...totals });
            }}
          />
        </div>
        <div className="flex items-center gap-2 mt-6">
          <input
            type="checkbox"
            checked={formData.include_itbis}
            onChange={(e) => {
              const newData = { ...formData, include_itbis: e.target.checked };
              const totals = calculateTotals(newData, selectedServices);
              setFormData({ ...newData, ...totals });
            }}
            className="w-4 h-4"
          />
          <Label>Incluir ITBIS (18%)</Label>
        </div>
      </div>

      {/* Totales */}
      <div className="bg-gray-50 p-4 rounded space-y-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className="font-semibold">${formData.subtotal.toFixed(2)}</span>
        </div>
        {formData.discount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Descuento:</span>
            <span>-${formData.discount.toFixed(2)}</span>
          </div>
        )}
        {formData.include_itbis && (
          <div className="flex justify-between text-blue-600">
            <span>ITBIS (18%):</span>
            <span>+${formData.itbis_amount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-xl font-bold border-t pt-2">
          <span>Total:</span>
          <span className="text-blue-600">${formData.total_amount.toFixed(2)}</span>
        </div>
      </div>

      {/* Notas */}
      <div>
        <Label>Notas (visibles al cliente)</Label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full p-2 border rounded"
          rows="3"
        />
      </div>

      <div>
        <Label>Notas Internas (no visibles al cliente)</Label>
        <textarea
          value={formData.internal_notes}
          onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
          className="w-full p-2 border rounded"
          rows="2"
        />
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {quotation ? 'Actualizar' : 'Crear'} Cotización
        </Button>
      </div>
    </form>
  );
};

export default QuotationForm;