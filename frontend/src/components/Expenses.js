import React, { useState, useEffect } from 'react';
import { getExpenses, getCategories, createExpense, updateExpense, deleteExpense, addAbonoToExpense, getExpenseAbonos, deleteExpenseAbono } from '../api/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Edit, Trash2, DollarSign, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ExpensesNew = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedExpenses, setExpandedExpenses] = useState({});
  const [isAbonoDialogOpen, setIsAbonoDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseAbonos, setExpenseAbonos] = useState({});
  const [abonoFormData, setAbonoFormData] = useState({
    amount: 0,
    currency: 'DOP',
    payment_method: 'efectivo',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  const [formData, setFormData] = useState({
    category: 'otros',
    category_id: '',
    description: '',
    amount: 0,
    currency: 'DOP',
    expense_date: new Date().toISOString().split('T')[0],
    payment_status: 'pending',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [expensesResponse, categoriesResponse] = await Promise.all([
        getExpenses(null, searchTerm || null),
        getCategories()
      ]);
      setExpenses(expensesResponse.data);
      setCategories(categoriesResponse.data);
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, formData);
      } else {
        await createExpense(formData);
      }
      await fetchData();
      setIsFormOpen(false);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar gasto');
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category || 'otros',
      category_id: expense.category_id || '',
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
        await fetchData();
      } catch (err) {
        setError('Error al eliminar gasto');
      }
    }
  };

  const resetForm = () => {
    setEditingExpense(null);
    setFormData({
      category: 'otros',
      category_id: '',
      description: '',
      amount: 0,
      currency: 'DOP',
      expense_date: new Date().toISOString().split('T')[0],
      payment_status: 'pending',
      notes: ''
    });
  };

  const toggleExpand = async (expenseId) => {
    const wasExpanded = expandedExpenses[expenseId];
    
    setExpandedExpenses(prev => ({
      ...prev,
      [expenseId]: !prev[expenseId]
    }));
    
    // Si se está expandiendo (no colapsando), cargar los abonos
    if (!wasExpanded && !expenseAbonos[expenseId]) {
      try {
        const response = await getExpenseAbonos(expenseId);
        setExpenseAbonos(prev => ({
          ...prev,
          [expenseId]: response.data
        }));
      } catch (err) {
        console.error('Error loading abonos:', err);
      }
    }
  };

  const handleDeleteAbono = async (expenseId, abonoId) => {
    if (window.confirm('¿Estás seguro de eliminar este abono? Esta acción corregirá el saldo del gasto.')) {
      try {
        await deleteExpenseAbono(expenseId, abonoId);
        // Recargar datos
        await fetchData();
        // Recargar abonos del gasto
        const response = await getExpenseAbonos(expenseId);
        setExpenseAbonos(prev => ({
          ...prev,
          [expenseId]: response.data
        }));
        alert('✅ Abono eliminado exitosamente. Saldo actualizado.');
      } catch (err) {
        setError('Error al eliminar abono');
        console.error(err);
      }
    }
  };

  const handleAddAbono = (expense) => {
    setSelectedExpense(expense);
    setAbonoFormData({
      amount: 0,
      currency: expense.currency,
      payment_method: 'efectivo',
      payment_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setIsAbonoDialogOpen(true);
  };

  const submitAbono = async (e) => {
    e.preventDefault();
    if (!selectedExpense) return;
    
    // Validar si el abono excede el saldo pendiente
    const balanceDue = selectedExpense.balance_due || selectedExpense.amount;
    const willBeOverpaid = abonoFormData.amount > balanceDue;
    const overpayAmount = abonoFormData.amount - balanceDue;
    
    if (willBeOverpaid) {
      const confirmOverpay = window.confirm(
        `⚠️ ADVERTENCIA: Estás pagando de más.\n\n` +
        `Saldo pendiente: ${formatCurrency(balanceDue, selectedExpense.currency)}\n` +
        `Abono a registrar: ${formatCurrency(abonoFormData.amount, abonoFormData.currency)}\n` +
        `Excedente: ${formatCurrency(overpayAmount, selectedExpense.currency)}\n\n` +
        `El saldo final será negativo: -${formatCurrency(overpayAmount, selectedExpense.currency)}\n\n` +
        `¿Deseas continuar de todos modos?`
      );
      
      if (!confirmOverpay) {
        return; // Cancelar si el usuario no confirma
      }
    }
    
    try {
      await addAbonoToExpense(selectedExpense.id, abonoFormData);
      setIsAbonoDialogOpen(false);
      setSelectedExpense(null);
      await fetchData();
      
      // Recargar abonos del gasto
      const response = await getExpenseAbonos(selectedExpense.id);
      setExpenseAbonos(prev => ({
        ...prev,
        [selectedExpense.id]: response.data
      }));
      
      if (willBeOverpaid) {
        alert(`✅ Abono registrado exitosamente.\n\n⚠️ Nota: El gasto tiene un excedente de pago de ${formatCurrency(overpayAmount, selectedExpense.currency)}`);
      } else {
        alert('✅ Abono registrado exitosamente');
      }
    } catch (err) {
      setError('Error al registrar abono');
      console.error(err);
    }
  };

  const formatCurrency = (amount, currency) => {
    const formatted = new Intl.NumberFormat('es-DO').format(amount);
    return currency === 'DOP' ? `RD$ ${formatted}` : `$ ${formatted}`;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'local': 'Local/Alquiler',
      'nomina': 'Nómina',
      'variable': 'Variable',
      'pago_propietario': 'Pago Propietario',
      'otros': 'Otros'
    };
    return labels[category] || category;
  };

  // Filtrar gastos por búsqueda
  const filteredExpenses = expenses.filter(e => 
    e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCategoryLabel(e.category).toLowerCase().includes(searchTerm.toLowerCase()) ||
    categories.find(c => c.id === e.category_id)?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupar gastos por categoría
  const groupedExpenses = {};
  filteredExpenses.forEach(expense => {
    const key = expense.category_id ? 
      categories.find(c => c.id === expense.category_id)?.name || expense.category :
      getCategoryLabel(expense.category);
    
    if (!groupedExpenses[key]) {
      groupedExpenses[key] = [];
    }
    groupedExpenses[key].push(expense);
  });

  // Ordenar categorías alfabéticamente
  const sortedCategoryKeys = Object.keys(groupedExpenses).sort();

  // Calcular totales
  const totalExpensesDOP = expenses.filter(e => e.currency === 'DOP').reduce((sum, e) => sum + e.amount, 0);
  const totalExpensesUSD = expenses.filter(e => e.currency === 'USD').reduce((sum, e) => sum + e.amount, 0);
  const pendingExpensesDOP = expenses.filter(e => e.currency === 'DOP' && e.payment_status === 'pending').reduce((sum, e) => sum + e.amount, 0);
  const pendingExpensesUSD = expenses.filter(e => e.currency === 'USD' && e.payment_status === 'pending').reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Gastos</h2>
          <p className="text-gray-500 mt-1">Gestiona los gastos del negocio</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Gasto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Categoría Predefinida *</Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="pago_propietario">Pago Propietario</option>
                  <option value="local">Local/Alquiler</option>
                  <option value="nomina">Nómina</option>
                  <option value="variable">Variable</option>
                  <option value="otros">Otros</option>
                </select>
              </div>

              <div>
                <Label>Categoría Personalizada (Opcional)</Label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Sin categoría personalizada</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Descripción *</Label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  rows="3"
                  required
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
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label>Moneda *</Label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="DOP">DOP</option>
                    <option value="USD">USD</option>
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
                />
              </div>

              <div>
                <Label>Estado de Pago *</Label>
                <select
                  value={formData.payment_status}
                  onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="pending">Pendiente</option>
                  <option value="paid">Pagado</option>
                </select>
              </div>

              <div>
                <Label>Notas</Label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  rows="2"
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
                <Button type="submit">
                  {editingExpense ? 'Actualizar' : 'Guardar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumen de totales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Total Gastos DOP</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpensesDOP, 'DOP')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Total Gastos USD</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpensesUSD, 'USD')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Pendientes DOP</div>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(pendingExpensesDOP, 'DOP')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Pendientes USD</div>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(pendingExpensesUSD, 'USD')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Buscador */}
      <div className="flex items-center space-x-2">
        <Search className="text-gray-400" size={20} />
        <Input
          placeholder="Buscar por descripción o categoría..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {error && !isFormOpen && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Gastos agrupados por categoría */}
      <div className="space-y-6">
        {sortedCategoryKeys.map((categoryKey) => {
          const categoryExpenses = groupedExpenses[categoryKey];
          const categoryTotal = categoryExpenses.reduce((sum, e) => sum + (e.currency === 'DOP' ? e.amount : 0), 0);
          
          return (
            <Card key={categoryKey}>
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DollarSign className="mr-2 text-red-600" size={24} />
                    <span className="text-xl">{categoryKey}</span>
                    <span className="ml-2 text-sm text-gray-500">({categoryExpenses.length})</span>
                  </div>
                  <span className="text-lg font-semibold text-red-600">
                    {formatCurrency(categoryTotal, 'DOP')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {categoryExpenses.map((expense) => {
                    const isExpanded = expandedExpenses[expense.id];
                    const isAutogenerated = expense.related_reservation_id;
                    
                    return (
                      <div key={expense.id} className="hover:bg-gray-50 transition-colors">
                        {/* Vista compacta */}
                        <div
                          className="p-4 cursor-pointer flex items-center justify-between"
                          onClick={() => toggleExpand(expense.id)}
                        >
                          <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                            <div className="col-span-2">
                              <p className="text-sm font-medium text-gray-900">{expense.description}</p>
                              {isAutogenerated && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-generado</span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm">{new Date(expense.expense_date).toLocaleDateString('es-DO')}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                {/* Mostrar balance_due (saldo restante) */}
                                <p className={`text-sm font-semibold ${
                                  expense.balance_due < 0 ? 'text-blue-600' : 
                                  expense.balance_due === 0 ? 'text-green-600' : 
                                  'text-red-600'
                                }`}>
                                  {formatCurrency(Math.abs(expense.balance_due || expense.amount), expense.currency)}
                                  {expense.balance_due < 0 && ' (Excedente)'}
                                  {expense.balance_due === 0 && ' (Pagado)'}
                                </p>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  expense.balance_due <= 0 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {expense.balance_due <= 0 ? 'Pagado' : 'Pendiente'}
                                </span>
                              </div>
                              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                          </div>
                        </div>

                        {/* Vista expandida */}
                        {isExpanded && (
                          <div className="px-4 pb-4 bg-gray-50 border-t">
                            <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                              <div>
                                <p className="text-xs text-gray-500 font-medium">CATEGORÍA:</p>
                                <p className="text-gray-900">{categoryKey}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium">ESTADO:</p>
                                <p className="text-gray-900">{expense.balance_due <= 0 ? 'Pagado' : 'Pendiente'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium">MONTO ORIGINAL:</p>
                                <p className="text-gray-900 font-semibold">{formatCurrency(expense.amount, expense.currency)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium">TOTAL PAGADO:</p>
                                <p className="text-green-600 font-semibold">{formatCurrency(expense.total_paid || 0, expense.currency)}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-xs text-gray-500 font-medium">SALDO RESTANTE:</p>
                                <p className={`text-lg font-bold ${
                                  expense.balance_due < 0 ? 'text-blue-600' : 
                                  expense.balance_due === 0 ? 'text-green-600' : 
                                  'text-red-600'
                                }`}>
                                  {expense.balance_due < 0 ? '-' : ''}{formatCurrency(Math.abs(expense.balance_due || expense.amount), expense.currency)}
                                  {expense.balance_due < 0 && ' (Excedente de pago)'}
                                  {expense.balance_due === 0 && ' (Totalmente pagado)'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium">MONEDA:</p>
                                <p className="text-gray-900">{expense.currency}</p>
                              </div>
                            </div>

                            {/* Notas */}
                            {expense.notes && (
                              <div className="mt-3">
                                <p className="text-xs text-gray-500 font-medium">NOTAS:</p>
                                <p className="text-sm text-gray-700">{expense.notes}</p>
                              </div>
                            )}

                            {/* Lista de Abonos */}
                            {expenseAbonos[expense.id] && expenseAbonos[expense.id].length > 0 && (
                              <div className="mt-3 bg-green-50 p-3 rounded-md border border-green-200">
                                <p className="text-xs font-bold text-green-800 mb-2 flex items-center justify-between">
                                  <span>📝 HISTORIAL DE ABONOS:</span>
                                  <span className="text-xs text-gray-600">({expenseAbonos[expense.id].length} pagos)</span>
                                </p>
                                <div className="space-y-2">
                                  {expenseAbonos[expense.id].map((abono, idx) => (
                                    <div key={abono.id} className="bg-white p-2 rounded border border-green-300 text-xs">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-green-700">
                                              {formatCurrency(abono.amount, abono.currency)}
                                            </span>
                                            <span className="text-gray-500">
                                              • {new Date(abono.payment_date).toLocaleDateString('es-DO')}
                                            </span>
                                            <span className="text-gray-500 capitalize">
                                              • {abono.payment_method}
                                            </span>
                                          </div>
                                          {abono.notes && (
                                            <p className="text-gray-600 mt-1">{abono.notes}</p>
                                          )}
                                        </div>
                                        {user?.role === 'admin' && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteAbono(expense.id, abono.id);
                                            }}
                                            className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                                            title="Eliminar abono (solo Admin)"
                                          >
                                            <Trash2 size={12} />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2 italic">
                                  💡 Tip: Puedes eliminar un abono si fue registrado por error
                                </p>
                              </div>
                            )}

                            {/* Acciones */}
                            <div className="flex gap-2 mt-4 pt-3 border-t">
                              {/* Botón Agregar Abono - Si tiene saldo pendiente (balance_due > 0) */}
                              {expense.balance_due > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddAbono(expense);
                                  }}
                                  className="flex-1 bg-green-50 text-green-700 hover:bg-green-100"
                                >
                                  💵 Agregar Abono
                                </Button>
                              )}
                              
                              {/* Editar/Eliminar solo si NO es auto-generado */}
                              {!isAutogenerated && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(expense);
                                    }}
                                    className="flex-1"
                                  >
                                    <Edit size={14} className="mr-1" /> Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(expense.id);
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:border-red-600"
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </>
                              )}
                            </div>
                            {isAutogenerated && (
                              <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800">
                                ℹ️ Este gasto fue generado automáticamente por una reservación
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredExpenses.length === 0 && (
          <div className="text-center py-12">
            <DollarSign size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No hay gastos registrados</p>
          </div>
        )}
      </div>

      {/* Diálogo de Agregar Abono */}
      <Dialog open={isAbonoDialogOpen} onOpenChange={setIsAbonoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Abono al Gasto</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="mb-4 p-3 bg-gray-50 rounded border-2 border-blue-200">
              <p className="text-sm font-medium">{selectedExpense.description}</p>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monto original:</span>
                  <span className="font-semibold">{formatCurrency(selectedExpense.amount, selectedExpense.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ya pagado:</span>
                  <span className="text-green-600 font-semibold">{formatCurrency(selectedExpense.total_paid || 0, selectedExpense.currency)}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-gray-800 font-medium">Saldo pendiente:</span>
                  <span className={`font-bold text-base ${
                    selectedExpense.balance_due < 0 ? 'text-blue-600' : 
                    selectedExpense.balance_due === 0 ? 'text-green-600' : 
                    'text-red-600'
                  }`}>
                    {selectedExpense.balance_due < 0 ? '-' : ''}
                    {formatCurrency(Math.abs(selectedExpense.balance_due || selectedExpense.amount), selectedExpense.currency)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <form onSubmit={submitAbono} className="space-y-4">
            {/* Tipo de Transacción */}
            <div>
              <Label>Tipo de Transacción *</Label>
              <select
                value={abonoFormData.amount >= 0 ? 'pago' : 'devolucion'}
                onChange={(e) => {
                  if (e.target.value === 'devolucion') {
                    setAbonoFormData({ ...abonoFormData, amount: Math.abs(abonoFormData.amount) * -1 });
                  } else {
                    setAbonoFormData({ ...abonoFormData, amount: Math.abs(abonoFormData.amount) });
                  }
                }}
                className="w-full p-2 border rounded-md"
              >
                <option value="pago">💵 Pago / Abono</option>
                <option value="devolucion">↩️ Devolución / Corrección</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {abonoFormData.amount < 0 ? 
                  '⚠️ Una devolución reducirá el total pagado (útil para corregir excedentes)' :
                  'Un pago aumentará el total pagado hacia el saldo'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monto {abonoFormData.amount < 0 ? 'de la Devolución' : 'del Abono'} *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={Math.abs(abonoFormData.amount)}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    const isDevolucion = abonoFormData.amount < 0;
                    setAbonoFormData({ ...abonoFormData, amount: isDevolucion ? -value : value });
                  }}
                  required
                />
                {selectedExpense && selectedExpense.balance_due > 0 && abonoFormData.amount >= 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    💡 Sugerido: {formatCurrency(selectedExpense.balance_due, selectedExpense.currency)}
                  </p>
                )}
                {selectedExpense && selectedExpense.balance_due < 0 && abonoFormData.amount < 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    💡 Excedente actual: {formatCurrency(Math.abs(selectedExpense.balance_due), selectedExpense.currency)}
                  </p>
                )}
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

            <div>
              <Label>Notas</Label>
              <textarea
                value={abonoFormData.notes}
                onChange={(e) => setAbonoFormData({ ...abonoFormData, notes: e.target.value })}
                className="w-full p-2 border rounded-md"
                rows="2"
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

export default ExpensesNew;
