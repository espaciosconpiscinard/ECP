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
  const [logo, setLogo] = useState(null);
  
  useEffect(() => {
    fetchQuotations();
    fetchLogo();
  }, []);
  
  const fetchLogo = async () => {
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${API_URL}/api/configuration/logo`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.logo_url) {
          setLogo(data.logo_url);
        }
      }
    } catch (err) {
      console.error('Error loading logo:', err);
    }
  };
  
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
                    </div>
                    <div className="flex gap-2">
                      {quotation.status === 'approved' && quotation.status !== 'converted' && (
                        <Button
                          size="sm"
                          onClick={() => handleConvertToInvoice(quotation.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="mr-1 h-4 w-4" /> Convertir a Factura
                        </Button>
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