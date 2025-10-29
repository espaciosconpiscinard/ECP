import React, { useState, useEffect } from 'react';
import { getConduces, createConduce, updateConduce, deleteConduce } from '../api/api';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertCircle, Plus, Edit2, Trash2, FileText } from 'lucide-react';
import ConduceForm from './ConduceForm';

const Conduces = () => {
  const [conduces, setConduces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConduce, setEditingConduce] = useState(null);
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetchConduces();
  }, []);
  
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
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Nuevo Conduce
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuevo Conduce</DialogTitle>
              </DialogHeader>
              <div className="text-center py-8">
                <p className="text-gray-500">Formulario de conduce próximamente...</p>
                <p className="text-sm text-gray-400 mt-2">Este componente se implementará completamente en la siguiente fase</p>
              </div>
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
                      <Button size="sm" variant="outline">
                        <FileText className="h-4 w-4" />
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