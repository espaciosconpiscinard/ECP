import React, { useState } from 'react';
import { createCustomer } from '../api/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus } from 'lucide-react';

const CustomerDialog = ({ onCustomerCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    identification: '',
    address: '',
    notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevenir propagación al formulario padre
    setError('');
    
    try {
      const response = await createCustomer(formData);
      
      // Llamar callback ANTES de cerrar el dialog y mostrar alert
      if (onCustomerCreated) {
        onCustomerCreated(response.data);
      }
      
      // Cerrar dialog después de un breve delay
      setTimeout(() => {
        setIsOpen(false);
        resetForm();
        alert('Cliente creado exitosamente');
      }, 100);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear cliente');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      identification: '',
      address: '',
      notes: ''
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" data-testid="quick-add-customer-button">
          <Plus className="mr-2 h-4 w-4" /> Cliente Rápido
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Cliente Rápido</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nombre *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              data-testid="customer-name-input"
            />
          </div>
          <div>
            <Label>Teléfono *</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              data-testid="customer-phone-input"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              data-testid="customer-email-input"
            />
          </div>
          <div>
            <Label>Identificación (Cédula/Pasaporte)</Label>
            <Input
              value={formData.identification}
              onChange={(e) => setFormData({ ...formData, identification: e.target.value })}
              data-testid="customer-identification-input"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" data-testid="save-customer-button">
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDialog;
