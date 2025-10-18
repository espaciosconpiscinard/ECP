import React, { useState, useEffect } from 'react';
import { getReservations, getCustomers, getVillas, getExtraServices, createReservation, updateReservation, deleteReservation } from '../api/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Edit, Trash2, Printer, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CustomerDialog from './CustomerDialog';

const Reservations = () => {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [villas, setVillas] = useState([]);
  const [extraServices, setExtraServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [selectedExtraServices, setSelectedExtraServices] = useState([]);
  const [showExtraServices, setShowExtraServices] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    villa_id: '',
    villa_code: '',
    villa_description: '',
    rental_type: 'pasadia',
    event_type: '',
    reservation_date: new Date().toISOString().split('T')[0],
    check_in_time: '9:00 AM',
    check_out_time: '8:00 PM',
    guests: 1,
    base_price: 0,
    extra_hours: 0,
    extra_hours_cost: 0,
    extra_services: [],
    extra_services_total: 0,
    subtotal: 0,
    discount: 0,
    total_amount: 0,
    deposit: 0,
    payment_method: 'efectivo',
    payment_details: '',
    amount_paid: 0,
    currency: 'DOP',
    notes: '',
    status: 'confirmed'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resResponse, custResponse, villasResponse, servicesResponse] = await Promise.all([
        getReservations(),
        getCustomers(),
        getVillas(),
        getExtraServices()
      ]);
      setReservations(resResponse.data);
      setCustomers(custResponse.data);
      setVillas(villasResponse.data);
      setExtraServices(servicesResponse.data);
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Calcular totales automáticamente
  useEffect(() => {
    const basePrice = parseFloat(formData.base_price) || 0;
    const extraHoursCost = parseFloat(formData.extra_hours_cost) || 0;
    const extraServicesTotal = selectedExtraServices.reduce((sum, s) => sum + (s.total || 0), 0);
    
    const subtotal = basePrice + extraHoursCost + extraServicesTotal;
    const discount = parseFloat(formData.discount) || 0;
    const total = subtotal - discount;
    
    setFormData(prev => ({
      ...prev,
      extra_services_total: extraServicesTotal,
      subtotal: subtotal,
      total_amount: total
    }));
  }, [formData.base_price, formData.extra_hours_cost, formData.discount, selectedExtraServices]);
  
  const handleVillaChange = (villaId) => {
    const villa = villas.find(v => v.id === villaId);
    if (villa) {
      let price = 0;
      if (formData.rental_type === 'pasadia') {
        price = villa.default_price_pasadia;
      } else if (formData.rental_type === 'amanecida') {
        price = villa.default_price_amanecida;
      } else if (formData.rental_type === 'evento') {
        price = villa.default_price_evento;
      }
      
      setFormData(prev => ({
        ...prev,
        villa_id: villaId,
        villa_code: villa.code,
        villa_description: villa.description || '',
        base_price: price
      }));
    }
  };
  
  const addExtraService = () => {
    setSelectedExtraServices([
      ...selectedExtraServices,
      { service_id: '', service_name: '', quantity: 1, unit_price: 0, total: 0 }
    ]);
  };
  
  const removeExtraService = (index) => {
    setSelectedExtraServices(selectedExtraServices.filter((_, i) => i !== index));
  };
  
  const updateExtraService = (index, field, value) => {
    const updated = [...selectedExtraServices];
    updated[index][field] = value;
    
    if (field === 'service_id') {
      const service = extraServices.find(s => s.id === value);
      if (service) {
        updated[index].service_name = service.name;
        updated[index].unit_price = service.default_price;
        updated[index].total = service.default_price * updated[index].quantity;
      }
    }
    
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total = updated[index].quantity * updated[index].unit_price;
    }
    
    setSelectedExtraServices(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const customer = customers.find(c => c.id === formData.customer_id);
      
      const dataToSend = {
        ...formData,
        customer_name: customer?.name || '',
        reservation_date: new Date(formData.reservation_date).toISOString(),
        extra_services: selectedExtraServices.filter(s => s.service_id)
      };
      
      if (editingReservation) {
        await updateReservation(editingReservation.id, dataToSend);
      } else {
        await createReservation(dataToSend);
      }
      
      await fetchData();
      setIsFormOpen(false);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar reservación');
      console.error('Error completo:', err.response?.data);
    }
  };

  const handleEdit = (reservation) => {
    setEditingReservation(reservation);
    setFormData({
      customer_id: reservation.customer_id,
      customer_name: reservation.customer_name,
      villa_id: reservation.villa_id,
      villa_code: reservation.villa_code,
      villa_description: reservation.villa_description || '',
      rental_type: reservation.rental_type,
      event_type: reservation.event_type || '',
      reservation_date: reservation.reservation_date.split('T')[0],
      check_in_time: reservation.check_in_time,
      check_out_time: reservation.check_out_time,
      guests: reservation.guests,
      base_price: reservation.base_price,
      extra_hours: reservation.extra_hours || 0,
      extra_hours_cost: reservation.extra_hours_cost || 0,
      extra_services_total: reservation.extra_services_total || 0,
      subtotal: reservation.subtotal,
      discount: reservation.discount || 0,
      total_amount: reservation.total_amount,
      deposit: reservation.deposit || 0,
      payment_method: reservation.payment_method,
      payment_details: reservation.payment_details || '',
      amount_paid: reservation.amount_paid,
      currency: reservation.currency,
      notes: reservation.notes || '',
      status: reservation.status
    });
    setSelectedExtraServices(reservation.extra_services || []);
    setShowExtraServices((reservation.extra_services || []).length > 0);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta reservación?')) {
      try {
        await deleteReservation(id);
        await fetchData();
      } catch (err) {
        setError('Error al eliminar reservación');
      }
    }
  };

  const resetForm = () => {
    setEditingReservation(null);
    setSelectedExtraServices([]);
    setShowExtraServices(false);
    setFormData({
      customer_id: '',
      customer_name: '',
      villa_id: '',
      villa_code: '',
      villa_description: '',
      rental_type: 'pasadia',
      event_type: '',
      reservation_date: new Date().toISOString().split('T')[0],
      check_in_time: '9:00 AM',
      check_out_time: '8:00 PM',
      guests: 1,
      base_price: 0,
      extra_hours: 0,
      extra_hours_cost: 0,
      extra_services: [],
      extra_services_total: 0,
      subtotal: 0,
      discount: 0,
      total_amount: 0,
      deposit: 0,
      payment_method: 'efectivo',
      payment_details: '',
      amount_paid: 0,
      currency: 'DOP',
      notes: '',
      status: 'confirmed'
    });
  };

  const handlePrint = (reservation) => {
    const printWindow = window.open('', '', 'width=900,height=700');
    const balanceDue = reservation.balance_due || 0;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Factura - ${reservation.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .info { margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .label { font-weight: bold; }
            .total { font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 10px; margin-top: 20px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>FACTURA DE RESERVACIÓN</h1>
          <div class="info">
            <div class="info-row">
              <span class="label">Número de Factura:</span>
              <span>${reservation.invoice_number}</span>
            </div>
            <div class="info-row">
              <span class="label">Cliente:</span>
              <span>${reservation.customer_name}</span>
            </div>
            <div class="info-row">
              <span class="label">Villa:</span>
              <span>${reservation.villa_name}</span>
            </div>
            <div class="info-row">
              <span class="label">Check-in:</span>
              <span>${new Date(reservation.check_in).toLocaleDateString('es-DO')}</span>
            </div>
            <div class="info-row">
              <span class="label">Check-out:</span>
              <span>${new Date(reservation.check_out).toLocaleDateString('es-DO')}</span>
            </div>
            <div class="info-row">
              <span class="label">Huéspedes:</span>
              <span>${reservation.guests}</span>
            </div>
            ${reservation.extra_hours > 0 ? `
              <div class="info-row">
                <span class="label">Horas Extras:</span>
                <span>${reservation.extra_hours} (${reservation.currency === 'DOP' ? 'RD$' : '$'} ${reservation.extra_hours_cost})</span>
              </div>
            ` : ''}
            ${reservation.additional_guests > 0 ? `
              <div class="info-row">
                <span class="label">Personas Adicionales:</span>
                <span>${reservation.additional_guests} (${reservation.currency === 'DOP' ? 'RD$' : '$'} ${reservation.additional_guests_cost})</span>
              </div>
            ` : ''}
          </div>
          <hr />
          <div class="info">
            <div class="info-row">
              <span class="label">Total:</span>
              <span>${reservation.currency === 'DOP' ? 'RD$' : '$'} ${reservation.total_amount.toLocaleString('es-DO')}</span>
            </div>
            <div class="info-row">
              <span class="label">Depósito:</span>
              <span>${reservation.currency === 'DOP' ? 'RD$' : '$'} ${reservation.deposit.toLocaleString('es-DO')}</span>
            </div>
            <div class="info-row">
              <span class="label">Pagado:</span>
              <span>${reservation.currency === 'DOP' ? 'RD$' : '$'} ${reservation.amount_paid.toLocaleString('es-DO')}</span>
            </div>
            <div class="total">
              <div class="info-row">
                <span class="label">RESTANTE A PAGAR:</span>
                <span>${reservation.currency === 'DOP' ? 'RD$' : '$'} ${balanceDue.toLocaleString('es-DO')}</span>
              </div>
            </div>
          </div>
          ${reservation.notes ? `
            <div class="info">
              <p class="label">Notas:</p>
              <p>${reservation.notes}</p>
            </div>
          ` : ''}
          <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #333; color: white; border: none; cursor: pointer;">Imprimir</button>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatCurrency = (amount, currency) => {
    const formatted = new Intl.NumberFormat('es-DO').format(amount);
    return currency === 'DOP' ? `RD$ ${formatted}` : `$ ${formatted}`;
  };

  const filteredReservations = reservations.filter(r => 
    r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.villa_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8" data-testid="reservations-loading">Cargando...</div>;
  }

  return (
    <div className="space-y-6" data-testid="reservations-page">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Reservaciones</h2>
          <p className="text-gray-500 mt-1">Gestiona las reservaciones de villas</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} data-testid="add-reservation-button">
              <Plus className="mr-2 h-4 w-4" /> Nueva Reservación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingReservation ? 'Editar Reservación' : 'Nueva Reservación'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <div className="flex justify-between items-center mb-2">
                    <Label>Cliente *</Label>
                    <CustomerDialog onCustomerCreated={fetchData} />
                  </div>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    required
                    data-testid="customer-select"
                  >
                    <option value="">Seleccionar cliente</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Tipo de Renta */}
                <div className="col-span-2">
                  <Label>Tipo de Renta *</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({...formData, rental_type: 'pasadia'});
                        if(formData.villa_id) handleVillaChange(formData.villa_id);
                      }}
                      className={`p-3 border-2 rounded-md font-medium ${formData.rental_type === 'pasadia' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-300'}`}
                    >
                      Pasadía
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({...formData, rental_type: 'amanecida'});
                        if(formData.villa_id) handleVillaChange(formData.villa_id);
                      }}
                      className={`p-3 border-2 rounded-md font-medium ${formData.rental_type === 'amanecida' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-300'}`}
                    >
                      Amanecida
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({...formData, rental_type: 'evento'});
                        if(formData.villa_id) handleVillaChange(formData.villa_id);
                      }}
                      className={`p-3 border-2 rounded-md font-medium ${formData.rental_type === 'evento' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-300'}`}
                    >
                      Evento
                    </button>
                  </div>
                </div>

                {/* Villa */}
                <div className="col-span-2">
                  <Label>Villa *</Label>
                  <select
                    value={formData.villa_id}
                    onChange={(e) => handleVillaChange(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    required
                    data-testid="villa-select"
                  >
                    <option value="">Seleccionar villa</option>
                    {villas.map(v => (
                      <option key={v.id} value={v.id}>{v.code} - {v.name}</option>
                    ))}
                  </select>
                </div>

                {/* Fecha según tipo de renta */}
                {formData.rental_type === 'pasadia' ? (
                  <div className="col-span-2">
                    <Label>Fecha de Pasadía *</Label>
                    <Input
                      type="date"
                      value={formData.reservation_date}
                      onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                      required
                      data-testid="reservation-date-input"
                    />
                  </div>
                ) : (
                  <div className="col-span-2">
                    <Label>Fecha de Reservación *</Label>
                    <Input
                      type="date"
                      value={formData.reservation_date}
                      onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                      required
                      data-testid="reservation-date-input"
                    />
                  </div>
                )}
                
                {/* Horarios */}
                <div>
                  <Label>Hora de Entrada *</Label>
                  <Input
                    type="text"
                    value={formData.check_in_time}
                    onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                    placeholder="9:00 AM"
                    required
                  />
                </div>
                <div>
                  <Label>Hora de Salida *</Label>
                  <Input
                    type="text"
                    value={formData.check_out_time}
                    onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
                    placeholder="8:00 PM"
                    required
                  />
                </div>
                
                {/* Huéspedes y Moneda */}
                <div>
                  <Label>Huéspedes *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.guests}
                    onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) })}
                    required
                    data-testid="guests-input"
                  />
                </div>
                
                {/* Moneda */}
                <div>
                  <Label>Moneda *</Label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="DOP">Pesos Dominicanos (DOP)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>

                {/* Precio Base (auto desde villa) */}
                <div className="col-span-2">
                  <Label>Precio Base</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
                    data-testid="base-price-input"
                  />
                </div>
                
                {/* Horas Extras */}
                <div>
                  <Label>Horas Extras</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.extra_hours}
                    onChange={(e) => setFormData({ ...formData, extra_hours: parseFloat(e.target.value) })}
                    data-testid="extra-hours-input"
                  />
                </div>
                <div>
                  <Label>Costo Horas Extras</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.extra_hours_cost}
                    onChange={(e) => setFormData({ ...formData, extra_hours_cost: parseFloat(e.target.value) })}
                    data-testid="extra-hours-cost-input"
                  />
                </div>
                
                {/* Checkbox para servicios adicionales */}
                <div className="col-span-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showExtraServices}
                      onChange={(e) => setShowExtraServices(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">¿Lleva servicios adicionales?</span>
                  </label>
                </div>

                {/* Servicios Extras */}
                {showExtraServices && (
                  <div className="col-span-2 border-2 border-blue-200 p-4 rounded-md bg-blue-50">
                    <div className="flex justify-between items-center mb-3">
                      <Label className="text-lg font-bold">Servicios Adicionales</Label>
                      <Button type="button" size="sm" onClick={addExtraService}>
                        <Plus size={16} className="mr-1" /> Agregar
                      </Button>
                    </div>
                    {selectedExtraServices.map((service, index) => (
                      <div key={index} className="grid grid-cols-4 gap-2 mb-2 items-end">
                        <div className="col-span-2">
                          <Label className="text-xs">Servicio</Label>
                          <select
                            value={service.service_id}
                            onChange={(e) => updateExtraService(index, 'service_id', e.target.value)}
                            className="w-full p-2 border rounded-md text-sm"
                          >
                            <option value="">Seleccionar</option>
                            {extraServices.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs">Cant.</Label>
                          <Input
                            type="number"
                            min="1"
                            value={service.quantity}
                            onChange={(e) => updateExtraService(index, 'quantity', parseInt(e.target.value))}
                            className="text-sm"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1">
                            <Label className="text-xs">Precio</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={service.unit_price}
                              onChange={(e) => updateExtraService(index, 'unit_price', parseFloat(e.target.value))}
                              className="text-sm"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExtraService(index)}
                            className="text-red-600 mt-5"
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Descuento */}
                <div className="col-span-2">
                  <Label>Descuento</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                {/* Resumen de Totales */}
                <div className="col-span-2 bg-gray-100 p-4 rounded-md">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-bold">{formatCurrency(formData.subtotal, formData.currency)}</span>
                    </div>
                    {formData.discount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Descuento:</span>
                        <span>- {formatCurrency(formData.discount, formData.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>TOTAL:</span>
                      <span>{formatCurrency(formData.total_amount, formData.currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Método de Pago */}
                <div className="col-span-2">
                  <Label>Método de Pago *</Label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="deposito">Depósito</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="mixto">Mixto</option>
                  </select>
                </div>

                {/* Depósito */}
                <div>
                  <Label>Depósito de Seguridad</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deposit}
                    onChange={(e) => setFormData({ ...formData, deposit: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                {/* Monto Pagado */}
                <div>
                  <Label>Monto Pagado *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount_paid}
                    onChange={(e) => setFormData({ ...formData, amount_paid: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label>Estado</Label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    data-testid="status-select"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="confirmed">Confirmada</option>
                    <option value="completed">Completada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Label>Notas</Label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    rows="3"
                    data-testid="notes-input"
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" data-testid="save-reservation-button">
                  {editingReservation ? 'Actualizar' : 'Guardar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="text-gray-400" size={20} />
        <Input
          placeholder="Buscar por cliente, villa o número de factura..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
          data-testid="search-input"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Reservaciones ({filteredReservations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="reservations-table">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-medium">Factura</th>
                  <th className="text-left p-2 text-sm font-medium">Cliente</th>
                  <th className="text-left p-2 text-sm font-medium">Villa</th>
                  <th className="text-left p-2 text-sm font-medium">Check-in</th>
                  <th className="text-right p-2 text-sm font-medium">Total</th>
                  <th className="text-right p-2 text-sm font-medium">Pagado</th>
                  <th className="text-right p-2 text-sm font-medium">Restante</th>
                  <th className="text-center p-2 text-sm font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.length > 0 ? (
                  filteredReservations.map((res) => (
                    <tr key={res.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-sm">{res.invoice_number}</td>
                      <td className="p-2 text-sm">{res.customer_name}</td>
                      <td className="p-2 text-sm">{res.villa_name}</td>
                      <td className="p-2 text-sm">{new Date(res.check_in).toLocaleDateString('es-DO')}</td>
                      <td className="p-2 text-sm text-right">{formatCurrency(res.total_amount, res.currency)}</td>
                      <td className="p-2 text-sm text-right">{formatCurrency(res.amount_paid, res.currency)}</td>
                      <td className="p-2 text-sm text-right font-medium">
                        <span className={res.balance_due > 0 ? 'text-orange-600' : 'text-green-600'}>
                          {formatCurrency(res.balance_due, res.currency)}
                        </span>
                      </td>
                      <td className="p-2 text-sm">
                        <div className="flex justify-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePrint(res)}
                            data-testid="print-button"
                          >
                            <Printer size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(res)}
                            data-testid="edit-button"
                          >
                            <Edit size={16} />
                          </Button>
                          {user?.role === 'admin' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(res.id)}
                              className="text-red-600 hover:text-red-700"
                              data-testid="delete-button"
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-500">
                      No hay reservaciones
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reservations;
