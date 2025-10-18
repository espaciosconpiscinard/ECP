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

const ReservationsNew = () => {
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
  
  // Form data con todos los campos nuevos
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    villa_id: '',
    villa_code: '',
    villa_description: '',
    rental_type: 'pasadia',  // pasadia, amanecida, evento
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
  
  const [selectedExtraServices, setSelectedExtraServices] = useState([]);
  const [showExtraServices, setShowExtraServices] = useState(false);

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

  const handleRentalTypeChange = (type) => {
    setFormData(prev => ({ ...prev, rental_type: type }));
    // Re-calcular precio si ya hay una villa seleccionada
    if (formData.villa_id) {
      handleVillaChange(formData.villa_id);
    }
  };

  const addExtraService = () => {
    if (selectedExtraServices.length < extraServices.length) {
      setSelectedExtraServices([
        ...selectedExtraServices,
        { service_id: '', service_name: '', quantity: 1, unit_price: 0, total: 0 }
      ]);
    }
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
    setSelectedExtraServices([]);
    setShowExtraServices(false);
  };

  const handlePrint = (reservation) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Factura ${reservation.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; color: #2563eb; }
            .company-info { font-size: 12px; margin-top: 10px; }
            .invoice-title { font-size: 20px; font-weight: bold; margin: 20px 0; }
            .info-section { margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 5px; }
            .info-row.highlight { background: #f3f4f6; }
            .label { font-weight: bold; }
            .services-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .services-table th, .services-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .services-table th { background: #2563eb; color: white; }
            .total-section { margin-top: 30px; padding: 15px; background: #f9fafb; border: 2px solid #2563eb; }
            .total-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 16px; }
            .total-row.final { font-size: 20px; font-weight: bold; color: #2563eb; }
            .footer { margin-top: 40px; font-size: 11px; border-top: 1px solid #ddd; padding-top: 20px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">ESPACIOS CON PISCINA ECP, SRL</div>
            <div class="company-info">
              RNC: 1-33-24652-1<br/>
              Calle Mencia #5, Ensanche Los Tainos, San Isidro, Santo Domingo Este, R.D.<br/>
              Oficina: 829-953-8401 | WhatsApp Ventas: 829-904-4245
            </div>
          </div>
          
          <div class="invoice-title">FACTURA #${reservation.invoice_number}</div>
          
          <div class="info-section">
            <div class="info-row highlight">
              <span class="label">Cliente:</span>
              <span>${reservation.customer_name}</span>
            </div>
            <div class="info-row">
              <span class="label">Villa:</span>
              <span>${reservation.villa_code}</span>
            </div>
            <div class="info-row highlight">
              <span class="label">Tipo de Renta:</span>
              <span>${reservation.rental_type === 'pasadia' ? 'Pasadía' : reservation.rental_type === 'amanecida' ? 'Amanecida' : 'Evento'}</span>
            </div>
            <div class="info-row">
              <span class="label">Fecha:</span>
              <span>${new Date(reservation.reservation_date).toLocaleDateString('es-DO')}</span>
            </div>
            <div class="info-row highlight">
              <span class="label">Horario:</span>
              <span>${reservation.check_in_time} - ${reservation.check_out_time}</span>
            </div>
            <div class="info-row">
              <span class="label">Personas:</span>
              <span>${reservation.guests}</span>
            </div>
          </div>
          
          ${reservation.extra_services && reservation.extra_services.length > 0 ? `
            <table class="services-table">
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Cantidad</th>
                  <th>Precio Unit.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Alquiler de Espacio (${reservation.villa_code})</td>
                  <td>1</td>
                  <td>${reservation.currency === 'DOP' ? 'RD$' : '$'} ${reservation.base_price.toLocaleString('es-DO')}</td>
                  <td>${reservation.currency === 'DOP' ? 'RD$' : '$'} ${reservation.base_price.toLocaleString('es-DO')}</td>
                </tr>
                ${reservation.extra_services.map(service => `
                  <tr>
                    <td>${service.service_name}</td>
                    <td>${service.quantity}</td>
                    <td>${reservation.currency === 'DOP' ? 'RD$' : '$'} ${service.unit_price.toLocaleString('es-DO')}</td>
                    <td>${reservation.currency === 'DOP' ? 'RD$' : '$'} ${service.total.toLocaleString('es-DO')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
          
          <div class="total-section">
            <div class="total-row">
              <span class="label">Subtotal:</span>
              <span>${reservation.currency === 'DOP' ? 'RD$' : '$'} ${reservation.subtotal.toLocaleString('es-DO')}</span>
            </div>
            ${reservation.discount > 0 ? `
              <div class="total-row">
                <span class="label">Descuento:</span>
                <span>- ${reservation.currency === 'DOP' ? 'RD$' : '$'} ${reservation.discount.toLocaleString('es-DO')}</span>
              </div>
            ` : ''}
            <div class="total-row">
              <span class="label">Total:</span>
              <span>${reservation.currency === 'DOP' ? 'RD$' : '$'} ${reservation.total_amount.toLocaleString('es-DO')}</span>
            </div>
            <div class="total-row">
              <span class="label">Depósito:</span>
              <span>${reservation.currency === 'DOP' ? 'RD$' : '$'} ${reservation.deposit.toLocaleString('es-DO')}</span>
            </div>
            <div class="total-row">
              <span class="label">Pagado:</span>
              <span>${reservation.currency === 'DOP' ? 'RD$' : '$'} ${reservation.amount_paid.toLocaleString('es-DO')}</span>
            </div>
            <div class="total-row final">
              <span class="label">RESTANTE A PAGAR:</span>
              <span>${reservation.currency === 'DOP' ? 'RD$' : '$'} ${reservation.balance_due.toLocaleString('es-DO')}</span>
            </div>
            <div class="total-row">
              <span class="label">Método de Pago:</span>
              <span>${reservation.payment_method.charAt(0).toUpperCase() + reservation.payment_method.slice(1)}</span>
            </div>
          </div>
          
          ${reservation.notes ? `
            <div class="info-section">
              <p class="label">Notas:</p>
              <p>${reservation.notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <p><strong>Políticas:</strong></p>
            <p>• El depósito de seguridad es reembolsable si no hay daños a la propiedad.</p>
            <p>• Las fechas se garantizan con el depósito del 50%.</p>
            <p>• No hay reembolsos por cancelaciones, llegadas tardías o salidas anticipadas.</p>
            <p>• El número máximo de huéspedes no debe excederse.</p>
            <p>• Cualquier daño a la propiedad será cobrado al cliente.</p>
          </div>
          
          <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #2563eb; color: white; border: none; cursor: pointer; border-radius: 5px;">Imprimir Factura</button>
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
    r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.villa_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8" data-testid="reservations-loading">Cargando...</div>;
  }

  return (
    <div className="space-y-6" data-testid="reservations-page">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Reservaciones</h2>
          <p className="text-gray-500 mt-1">Gestiona las reservaciones y facturas</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} data-testid="add-reservation-button">
              <Plus className="mr-2 h-4 w-4" /> Nueva Reservación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingReservation ? 'Editar Reservación' : 'Nueva Reservación'}
              </DialogTitle>
            </DialogHeader>
            
            {/* CONTINÚA EN LA SIGUIENTE PARTE... */}
