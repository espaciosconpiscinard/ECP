import React, { useState, useEffect } from 'react';
import { 
  getExpenses, createExpense, updateExpense, deleteExpense,
  addAbonoToExpense, getExpenseAbonos, deleteExpenseAbono 
} from '../api/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Edit, Trash2, Filter, DollarSign, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Expenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  
  // Abono states
  const [isAbonoDialogOpen, setIsAbonoDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [abonos, setAbonos] = useState([]);
  const [abonoFormData, setAbonoFormData] = useState({
    amount: 0,
    currency: 'DOP',
    payment_method: 'efectivo',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  const [formData, setFormData] = useState({
    category: 'otros',
    description: '',
    amount: 0,
    currency: 'DOP',
    expense_date: new Date().toISOString().split('T')[0],
    payment_status: 'paid',
    notes: ''
  });

  useEffect(() => {
    fetchExpenses();
  }, [filterCategory]);

  const fetchExpenses = async () => {
    try {
      const response = await getExpenses(filterCategory || null);
      setExpenses(response.data);
    } catch (err) {
      setError('Error al cargar gastos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const dataToSend = {
        ...formData,
        expense_date: new Date(formData.expense_date).toISOString()
      };
      
      if (editingExpense) {
        await updateExpense(editingExpense.id, dataToSend);
      } else {
        await createExpense(dataToSend);
      }
      await fetchExpenses();
      setIsFormOpen(false);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar gasto');
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      expense_date: expense.expense_date.split('T')[0],
      payment_status: expense.payment_status,
      notes: expense.notes || ''
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este gasto?')) {
      try {
        await deleteExpense(id);
        await fetchExpenses();
      } catch (err) {
        setError('Error al eliminar gasto');
        alert('Error al eliminar gasto: ' + (err.response?.data?.detail || err.message));
      }
    }
  };

  const resetForm = () => {
    setEditingExpense(null);
    setFormData({
      category: 'otros',
      description: '',
      amount: 0,
      currency: 'DOP',
      expense_date: new Date().toISOString().split('T')[0],
      payment_status: 'paid',
      notes: ''
    });
  };

  const formatCurrency = (amount, currency) => {
    const formatted = new Intl.NumberFormat('es-DO').format(amount);
    return currency === 'DOP' ? `RD$ ${formatted}` : `$ ${formatted}`;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'local': 'Pago de Local',
      'nomina': 'Nómina',
      'variable': 'Gasto Variable',
      'otros': 'Otros'
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'local': 'bg-blue-100 text-blue-800',
      'nomina': 'bg-green-100 text-green-800',
      'variable': 'bg-yellow-100 text-yellow-800',
      'otros': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.otros;
  };

  // Calculate totals
  const totalDOP = expenses.filter(e => e.currency === 'DOP').reduce((sum, e) => sum + e.amount, 0);
  const totalUSD = expenses.filter(e => e.currency === 'USD').reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return <div className="text-center py-8" data-testid="expenses-loading">Cargando...</div>;
  }

  return (
    <div className="space-y-6" data-testid="expenses-page">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Gastos y Compromisos</h2>
          <p className="text-gray-500 mt-1">Registra y gestiona todos tus gastos</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} data-testid="add-expense-button">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Gasto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Categoría *</Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                  data-testid="category-select"
                >
                  <option value="local">Pago de Local</option>
                  <option value="nomina">Nómina</option>
                  <option value="variable">Gasto Variable</option>
                  <option value="otros">Otros</option>
                </select>
              </div>
              <div>
                <Label>Descripción *</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  placeholder="Descripción del gasto"
                  data-testid="description-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Monto *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    required
                    data-testid="amount-input"
                  />
                </div>
                <div>
                  <Label>Moneda *</Label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    data-testid="currency-select"
                  >
                    <option value="DOP">Pesos Dominicanos (DOP)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Fecha del Gasto *</Label>
                <Input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  required
                  data-testid="expense-date-input"
                />
              </div>
              <div>
                <Label>Estado de Pago *</Label>
                <select
                  value={formData.payment_status}
                  onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  data-testid="payment-status-select"
                >
                  <option value="paid">Pagado</option>
                  <option value="pending">Pendiente</option>
                </select>
              </div>
              <div>
                <Label>Notas</Label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  rows="3"
                  data-testid="notes-input"
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
                <Button type="submit" data-testid="save-expense-button">
                  {editingExpense ? 'Actualizar' : 'Guardar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card data-testid="total-dop-card">
          <CardHeader>
            <CardTitle>Total Gastos (DOP)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(totalDOP, 'DOP')}</p>
          </CardContent>
        </Card>
        <Card data-testid="total-usd-card">
          <CardHeader>
            <CardTitle>Total Gastos (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(totalUSD, 'USD')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center space-x-2">
        <Filter className="text-gray-400" size={20} />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="p-2 border rounded-md"
          data-testid="filter-category-select"
        >
          <option value="">Todas las categorías</option>
          <option value="local">Pago de Local</option>
          <option value="nomina">Nómina</option>
          <option value="variable">Gasto Variable</option>
          <option value="otros">Otros</option>
        </select>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Gastos ({expenses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="expenses-table">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-medium">Fecha</th>
                  <th className="text-left p-2 text-sm font-medium">Categoría</th>
                  <th className="text-left p-2 text-sm font-medium">Descripción</th>
                  <th className="text-right p-2 text-sm font-medium">Monto</th>
                  <th className="text-center p-2 text-sm font-medium">Estado</th>
                  <th className="text-center p-2 text-sm font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length > 0 ? (
                  expenses.map((expense) => (
                    <tr key={expense.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-sm">
                        {new Date(expense.expense_date).toLocaleDateString('es-DO')}
                      </td>
                      <td className="p-2 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(expense.category)}`}>
                          {getCategoryLabel(expense.category)}
                        </span>
                      </td>
                      <td className="p-2 text-sm">{expense.description}</td>
                      <td className="p-2 text-sm text-right font-medium">
                        {formatCurrency(expense.amount, expense.currency)}
                      </td>
                      <td className="p-2 text-sm text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          expense.payment_status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {expense.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="p-2 text-sm">
                        <div className="flex justify-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(expense)}
                            className="hover:bg-gray-100"
                            data-testid="edit-expense-button"
                          >
                            <Edit size={16} />
                          </Button>
                          {user?.role === 'admin' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(expense.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              data-testid="delete-expense-button"
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                          {expense.related_reservation_id && (
                            <span className="text-xs text-gray-500 italic ml-2">
                              (Auto-generado)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500">
                      No hay gastos registrados
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

export default Expenses;
