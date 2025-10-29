import React, { useState, useEffect } from 'react';
import { getQuotations, createQuotation, updateQuotation, deleteQuotation, convertQuotationToInvoice } from '../api/api';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertCircle, Plus, Edit2, Trash2, Printer, CheckCircle, FileText } from 'lucide-react';
import QuotationForm from './QuotationForm';

const Quotations = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetchQuotations();
  }, []);
  
  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const response = await getQuotations();
      setQuotations(response.data);
    } catch (err) {
      setError('Error al cargar cotizaciones');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (quotationData) => {
    try {
      if (editingQuotation) {
        await updateQuotation(editingQuotation.id, quotationData);
        alert('Cotización actualizada exitosamente');
      } else {
        await createQuotation(quotationData);
        alert('Cotización creada exitosamente');
      }
      setIsFormOpen(false);
      setEditingQuotation(null);
      fetchQuotations();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || 'Error desconocido'));
    }
  };

  const handlePrint = async (quotation) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    
    const validityDate = new Date(quotation.quotation_date);
    validityDate.setDate(validityDate.getDate() + (quotation.validity_days || 30));
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Cotización ${quotation.quotation_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px;
              color: #333;
            }
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              border-bottom: 3px solid #0ea5e9;
              padding-bottom: 20px;
            }
            .company-info h1 {
              font-size: 24px;
              color: #0369a1;
              margin-bottom: 5px;
            }
            .company-info p {
              font-size: 12px;
              color: #666;
              margin: 2px 0;
            }
            .document-info {
              text-align: right;
            }
            .document-info h2 {
              font-size: 28px;
              color: #0ea5e9;
              margin-bottom: 5px;
            }
            .document-info p {
              font-size: 12px;
              color: #666;
            }
            .client-section {
              background: #f0f9ff;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .client-section h3 {
              font-size: 14px;
              color: #0369a1;
              margin-bottom: 10px;
              text-transform: uppercase;
            }
            .client-section p {
              font-size: 13px;
              margin: 5px 0;
            }
            .validity-notice {
              background: #fef3c7;
              padding: 10px 15px;
              border-left: 4px solid #f59e0b;
              margin: 15px 0;
              font-size: 12px;
              color: #92400e;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            thead {
              background: #0369a1;
              color: white;
            }
            th {
              padding: 12px;
              text-align: left;
              font-size: 12px;
              text-transform: uppercase;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e0e0e0;
              font-size: 13px;
            }
            tbody tr:nth-child(even) {
              background: #f8fafc;
            }
            .totals {
              width: 400px;
              margin-left: auto;
              margin-top: 20px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 15px;
              font-size: 14px;
            }
            .total-row.subtotal {
              border-top: 1px solid #ccc;
              margin-top: 10px;
              padding-top: 10px;
            }
            .total-row.grand-total {
              background: #f0f9ff;
              border-top: 2px solid #0ea5e9;
              font-size: 18px;
              font-weight: bold;
              color: #0369a1;
              margin-top: 10px;
            }
            .notes-section {
              margin-top: 30px;
              padding: 15px;
              background: #f8fafc;
              border-radius: 8px;
            }
            .notes-section h4 {
              font-size: 12px;
              color: #0369a1;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            .notes-section p {
              font-size: 11px;
              color: #475569;
              line-height: 1.6;
            }
            .terms {
              margin-top: 30px;
              font-size: 11px;
              color: #666;
              padding: 15px;
              border-top: 1px solid #e0e0e0;
            }
            .terms h4 {
              font-size: 12px;
              margin-bottom: 10px;
              color: #0369a1;
            }
            .terms ul {
              margin-left: 20px;
              line-height: 1.8;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 10px;
              color: #999;
              border-top: 1px solid #e0e0e0;
              padding-top: 15px;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <h1>Espacios Con Piscina</h1>
              <p>Calle Mencia #5, Ensanche Los Tainos</p>
              <p>San Isidro, SDE</p>
              <p>Tel: 829-904-4245</p>
              <p>Email: info@espaciosconpiscina.com</p>
            </div>
            <div class="document-info">
              <h2>COTIZACIÓN</h2>
              <p><strong>#${quotation.quotation_number}</strong></p>
              <p>Fecha: ${new Date(quotation.quotation_date).toLocaleDateString('es-ES')}</p>
            </div>
          </div>

          <div class="client-section">
            <h3>Cliente:</h3>
            <p><strong>${quotation.customer_name}</strong></p>
            ${quotation.villa_code ? `<p>Villa: ${quotation.villa_code}</p>` : ''}
          </div>

          <div class="validity-notice">
            <strong>⏰ Validez de la cotización:</strong> Esta cotización es válida hasta el ${validityDate.toLocaleDateString('es-ES')} (${quotation.validity_days || 30} días)
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 10%">Cant.</th>
                <th style="width: 50%">Descripción</th>
                <th style="width: 20%">Precio Unit.</th>
                <th style="width: 20%">Total</th>
              </tr>
            </thead>
            <tbody>
              ${quotation.villa_code ? `
                <tr>
                  <td>1</td>
                  <td>${quotation.villa_code}${quotation.villa_location ? ` - ${quotation.villa_location}` : ''}</td>
                  <td>${quotation.currency} ${quotation.base_price.toFixed(2)}</td>
                  <td>${quotation.currency} ${quotation.base_price.toFixed(2)}</td>
                </tr>
              ` : ''}
              ${quotation.extra_services && quotation.extra_services.length > 0 ? quotation.extra_services.map(service => `
                <tr>
                  <td>${service.quantity || 1}</td>
                  <td>${service.service_name || 'Servicio'}${service.supplier_name ? ` (${service.supplier_name})` : ''}</td>
                  <td>${quotation.currency} ${(service.unit_price || 0).toFixed(2)}</td>
                  <td>${quotation.currency} ${(service.total || 0).toFixed(2)}</td>
                </tr>
              `).join('') : ''}
              ${!quotation.villa_code && (!quotation.extra_services || quotation.extra_services.length === 0) ? `
                <tr><td colspan="4" style="text-align: center;">No hay ítems en esta cotización</td></tr>
              ` : ''}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row subtotal">
              <span>Subtotal:</span>
              <span>${quotation.currency} ${quotation.subtotal.toFixed(2)}</span>
            </div>
            ${quotation.discount > 0 ? `
              <div class="total-row">
                <span>Descuento:</span>
                <span>-${quotation.currency} ${quotation.discount.toFixed(2)}</span>
              </div>
            ` : ''}
            ${quotation.include_itbis ? `
              <div class="total-row">
                <span>ITBIS (18%):</span>
                <span>${quotation.currency} ${quotation.itbis_amount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-row grand-total">
              <span>TOTAL:</span>
              <span>${quotation.currency} ${quotation.total_amount.toFixed(2)}</span>
            </div>
          </div>

          ${quotation.notes ? `
            <div class="notes-section">
              <h4>Notas:</h4>
              <p>${quotation.notes}</p>
            </div>
          ` : ''}

          <div class="terms">
            <h4>Términos y Condiciones:</h4>
            <ul>
              <li>Esta cotización es válida por ${quotation.validity_days || 30} días desde la fecha de emisión</li>
              <li>Los precios están sujetos a cambios sin previo aviso después de la fecha de validez</li>
              <li>Se requiere un depósito del 50% para confirmar la reservación</li>
              <li>El saldo restante debe ser pagado antes de la fecha del evento</li>
              <li>Las cancelaciones deben notificarse con al menos 48 horas de anticipación</li>
            </ul>
          </div>

          <div class="footer">
            <p>Calle Mencia #5, Ensanche Los Tainos, San Isidro, SDE | Tel: 829-904-4245</p>
            <p><strong>¿Preguntas? Contáctenos al 829-904-4245 o visite nuestras instalaciones</strong></p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
  };

  const handlePrintConduce = async (quotation) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Conduce - Cotización ${quotation.quotation_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px;
              color: #333;
            }
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              border-bottom: 3px solid #0ea5e9;
              padding-bottom: 20px;
            }
            .company-info h1 {
              font-size: 24px;
              color: #0369a1;
              margin-bottom: 5px;
            }
            .company-info p {
              font-size: 12px;
              color: #666;
              margin: 2px 0;
            }
            .document-info {
              text-align: right;
            }
            .document-info h2 {
              font-size: 28px;
              color: #0ea5e9;
              margin-bottom: 5px;
            }
            .document-info p {
              font-size: 12px;
              color: #666;
            }
            .delivery-section {
              background: #f0f9ff;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .delivery-section h3 {
              font-size: 14px;
              color: #0369a1;
              margin-bottom: 10px;
              text-transform: uppercase;
            }
            .delivery-section p {
              font-size: 13px;
              margin: 5px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            thead {
              background: #0369a1;
              color: white;
            }
            th {
              padding: 12px;
              text-align: left;
              font-size: 12px;
              text-transform: uppercase;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e0e0e0;
              font-size: 13px;
            }
            tbody tr:nth-child(even) {
              background: #f8fafc;
            }
            .signature-section {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              width: 45%;
            }
            .signature-box p {
              font-size: 12px;
              color: #666;
              margin-bottom: 5px;
            }
            .signature-line {
              border-top: 1px solid #333;
              margin-top: 40px;
              padding-top: 5px;
              font-size: 11px;
              text-align: center;
            }
            .notes-section {
              margin-top: 30px;
              padding: 15px;
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              border-radius: 4px;
            }
            .notes-section h4 {
              font-size: 12px;
              color: #92400e;
              margin-bottom: 8px;
            }
            .notes-section p {
              font-size: 11px;
              color: #78350f;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 10px;
              color: #999;
              border-top: 1px solid #e0e0e0;
              padding-top: 15px;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <h1>Espacios Con Piscina</h1>
              <p>Calle Mencia #5, Ensanche Los Tainos</p>
              <p>San Isidro, SDE</p>
              <p>Tel: 829-904-4245</p>
              <p>Email: info@espaciosconpiscina.com</p>
            </div>
            <div class="document-info">
              <h2>CONDUCE</h2>
              <p><strong>Ref. Cotización #${quotation.quotation_number}</strong></p>
              <p>Fecha: ${new Date(quotation.quotation_date).toLocaleDateString('es-ES')}</p>
            </div>
          </div>

          <div class="delivery-section">
            <h3>Entregar a:</h3>
            <p><strong>${quotation.customer_name}</strong></p>
            <p>Tipo: Cliente</p>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 10%">No.</th>
                <th style="width: 50%">Descripción</th>
                <th style="width: 15%">Cantidad</th>
                <th style="width: 15%">Unidad</th>
                <th style="width: 10%">Completo</th>
              </tr>
            </thead>
            <tbody>
              ${quotation.villa_code ? `
                <tr>
                  <td>1</td>
                  <td>${quotation.villa_code}${quotation.villa_location ? ` - ${quotation.villa_location}` : ''}</td>
                  <td>1</td>
                  <td>unidad</td>
                  <td>☐</td>
                </tr>
              ` : ''}
              ${quotation.extra_services && quotation.extra_services.length > 0 
                ? quotation.extra_services.map((service, idx) => {
                  const rowNum = (quotation.villa_code ? 1 : 0) + idx + 1;
                  return `
                    <tr>
                      <td>${rowNum}</td>
                      <td>${service.service_name || 'Servicio'}${service.supplier_name ? ` (${service.supplier_name})` : ''}</td>
                      <td>${service.quantity || 1}</td>
                      <td>unidad</td>
                      <td>☐</td>
                    </tr>
                  `;
                }).join('')
                : ''
              }
            </tbody>
          </table>

          ${quotation.notes ? `
            <div class="notes-section">
              <h4>Notas:</h4>
              <p>${quotation.notes}</p>
            </div>
          ` : ''}

          <div class="signature-section">
            <div class="signature-box">
              <p><strong>Entregado por:</strong></p>
              <div class="signature-line">
                Firma y Fecha
              </div>
            </div>
            <div class="signature-box">
              <p><strong>Recibido por:</strong></p>
              <div class="signature-line">
                Firma y Fecha
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Calle Mencia #5, Ensanche Los Tainos, San Isidro, SDE | Tel: 829-904-4245</p>
            <p>Este documento no tiene valor fiscal</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
  };

  
  const handleEdit = (quotation) => {
    setEditingQuotation(quotation);
    setIsFormOpen(true);
  };
  
  const handleDelete = async (quotationId) => {
    if (!window.confirm('¿Eliminar esta cotización?')) return;
    
    try {
      await deleteQuotation(quotationId);
      alert('Cotización eliminada exitosamente');
      fetchQuotations();
    } catch (err) {
      alert('Error al eliminar: ' + (err.response?.data?.detail || 'Error desconocido'));
    }
  };
  
  const handleConvertToInvoice = async (quotationId) => {
    if (!window.confirm('¿Convertir esta cotización en factura?')) return;
    
    try {
      await convertQuotationToInvoice(quotationId);
      alert('Cotización convertida a factura exitosamente');
      fetchQuotations();
    } catch (err) {
      alert('Error al convertir cotización: ' + (err.response?.data?.detail || 'Error desconocido'));
    }
  };
  
  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      converted: 'bg-blue-100 text-blue-800'
    };
    const labels = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
      converted: 'Convertida'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };
  
  if (loading) return <div>Cargando cotizaciones...</div>;
  
  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cotizaciones</CardTitle>
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setEditingQuotation(null);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Nueva Cotización
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingQuotation ? 'Editar Cotización' : 'Nueva Cotización'}</DialogTitle>
              </DialogHeader>
              <QuotationForm 
                quotation={editingQuotation}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingQuotation(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          )}
          
          <div className="space-y-3">
            {quotations.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay cotizaciones registradas</p>
            ) : (
              quotations.map(quotation => (
                <div key={quotation.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{quotation.quotation_number}</h3>
                        {getStatusBadge(quotation.status)}
                      </div>
                      <p className="text-sm text-gray-600">Cliente: {quotation.customer_name}</p>
                      {quotation.villa_code && (
                        <p className="text-sm text-gray-600">Villa: {quotation.villa_code}</p>
                      )}
                      <p className="text-sm font-semibold text-blue-600 mt-2">
                        Total: {quotation.currency} ${quotation.total_amount.toFixed(2)}
                      </p>
                      {quotation.status === 'converted' && quotation.converted_to_invoice_id && (
                        <p className="text-xs text-green-600 mt-1 flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Sincronizada con factura - Los cambios se actualizarán automáticamente
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handlePrint(quotation)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      {quotation.status !== 'converted' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintConduce(quotation)}
                          >
                            <FileText className="mr-1 h-4 w-4" /> Conduce
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleConvertToInvoice(quotation.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="mr-1 h-4 w-4" /> Convertir a Factura
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleEdit(quotation)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(quotation.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Quotations;