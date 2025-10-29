import React, { useState, useEffect } from 'react';
import { getConduces, createConduce, updateConduce, deleteConduce } from '../api/api';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertCircle, Plus, Edit2, Trash2, Printer } from 'lucide-react';
import ConduceForm from './ConduceForm';

const Conduces = () => {
  const [conduces, setConduces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConduce, setEditingConduce] = useState(null);
  const [error, setError] = useState('');
  const [logo, setLogo] = useState(null);
  
  useEffect(() => {
    fetchConduces();
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
  
  const fetchConduces = async () => {
    try {
      setLoading(true);
      const response = await getConduces();
      setConduces(response.data);
    } catch (err) {
      setError('Error al cargar conduces');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (conduceData) => {
    try {
      if (editingConduce) {
        await updateConduce(editingConduce.id, conduceData);

  const handlePrint = async (conduce) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Conduce ${conduce.conduce_number}</title>
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
              .no-print { display: none; }
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
              <p><strong>#${conduce.conduce_number}</strong></p>
              <p>Fecha: ${new Date(conduce.delivery_date).toLocaleDateString('es-ES')}</p>
            </div>
          </div>

          <div class="delivery-section">
            <h3>Entregar a:</h3>
            <p><strong>${conduce.recipient_name}</strong></p>
            <p>Tipo: ${conduce.recipient_type === 'customer' ? 'Cliente' : conduce.recipient_type === 'employee' ? 'Empleado' : 'Suplidor'}</p>
            ${conduce.delivery_address ? `<p>Dirección: ${conduce.delivery_address}</p>` : ''}
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
              ${conduce.items && conduce.items.length > 0 ? conduce.items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unit}</td>
                  <td>☐</td>
                </tr>
              `).join('') : '<tr><td colspan="5" style="text-align: center;">No hay ítems</td></tr>'}
            </tbody>
          </table>

          ${conduce.notes ? `
            <div class="notes-section">
              <h4>Notas:</h4>
              <p>${conduce.notes}</p>
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
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

        alert('Conduce actualizado exitosamente');
      } else {
        await createConduce(conduceData);
        alert('Conduce creado exitosamente');
      }
      setIsFormOpen(false);
      setEditingConduce(null);
      fetchConduces();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || 'Error desconocido'));
    }
  };
  
  const handleEdit = (conduce) => {
    setEditingConduce(conduce);
    setIsFormOpen(true);
  };
  
  const handleDelete = async (conduceId) => {
    if (!window.confirm('¿Eliminar este conduce?')) return;
    
    try {
      await deleteConduce(conduceId);
      alert('Conduce eliminado exitosamente');
      fetchConduces();
    } catch (err) {
      alert('Error al eliminar: ' + (err.response?.data?.detail || 'Error desconocido'));
    }
  };
  
  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    const labels = {
      pending: 'Pendiente',
      delivered: 'Entregado',
      cancelled: 'Cancelado'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };
  
  const getRecipientTypeBadge = (type) => {
    const labels = {
      employee: 'Empleado',
      supplier: 'Suplidor',
      customer: 'Cliente'
    };
    return labels[type] || type;
  };
  
  if (loading) return <div>Cargando conduces...</div>;
  
  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Conduces</CardTitle>
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setEditingConduce(null);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Nuevo Conduce
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingConduce ? 'Editar Conduce' : 'Nuevo Conduce'}</DialogTitle>
              </DialogHeader>
              <ConduceForm
                conduce={editingConduce}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingConduce(null);
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
            {conduces.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay conduces registrados</p>
            ) : (
              conduces.map(conduce => (
                <div key={conduce.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{conduce.conduce_number}</h3>
                        {getStatusBadge(conduce.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        Destinatario: {conduce.recipient_name} ({getRecipientTypeBadge(conduce.recipient_type)})
                      </p>
                      <p className="text-sm text-gray-600">
                        Ítems: {conduce.items?.length || 0}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Fecha entrega: {new Date(conduce.delivery_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(conduce)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(conduce.id)}>
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

export default Conduces;