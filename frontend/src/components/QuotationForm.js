import React, { useState, useEffect } from 'react';
import { getCustomers, getVillas, getExtraServices } from '../api/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X } from 'lucide-react';

const QuotationForm = ({ quotation, onSubmit, onCancel }) => {
  const [customers, setCustomers] = useState([]);
  const [villas, setVillas] = useState([]);
  const [extraServices, setExtraServices] = useState([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    villa_id: '',
    villa_code: '',
    villa_location: '',
    quotation_date: new Date().toISOString().split('T')[0],
    validity_days: 30,
    guests: 0,
    base_price: 0,
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
      setFormData(quotation);
      setSelectedServices(quotation.extra_services || []);
    }
  }, [quotation]);

  const fetchData = async () => {
    try {
      const [customersRes, villasRes, servicesRes] = await Promise.all([
        getCustomers(),
        getVillas(),
        getExtraServices()
      ]);
      setCustomers(customersRes.data);
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
        villa_id: villa.id,
        villa_code: villa.code,
        villa_location: villa.location || '',
        base_price: villa.prices?.[0]?.price || 0
      };
      const totals = calculateTotals(newData, selectedServices);
      setFormData({ ...newData, ...totals });
    }
  };

  const handleCustomerChange = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData({
        ...formData,
        customer_id: customer.id,
        customer_name: customer.name
      });
    }
  };

  const addService = () => {
    setSelectedServices([...selectedServices, {
      service_id: '',
      service_name: '',
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
        updated[index].unit_price = service.price;
        updated[index].total = service.price * updated[index].quantity;
      }
    } else if (field === 'quantity' || field === 'unit_price') {
      updated[index].total = updated[index].unit_price * updated[index].quantity;
    }
    
    setSelectedServices(updated);
    const totals = calculateTotals(formData, updated);
    setFormData({ ...formData, ...totals });
  };

  const removeService = (index) => {
    const updated = selectedServices.filter((_, i) => i !== index);
    setSelectedServices(updated);
    const totals = calculateTotals(formData, updated);
    setFormData({ ...formData, ...totals });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, extra_services: selectedServices });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Cliente *</Label>
          <select
            value={formData.customer_id}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Seleccionar cliente</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Villa</Label>
          <select
            value={formData.villa_id}
            onChange={(e) => handleVillaChange(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Seleccionar villa (opcional)</option>
            {villas.map(v => (
              <option key={v.id} value={v.id}>{v.code} - {v.name}</option>
            ))}
          </select>
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
        <div>
          <Label>Días de Validez</Label>
          <Input
            type="number"
            value={formData.validity_days}
            onChange={(e) => setFormData({ ...formData, validity_days: parseInt(e.target.value) })}
          />
        </div>
        <div>
          <Label>Número de Huéspedes</Label>
          <Input
            type="number"
            value={formData.guests}
            onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) })}
          />
        </div>
        <div>
          <Label>Precio Base</Label>
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
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Servicios Adicionales</Label>
          <Button type="button" size="sm" onClick={addService}>+ Agregar Servicio</Button>
        </div>
        {selectedServices.map((service, index) => (
          <div key={index} className="grid grid-cols-5 gap-2 mb-2">
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
            <Input
              type="number"
              placeholder="Cantidad"
              value={service.quantity}
              onChange={(e) => updateService(index, 'quantity', parseInt(e.target.value) || 1)}
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Precio"
              value={service.unit_price}
              onChange={(e) => updateService(index, 'unit_price', parseFloat(e.target.value) || 0)}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm">${service.total.toFixed(2)}</span>
              <Button type="button" size="sm" variant="destructive" onClick={() => removeService(index)}>
                <X size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>

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
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.include_itbis}
            onChange={(e) => {
              const newData = { ...formData, include_itbis: e.target.checked };
              const totals = calculateTotals(newData, selectedServices);
              setFormData({ ...newData, ...totals });
            }}
          />
          <Label>Incluir ITBIS (18%)</Label>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded">
        <div className="flex justify-between mb-1">
          <span>Subtotal:</span>
          <span>{formData.currency} ${formData.subtotal.toFixed(2)}</span>
        </div>
        {formData.include_itbis && (
          <div className="flex justify-between mb-1">
            <span>ITBIS (18%):</span>
            <span>{formData.currency} ${formData.itbis_amount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg">
          <span>Total:</span>
          <span>{formData.currency} ${formData.total_amount.toFixed(2)}</span>
        </div>
      </div>

      <div>
        <Label>Notas</Label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full p-2 border rounded"
          rows="2"
        />
      </div>

      <div>
        <Label>Nota Interna</Label>
        <textarea
          value={formData.internal_notes}
          onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
          className="w-full p-2 border rounded bg-yellow-50"
          rows="2"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Guardar Cotización</Button>
      </div>
    </form>
  );
};

export default QuotationForm;