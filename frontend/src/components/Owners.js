import React, { useState, useEffect } from 'react';
import { getOwners, createOwner, updateOwner, deleteOwner, createOwnerPayment, getOwnerPayments, updateOwnerAmounts } from '../api/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Edit, Trash2, DollarSign, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Owners = () => {
  const { user } = useAuth();
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isAmountUpdateOpen, setIsAmountUpdateOpen] = useState(false);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    villas: '',
    commission_percentage: 0,
    notes: ''
  });
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    currency: 'DOP',
    payment_method: 'cash',
    notes: ''
  });
  const [amountData, setAmountData] = useState({
    total_owed: 0
  });

  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    try {
      const response = await getOwners();
      setOwners(response.data);
    } catch (err) {
      setError('Error al cargar propietarios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async (ownerId) => {
    try {
      const response = await getOwnerPayments(ownerId);
      setPaymentHistory(response.data);
    } catch (err) {
      console.error('Error al cargar historial de pagos:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const dataToSend = {
        ...formData,
        villas: formData.villas.split(',').map(v => v.trim()).filter(v => v)
      };
      
      if (editingOwner) {
        await updateOwner(editingOwner.id, dataToSend);
      } else {
        await createOwner(dataToSend);
      }
      await fetchOwners();
      setIsFormOpen(false);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar propietario');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await createOwnerPayment(selectedOwner.id, paymentData);
      await fetchOwners();
      setIsPaymentOpen(false);
      setPaymentData({ amount: 0, currency: 'DOP', payment_method: 'cash', notes: '' });
      alert('Pago registrado exitosamente');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al registrar pago');
    }
  };

  const handleAmountUpdate = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await updateOwnerAmounts(selectedOwner.id, amountData.total_owed);
      await fetchOwners();
      setIsAmountUpdateOpen(false);
      setAmountData({ total_owed: 0 });
      alert('Monto actualizado exitosamente');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al actualizar monto');
    }
  };

  const handleEdit = (owner) => {
    setEditingOwner(owner);
    setFormData({
      name: owner.name,
      phone: owner.phone,
      email: owner.email || '',
      villas: owner.villas.join(', '),
      commission_percentage: owner.commission_percentage,
      notes: owner.notes || ''
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este propietario?')) {
      try {
        await deleteOwner(id);
        await fetchOwners();
      } catch (err) {
        setError('Error al eliminar propietario');
      }
    }
  };

  const openPaymentDialog = (owner) => {
    setSelectedOwner(owner);
    setPaymentData({ ...paymentData, owner_id: owner.id });
    setIsPaymentOpen(true);
  };

  const openAmountUpdateDialog = (owner) => {
    setSelectedOwner(owner);
    setAmountData({ total_owed: owner.total_owed });
    setIsAmountUpdateOpen(true);
  };

  const openPaymentHistory = (owner) => {
    setSelectedOwner(owner);
    fetchPaymentHistory(owner.id);
    setIsPaymentHistoryOpen(true);
  };

  const resetForm = () => {
    setEditingOwner(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      villas: '',
      commission_percentage: 0,
      notes: ''
    });
  };

  const formatCurrency = (amount) => {
    return `RD$ ${new Intl.NumberFormat('es-DO').format(amount)}`;
  };

  if (loading) {
    return <div className="text-center py-8" data-testid="owners-loading">Cargando...</div>;
  }

  return (
    <div className="space-y-6" data-testid="owners-page">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Propietarios de Villas</h2>
          <p className="text-gray-500 mt-1">Gestiona los propietarios y sus pagos</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} data-testid="add-owner-button">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Propietario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingOwner ? 'Editar Propietario' : 'Nuevo Propietario'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="owner-name-input"
                />
              </div>
              <div>
                <Label>Teléfono *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  data-testid="owner-phone-input"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid="owner-email-input"
                />
              </div>
              <div>
                <Label>Villas (separadas por coma)</Label>
                <Input
                  value={formData.villas}
                  onChange={(e) => setFormData({ ...formData, villas: e.target.value })}
                  placeholder="Villa 1, Villa 2, Villa 3"
                  data-testid="owner-villas-input"
                />
              </div>
              <div>
                <Label>Porcentaje de Comisión (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.commission_percentage}
                  onChange={(e) => setFormData({ ...formData, commission_percentage: parseFloat(e.target.value) })}
                  data-testid="owner-commission-input"
                />
              </div>
              <div>
                <Label>Notas</Label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  rows="3"
                  data-testid="owner-notes-input"
                />
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
                <Button type="submit" data-testid="save-owner-button">
                  {editingOwner ? 'Actualizar' : 'Guardar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago - {selectedOwner?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <Label>Monto *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })}
                required
                data-testid="payment-amount-input"
              />
            </div>
            <div>
              <Label>Moneda *</Label>
              <select
                value={paymentData.currency}
                onChange={(e) => setPaymentData({ ...paymentData, currency: e.target.value })}
                className="w-full p-2 border rounded-md"
                data-testid="payment-currency-select"
              >
                <option value="DOP">Pesos Dominicanos (DOP)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
            <div>
              <Label>Método de Pago</Label>
              <Input
                value={paymentData.payment_method}
                onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                placeholder="Efectivo, Transferencia, etc."
                data-testid="payment-method-input"
              />
            </div>
            <div>
              <Label>Notas</Label>
              <textarea
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                className="w-full p-2 border rounded-md"
                rows="2"
                data-testid="payment-notes-input"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsPaymentOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" data-testid="save-payment-button">Registrar Pago</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Amount Update Dialog */}
      <Dialog open={isAmountUpdateOpen} onOpenChange={setIsAmountUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar Total a Pagar - {selectedOwner?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAmountUpdate} className="space-y-4">
            <div>
              <Label>Total a Pagar *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amountData.total_owed}
                onChange={(e) => setAmountData({ total_owed: parseFloat(e.target.value) })}
                required
                data-testid="total-owed-input"
              />
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-600">Pagado actualmente: {formatCurrency(selectedOwner?.amount_paid || 0)}</p>
              <p className="text-sm font-medium mt-1">
                Nuevo restante: {formatCurrency(amountData.total_owed - (selectedOwner?.amount_paid || 0))}
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsAmountUpdateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" data-testid="save-amount-button">Actualizar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={isPaymentHistoryOpen} onOpenChange={setIsPaymentHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historial de Pagos - {selectedOwner?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {paymentHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 text-sm font-medium">Fecha</th>
                      <th className="text-right p-2 text-sm font-medium">Monto</th>
                      <th className="text-left p-2 text-sm font-medium">Método</th>
                      <th className="text-left p-2 text-sm font-medium">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id} className="border-b">
                        <td className="p-2 text-sm">{new Date(payment.payment_date).toLocaleDateString('es-DO')}</td>
                        <td className="p-2 text-sm text-right">
                          {payment.currency === 'DOP' ? 'RD$' : '$'} {payment.amount.toLocaleString('es-DO')}
                        </td>
                        <td className="p-2 text-sm">{payment.payment_method}</td>
                        <td className="p-2 text-sm">{payment.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No hay pagos registrados</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {owners.length > 0 ? (
          owners.map((owner) => (
            <Card key={owner.id} data-testid={`owner-card-${owner.id}`}>
              <CardHeader>
                <CardTitle className="text-lg">{owner.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Teléfono:</p>
                  <p className="font-medium">{owner.phone}</p>
                </div>
                {owner.email && (
                  <div>
                    <p className="text-sm text-gray-600">Email:</p>
                    <p className="font-medium">{owner.email}</p>
                  </div>
                )}
                {owner.villas.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Villas:</p>
                    <p className="font-medium">{owner.villas.join(', ')}</p>
                  </div>
                )}
                <div className="bg-gray-50 p-3 rounded space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total a pagar:</span>
                    <span className="font-medium">{formatCurrency(owner.total_owed)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pagado:</span>
                    <span className="font-medium text-green-600">{formatCurrency(owner.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="font-medium">Restante:</span>
                    <span className="font-bold text-orange-600">{formatCurrency(owner.balance_due)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openPaymentDialog(owner)}
                    data-testid="add-payment-button"
                  >
                    <DollarSign size={14} className="mr-1" /> Pago
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openAmountUpdateDialog(owner)}
                    data-testid="update-amount-button"
                  >
                    Actualizar Monto
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openPaymentHistory(owner)}
                    data-testid="view-history-button"
                  >
                    <History size={14} className="mr-1" /> Historial
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(owner)}
                    data-testid="edit-owner-button"
                  >
                    <Edit size={14} />
                  </Button>
                  {user?.role === 'admin' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(owner.id)}
                      className="text-red-600 hover:text-red-700"
                      data-testid="delete-owner-button"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            No hay propietarios registrados
          </div>
        )}
      </div>
    </div>
  );
};

export default Owners;
