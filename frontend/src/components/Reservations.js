import React, { useState, useEffect } from 'react';
import { getReservations, getCustomers, getVillas, getExtraServices, createReservation, updateReservation, deleteReservation, addAbonoToReservation } from '../api/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Edit, Trash2, Printer, Search, X, ChevronDown, ChevronUp, Download, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CustomerDialog from './CustomerDialog';
import ConduceForm from './ConduceForm';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const Reservations = () => {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [villas, setVillas] = useState([]);
  const [extraServices, setExtraServices] = useState([]);
  const [logo, setLogo] = useState(null);
  const [invoiceTemplate, setInvoiceTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [selectedExtraServices, setSelectedExtraServices] = useState([]);
  const [showExtraServices, setShowExtraServices] = useState(false);
  const [expandedReservations, setExpandedReservations] = useState({});
  const [isAbonoDialogOpen, setIsAbonoDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [villaSearchTerm, setVillaSearchTerm] = useState('');
  const [showVillaDropdown, setShowVillaDropdown] = useState(false);
  const [isConduceDialogOpen, setIsConduceDialogOpen] = useState(false);
  const [conduceFromReservation, setConduceFromReservation] = useState(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  // Nuevo estado para tipo de factura
  const [invoiceType, setInvoiceType] = useState('villa'); // 'villa' o 'service'
  const [abonoFormData, setAbonoFormData] = useState({
    amount: 0,
    currency: 'DOP',
    payment_method: 'efectivo',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
    invoice_number: ''  // Número de factura para el abono (solo admin)
  });
  
  // Estados para selección múltiple
  const [selectedReservations, setSelectedReservations] = useState([]);
  const [selectAllReservations, setSelectAllReservations] = useState(false);
  
  // Estado para almacenar los abonos de cada reservación (para mostrar invoice_numbers)
  const [reservationAbonos, setReservationAbonos] = useState({});
  
  // Estados para precios flexibles
  const [selectedVillaFlexiblePrices, setSelectedVillaFlexiblePrices] = useState(null);
  const [showPriceSelector, setShowPriceSelector] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    villa_id: '',
    villa_code: '',
    villa_description: '',
    villa_location: '',
    rental_type: 'pasadia',
    event_type: '',
    reservation_date: new Date().toISOString().split('T')[0],
    check_out_date: '',
    check_in_time: '9:00 AM',
    check_out_time: '8:00 PM',
    guests: 1,
    base_price: 0,
    owner_price: 0,
    extra_hours: 0,
    extra_hours_cost: 0,
    extra_hours_unit_price: 0,
    extra_people: 0,
    extra_people_cost: 0,
    extra_people_unit_price: 0,
    extra_services: [],
    extra_services_total: 0,
    subtotal: 0,
    discount: 0,
    include_itbis: false,
    itbis_amount: 0,
    total_amount: 0,
    deposit: 0,
    payment_method: 'efectivo',
    payment_details: '',
    amount_paid: 0,
    currency: 'DOP',
    notes: '',
    internal_notes: '',  // Nota interna (no se imprime)
    status: 'confirmed',
    invoice_number: null  // Solo admin puede establecer manualmente
  });

  useEffect(() => {
    fetchData();
    fetchLogo();
    fetchInvoiceTemplate();
  }, []);

  const fetchInvoiceTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/config/invoice-template`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setInvoiceTemplate(data);
      }
    } catch (err) {
      console.error('Error loading invoice template:', err);
    }
  };

  const fetchLogo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/config/logo`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.logo_data) {
          setLogo(data.logo_data);
        }
      }
    } catch (err) {
      console.error('Error loading logo:', err);
    }
  };

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
      
      console.log('📋 Servicios cargados:', servicesResponse.data);
      console.log('📋 Total servicios:', servicesResponse.data.length);
      
      // Cargar abonos de cada reservación para mostrar sus invoice_numbers
      const abonosMap = {};
      for (const reservation of resResponse.data) {
        try {
          const abonosResponse = await fetch(`${API_URL}/api/reservations/${reservation.id}/abonos`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (abonosResponse.ok) {
            const abonos = await abonosResponse.json();
            abonosMap[reservation.id] = abonos;
          }
        } catch (err) {
          console.error(`Error loading abonos for reservation ${reservation.id}:`, err);
        }
      }
      setReservationAbonos(abonosMap);
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomersOnly = async () => {
    try {
      const custResponse = await getCustomers();
      setCustomers(custResponse.data);
      // NO recargamos reservations, villas ni servicios
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    }
  };
  
  // Calcular totales automáticamente
  useEffect(() => {
    const basePrice = parseFloat(formData.base_price) || 0;
    const extraHoursCost = parseFloat(formData.extra_hours_cost) || 0;
    const extraPeopleCost = parseFloat(formData.extra_people_cost) || 0;
    const extraServicesTotal = selectedExtraServices.reduce((sum, s) => sum + (s.total || 0), 0);
    
    const subtotal = basePrice + extraHoursCost + extraPeopleCost + extraServicesTotal;
    const discount = parseFloat(formData.discount) || 0;
    const subtotalAfterDiscount = subtotal - discount;
    
    // Calcular ITBIS (18% sobre subtotal sin depósito)
    let itbisAmount = 0;
    if (formData.include_itbis) {
      itbisAmount = subtotalAfterDiscount * 0.18;
    }
    
    const total = subtotalAfterDiscount + itbisAmount;
    
    setFormData(prev => ({
      ...prev,
      extra_services_total: extraServicesTotal,
      subtotal: subtotal,
      itbis_amount: itbisAmount,
      total_amount: total
    }));
  }, [formData.base_price, formData.extra_hours_cost, formData.extra_people_cost, formData.discount, formData.include_itbis, selectedExtraServices]);
  
  const handleVillaChange = (villaId) => {
    const villa = villas.find(v => v.id === villaId);
    if (villa) {
      // Guardar precios flexibles de la villa
      setSelectedVillaFlexiblePrices(villa.flexible_prices || null);
      
      // Si tiene precios flexibles, mostrar selector
      if (villa.flexible_prices && villa.flexible_prices[formData.rental_type]?.length > 0) {
        setShowPriceSelector(true);
        // No auto-llenar precios, esperar que usuario seleccione
        setFormData(prev => ({
          ...prev,
          villa_id: villaId,
          villa_code: villa.code,
          villa_description: villa.description || '',
          villa_location: villa.location || '',
          check_in_time: villa.default_check_in_time || '9:00 AM',
          check_out_time: villa.default_check_out_time || '8:00 PM',
          base_price: 0,
          owner_price: 0,
          extra_hours_unit_price: villa.extra_hours_price_client || 0,
          extra_people_unit_price: villa.extra_people_price_client || 0
        }));
      } else {
        // Si no tiene precios flexibles, usar precios fijos (compatibilidad)
        setShowPriceSelector(false);
        let clientPrice = 0;
        let ownerPrice = 0;
        
        if (formData.rental_type === 'pasadia') {
          clientPrice = villa.default_price_pasadia || 0;
          ownerPrice = villa.owner_price_pasadia || 0;
        } else if (formData.rental_type === 'amanecida') {
          clientPrice = villa.default_price_amanecida || 0;
          ownerPrice = villa.owner_price_amanecida || 0;
        } else if (formData.rental_type === 'evento') {
          clientPrice = villa.default_price_evento || 0;
          ownerPrice = villa.owner_price_evento || 0;
        }
        
        setFormData(prev => ({
          ...prev,
          villa_id: villaId,
          villa_code: villa.code,
          villa_description: villa.description || '',
          villa_location: villa.location || '',
          check_in_time: villa.default_check_in_time || '9:00 AM',
          check_out_time: villa.default_check_out_time || '8:00 PM',
          base_price: clientPrice,
          owner_price: ownerPrice,
          extra_hours_unit_price: villa.extra_hours_price_client || 0,
          extra_people_unit_price: villa.extra_people_price_client || 0
        }));
      }
    }
  };

  const handleSelectFlexiblePrice = (priceOption) => {
    // Extraer número de personas del people_count (ej: "1-10" → 10, "21+" → 21)
    let guestCount = 1;
    if (priceOption.people_count) {
      const match = priceOption.people_count.match(/(\d+)/g);
      if (match && match.length > 0) {
        // Si tiene rango (ej: "1-10"), tomar el número más alto
        guestCount = parseInt(match[match.length - 1]);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      base_price: priceOption.client_price,
      owner_price: priceOption.owner_price,
      guests: guestCount  // Auto-llenar huéspedes
    }));
    setShowPriceSelector(false);
  };
  
  const addExtraService = () => {
    setSelectedExtraServices([
      ...selectedExtraServices,
      { 
        service_id: '', 
        service_name: '', 
        supplier_name: '', 
        supplier_cost: 0, 
        quantity: 1, 
        unit_price: 0, 
        total: 0 
      }
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
        updated[index].name = service.name;
        updated[index].unit_price = service.default_price;
        updated[index].price_unit = service.default_price;
        updated[index].total = service.default_price * updated[index].quantity;
        updated[index].price_total = service.default_price * updated[index].quantity;
      }
    }
    
    if (field === 'quantity' || field === 'unit_price' || field === 'price_unit') {
      const unitPrice = updated[index].price_unit || updated[index].unit_price || 0;
      updated[index].total = updated[index].quantity * unitPrice;
      updated[index].price_total = updated[index].quantity * unitPrice;
    }
    
    setSelectedExtraServices(updated);
    
    // Recalcular totales generales
    const servicesTotal = updated.reduce((sum, s) => sum + (s.price_total || s.total || 0), 0);
    const newSubtotal = (formData.base_price || 0) + (formData.extra_hours_cost || 0) + (formData.extra_people_cost || 0) + servicesTotal;
    const newITBIS = formData.include_itbis ? newSubtotal * 0.18 : 0;
    const newTotal = newSubtotal + newITBIS - (formData.discount || 0);
    
    setFormData(prev => ({
      ...prev,
      extra_services: updated,
      extra_services_total: servicesTotal,
      subtotal: newSubtotal,
      itbis_amount: newITBIS,
      total_amount: newTotal
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // VALIDACIÓN: Facturas "Solo Servicios" deben tener al menos un servicio
      if (invoiceType === 'service' && !formData.villa_id) {
        const servicesWithData = selectedExtraServices.filter(s => s.service_id);
        if (servicesWithData.length === 0) {
          setError('No se pueden crear facturas "Solo Servicios" sin agregar servicios. Por favor, agrega al menos un servicio antes de guardar.');
          return;
        }
      }
      
      const customer = customers.find(c => c.id === formData.customer_id);
      
      // Arreglar fecha para evitar problema de zona horaria
      const reservationDate = formData.reservation_date.includes('T') 
        ? formData.reservation_date 
        : `${formData.reservation_date}T12:00:00.000Z`; // Usar mediodía UTC para evitar cambio de día
      
      const dataToSend = {
        ...formData,
        customer_name: customer?.name || '',
        reservation_date: reservationDate,
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
      console.error('Error completo:', err.response?.data);
      
      // Manejar errores de validación de Pydantic
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        
        // Si es un array de errores de validación
        if (Array.isArray(detail)) {
          const errorMessages = detail.map(e => `${e.loc.join('.')}: ${e.msg}`).join('\n');
          setError('Errores de validación:\n' + errorMessages);
        } else if (typeof detail === 'string') {
          setError(detail);
        } else {
          setError('Error al guardar la factura');
        }
      } else {
        setError('Error al guardar la factura');
      }
    }
  };

  const handleEdit = (reservation) => {
    setEditingReservation(reservation);
    
    // Encontrar la villa para establecer el texto de búsqueda
    const villa = villas.find(v => v.id === reservation.villa_id);
    if (villa) {
      setVillaSearchTerm(`${villa.code} - ${villa.name}`);
    }

    // Encontrar el cliente para establecer el texto de búsqueda
    const customer = customers.find(c => c.id === reservation.customer_id);
    if (customer) {
      setCustomerSearchTerm(customer.name);
    }
    
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
      owner_price: reservation.owner_price || 0,
      extra_hours: reservation.extra_hours || 0,
      extra_hours_cost: reservation.extra_hours_cost || 0,
      extra_services_total: reservation.extra_services_total || 0,
      subtotal: reservation.subtotal,
      discount: reservation.discount || 0,
      include_itbis: reservation.include_itbis || false,
      itbis_amount: reservation.itbis_amount || 0,
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

  // Manejar selección individual de reservaciones
  const handleSelectReservation = (reservationId) => {
    setSelectedReservations(prev => {
      if (prev.includes(reservationId)) {
        return prev.filter(id => id !== reservationId);
      } else {
        return [...prev, reservationId];
      }
    });
  };

  // Manejar seleccionar todas las reservaciones
  const handleSelectAllReservations = () => {
    if (selectAllReservations) {
      setSelectedReservations([]);
      setSelectAllReservations(false);
    } else {
      setSelectedReservations(filteredReservations.map(r => r.id));
      setSelectAllReservations(true);
    }
  };

  // Eliminar reservaciones seleccionadas
  const handleDeleteSelectedReservations = async () => {
    if (selectedReservations.length === 0) {
      alert('No hay reservaciones seleccionadas');
      return;
    }
    
    if (window.confirm(`¿Estás seguro de eliminar ${selectedReservations.length} reservación(es)?`)) {
      try {
        await Promise.all(selectedReservations.map(id => deleteReservation(id)));
        setSelectedReservations([]);
        setSelectAllReservations(false);
        await fetchData();
      } catch (err) {
        setError('Error al eliminar reservaciones');
        console.error(err);
      }
    }
  };

  const resetForm = () => {
    setEditingReservation(null);
    setSelectedExtraServices([]);
    setShowExtraServices(false);
    setVillaSearchTerm('');
    setShowVillaDropdown(false);
    setCustomerSearchTerm('');
    setShowCustomerDropdown(false);
    setFormData({
      customer_id: '',
      customer_name: '',
      villa_id: '',
      villa_code: '',
      villa_description: '',
      rental_type: 'pasadia',
      event_type: '',
      reservation_date: new Date().toISOString().split('T')[0],
      check_out_date: '',
      check_in_time: '9:00 AM',
      check_out_time: '8:00 PM',
      guests: 1,
      base_price: 0,
      owner_price: 0,
      extra_hours: 0,
      extra_hours_cost: 0,
      extra_services: [],
      extra_services_total: 0,
      subtotal: 0,
      discount: 0,
      include_itbis: false,
      itbis_amount: 0,
      total_amount: 0,
      deposit: 0,
      payment_method: 'efectivo',
      payment_details: '',
      amount_paid: 0,
      currency: 'DOP',
      notes: '',
      internal_notes: '',  // Nota interna
      status: 'confirmed'
    });
  };

  const toggleExpand = (reservationId) => {
    setExpandedReservations(prev => ({
      ...prev,
      [reservationId]: !prev[reservationId]
    }));
  };

  const handleAddAbono = (reservation) => {
    setSelectedReservation(reservation);
    setAbonoFormData({
      amount: 0,
      currency: reservation.currency,
      payment_method: 'efectivo',
      payment_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setIsAbonoDialogOpen(true);
  };

  const submitAbono = async (e) => {
    e.preventDefault();
    if (!selectedReservation) return;
    
    try {
      // Preparar datos del abono, incluyendo invoice_number solo si se proporcionó
      const abonoData = { ...abonoFormData };
      if (!abonoData.invoice_number || abonoData.invoice_number.trim() === '') {
        delete abonoData.invoice_number;
      }
      
      await addAbonoToReservation(selectedReservation.id, abonoData);
      setIsAbonoDialogOpen(false);
      setSelectedReservation(null);
      // Resetear formulario de abono
      setAbonoFormData({
        amount: 0,
        currency: 'DOP',
        payment_method: 'efectivo',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
        invoice_number: ''
      });
      await fetchData();
      alert('Abono registrado exitosamente');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al registrar abono');
      console.error(err);
    }
  };

  const handlePrint = async (reservation) => {
    // Cargar los abonos de esta reservación
    let abonos = [];
    try {
      const response = await fetch(`${API_URL}/api/reservations/${reservation.id}/abonos`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        abonos = await response.json();
      }
    } catch (err) {
      console.error('Error loading abonos for print:', err);
    }
    
    const printWindow = window.open('', '', 'width=900,height=700');
    const balanceDue = reservation.balance_due || 0;
    
    // Generar HTML de políticas
    let policiesHtml = '';
    if (invoiceTemplate && invoiceTemplate.policies && invoiceTemplate.policies.length > 0) {
      policiesHtml = invoiceTemplate.policies.map(policy => `<p>• ${policy}</p>`).join('');
    } else {
      // Políticas por defecto
      policiesHtml = `
        <p>• El depósito de seguridad es reembolsable si no hay daños a la propiedad.</p>
        <p>• Las reservaciones se garantizan con el pago del 50% del total.</p>
        <p>• No hay reembolsos por cancelaciones, llegadas tardías o salidas anticipadas.</p>
        <p>• El número máximo de huéspedes no debe ser excedido.</p>
        <p>• Cualquier daño será cobrado al cliente. Prohibido fumar en áreas cerradas.</p>
      `;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Factura ${reservation.invoice_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
              padding: 30px; 
              color: #333;
              background: #f5f5f5;
            }
            .invoice-wrapper {
              max-width: 900px;
              margin: 0 auto;
              background: white;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            
            /* Top Bar - Colores del logo (azul) */
            .top-bar {
              height: 15px;
              background: #0ea5e9;
            }
            
            /* Header Section */
            .header {
              display: flex;
              justify-content: space-between;
              padding: 40px 50px 30px;
              border-bottom: 3px solid #0369a1;
            }
            .header-left {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            .logo { 
              height: 60px; 
              width: auto;
            }
            .brand-info {
              display: flex;
              flex-direction: column;
            }
            .brand-name { 
              font-size: 16px; 
              font-weight: 700;
              color: #0369a1;
              line-height: 1.2;
            }
            .brand-tagline { 
              font-size: 9px; 
              color: #0ea5e9;
              font-weight: 600;
              letter-spacing: 1px;
            }
            .header-right {
              text-align: right;
            }
            .invoice-title { 
              font-size: 28px; 
              font-weight: 700;
              color: #0ea5e9;
              margin-bottom: 8px;
              line-height: 1;
            }
            .invoice-meta {
              font-size: 10px;
              color: #0369a1;
              line-height: 1.8;
            }
            .invoice-meta strong {
              display: inline-block;
              min-width: 90px;
            }
            
            /* Content Area */
            .content {
              padding: 20px 40px;
            }
            
            /* Payment Info & Bill To */
            .info-row {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 12px;
            }
            .info-box {
              background: #f0f9ff;
              padding: 8px 10px;
              border-left: 2px solid #0ea5e9;
            }
            .info-title {
              font-size: 9px;
              font-weight: 700;
              color: #0369a1;
              margin-bottom: 4px;
              text-transform: uppercase;
            }
            .info-line {
              font-size: 8px;
              margin: 2px 0;
              color: #555;
              line-height: 1.3;
            }
            .info-line strong {
              color: #0369a1;
              min-width: 65px;
              display: inline-block;
            }
            
            /* Villa Description Box */
            .villa-description {
              background: #e0f2fe;
              padding: 8px 10px;
              margin: 10px 0;
              border-left: 2px solid #0ea5e9;
            }
            .villa-description-title {
              font-size: 9px;
              font-weight: 700;
              color: #0369a1;
              margin-bottom: 4px;
              text-transform: uppercase;
            }
            .villa-description-text {
              font-size: 8px;
              line-height: 1.4;
              color: #555;
            }
            
            /* Services Table */
            .services-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .services-table thead {
              background: #0ea5e9;
              color: white;
            }
            .services-table th {
              padding: 10px 10px;
              text-align: left;
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .services-table td {
              padding: 10px 10px;
              font-size: 11px;
              border-bottom: 1px solid #e0e0e0;
            }
            .services-table tbody tr:nth-child(even) {
              background: #f9f9f9;
            }
            .services-table tbody tr:hover {
              background: #f0f9ff;
            }
            
            /* Totals Section */
            .totals-wrapper {
              display: flex;
              justify-content: flex-end;
              margin-top: 30px;
            }
            .totals-box {
              width: 350px;
            }
            .total-line {
              display: flex;
              justify-content: space-between;
              padding: 8px 12px;
              font-size: 11px;
              border-bottom: 1px solid #e0e0e0;
            }
            .total-line.subtotal {
              background: #f8f9fa;
              font-weight: 600;
            }
            .total-line.deposit {
              color: #059669;
            }
            .total-line.grand-total {
              background: #0ea5e9;
              color: white;
              font-size: 14px;
              font-weight: 700;
              border: none;
              padding: 12px;
            }
            
            /* Abonos Section */
            .abonos-section {
              margin: 15px 0;
              padding: 12px;
              background: #f0f9ff;
              border-radius: 6px;
              border: 2px solid #0ea5e9;
            }
            .abonos-title {
              font-size: 11px;
              font-weight: 700;
              color: #0369a1;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            .abonos-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9px;
            }
            .abonos-table thead {
              background: #0ea5e9;
              color: white;
            }
            .abonos-table th {
              padding: 8px;
              text-align: left;
              font-weight: 600;
            }
            .abonos-table tbody tr {
              border-bottom: 1px solid #ddd;
            }
            .abonos-table tbody td {
              padding: 8px;
            }
            .abonos-table tfoot {
              background: #e0f2fe;
              font-weight: 700;
            }
            .abonos-table tfoot td {
              padding: 10px 8px;
            }
            
            /* Payment & Notes */
            .extra-info {
              margin: 30px 0;
            }
            .payment-box, .notes-box {
              background: #f0f9ff;
              padding: 12px 15px;
              margin: 12px 0;
              border-left: 4px solid #0ea5e9;
              font-size: 10px;
            }
            .notes-box {
              border-left-color: #f59e0b;
              background: #fef3c7;
            }
            
            /* Terms & Signature */
            .terms-section {
              margin: 15px 0;
              padding: 12px 15px;
              background: #f8f9fa;
              page-break-inside: avoid;
            }
            .terms-title {
              font-size: 10px;
              font-weight: 700;
              color: #0369a1;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            .terms-content {
              font-size: 8px;
              line-height: 1.5;
              color: #666;
              column-count: 2;
              column-gap: 25px;
            }
            .terms-content p {
              margin: 3px 0;
              break-inside: avoid;
            }
            
            /* Footer */
            .footer {
              background: #0369a1;
              color: white;
              padding: 20px 40px;
              text-align: center;
              position: relative;
            }
            .footer::before {
              content: '';
              position: absolute;
              top: -15px;
              left: 0;
              width: 0;
              height: 0;
              border-left: 40px solid transparent;
              border-bottom: 15px solid #0ea5e9;
            }
            .thank-you {
              font-size: 14px;
              font-weight: 700;
              letter-spacing: 1px;
              margin-bottom: 8px;
            }
            .footer-contact {
              font-size: 9px;
              opacity: 0.9;
            }
            
            /* Print Button */
            .print-button {
              margin: 30px auto;
              display: block;
              padding: 14px 40px;
              background: #0ea5e9;
              color: white;
              border: none;
              border-radius: 5px;
              font-size: 15px;
              font-weight: 600;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(14,165,233,0.3);
            }
            .print-button:hover {
              background: #0284c7;
            }
            
            @media print {
              body { padding: 0; background: white; }
              .invoice-wrapper { box-shadow: none; }
              .print-button { display: none; }
              .villa-description { page-break-inside: avoid; }
              .terms-section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-wrapper">
            <!-- Top Bar -->
            <div class="top-bar"></div>
            
            <!-- Header -->
            <div class="header">
              <div class="header-left">
                ${logo ? `<img src="${logo}" alt="Logo" class="logo" />` : '<div style="width: 80px; height: 80px; background: #0ea5e9; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">EC</div>'}
                <div class="brand-info">
                  <div class="brand-name">ESPACIOS CON PISCINA</div>
                  <div class="brand-tagline">ECP, SRL</div>
                </div>
              </div>
              <div class="header-right">
                <div class="invoice-title">FACTURA</div>
                <div class="invoice-meta">
                  <div><strong>Factura N°:</strong> ${reservation.invoice_number}</div>
                  <div><strong>Fecha:</strong> ${new Date(reservation.reservation_date).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                  <div><strong>RNC:</strong> 1-33-24652-1</div>
                </div>
              </div>
            </div>
            
            <!-- Content -->
            <div class="content">
              <!-- Payment Info & Bill To -->
              <div class="info-row">
                <div class="info-box">
                  <div class="info-title">Información de Pago</div>
                  <div class="info-line"><strong>Método:</strong> ${reservation.payment_method ? reservation.payment_method.charAt(0).toUpperCase() + reservation.payment_method.slice(1) : 'No especificado'}</div>
                  ${reservation.payment_details ? `<div class="info-line"><strong>Detalles:</strong> ${reservation.payment_details}</div>` : ''}
                  <div class="info-line"><strong>Teléfono:</strong> 829-953-8401</div>
                  <div class="info-line"><strong>WhatsApp:</strong> 829-904-4245</div>
                </div>
                
                <div class="info-box">
                  <div style="font-size: 11px; margin-bottom: 4px;">
                    <span style="font-weight: 700; color: #0369a1;">FACTURA DE:</span> 
                    <span style="font-weight: 700; color: #000;">${reservation.customer_name}</span>
                  </div>
                  ${reservation.customer_identification_document ? `
                    <div class="info-line"><strong>Cédula/RNC:</strong> ${reservation.customer_identification_document}</div>
                  ` : ''}
                  <div class="info-line"><strong>Villa:</strong> ${reservation.villa_code || reservation.villa_name}</div>
                  ${reservation.villa_location ? `<div class="info-line"><strong>Ubicación:</strong> ${reservation.villa_location}</div>` : ''}
                  <div class="info-line"><strong>Tipo:</strong> ${reservation.rental_type === 'pasadia' ? 'Pasadía' : reservation.rental_type === 'amanecida' ? 'Amanecida' : 'Evento'}</div>
                  <div class="info-line"><strong>Horario:</strong> ${reservation.check_in_time} - ${reservation.check_out_time}</div>
                  <div class="info-line"><strong>Personas:</strong> ${reservation.guests}</div>
                </div>
              </div>
              
              <!-- Villa Description -->
              ${reservation.villa_description ? `
                <div class="villa-description">
                  <div class="villa-description-title">Descripción de la Villa</div>
                  <div class="villa-description-text">${reservation.villa_description}</div>
                </div>
              ` : ''}
              
              <!-- Services Table -->
              <table class="services-table">
                <thead>
                  <tr>
                    <th style="width: 50px;">N°</th>
                    <th>DESCRIPCIÓN DEL SERVICIO</th>
                    <th style="text-align: right; width: 120px;">PRECIO UNIT.</th>
                    <th style="text-align: center; width: 80px;">CANT</th>
                    <th style="text-align: right; width: 120px;">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>01</td>
                    <td><strong>Alquiler de Espacio</strong> - ${reservation.villa_code || reservation.villa_name}</td>
                    <td style="text-align: right;">${reservation.currency === 'DOP' ? 'RD$' : '$'}${(reservation.base_price || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                    <td style="text-align: center;">1</td>
                    <td style="text-align: right;"><strong>${reservation.currency === 'DOP' ? 'RD$' : '$'}${(reservation.base_price || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</strong></td>
                  </tr>
                  ${reservation.extra_hours && reservation.extra_hours > 0 ? `
                    <tr>
                      <td>02</td>
                      <td>Horas Extras</td>
                      <td style="text-align: right;">${reservation.currency === 'DOP' ? 'RD$' : '$'}${((reservation.extra_hours_cost || 0) / reservation.extra_hours).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                      <td style="text-align: center;">${reservation.extra_hours}</td>
                      <td style="text-align: right;"><strong>${reservation.currency === 'DOP' ? 'RD$' : '$'}${(reservation.extra_hours_cost || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</strong></td>
                    </tr>
                  ` : ''}
                  ${reservation.extra_people && reservation.extra_people > 0 ? `
                    <tr>
                      <td>0${(reservation.extra_hours > 0 ? 3 : 2)}</td>
                      <td>Personas Extras</td>
                      <td style="text-align: right;">${reservation.currency === 'DOP' ? 'RD$' : '$'}${((reservation.extra_people_cost || 0) / reservation.extra_people).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                      <td style="text-align: center;">${reservation.extra_people}</td>
                      <td style="text-align: right;"><strong>${reservation.currency === 'DOP' ? 'RD$' : '$'}${(reservation.extra_people_cost || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</strong></td>
                    </tr>
                  ` : ''}
                  ${reservation.extra_services && reservation.extra_services.length > 0 ? reservation.extra_services.map((service, idx) => `
                    <tr>
                      <td>0${idx + (reservation.extra_hours > 0 ? 1 : 0) + (reservation.extra_people > 0 ? 1 : 0) + 2}</td>
                      <td>${service.service_name}</td>
                      <td style="text-align: right;">${reservation.currency === 'DOP' ? 'RD$' : '$'}${service.unit_price.toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                      <td style="text-align: center;">${service.quantity}</td>
                      <td style="text-align: right;"><strong>${reservation.currency === 'DOP' ? 'RD$' : '$'}${service.total.toLocaleString('es-DO', {minimumFractionDigits: 2})}</strong></td>
                    </tr>
                  `).join('') : ''}
                </tbody>
              </table>
              
              <!-- Totals -->
              <div class="totals-wrapper">
                <div class="totals-box">
                  <div class="total-line">
                    <span>Subtotal</span>
                    <span>${reservation.currency === 'DOP' ? 'RD$' : '$'}${(reservation.subtotal || reservation.total_amount).toLocaleString('es-DO', {minimumFractionDigits: 2})}</span>
                  </div>
                  ${reservation.discount && reservation.discount > 0 ? `
                    <div class="total-line" style="color: #dc2626;">
                      <span>Descuento</span>
                      <span>- ${reservation.currency === 'DOP' ? 'RD$' : '$'}${reservation.discount.toLocaleString('es-DO', {minimumFractionDigits: 2})}</span>
                    </div>
                  ` : ''}
                  ${reservation.include_itbis && reservation.itbis_amount > 0 ? `
                    <div class="total-line">
                      <span>ITBIS 18%</span>
                      <span>+ ${reservation.currency === 'DOP' ? 'RD$' : '$'}${reservation.itbis_amount.toLocaleString('es-DO', {minimumFractionDigits: 2})}</span>
                    </div>
                  ` : ''}
                  <div class="total-line subtotal">
                    <span>TOTAL</span>
                    <span>${reservation.currency === 'DOP' ? 'RD$' : '$'}${reservation.total_amount.toLocaleString('es-DO', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div class="total-line deposit">
                    <span>+ Depósito de Seguridad</span>
                    <span>${reservation.currency === 'DOP' ? 'RD$' : '$'}${(reservation.deposit || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div class="total-line">
                    <span>Monto Pagado</span>
                    <span>${reservation.currency === 'DOP' ? 'RD$' : '$'}${reservation.amount_paid.toLocaleString('es-DO', {minimumFractionDigits: 2})}</span>
                  </div>

                  
                  ${
                    // Calcular pago inicial (total pagado - suma de abonos)
                    (() => {
                      const totalAbonos = abonos.reduce((sum, a) => sum + a.amount, 0);
                      const pagoInicial = reservation.amount_paid - totalAbonos;
                      const hasHistory = pagoInicial > 0 || abonos.length > 0;
                      
                      if (!hasHistory) return '';
                      
                      let historyHtml = '<div class="abonos-section"><div class="abonos-title">📋 Historial de Pagos</div><table class="abonos-table"><thead><tr><th>Factura #</th><th>Fecha</th><th>Método</th><th>Monto</th></tr></thead><tbody>';
                      
                      // Pago inicial
                      if (pagoInicial > 0) {
                        historyHtml += '<tr style="background: #e0f2fe;"><td><strong>#' + reservation.invoice_number + '</strong> <span style="font-size: 9px; color: #0369a1;">(INICIAL)</span></td>';
                        historyHtml += '<td>' + new Date(reservation.reservation_date).toLocaleDateString('es-DO') + '</td>';
                        historyHtml += '<td>' + reservation.payment_method + '</td>';
                        historyHtml += '<td style="text-align: right; font-weight: bold;">' + (reservation.currency === 'DOP' ? 'RD$' : '$') + pagoInicial.toLocaleString('es-DO', {minimumFractionDigits: 2}) + '</td></tr>';
                      }
                      
                      // Abonos
                      abonos.forEach(abono => {
                        historyHtml += '<tr><td><strong>#' + abono.invoice_number + '</strong></td>';
                        historyHtml += '<td>' + new Date(abono.payment_date).toLocaleDateString('es-DO') + '</td>';
                        historyHtml += '<td>' + abono.payment_method + '</td>';
                        historyHtml += '<td style="text-align: right; font-weight: bold;">' + (reservation.currency === 'DOP' ? 'RD$' : '$') + abono.amount.toLocaleString('es-DO', {minimumFractionDigits: 2}) + '</td></tr>';
                        
                        if (abono.notes) {
                          historyHtml += '<tr><td colspan="4" style="padding: 5px 10px; font-size: 11px; color: #666; font-style: italic;">📝 ' + abono.notes + '</td></tr>';
                        }
                      });
                      
                      historyHtml += '</tbody><tfoot><tr><td colspan="3" style="text-align: right; font-weight: bold;">Total Pagos:</td>';
                      historyHtml += '<td style="text-align: right; font-weight: bold; color: #0ea5e9;">' + (reservation.currency === 'DOP' ? 'RD$' : '$') + reservation.amount_paid.toLocaleString('es-DO', {minimumFractionDigits: 2}) + '</td></tr></tfoot></table></div>';
                      
                      return historyHtml;
                    })()
                  }
                  
                  <div class="total-line grand-total">
                    <span>RESTANTE A PAGAR</span>
                    <span>${reservation.currency === 'DOP' ? 'RD$' : '$'}${balanceDue.toLocaleString('es-DO', {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
              </div>
              
              ${reservation.notes ? `
                <div class="notes-box">
                  <strong>Notas Adicionales:</strong><br/>
                  ${reservation.notes}
                </div>
              ` : ''}
              
              <!-- Terms & Conditions -->
              <div class="terms-section">
                <div class="terms-title">Términos y Condiciones</div>
                <div class="terms-content">
                  ${policiesHtml}
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <div class="thank-you">GRACIAS POR SU PREFERENCIA</div>
              <div class="footer-contact">
                Calle Mencia #5, Ensanche Los Tainos, San Isidro, SDE | 
                Contacto: 829-904-4245 (WhatsApp)
              </div>
            </div>
          </div>
          
          <button onclick="window.print()" class="print-button">🖨️ IMPRIMIR FACTURA</button>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = async (reservation) => {
    try {
      // Crear nuevo documento PDF
      const doc = new jsPDF();
      
      // Configuración de colores
      const primaryColor = [14, 165, 233]; // #0ea5e9
      const darkColor = [3, 105, 161]; // #0369a1
      
      // Agregar logo si existe
      if (logo) {
        try {
          doc.addImage(logo, 'PNG', 15, 15, 30, 30);
        } catch (e) {
          console.log('Could not add logo:', e);
        }
      }
      
      // Título
      doc.setFontSize(24);
      doc.setTextColor(...darkColor);
      doc.setFont(undefined, 'bold');
      doc.text('FACTURA', 150, 25);
      
      // Número de factura
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.setFont(undefined, 'normal');
      doc.text(`#${reservation.invoice_number}`, 150, 32);
      
      // Información de la empresa
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.setFont(undefined, 'bold');
      doc.text('Espacios Con Piscina', 15, 52);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text('Calle Mencia #5, Ensanche Los Tainos', 15, 58);
      doc.text('San Isidro, SDE', 15, 63);
      doc.text('Tel: 829-904-4245', 15, 68);
      
      // Información del cliente
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('CLIENTE', 150, 52);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(reservation.customer_name, 150, 58);
      doc.text(`Fecha: ${new Date(reservation.reservation_date).toLocaleDateString('es-ES')}`, 150, 63);
      
      // Estado de pago
      const balanceDue = reservation.balance_due || 0;
      const status = balanceDue <= 0 ? 'PAGADO' : reservation.amount_paid > 0 ? 'PAGO PARCIAL' : 'PENDIENTE';
      const statusColor = balanceDue <= 0 ? [34, 197, 94] : reservation.amount_paid > 0 ? [59, 130, 246] : [234, 179, 8];
      doc.setTextColor(...statusColor);
      doc.setFont(undefined, 'bold');
      doc.text(status, 150, 68);
      
      // Línea separadora
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      doc.line(15, 75, 195, 75);
      
      // Tabla de ítems
      const tableData = [];
      
      // Villa
      if (reservation.villa_code) {
        tableData.push([
          1,
          `${reservation.villa_code}${reservation.villa_location ? ` - ${reservation.villa_location}` : ''}`,
          `${reservation.currency} ${reservation.base_price.toFixed(2)}`,
          `${reservation.currency} ${reservation.base_price.toFixed(2)}`
        ]);
      }
      
      // Personas extra
      if (reservation.extra_people > 0) {
        tableData.push([
          reservation.extra_people,
          'Personas extra',
          `${reservation.currency} ${(reservation.extra_people_cost / reservation.extra_people).toFixed(2)}`,
          `${reservation.currency} ${reservation.extra_people_cost.toFixed(2)}`
        ]);
      }
      
      // Horas extra
      if (reservation.extra_hours > 0) {
        tableData.push([
          reservation.extra_hours,
          'Horas extra',
          `${reservation.currency} ${(reservation.extra_hours_cost / reservation.extra_hours).toFixed(2)}`,
          `${reservation.currency} ${reservation.extra_hours_cost.toFixed(2)}`
        ]);
      }
      
      // Servicios adicionales
      if (reservation.extra_services && reservation.extra_services.length > 0) {
        reservation.extra_services.forEach(service => {
          tableData.push([
            service.quantity || 1,
            `${service.service_name || 'Servicio'}${service.supplier_name ? ` (${service.supplier_name})` : ''}`,
            `${reservation.currency} ${(service.unit_price || 0).toFixed(2)}`,
            `${reservation.currency} ${(service.total || 0).toFixed(2)}`
          ]);
        });
      }
      
      doc.autoTable({
        startY: 80,
        head: [['CANT.', 'DESCRIPCIÓN', 'PRECIO UNIT.', 'TOTAL']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: darkColor,
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 20 },
          1: { halign: 'left', cellWidth: 90 },
          2: { halign: 'right', cellWidth: 35 },
          3: { halign: 'right', cellWidth: 35 }
        },
        styles: {
          fontSize: 9,
          cellPadding: 4
        }
      });
      
      // Totales
      const finalY = doc.lastAutoTable.finalY + 10;
      const rightX = 195;
      
      doc.setFontSize(9);
      doc.setTextColor(60);
      doc.setFont(undefined, 'normal');
      
      doc.text('Subtotal:', rightX - 60, finalY, { align: 'right' });
      doc.text(`${reservation.currency} ${reservation.subtotal.toFixed(2)}`, rightX, finalY, { align: 'right' });
      
      if (reservation.discount > 0) {
        doc.text('Descuento:', rightX - 60, finalY + 6, { align: 'right' });
        doc.text(`-${reservation.currency} ${reservation.discount.toFixed(2)}`, rightX, finalY + 6, { align: 'right' });
      }
      
      if (reservation.include_itbis) {
        doc.text('ITBIS (18%):', rightX - 60, finalY + (reservation.discount > 0 ? 12 : 6), { align: 'right' });
        doc.text(`${reservation.currency} ${reservation.itbis_amount.toFixed(2)}`, rightX, finalY + (reservation.discount > 0 ? 12 : 6), { align: 'right' });
      }
      
      // Total
      let totalY = finalY + 6;
      if (reservation.discount > 0) totalY += 6;
      if (reservation.include_itbis) totalY += 6;
      
      doc.setDrawColor(...darkColor);
      doc.setLineWidth(0.3);
      doc.line(rightX - 60, totalY, rightX, totalY);
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...darkColor);
      doc.text('TOTAL:', rightX - 60, totalY + 6, { align: 'right' });
      doc.text(`${reservation.currency} ${reservation.total_amount.toFixed(2)}`, rightX, totalY + 6, { align: 'right' });
      
      // Pagos
      if (reservation.amount_paid > 0) {
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(60);
        doc.text('Pagado:', rightX - 60, totalY + 12, { align: 'right' });
        doc.text(`${reservation.currency} ${reservation.amount_paid.toFixed(2)}`, rightX, totalY + 12, { align: 'right' });
        
        const balanceColor = balanceDue > 0 ? [220, 38, 38] : [34, 197, 94];
        doc.setTextColor(...balanceColor);
        doc.setFont(undefined, 'bold');
        doc.text('Balance:', rightX - 60, totalY + 18, { align: 'right' });
        doc.text(`${reservation.currency} ${balanceDue.toFixed(2)}`, rightX, totalY + 18, { align: 'right' });
      }
      
      // Notas
      if (reservation.notes) {
        let notesY = totalY + (reservation.amount_paid > 0 ? 25 : 15);
        doc.setFontSize(9);

  const handleGenerateConduce = (reservation) => {
    // Preparar datos del conduce basado en la factura
    const conduceData = {
      recipient_name: reservation.customer_name,
      recipient_type: 'customer',
      delivery_date: new Date().toISOString().split('T')[0],
      items: [],
      notes: `Generado desde Factura #${reservation.invoice_number}`,
      internal_notes: '',
      status: 'pending'
    };
    
    // Agregar villa si existe
    if (reservation.villa_code) {
      conduceData.items.push({
        description: `Uso de ${reservation.villa_code}${reservation.villa_location ? ` - ${reservation.villa_location}` : ''}`,
        quantity: 1,
        unit: 'unidad'
      });
    }
    
    // Agregar servicios adicionales
    if (reservation.extra_services && reservation.extra_services.length > 0) {
      reservation.extra_services.forEach(service => {
        conduceData.items.push({
          description: service.service_name || 'Servicio adicional',
          quantity: service.quantity || 1,
          unit: 'unidad'
        });
      });
    }
    
    setConduceFromReservation(conduceData);
    setIsConduceDialogOpen(true);
  };

        doc.setTextColor(60);
        doc.setFont(undefined, 'bold');
        doc.text('Notas:', 15, notesY);
        doc.setFont(undefined, 'normal');
        const splitNotes = doc.splitTextToSize(reservation.notes, 180);
        doc.text(splitNotes, 15, notesY + 5);
      }
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text('GRACIAS POR SU PREFERENCIA', 105, 280, { align: 'center' });
      doc.text('Calle Mencia #5, Ensanche Los Tainos, San Isidro, SDE | Tel: 829-904-4245', 105, 285, { align: 'center' });
      
      // Guardar PDF
      doc.save(`Factura_${reservation.invoice_number}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Por favor, intenta nuevamente.');
    }
  };


  const formatCurrency = (amount, currency) => {
    const formatted = new Intl.NumberFormat('es-DO').format(amount);
    return currency === 'DOP' ? `RD$ ${formatted}` : `$ ${formatted}`;
  };

  const filteredReservations = reservations.filter(r => 
    r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.villa_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.villa_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular totales de reservaciones
  const calculateReservationTotals = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalReservations = filteredReservations.length;
    
    // Reservaciones pendientes (futuras - que aún no han pasado su fecha)
    const upcomingReservations = filteredReservations.filter(r => {
      const reservationDate = new Date(r.reservation_date);
      reservationDate.setHours(0, 0, 0, 0);
      return reservationDate >= today;
    }).length;
    
    // Total pagado (suma de amount_paid)
    const totalPaid = filteredReservations.reduce((sum, r) => {
      return sum + (r.amount_paid || 0);
    }, 0);
    
    // Total restante (suma de balance_due)
    const totalRemaining = filteredReservations.reduce((sum, r) => {
      return sum + (r.balance_due || 0);
    }, 0);
    
    // Agrupar por moneda
    const totalPaidDOP = filteredReservations
      .filter(r => r.currency === 'DOP')
      .reduce((sum, r) => sum + (r.amount_paid || 0), 0);
    
    const totalPaidUSD = filteredReservations
      .filter(r => r.currency === 'USD')
      .reduce((sum, r) => sum + (r.amount_paid || 0), 0);
    
    const totalRemainingDOP = filteredReservations
      .filter(r => r.currency === 'DOP')
      .reduce((sum, r) => sum + (r.balance_due || 0), 0);
    
    const totalRemainingUSD = filteredReservations
      .filter(r => r.currency === 'USD')
      .reduce((sum, r) => sum + (r.balance_due || 0), 0);
    
    return {
      totalReservations,
      upcomingReservations,
      totalPaid,
      totalRemaining,
      totalPaidDOP,
      totalPaidUSD,
      totalRemainingDOP,
      totalRemainingUSD
    };
  };
  
  const totals = calculateReservationTotals();


  // Filtrar y ordenar villas y servicios alfabéticamente
  const filteredVillas = villas
    .filter(v => 
      v.code?.toLowerCase().includes(villaSearchTerm.toLowerCase()) ||
      v.name?.toLowerCase().includes(villaSearchTerm.toLowerCase())
    )
    .sort((a, b) => a.code.localeCompare(b.code));

  // Filtrar servicios para mostrar en el dropdown
  const filteredServices = extraServices
    .filter(s => 
      s.name?.toLowerCase().includes(villaSearchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  // Filtrar y ordenar clientes alfabéticamente
  const filteredCustomers = customers
    .filter(c =>
      c.name?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      c.phone?.toLowerCase().includes(customerSearchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSelectVilla = (villaId) => {
    const villa = villas.find(v => v.id === villaId);
    if (villa) {
      setVillaSearchTerm(`${villa.code} - ${villa.name}`);
      setShowVillaDropdown(false);
      handleVillaChange(villaId);
    }
  };

  const handleSelectService = (serviceId) => {
    const service = extraServices.find(s => s.id === serviceId);
    if (service) {
      setVillaSearchTerm(`Servicio: ${service.name}`);
      setShowVillaDropdown(false);
      
      // Agregar el servicio a la lista de servicios seleccionados SIN auto-seleccionar suplidor
      const newService = {
        service_id: service.id,
        name: service.name,
        service_name: service.name,  // ✅ AGREGAR service_name que requiere el backend
        quantity: 1,
        price_unit: 0,
        price_total: 0,
        unit_price: 0,
        total: 0,
        supplier_id: '',
        supplier_name: '',
        supplier_price_unit: 0,
        supplier_price_total: 0,
        supplier_cost: 0
      };
      
      setSelectedExtraServices([newService]);
      setShowExtraServices(true);
      
      setFormData(prev => ({
        ...prev,
        extra_services: [newService],
        extra_services_total: 0,
        subtotal: (prev.base_price || 0) + (prev.extra_hours_cost || 0) + (prev.extra_people_cost || 0),
        itbis_amount: prev.include_itbis ? ((prev.base_price || 0) + (prev.extra_hours_cost || 0) + (prev.extra_people_cost || 0)) * 0.18 : 0,
        total_amount: ((prev.base_price || 0) + (prev.extra_hours_cost || 0) + (prev.extra_people_cost || 0)) + (prev.include_itbis ? ((prev.base_price || 0) + (prev.extra_hours_cost || 0) + (prev.extra_people_cost || 0)) * 0.18 : 0) - (prev.discount || 0)
      }));
    }
  };

  const handleSelectCustomer = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setCustomerSearchTerm(customer.name);
      setShowCustomerDropdown(false);
      setFormData({ ...formData, customer_id: customerId, customer_name: customer.name });
    }
  };

  if (loading) {
    return <div className="text-center py-8" data-testid="reservations-loading">Cargando...</div>;
  }

  return (
    <div className="space-y-6" data-testid="reservations-page">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Facturas</h2>
          <p className="text-gray-500 mt-1">Gestiona las facturas de villas y servicios</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => {
            setInvoiceType('villa');
            resetForm();
            setIsFormOpen(true);
          }} data-testid="add-reservation-button">
            <Plus className="mr-2 h-4 w-4" /> Nueva Factura
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => {
              setInvoiceType('service');
              resetForm();
              setIsFormOpen(true);
              setShowExtraServices(true);
            }} 
            data-testid="add-service-only-button"
          >
            <Plus className="mr-2 h-4 w-4" /> Factura Solo Servicios
          </Button>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={(open) => {
          // Solo cerrar si es un cierre intencional (click fuera o ESC)
          // NO cerrar por eventos de diálogos anidados
          if (!open) {
            setIsFormOpen(false);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingReservation 
                  ? 'Editar Factura' 
                  : invoiceType === 'villa' 
                    ? 'Nueva Factura - Villa y Servicios' 
                    : 'Nueva Factura - Solo Servicios'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Cliente con Buscador */}
                <div className="col-span-2">
                  <div className="flex justify-between items-center mb-2">
                    <Label>Cliente *</Label>
                    <CustomerDialog onCustomerCreated={(newCustomer) => {
                      // Solo actualizar el cliente seleccionado, NO cerrar el formulario
                      setCustomerSearchTerm(newCustomer.name);
                      setFormData({ ...formData, customer_id: newCustomer.id, customer_name: newCustomer.name });
                      setShowCustomerDropdown(false);
                      // Recargar solo lista de clientes en background (NO reservations)
                      fetchCustomersOnly();
                    }} />
                  </div>
                  <div className="relative">
                    <Input
                      type="text"
                      value={customerSearchTerm}
                      onChange={(e) => {
                        setCustomerSearchTerm(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Buscar por nombre o teléfono..."
                      className="w-full"
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    
                    {/* Dropdown de clientes filtrados */}
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredCustomers.map(customer => (
                          <div
                            key={customer.id}
                            onClick={() => handleSelectCustomer(customer.id)}
                            className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold text-blue-600">{customer.name}</p>
                                <p className="text-sm text-gray-600">{customer.phone}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Mensaje si no hay resultados */}
                    {showCustomerDropdown && customerSearchTerm && filteredCustomers.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 text-center text-gray-500">
                        No se encontraron clientes
                      </div>
                    )}
                  </div>
                  {!formData.customer_id && (
                    <p className="text-xs text-red-500 mt-1">* Debes seleccionar un cliente</p>
                  )}
                </div>

                {/* Click fuera para cerrar dropdown */}
                {showCustomerDropdown && (
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowCustomerDropdown(false)}
                  />
                )}
                
                {/* Tipo de Renta - Solo para facturas con villa */}
                {invoiceType === 'villa' && (
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
                      {invoiceType === 'service' ? 'Servicios' : 'Evento'}
                    </button>
                  </div>
                </div>
                )}

                {/* Villas Y Servicios con Buscador - Solo si es tipo 'villa' */}
                {invoiceType === 'villa' && (
                  <div className="col-span-2">
                    <Label>Villas Y Servicios</Label>
                    <div className="relative">
                    <Input
                      type="text"
                      value={villaSearchTerm}
                      onChange={(e) => {
                        setVillaSearchTerm(e.target.value);
                        setShowVillaDropdown(true);
                      }}
                      onFocus={() => setShowVillaDropdown(true)}
                      placeholder="Buscar villa o servicio..."
                      className="w-full"
                      data-testid="villa-search-input"
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    
                    {/* Dropdown de villas y servicios filtrados */}
                    {showVillaDropdown && (filteredVillas.length > 0 || filteredServices.length > 0) && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {/* Sección de Villas */}
                        {filteredVillas.length > 0 && (
                          <>
                            <div className="px-3 py-2 bg-blue-50 border-b font-semibold text-sm text-blue-900">
                              🏡 Villas
                            </div>
                            {filteredVillas.map(villa => (
                              <div
                                key={`villa-${villa.id}`}
                                onClick={() => handleSelectVilla(villa.id)}
                                className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-semibold text-blue-600">{villa.code}</p>
                                    <p className="text-sm text-gray-600">{villa.name}</p>
                                  </div>
                                  <div className="text-right text-sm">
                                    <p className="text-gray-700">
                                      {formData.rental_type === 'pasadia' && `RD$ ${villa.default_price_pasadia?.toLocaleString()}`}
                                      {formData.rental_type === 'amanecida' && `RD$ ${villa.default_price_amanecida?.toLocaleString()}`}
                                      {formData.rental_type === 'evento' && `RD$ ${villa.default_price_evento?.toLocaleString()}`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                        
                        {/* Sección de Servicios */}
                        {filteredServices.length > 0 && (
                          <>
                            <div className="px-3 py-2 bg-green-50 border-b font-semibold text-sm text-green-900">
                              🛎️ Servicios
                            </div>
                            {filteredServices.map(service => (
                              <div
                                key={`service-${service.id}`}
                                onClick={() => handleSelectService(service.id)}
                                className="p-3 hover:bg-green-50 cursor-pointer border-b last:border-b-0"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="font-semibold text-green-700">{service.name}</p>
                                    {service.suppliers && service.suppliers.length > 0 && (
                                      <div className="mt-1 space-y-1">
                                        {service.suppliers.map((supplier, idx) => (
                                          <p key={idx} className="text-xs text-gray-600">
                                            📦 {supplier.name}: RD$ {supplier.price?.toLocaleString()}
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Mensaje si no hay resultados */}
                    {showVillaDropdown && villaSearchTerm && filteredVillas.length === 0 && filteredServices.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 text-center text-gray-500">
                        No se encontraron villas o servicios
                      </div>
                    )}
                  </div>
                  {!formData.villa_id && (
                    <p className="text-xs text-gray-500 mt-1">Selecciona una villa o servicio (opcional)</p>
                  )}
                </div>
                )}

                {/* FORMULARIO PARA SOLO SERVICIOS */}
                {invoiceType === 'service' && (
                  <>
                    {/* Servicios Principales (NO adicionales) */}
                    <div className="col-span-2 bg-green-50 p-4 rounded-lg border-2 border-green-300">
                      <h3 className="font-bold text-green-900 mb-3">🛎️ Servicios a Facturar</h3>
                      <div className="space-y-3">
                        {selectedExtraServices.map((service, index) => (
                          <div key={index} className="grid grid-cols-5 gap-2 bg-white p-3 rounded border">
                            <div className="col-span-2">
                              <Label className="text-xs">Servicio</Label>
                              <select
                                value={service.service_id || ''}
                                onChange={(e) => {
                                  const selectedService = extraServices.find(s => s.id === e.target.value);
                                  if (selectedService) {
                                    updateExtraService(index, 'service_id', e.target.value);
                                  }
                                }}
                                className="w-full p-2 border rounded-md text-sm"
                              >
                                <option value="">Seleccionar servicio</option>
                                {extraServices.map(svc => (
                                  <option key={svc.id} value={svc.id}>{svc.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="col-span-2">
                              <Label className="text-xs">Suplidor</Label>
                              <select
                                value={service.supplier_name || ''}
                                onChange={(e) => {
                                  const selectedService = extraServices.find(s => s.id === service.service_id);
                                  const selectedSupplier = selectedService?.suppliers?.find(sup => sup.name === e.target.value);
                                  if (selectedSupplier) {
                                    updateExtraService(index, 'supplier_name', selectedSupplier.name);
                                    updateExtraService(index, 'supplier_id', selectedSupplier.name);
                                    updateExtraService(index, 'supplier_cost', selectedSupplier.supplier_cost);
                                    updateExtraService(index, 'price_unit', selectedSupplier.client_price);
                                    updateExtraService(index, 'unit_price', selectedSupplier.client_price);
                                    updateExtraService(index, 'price_total', selectedSupplier.client_price * service.quantity);
                                    updateExtraService(index, 'total', selectedSupplier.client_price * service.quantity);
                                  }
                                }}
                                className="w-full p-2 border rounded-md text-sm"
                                disabled={!service.service_id}
                              >
                                <option value="">{!service.service_id ? 'Primero selecciona servicio' : 'Seleccionar suplidor'}</option>
                                {extraServices.find(s => s.id === service.service_id)?.suppliers?.map((supplier, idx) => (
                                  <option key={idx} value={supplier.name}>
                                    {supplier.name} - RD$ {supplier.client_price?.toLocaleString('es-DO')}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <Label className="text-xs">Cant.</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={service.quantity}
                                  onChange={(e) => updateExtraService(index, 'quantity', parseInt(e.target.value) || 1)}
                                  className="text-sm"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = selectedExtraServices.filter((_, i) => i !== index);
                                  setSelectedExtraServices(updated);
                                  setFormData({ ...formData, extra_services: updated });
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExtraServices([
                              ...selectedExtraServices,
                              {
                                service_id: '',
                                name: '',
                                service_name: '',
                                quantity: 1,
                                price_unit: 0,
                                price_total: 0,
                                unit_price: 0,
                                total: 0,
                                supplier_id: '',
                                supplier_name: '',
                                supplier_cost: 0
                              }
                            ]);
                          }}
                          className="w-full p-3 border-2 border-dashed border-green-400 rounded-lg text-green-700 hover:bg-green-50 transition-colors"
                        >
                          + Agregar Servicio
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Click fuera para cerrar dropdown */}
                {showVillaDropdown && (
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowVillaDropdown(false)}
                  />
                )}

                {/* SELECTOR DE PRECIOS FLEXIBLES */}
                {showPriceSelector && selectedVillaFlexiblePrices && (
                  <div className="col-span-2 bg-purple-50 p-4 rounded-lg border-2 border-purple-300">
                    <h4 className="font-bold text-purple-900 mb-3">💰 Selecciona el Precio para esta Reservación</h4>
                    <p className="text-xs text-gray-600 mb-3">La cantidad de huéspedes se llenará automáticamente según tu selección</p>
                    <div className="space-y-2">
                      {selectedVillaFlexiblePrices[formData.rental_type]?.map((priceOption, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSelectFlexiblePrice(priceOption)}
                          className="w-full p-4 bg-white hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-400 rounded-lg text-left transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">👥</span>
                                <span className="text-lg font-bold text-purple-900">
                                  {priceOption.people_count || `Opción ${index + 1}`}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-blue-700 mb-1">
                                <span className="text-xs">Cliente:</span> <span className="font-bold text-base">RD$ {priceOption.client_price?.toLocaleString()}</span>
                              </p>
                              <p className="text-sm text-green-700">
                                <span className="text-xs">Propietario:</span> <span className="font-bold text-base">RD$ {priceOption.owner_price?.toLocaleString()}</span>
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 mt-3 bg-blue-50 p-2 rounded border border-blue-200">
                      💡 <strong>Nota:</strong> Los precios y cantidad de huéspedes se llenarán automáticamente, pero puedes editarlos después
                    </p>
                  </div>
                )}

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
                ) : formData.rental_type === 'amanecida' ? (
                  <>
                    <div>
                      <Label>Fecha Desde (Entrada) *</Label>
                      <Input
                        type="date"
                        value={formData.reservation_date}
                        onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                        required
                        data-testid="reservation-date-from-input"
                      />
                    </div>
                    <div>
                      <Label>Fecha Hasta (Salida) *</Label>
                      <Input
                        type="date"
                        value={formData.check_out_date || ''}
                        onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                        required
                        data-testid="reservation-date-to-input"
                      />
                    </div>
                  </>
                ) : (
                  <div className="col-span-2">
                    <Label>Fecha del Evento *</Label>
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
                
                {/* Huéspedes y Moneda - Solo para facturas con villa */}
                {invoiceType === 'villa' && (
                  <>
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

                {/* Número de Factura Manual - SOLO ADMIN */}
                {user?.role === 'admin' && (
                  <div className="col-span-2 bg-yellow-50 p-4 rounded-md border-2 border-yellow-300">
                    <Label className="font-bold text-yellow-800">Número de Factura (Opcional - Solo Admin)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.invoice_number || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        invoice_number: e.target.value ? parseInt(e.target.value) : null 
                      })}
                      placeholder="Dejar vacío para asignación automática"
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      ⚠️ Si ingresas un número manual (ej: 1300), el sistema automáticamente ajustará la numeración de los empleados para evitar duplicados.
                    </p>
                  </div>
                )}

                {/* Precio Base de la Villa - EDITABLE */}
                <div className="col-span-2 bg-blue-50 p-4 rounded-md border-2 border-blue-200">
                  <Label className="font-bold text-blue-800">Precio Base de la Villa *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                    required
                    className="mt-2"
                    data-testid="base-price-input"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Este precio se autocompleta según la villa y tipo de renta seleccionado, pero puedes editarlo si necesitas aplicar un precio especial
                  </p>
                </div>
                </>
                )}

                {/* Horas Extras - Solo para villas */}
                {invoiceType === 'villa' && (
                  <>
                    <div>
                  <Label>Horas Extras (Cantidad)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.extra_hours}
                    onChange={(e) => {
                      const hours = parseFloat(e.target.value) || 0;
                      const totalCost = hours * (formData.extra_hours_unit_price || 0);
                      setFormData({ 
                        ...formData, 
                        extra_hours: hours,
                        extra_hours_cost: totalCost 
                      });
                    }}
                    data-testid="extra-hours-input"
                  />
                </div>
                <div>
                  <Label>Precio por Hora Extra</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.extra_hours_unit_price || 0}
                    onChange={(e) => {
                      const unitPrice = parseFloat(e.target.value) || 0;
                      const totalCost = unitPrice * (formData.extra_hours || 0);
                      setFormData({ 
                        ...formData, 
                        extra_hours_unit_price: unitPrice,
                        extra_hours_cost: totalCost 
                      });
                    }}
                    data-testid="extra-hours-unit-price-input"
                  />
                  {formData.extra_hours > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      Total: {((formData.extra_hours_unit_price || 0) * formData.extra_hours).toFixed(2)}
                    </p>
                  )}
                </div>
                
                {/* Personas Extras */}
                <div>
                  <Label>Personas Extras (Cantidad)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.extra_people}
                    onChange={(e) => {
                      const people = parseFloat(e.target.value) || 0;
                      const totalCost = people * (formData.extra_people_unit_price || 0);
                      setFormData({ 
                        ...formData, 
                        extra_people: people,
                        extra_people_cost: totalCost 
                      });
                    }}
                    data-testid="extra-people-input"
                  />
                </div>
                <div>
                  <Label>Precio por Persona Extra</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.extra_people_unit_price || 0}
                    onChange={(e) => {
                      const unitPrice = parseFloat(e.target.value) || 0;
                      const totalCost = unitPrice * (formData.extra_people || 0);
                      setFormData({ 
                        ...formData, 
                        extra_people_unit_price: unitPrice,
                        extra_people_cost: totalCost 
                      });
                    }}
                    data-testid="extra-people-unit-price-input"
                  />
                  {formData.extra_people > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      Total: {((formData.extra_people_unit_price || 0) * formData.extra_people).toFixed(2)}
                    </p>
                  )}
                </div>
                </>
                )}
                
                {/* Checkbox para servicios adicionales - Solo para villas */}
                {invoiceType === 'villa' && (
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
                )}

                {/* Servicios Extras */}
                {invoiceType === 'villa' && showExtraServices && (
                  <div className="col-span-2 border-2 border-blue-200 p-4 rounded-md bg-blue-50">
                    <div className="flex justify-between items-center mb-3">
                      <Label className="text-lg font-bold">Servicios Adicionales</Label>
                      <Button type="button" size="sm" onClick={addExtraService}>
                        <Plus size={16} className="mr-1" /> Agregar
                      </Button>
                    </div>
                    
                    {/* Mensaje si no hay servicios disponibles */}
                    {extraServices.length === 0 && (
                      <div className="bg-yellow-50 border border-yellow-300 rounded p-3 mb-3">
                        <p className="text-sm text-yellow-800">
                          ⚠️ No hay servicios adicionales configurados. Por favor, ve a <strong>Villas → Servicios</strong> para crear servicios y agregar suplidores.
                        </p>
                      </div>
                    )}
                    
                    {selectedExtraServices.map((service, index) => (
                      <div key={index} className="grid grid-cols-6 gap-2 mb-2 items-end">
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
                        <div className="col-span-2">
                          <Label className="text-xs">Suplidor</Label>
                          <select
                            value={service.supplier_name || ''}
                            onChange={(e) => {
                              const selectedService = extraServices.find(s => s.id === service.service_id);
                              const selectedSupplier = selectedService?.suppliers?.find(sup => sup.name === e.target.value);
                              if (selectedSupplier) {
                                // Actualizar todos los campos del suplidor (usar supplier_cost como en el backend)
                                updateExtraService(index, 'supplier_name', selectedSupplier.name);
                                updateExtraService(index, 'supplier_id', selectedSupplier.name);
                                updateExtraService(index, 'supplier_cost', selectedSupplier.supplier_cost);
                                
                                // Actualizar precios al cliente
                                updateExtraService(index, 'price_unit', selectedSupplier.client_price);
                                updateExtraService(index, 'unit_price', selectedSupplier.client_price);
                                updateExtraService(index, 'price_total', selectedSupplier.client_price * service.quantity);
                                updateExtraService(index, 'total', selectedSupplier.client_price * service.quantity);
                                
                                // Recalcular totales de la factura
                                const servicesTotal = selectedExtraServices.reduce((sum, s, idx) => {
                                  if (idx === index) {
                                    return sum + (selectedSupplier.client_price * service.quantity);
                                  }
                                  return sum + (s.price_total || s.total || 0);
                                }, 0);
                                
                                const newSubtotal = (formData.base_price || 0) + (formData.extra_hours_cost || 0) + (formData.extra_people_cost || 0) + servicesTotal;
                                const newITBIS = formData.include_itbis ? newSubtotal * 0.18 : 0;
                                const newTotal = newSubtotal + newITBIS - (formData.discount || 0);
                                
                                setFormData(prev => ({
                                  ...prev,
                                  extra_services_total: servicesTotal,
                                  subtotal: newSubtotal,
                                  itbis_amount: newITBIS,
                                  total_amount: newTotal
                                }));
                              }
                            }}
                            className="w-full p-2 border rounded-md text-sm"
                            disabled={!service.service_id}
                          >
                            <option value="">
                              {!service.service_id 
                                ? 'Primero selecciona un servicio' 
                                : extraServices.find(s => s.id === service.service_id)?.suppliers?.length === 0
                                  ? 'Este servicio no tiene suplidores'
                                  : 'Seleccionar suplidor'}
                            </option>
                            {extraServices
                              .find(s => s.id === service.service_id)?.suppliers?.map((supplier, idx) => (
                                <option key={idx} value={supplier.name}>
                                  {supplier.name} - Cliente: RD$ {supplier.client_price?.toLocaleString('es-DO')} | Suplidor: RD$ {supplier.supplier_cost?.toLocaleString('es-DO')}
                                </option>
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

                {/* ITBIS Checkbox */}
                <div className="col-span-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.include_itbis}
                      onChange={(e) => setFormData({ ...formData, include_itbis: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">Incluir ITBIS (18%)</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6">Se calcula sobre el total sin incluir el depósito de seguridad</p>
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
                    {formData.include_itbis && (
                      <div className="flex justify-between text-blue-600">
                        <span>ITBIS (18%):</span>
                        <span>+ {formatCurrency(formData.itbis_amount, formData.currency)}</span>
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
                  <Label>Notas (Visible para el Cliente)</Label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    rows="3"
                    placeholder="Nota que se imprime en la factura..."
                    data-testid="notes-input"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Nota Interna (Solo Visible en Sistema)</Label>
                  <textarea
                    value={formData.internal_notes}
                    onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                    className="w-full p-2 border rounded-md bg-yellow-50"
                    rows="2"
                    placeholder="Nota interna que NO se imprime en la factura..."
                    data-testid="internal-notes-input"
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

      {/* Tarjetas de Totales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total de Facturas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">📋 Total Facturas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totals.totalReservations}</div>
            <p className="text-xs text-gray-500 mt-1">Todas las facturas</p>
          </CardContent>
        </Card>

        {/* Facturas Pendientes/Futuras */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">📅 Facturas Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totals.upcomingReservations}</div>
            <p className="text-xs text-gray-500 mt-1">Futuras (no han pasado)</p>
          </CardContent>
        </Card>

        {/* Total Pagado */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">💰 Total Pagado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-xl font-bold text-green-600">
                RD$ {totals.totalPaidDOP.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              {totals.totalPaidUSD > 0 && (
                <div className="text-sm font-semibold text-green-500">
                  US$ {totals.totalPaidUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Suma de pagos realizados</p>
          </CardContent>
        </Card>

        {/* Total Restante */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">⚠️ Total Restante</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-xl font-bold text-red-600">
                RD$ {totals.totalRemainingDOP.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              {totals.totalRemainingUSD > 0 && (
                <div className="text-sm font-semibold text-red-500">
                  US$ {totals.totalRemainingUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Saldos pendientes</p>
          </CardContent>
        </Card>
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
          <div className="flex justify-between items-center">
            <CardTitle>Lista de Facturas ({filteredReservations.length})</CardTitle>
            {selectedReservations.length > 0 && user?.role === 'admin' && (
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleDeleteSelectedReservations}
                  variant="destructive"
                  size="sm"
                  className="flex items-center"
                >
                  <Trash2 size={16} className="mr-2" />
                  Eliminar Seleccionadas ({selectedReservations.length})
                </Button>
                <Button
                  onClick={handleSelectAllReservations}
                  variant="outline"
                  size="sm"
                >
                  {selectAllReservations ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredReservations.length > 0 ? (
              filteredReservations.map((res) => {
                const isExpanded = expandedReservations[res.id];
                return (
                  <div key={res.id} className="hover:bg-gray-50 transition-colors">
                    {/* Vista compacta */}
                    <div className="p-4 flex items-center justify-between">
                      {user?.role === 'admin' && (
                        <div className="mr-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedReservations.includes(res.id)}
                            onChange={() => handleSelectReservation(res.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </div>
                      )}
                      <div 
                        className="flex-1 grid grid-cols-5 gap-4 items-center cursor-pointer"
                        onClick={() => toggleExpand(res.id)}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{res.customer_name}</p>
                          <p className="text-xs text-gray-500">
                            #{res.invoice_number}
                            {reservationAbonos[res.id] && reservationAbonos[res.id].length > 0 && (
                              <span className="text-purple-600 ml-1">
                                (Abonos: {reservationAbonos[res.id].map(a => `#${a.invoice_number}`).join(', ')})
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{res.villa_code}</p>
                          <p className="text-xs text-gray-500">Villa</p>
                        </div>
                        <div>
                          <p className="text-sm">{new Date(res.reservation_date).toLocaleDateString('es-DO')}</p>
                          <p className="text-xs text-gray-500">{res.rental_type === 'pasadia' ? 'Pasadía' : res.rental_type === 'amanecida' ? 'Amanecida' : 'Evento'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-green-600">{formatCurrency(res.amount_paid, res.currency)}</p>
                          <p className="text-xs text-gray-500">Pagado</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-semibold ${res.balance_due > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              {formatCurrency(res.balance_due, res.currency)}
                            </p>
                            <p className="text-xs text-gray-500">Restante</p>
                          </div>
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </div>

                    {/* Vista expandida */}
                    {isExpanded && (
                      <div className="px-4 pb-4 bg-gray-50 border-t">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-500 font-medium">VILLA:</p>
                            <p className="text-gray-900">{res.villa_code}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">HORARIO:</p>
                            <p className="text-gray-900">{res.check_in_time} - {res.check_out_time}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">HUÉSPEDES:</p>
                            <p className="text-gray-900">{res.guests} personas</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">TOTAL:</p>
                            <p className="text-gray-900 font-semibold">{formatCurrency(res.total_amount, res.currency)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">DEPÓSITO:</p>
                            <p className="text-gray-900">{formatCurrency(res.deposit || 0, res.currency)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">MÉTODO DE PAGO:</p>
                            <p className="text-gray-900 capitalize">{res.payment_method}</p>
                          </div>
                        </div>

                        {/* Indicador de extras - Solo mostrar badges */}
                        {((res.extra_services && res.extra_services.length > 0) || res.extra_hours > 0 || res.extra_people > 0) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {res.extra_services && res.extra_services.length > 0 && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                                🛎️ {res.extra_services.length} Servicio(s) Extra
                              </span>
                            )}
                            {res.extra_hours > 0 && (
                              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full font-medium">
                                ⏰ {res.extra_hours} Hora(s) Extra
                              </span>
                            )}
                            {res.extra_people > 0 && (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                                👥 {res.extra_people} Persona(s) Extra
                              </span>
                            )}
                          </div>
                        )}

                        {/* Notas */}
                        {res.notes && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 font-medium">NOTAS:</p>
                            <p className="text-sm text-gray-700">{res.notes}</p>
                          </div>
                        )}

                        {/* Acciones */}
                        <div className="flex gap-2 mt-4 pt-3 border-t">
                          {/* Botón Agregar Abono - Si tiene saldo pendiente */}
                          {res.balance_due > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddAbono(res);
                              }}
                              className="flex-1 bg-green-50 text-green-700 hover:bg-green-100"
                            >
                              💵 Agregar Abono
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrint(res);
                            }}
                            className="flex-1"
                          >
                            <Printer size={14} className="mr-1" /> Imprimir
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPDF(res);
                            }}
                            className="flex-1"
                          >
                            <Download size={14} className="mr-1" /> PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateConduce(res);
                            }}
                            className="flex-1"
                          >
                            <FileText size={14} className="mr-1" /> Conduce
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(res);
                            }}
                            className="flex-1"
                          >
                            <Edit size={14} className="mr-1" /> Editar
                          </Button>
                          {user?.role === 'admin' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(res.id);
                              }}
                              className="text-red-600 hover:text-red-700 hover:border-red-600"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-gray-500">
                No hay reservaciones
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de Agregar Abono */}
      <Dialog open={isAbonoDialogOpen} onOpenChange={setIsAbonoDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pagos - Factura #{selectedReservation?.invoice_number}</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <>
              {/* Resumen de la factura */}
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium">Cliente: {selectedReservation.customer_name}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Total: {formatCurrency(selectedReservation.total_amount, selectedReservation.currency)} | 
                  Pagado: {formatCurrency(selectedReservation.amount_paid, selectedReservation.currency)} | 
                  Restante: <span className="font-semibold text-orange-600">{formatCurrency(selectedReservation.balance_due, selectedReservation.currency)}</span>
                </p>
              </div>

              {/* Detalles de pagos a realizar */}
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="text-sm font-bold text-blue-900 mb-3">💰 Pagos Pendientes</h4>
                
                {/* Pago al Propietario */}
                <div className="mb-3 p-3 bg-white rounded border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-purple-900">🏡 Pago Propietario:</span>
                      <p className="text-xs text-gray-600 mt-1">Villa: {selectedReservation.villa_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Monto</p>
                      <p className="font-bold text-purple-900">{formatCurrency(selectedReservation.owner_price || 0, selectedReservation.currency)}</p>
                    </div>
                  </div>
                </div>

                {/* Personas Extras */}
                {selectedReservation.extra_people > 0 && (
                  <div className="mb-3 p-3 bg-white rounded border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-blue-900">👥 Personas Extras:</span>
                        <span className="ml-2 text-sm text-gray-700">{selectedReservation.extra_people} persona(s)</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Pago Propietario</p>
                        <p className="font-bold text-blue-900">{formatCurrency(selectedReservation.extra_people * (selectedReservation.extra_people_price_owner || 0), selectedReservation.currency)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Horas Extras */}
                {selectedReservation.extra_hours > 0 && (
                  <div className="mb-3 p-3 bg-white rounded border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-blue-900">⏰ Horas Extras:</span>
                        <span className="ml-2 text-sm text-gray-700">{selectedReservation.extra_hours} hora(s)</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Pago Propietario</p>
                        <p className="font-bold text-blue-900">{formatCurrency(selectedReservation.extra_hours * (selectedReservation.extra_hours_price_owner || 0), selectedReservation.currency)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Servicios Extras con Suplidores */}
                {selectedReservation.extra_services && selectedReservation.extra_services.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-blue-900 mb-2">🛎️ Servicios Extras - Pago a Suplidores</h5>
                    <div className="space-y-2">
                      {selectedReservation.extra_services.map((service, index) => (
                        <div key={index} className="p-3 bg-white rounded border border-blue-200">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{service.service_name || service.name}</p>
                              <p className="text-xs text-gray-500">Cantidad: {service.quantity}</p>
                            </div>
                          </div>
                          
                          {/* Información del Suplidor */}
                          {service.supplier_name && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="flex justify-between items-center bg-yellow-50 p-2 rounded">
                                <div>
                                  <p className="text-xs font-medium text-gray-600">Pagar a Suplidor:</p>
                                  <p className="text-sm font-semibold text-gray-800">{service.supplier_name}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Monto</p>
                                  <p className="font-bold text-orange-600">
                                    {service.quantity} × {formatCurrency(service.supplier_cost || 0, selectedReservation.currency)} = {formatCurrency((service.supplier_cost || 0) * service.quantity, selectedReservation.currency)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nota informativa */}
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-xs text-green-800">
                    <strong>ℹ️ Nota:</strong> Utiliza el formulario abajo para registrar los abonos realizados a propietario y/o suplidores.
                  </p>
                </div>
              </div>
            </>
          )}
          <form onSubmit={submitAbono} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monto del Abono *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={abonoFormData.amount}
                  onChange={(e) => setAbonoFormData({ ...abonoFormData, amount: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div>
                <Label>Moneda *</Label>
                <select
                  value={abonoFormData.currency}
                  onChange={(e) => setAbonoFormData({ ...abonoFormData, currency: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="DOP">DOP</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Método de Pago *</Label>
              <select
                value={abonoFormData.payment_method}
                onChange={(e) => setAbonoFormData({ ...abonoFormData, payment_method: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="efectivo">Efectivo</option>
                <option value="deposito">Depósito</option>
                <option value="transferencia">Transferencia</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>

            <div>
              <Label>Fecha de Pago *</Label>
              <Input
                type="date"
                value={abonoFormData.payment_date}
                onChange={(e) => setAbonoFormData({ ...abonoFormData, payment_date: e.target.value })}
                required
              />
            </div>

            {/* Campo de número de factura - solo visible para admin */}
            {user?.role === 'admin' && (
              <div>
                <Label>Número de Factura (Opcional)</Label>
                <Input
                  type="text"
                  value={abonoFormData.invoice_number}
                  onChange={(e) => setAbonoFormData({ ...abonoFormData, invoice_number: e.target.value })}
                  placeholder="Dejar vacío para auto-generar"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si no se especifica, se generará automáticamente
                </p>
              </div>
            )}

            <div>
              <Label>Notas</Label>
              <textarea
                value={abonoFormData.notes}
                onChange={(e) => setAbonoFormData({ ...abonoFormData, notes: e.target.value })}
                className="w-full p-2 border rounded-md"
                rows="2"
                placeholder="Ej: Abono parcial, segundo pago, etc."
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsAbonoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Registrar Abono
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reservations;
