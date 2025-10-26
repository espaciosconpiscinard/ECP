import React, { useState, useEffect } from 'react';
import { 
  getExpenses, createExpense, updateExpense, deleteExpense,
  addAbonoToExpense, getExpenseAbonos, deleteExpenseAbono,
  getExpenseCategories
} from '../api/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Edit, Trash2, Filter, DollarSign, X, Bell, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Expenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [activeTab, setActiveTab] = useState('propietarios'); // propietarios, fijos, unicos, variables
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('pending'); // pending, paid, all
  
  // Filtro de mes/año
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Nuevos filtros y ordenamiento
  const [sortBy, setSortBy] = useState('date'); // date, invoice, villa, owner, remaining
  const [filterVilla, setFilterVilla] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  
  // Estados para almacenar reservaciones y villas
  const [reservations, setReservations] = useState([]);
  const [villas, setVillas] = useState([]);
  
  // Abono states
  const [isAbonoDialogOpen, setIsAbonoDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [abonos, setAbonos] = useState([]);
  
  // Estado para almacenar los abonos de cada gasto (para mostrar invoice_numbers)
  const [expenseAbonos, setExpenseAbonos] = useState({});
  const [abonoFormData, setAbonoFormData] = useState({
    amount: 0,
    currency: 'DOP',
    payment_method: 'efectivo',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
    invoice_number: ''  // Número de factura para el abono (solo admin)
  });
  
  const [formData, setFormData] = useState({
    category: 'otros',
    expense_category_id: '',
    description: '',
    amount: 0,
    currency: 'DOP',
    expense_date: new Date().toISOString().split('T')[0],
    payment_status: 'paid',
    notes: '',
    expense_type: 'variable', // fijo, variable, unico
    reservation_check_in: null,
    has_payment_reminder: false,
    payment_reminder_day: 1,
    is_recurring: false
  });

  useEffect(() => {
    fetchExpenses();
    fetchExpenseCategories();
    fetchReservations();
    fetchVillas();
  }, [filterCategory, selectedMonth, selectedYear]);

  const fetchExpenseCategories = async () => {
    try {
      const response = await getExpenseCategories();
      setExpenseCategories(response.data);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
    }
  };

  const fetchReservations = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL}/api/reservations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Error al cargar reservaciones');
      const data = await response.json();
      setReservations(data);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    }
  };

  const fetchVillas = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL}/api/villas`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Error al cargar villas');
      const data = await response.json();
      setVillas(data);
    } catch (err) {
      console.error('Error fetching villas:', err);
    }
  };

  const fetchExpenses = async () => {
    try {
      const response = await getExpenses(filterCategory || null);
      setExpenses(response.data);
      
      // Cargar abonos de cada gasto para mostrar sus invoice_numbers
      const abonosMap = {};
      for (const expense of response.data) {
        try {
          const abonosResponse = await getExpenseAbonos(expense.id);
          if (abonosResponse.data) {
            abonosMap[expense.id] = abonosResponse.data;
          }
        } catch (err) {
          console.error(`Error loading abonos for expense ${expense.id}:`, err);
        }
      }
      setExpenseAbonos(abonosMap);
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
      expense_category_id: expense.expense_category_id || '',
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      expense_date: expense.expense_date.split('T')[0],
      payment_status: expense.payment_status,
      notes: expense.notes || '',
      expense_type: expense.expense_type || 'variable',
      reservation_check_in: expense.reservation_check_in || null,
      has_payment_reminder: expense.has_payment_reminder || false,
      payment_reminder_day: expense.payment_reminder_day || 1,
      is_recurring: expense.is_recurring || false
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
      expense_category_id: '',
      description: '',
      amount: 0,
      currency: 'DOP',
      expense_date: new Date().toISOString().split('T')[0],
      payment_status: 'paid',
      notes: '',
      expense_type: 'variable',
      reservation_check_in: null,
      has_payment_reminder: false,
      payment_reminder_day: 1,
      is_recurring: false
    });
  };

  // Abono functions
  const handleOpenAbonoDialog = async (expense) => {
    setSelectedExpense(expense);
    setAbonoFormData({
      amount: 0,
      currency: expense.currency,
      payment_method: 'efectivo',
      payment_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    
    // Fetch abonos for this expense
    try {
      const response = await getExpenseAbonos(expense.id);
      setAbonos(response.data);
    } catch (err) {
      console.error('Error al cargar abonos:', err);
      setAbonos([]);
    }
    
    setIsAbonoDialogOpen(true);
  };

  const handleAbonoSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...abonoFormData,
        payment_date: new Date(abonoFormData.payment_date).toISOString()
      };
      
      // Solo incluir invoice_number si se proporcionó
      if (!dataToSend.invoice_number || dataToSend.invoice_number.trim() === '') {
        delete dataToSend.invoice_number;
      }
      
      await addAbonoToExpense(selectedExpense.id, dataToSend);
      
      // Refresh abonos list
      const response = await getExpenseAbonos(selectedExpense.id);
      setAbonos(response.data);
      
      // Refresh expenses list
      await fetchExpenses();
      
      // Reset form
      setAbonoFormData({
        amount: 0,
        currency: selectedExpense.currency,
        payment_method: 'efectivo',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
        invoice_number: ''
      });
      
      alert('✅ Abono agregado exitosamente');
    } catch (err) {
      alert('Error al agregar abono: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteAbono = async (abonoId) => {
    if (window.confirm('¿Estás seguro de eliminar este abono?')) {
      try {
        await deleteExpenseAbono(selectedExpense.id, abonoId);
        
        // Refresh abonos list
        const response = await getExpenseAbonos(selectedExpense.id);
        setAbonos(response.data);
        
        // Refresh expenses list
        await fetchExpenses();
        
        alert('✅ Abono eliminado exitosamente');
      } catch (err) {
        alert('Error al eliminar abono: ' + (err.response?.data?.detail || err.message));
      }
    }
  };

  const formatCurrency = (amount, currency) => {
    const formatted = new Intl.NumberFormat('es-DO').format(amount);
    return currency === 'DOP' ? `RD$ ${formatted}` : `$ ${formatted}`;
  };

  // Función para filtrar gastos por mes seleccionado
  const filterByMonth = (expensesList) => {
    return expensesList.filter(expense => {
      const expenseDate = new Date(expense.expense_date);
      return expenseDate.getMonth() === selectedMonth && expenseDate.getFullYear() === selectedYear;
    });
  };

  // Función para obtener gastos pendientes de meses anteriores
  const getPendingFromPreviousMonths = () => {
    const selectedDate = new Date(selectedYear, selectedMonth, 1);
    
    return expenses.filter(expense => {
      // Solo gastos pendientes
      if (expense.payment_status !== 'pending') return false;
      
      const expenseDate = new Date(expense.expense_date);
      
      // Solo gastos de meses anteriores al seleccionado
      return expenseDate < selectedDate;
    });
  };

  // Función para obtener información de la reservación asociada
  const getReservationInfo = (expense) => {
    if (!expense.related_reservation_id) return null;
    return reservations.find(r => r.id === expense.related_reservation_id);
  };

  // Función para obtener el número de factura (número de invoice)
  const getInvoiceNumber = (expense) => {
    const reservation = getReservationInfo(expense);
    return reservation?.invoice_number || 0;
  };

  // Función para extraer código de villa de la descripción si no hay reservación
  const getVillaCodeFromDescription = (expense) => {
    // Si hay reservación, usar su villa_code
    const reservation = getReservationInfo(expense);
    if (reservation) return reservation.villa_code;
    
    // Si no hay reservación, intentar extraer de la descripción
    const description = expense.description || '';
    // Buscar patrón ECPV seguido de letras (ej: ECPVAH, ECPVWLSL, ECPVSH)
    const match = description.match(/ECPV[A-Z]+/i);
    return match ? match[0].toUpperCase() : null;
  };

  // Función para obtener propietarios únicos de las villas
  const getUniqueOwners = () => {
    const owners = new Set();
    villas.forEach(villa => {
      if (villa.owner) owners.add(villa.owner);
    });
    return Array.from(owners).sort();
  };

  // Función para filtrar y ordenar gastos por tipo con prioridad de urgencia
  const getFilteredAndSortedExpenses = () => {
    // Tab especial: Propietarios (gastos auto-generados)
    if (activeTab === 'propietarios') {
      let filtered = expenses.filter(expense => 
        expense.category === 'pago_propietario' || expense.related_reservation_id
      );
      
      // Filtrar por estado de pago
      if (paymentStatusFilter === 'pending') {
        filtered = filtered.filter(expense => expense.payment_status === 'pending');
      } else if (paymentStatusFilter === 'paid') {
        filtered = filtered.filter(expense => expense.payment_status === 'paid');
      }
      
      // Filtrar por mes seleccionado
      const monthFiltered = filterByMonth(filtered);
      
      // Agregar pendientes de meses anteriores
      let pendingFiltered = [];
      if (paymentStatusFilter !== 'paid') {
        pendingFiltered = expenses.filter(expense => {
          if (!(expense.category === 'pago_propietario' || expense.related_reservation_id)) return false;
          if (expense.payment_status !== 'pending') return false;
          const expenseDate = new Date(expense.expense_date);
          const selectedDate = new Date(selectedYear, selectedMonth, 1);
          return expenseDate < selectedDate;
        });
      }
      
      filtered = [...monthFiltered, ...pendingFiltered];
      
      // Aplicar ordenamiento simple por fecha
      return filtered.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
    }
    
    // Mapear tabs a tipos del backend (para otros tabs)
    const typeMap = {
      'variables': 'variable',
      'fijos': 'fijo',
      'unicos': 'unico'
    };
    
    const targetType = typeMap[activeTab];
    
    // Filtrar por tipo de tab activo
    let filtered = expenses.filter(expense => {
      const type = expense.expense_type || 'variable';
      return type === targetType;
    });

    // Filtrar por estado de pago (NUEVO)
    if (paymentStatusFilter === 'pending') {
      filtered = filtered.filter(expense => expense.payment_status === 'pending');
    } else if (paymentStatusFilter === 'paid') {
      filtered = filtered.filter(expense => expense.payment_status === 'paid');
    }
    // Si es 'all', no filtramos por payment_status

    // Filtrar por mes seleccionado
    const monthFiltered = filterByMonth(filtered);
    
    // Agregar pendientes de meses anteriores (solo si filtro es 'pending' o 'all')
    let pendingFiltered = [];
    if (paymentStatusFilter !== 'paid') {
      pendingFiltered = expenses.filter(expense => {
        const type = expense.expense_type || 'variable';
        if (type !== targetType) return false;
        if (expense.payment_status !== 'pending') return false;
        const expenseDate = new Date(expense.expense_date);
        const selectedDate = new Date(selectedYear, selectedMonth, 1);
        return expenseDate < selectedDate;
      });
    }
    
    // Combinar gastos del mes con pendientes de meses anteriores
    filtered = [...monthFiltered, ...pendingFiltered];

    // Aplicar filtros adicionales
    if (filterVilla) {
      filtered = filtered.filter(expense => {
        const villaCode = getVillaCodeFromDescription(expense);
        return villaCode === filterVilla;
      });
    }

    if (filterOwner) {
      filtered = filtered.filter(expense => {
        const reservation = getReservationInfo(expense);
        if (!reservation) return false;
        const villa = villas.find(v => v.code === reservation.villa_code);
        return villa?.owner === filterOwner;
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Clasificar gastos por urgencia
    const overdue = []; // Vencidos (rojo)
    const upcoming = []; // Próximos a vencer (naranja)
    const future = []; // Futuros (normal)
    const paid = []; // Pagados (verde)

    filtered.forEach(expense => {
      if (expense.payment_status === 'paid') {
        paid.push(expense);
        return;
      }

      const expenseDate = expense.reservation_check_in 
        ? new Date(expense.reservation_check_in) 
        : new Date(expense.expense_date);
      expenseDate.setHours(0, 0, 0, 0);

      const daysUntil = Math.floor((expenseDate - today) / (1000 * 60 * 60 * 24));

      if (daysUntil < 0) {
        overdue.push({ ...expense, daysUntil, urgency: 'overdue' });
      } else if (daysUntil <= 7) {
        upcoming.push({ ...expense, daysUntil, urgency: 'upcoming' });
      } else {
        future.push({ ...expense, daysUntil, urgency: 'future' });
      }
    });

    // Ordenar cada categoría
    overdue.sort((a, b) => a.daysUntil - b.daysUntil); // Más atrasados primero
    upcoming.sort((a, b) => a.daysUntil - b.daysUntil); // Más próximos primero
    future.sort((a, b) => a.daysUntil - b.daysUntil);
    paid.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date)); // Más recientes primero

    // Para gastos fijos: también considerar día de recordatorio
    if (activeTab === 'fijos') {
      const sortByReminder = (arr) => {
        return arr.sort((a, b) => {
          if (a.payment_reminder_day && b.payment_reminder_day) {
            return a.payment_reminder_day - b.payment_reminder_day;
          }
          return a.daysUntil - b.daysUntil;
        });
      };
      sortByReminder(overdue);
      sortByReminder(upcoming);
      sortByReminder(future);
    }

    let result = [...overdue, ...upcoming, ...future, ...paid];

    // Aplicar ordenamiento según selección
    if (sortBy === 'invoice') {
      // Ordenar por número de factura (menor a mayor), y por fecha dentro del mismo número
      result.sort((a, b) => {
        const invoiceA = getInvoiceNumber(a);
        const invoiceB = getInvoiceNumber(b);
        if (invoiceA !== invoiceB) {
          return invoiceA - invoiceB;
        }
        // Mismo número de factura, ordenar por fecha
        const dateA = new Date(a.expense_date);
        const dateB = new Date(b.expense_date);
        return dateA - dateB;
      });
    } else if (sortBy === 'villa') {
      // Ordenar por código de villa, y por fecha dentro de la misma villa
      result.sort((a, b) => {
        const villaA = getVillaCodeFromDescription(a) || 'ZZZ'; // Sin villa va al final
        const villaB = getVillaCodeFromDescription(b) || 'ZZZ';
        
        if (villaA !== villaB) {
          return villaA.localeCompare(villaB);
        }
        
        // Misma villa, ordenar por fecha
        const dateA = new Date(a.expense_date);
        const dateB = new Date(b.expense_date);
        return dateA - dateB;
      });
    } else if (sortBy === 'owner') {
      // Ordenar por propietario, y por fecha dentro del mismo propietario
      result.sort((a, b) => {
        const reservationA = getReservationInfo(a);
        const reservationB = getReservationInfo(b);
        const villaA = villas.find(v => v.code === reservationA?.villa_code);
        const villaB = villas.find(v => v.code === reservationB?.villa_code);
        const ownerA = villaA?.owner || 'ZZZ'; // Sin propietario va al final
        const ownerB = villaB?.owner || 'ZZZ';
        
        if (ownerA !== ownerB) {
          return ownerA.localeCompare(ownerB);
        }
        
        // Mismo propietario, ordenar por fecha
        const dateA = new Date(a.expense_date);
        const dateB = new Date(b.expense_date);
        return dateA - dateB;
      });
    } else if (sortBy === 'remaining') {
      // Ordenar por monto restante (menor a mayor), y por fecha si es el mismo monto
      result.sort((a, b) => {
        const remainingA = a.balance_due || (a.amount - (a.total_paid || 0));
        const remainingB = b.balance_due || (b.amount - (b.total_paid || 0));
        
        if (remainingA !== remainingB) {
          return remainingA - remainingB;
        }
        
        // Mismo monto restante, ordenar por fecha
        const dateA = new Date(a.expense_date);
        const dateB = new Date(b.expense_date);
        return dateA - dateB;
      });
    }
    // Si sortBy === 'date', mantener el orden de urgencia actual

    return result;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'compromiso': 'Compromiso',
      'local': 'Pago de Local',
      'nomina': 'Nómina',
      'variable': 'Gasto Variable',
      'pago_propietario': 'Pago Propietario',
      'otros': 'Otros'
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'compromiso': 'bg-red-100 text-red-800 font-semibold',
      'local': 'bg-blue-100 text-blue-800',
      'nomina': 'bg-green-100 text-green-800',
      'variable': 'bg-yellow-100 text-yellow-800',
      'pago_propietario': 'bg-purple-100 text-purple-800',
      'otros': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.otros;
  };
  
  // Función para obtener color de urgencia
  const getUrgencyColor = (expense) => {
    if (expense.urgency === 'overdue') return 'bg-red-50 border-l-4 border-red-500';
    if (expense.urgency === 'upcoming') return 'bg-orange-50 border-l-4 border-orange-500';
    if (expense.payment_status === 'paid') return 'bg-green-50';
    return 'bg-white';
  };

  const getExpenseCategoryName = (categoryId) => {
    const category = expenseCategories.find(c => c.id === categoryId);
    return category ? category.name : null;
  };

  const groupExpensesByCategory = () => {
    const grouped = {};
    const filteredExpenses = getFilteredAndSortedExpenses();
    filteredExpenses.forEach(expense => {
      const categoryId = expense.expense_category_id;
      const categoryName = categoryId ? getExpenseCategoryName(categoryId) : 'Sin Categoría';
      
      if (!grouped[categoryName]) {
        grouped[categoryName] = [];
      }
      grouped[categoryName].push(expense);
    });
    return grouped;
  };

  const getUpcomingPayments = () => {
    const today = new Date();
    const currentDay = today.getDate();
    
    return expenses.filter(expense => {
      if (!expense.has_payment_reminder || !expense.payment_reminder_day) return false;
      
      const reminderDay = expense.payment_reminder_day;
      const daysUntilPayment = reminderDay - currentDay;
      
      // Show if payment is within next 7 days or overdue
      return daysUntilPayment <= 7 && daysUntilPayment >= -3;
    }).sort((a, b) => a.payment_reminder_day - b.payment_reminder_day);
  };

  // Calculate totals generales
  const totalDOP = expenses.filter(e => e.currency === 'DOP').reduce((sum, e) => sum + e.amount, 0);
  const totalUSD = expenses.filter(e => e.currency === 'USD').reduce((sum, e) => sum + e.amount, 0);
  
  // Calculate totals por mes seleccionado
  const monthExpenses = filterByMonth(expenses);
  const pendingFromPrevious = getPendingFromPreviousMonths();
  
  // Combinar gastos del mes actual con pendientes de meses anteriores
  const allRelevantExpenses = [...monthExpenses, ...pendingFromPrevious];
  
  // Totales por tipo (mes actual + pendientes anteriores)
  const compromisosDOP = allRelevantExpenses.filter(e => e.category === 'compromiso' && e.currency === 'DOP').reduce((sum, e) => sum + e.amount, 0);
  const compromisosUSD = allRelevantExpenses.filter(e => e.category === 'compromiso' && e.currency === 'USD').reduce((sum, e) => sum + e.amount, 0);
  
  const fijosDOP = allRelevantExpenses.filter(e => e.expense_type === 'fijo' && e.currency === 'DOP').reduce((sum, e) => sum + e.amount, 0);
  const fijosUSD = allRelevantExpenses.filter(e => e.expense_type === 'fijo' && e.currency === 'USD').reduce((sum, e) => sum + e.amount, 0);
  
  const variablesDOP = allRelevantExpenses.filter(e => e.expense_type === 'variable' && e.currency === 'DOP').reduce((sum, e) => sum + e.amount, 0);
  const variablesUSD = allRelevantExpenses.filter(e => e.expense_type === 'variable' && e.currency === 'USD').reduce((sum, e) => sum + e.amount, 0);
  
  const unicosDOP = allRelevantExpenses.filter(e => e.expense_type === 'unico' && e.currency === 'DOP').reduce((sum, e) => sum + e.amount, 0);
  const unicosUSD = allRelevantExpenses.filter(e => e.expense_type === 'unico' && e.currency === 'USD').reduce((sum, e) => sum + e.amount, 0);
  
  // Totales de pendientes de meses anteriores
  const pendingPreviousDOP = pendingFromPrevious.filter(e => e.currency === 'DOP').reduce((sum, e) => sum + e.amount, 0);
  const pendingPreviousUSD = pendingFromPrevious.filter(e => e.currency === 'USD').reduce((sum, e) => sum + e.amount, 0);
  
  // Compromisos del mes
  const compromisosDelMes = monthExpenses.filter(e => e.category === 'compromiso');
  const compromisosPagados = compromisosDelMes.filter(e => e.payment_status === 'paid').length;
  const compromisosPendientes = compromisosDelMes.filter(e => e.payment_status === 'pending').length;
  const compromisosVencidos = compromisosDelMes.filter(e => {
    if (e.payment_status === 'paid') return false;
    const expenseDate = new Date(e.expense_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expenseDate < today;
  }).length;
  
  const upcomingPayments = getUpcomingPayments();

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
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <Label>Categoría Personalizada</Label>
                <select
                  value={formData.expense_category_id}
                  onChange={(e) => setFormData({ ...formData, expense_category_id: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Sin categoría</option>
                  {expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Puedes crear categorías en "Categorías Gastos"</p>
              </div>

              <div>
                <Label>Categoría Base *</Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                  data-testid="category-select"
                >
                  <option value="compromiso">Compromiso (Crítico)</option>
                  <option value="local">Pago de Local</option>
                  <option value="nomina">Nómina</option>
                  <option value="variable">Gasto Variable</option>
                  <option value="pago_propietario">Pago Propietario</option>
                  <option value="otros">Otros</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.category === 'compromiso' && '⚠️ Compromisos son gastos críticos que requieren atención especial'}
                </p>
              </div>

              {/* Tipo de Gasto */}
              <div>
                <Label>Tipo de Gasto *</Label>
                <select
                  value={formData.expense_type}
                  onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="variable">Variable (Con fecha de pago)</option>
                  <option value="fijo">Fijo (Recurrente mensual)</option>
                  <option value="unico">Único (Ya pagado, sin fecha)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.expense_type === 'variable' && 'Gasto con fecha específica de pago (ej: reservación)'}
                  {formData.expense_type === 'fijo' && 'Gasto que se repite cada mes (ej: luz, internet)'}
                  {formData.expense_type === 'unico' && 'Gasto ya pagado al momento de registro (ej: compra de impresora)'}
                </p>
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

              {/* Recordatorio de Pago */}
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    checked={formData.has_payment_reminder}
                    onChange={(e) => setFormData({ ...formData, has_payment_reminder: e.target.checked })}
                    id="has_reminder"
                  />
                  <Label htmlFor="has_reminder" className="flex items-center">
                    <Bell className="h-4 w-4 mr-1" />
                    Configurar Recordatorio de Pago
                  </Label>
                </div>

                {formData.has_payment_reminder && (
                  <div className="space-y-3 pl-6">
                    <div>
                      <Label>Día del Mes para Recordatorio *</Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.payment_reminder_day}
                        onChange={(e) => setFormData({ ...formData, payment_reminder_day: parseInt(e.target.value) })}
                        placeholder="Ej: 15"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Día del mes en que se debe pagar (1-31)
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.is_recurring}
                        onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                        id="is_recurring"
                      />
                      <Label htmlFor="is_recurring">
                        Gasto Recurrente (se repite cada mes)
                      </Label>
                    </div>
                  </div>
                )}
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

      {/* Summary Cards - Totales Desglosados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50" data-testid="total-compromisos-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-800">⚠️ Total Compromisos (Mes)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(compromisosDOP, 'DOP')}</p>
            {compromisosUSD > 0 && <p className="text-sm text-red-500">{formatCurrency(compromisosUSD, 'USD')}</p>}
            <p className="text-xs text-gray-600 mt-1">
              {compromisosPagados} pagados • {compromisosPendientes} pendientes
              {compromisosVencidos > 0 && <span className="text-red-600 font-semibold"> • {compromisosVencidos} vencidos</span>}
            </p>
          </CardContent>
        </Card>
        
        <Card data-testid="total-fijos-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">🔁 Total Gastos Fijos (Mes)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(fijosDOP, 'DOP')}</p>
            {fijosUSD > 0 && <p className="text-sm text-blue-500">{formatCurrency(fijosUSD, 'USD')}</p>}
          </CardContent>
        </Card>
        
        <Card data-testid="total-variables-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">📅 Total Gastos Variables (Mes)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(variablesDOP, 'DOP')}</p>
            {variablesUSD > 0 && <p className="text-sm text-orange-500">{formatCurrency(variablesUSD, 'USD')}</p>}
          </CardContent>
        </Card>
        
        <Card data-testid="total-unicos-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">💰 Total Gastos Únicos (Mes)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(unicosDOP, 'DOP')}</p>
            {unicosUSD > 0 && <p className="text-sm text-green-500">{formatCurrency(unicosUSD, 'USD')}</p>}
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2" data-testid="total-general-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">💵 Total General (Todos los gastos)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalDOP, 'DOP')}</p>
                {totalUSD > 0 && <p className="text-lg text-gray-600">{formatCurrency(totalUSD, 'USD')}</p>}
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>Total acumulado</p>
                <p>de todos los tiempos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Próximos Pagos */}
      {upcomingPayments.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <Bell className="mr-2 h-5 w-5" />
              Recordatorios de Pago ({upcomingPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingPayments.map((expense) => {
                const today = new Date().getDate();
                const daysUntil = expense.payment_reminder_day - today;
                const isOverdue = daysUntil < 0;
                const isToday = daysUntil === 0;
                
                return (
                  <div key={expense.id} className="flex items-center justify-between p-3 bg-white rounded-md border">
                    <div className="flex-1">
                      <p className="font-semibold">{expense.description}</p>
                      {getExpenseCategoryName(expense.expense_category_id) && (
                        <p className="text-sm text-gray-600">
                          {getExpenseCategoryName(expense.expense_category_id)}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        Día de pago: {expense.payment_reminder_day} de cada mes
                        {expense.is_recurring && ' (Recurrente)'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {formatCurrency(expense.amount, expense.currency)}
                      </p>
                      <p className={`text-sm font-semibold ${
                        isOverdue ? 'text-red-600' : 
                        isToday ? 'text-orange-600' : 
                        'text-green-600'
                      }`}>
                        {isOverdue ? '¡Vencido!' : 
                         isToday ? 'Hoy' : 
                         `En ${daysUntil} días`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter and Group */}
      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        {/* Primera fila: Categoría y Mes */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="text-gray-400" size={20} />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="p-2 border rounded-md"
              data-testid="filter-category-select"
            >
              <option value="">Todas las categorías</option>
              <option value="compromiso">Compromiso</option>
              <option value="local">Pago de Local</option>
              <option value="nomina">Nómina</option>
              <option value="variable">Gasto Variable</option>
              <option value="pago_propietario">Pago Propietario</option>
              <option value="otros">Otros</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Label>Mes:</Label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="p-2 border rounded-md"
            >
              <option value={0}>Enero</option>
              <option value={1}>Febrero</option>
              <option value={2}>Marzo</option>
              <option value={3}>Abril</option>
              <option value={4}>Mayo</option>
              <option value={5}>Junio</option>
              <option value={6}>Julio</option>
              <option value={7}>Agosto</option>
              <option value={8}>Septiembre</option>
              <option value={9}>Octubre</option>
              <option value={10}>Noviembre</option>
              <option value={11}>Diciembre</option>
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="p-2 border rounded-md"
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Segunda fila: Ordenamiento y Filtros Avanzados */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-t pt-4">
          <div className="flex items-center space-x-2">
            <Label className="font-semibold">🔵 Estado:</Label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="p-2 border-2 rounded-md bg-blue-50 font-medium"
            >
              <option value="pending">⏳ Pendientes</option>
              <option value="paid">✅ Pagados</option>
              <option value="all">📋 Todos</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Label className="font-semibold">Ordenar por:</Label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="p-2 border rounded-md bg-blue-50"
            >
              <option value="date">📅 Fecha / Urgencia</option>
              <option value="invoice">🧾 Número de Factura</option>
              <option value="villa">🏠 Villa</option>
              <option value="owner">👤 Propietario</option>
              <option value="remaining">💵 Monto Restante</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Label>Filtrar Villa:</Label>
            <select
              value={filterVilla}
              onChange={(e) => setFilterVilla(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="">Todas las villas</option>
              {villas.map(villa => (
                <option key={villa.id} value={villa.code}>
                  {villa.code} - {villa.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Label>Filtrar Propietario:</Label>
            <select
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="">Todos los propietarios</option>
              {getUniqueOwners().map(owner => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setPaymentStatusFilter('pending');
              setSortBy('date');
              setFilterVilla('');
              setFilterOwner('');
            }}
            className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
          >
            🔄 Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Alerta de Gastos Pendientes de Meses Anteriores */}
      {pendingFromPrevious.length > 0 && (
        <Alert className="bg-yellow-50 border-yellow-300">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>⚠️ Gastos Pendientes de Meses Anteriores:</strong> Tienes {pendingFromPrevious.length} gasto(s) pendiente(s) de meses anteriores por un total de{' '}
            <strong className="text-red-600">{formatCurrency(pendingPreviousDOP, 'DOP')}</strong>
            {pendingPreviousUSD > 0 && <> y <strong className="text-red-600">{formatCurrency(pendingPreviousUSD, 'USD')}</strong></>}.
            Estos gastos se muestran en la lista con un indicador especial.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs para Tipos de Gastos */}
      <div className="bg-white rounded-lg shadow-md mb-4">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('variables')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'variables'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            📅 Variables ({expenses.filter(e => (e.expense_type || 'variable') === 'variable').length})
          </button>
          <button
            onClick={() => setActiveTab('fijos')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'fijos'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            🔁 Fijos ({expenses.filter(e => e.expense_type === 'fijo').length})
          </button>
          <button
            onClick={() => setActiveTab('unicos')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'unicos'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            💰 Únicos ({expenses.filter(e => e.expense_type === 'unico').length})
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'variables' && '📅 Gastos Variables (Con fecha de pago)'}
            {activeTab === 'fijos' && '🔁 Gastos Fijos (Recurrentes mensuales)'}
            {activeTab === 'unicos' && '💰 Gastos Únicos (Ya pagados)'}
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({getFilteredAndSortedExpenses().length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!groupByCategory ? (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="expenses-table">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-sm font-medium">Fecha</th>
                    <th className="text-left p-2 text-sm font-medium">Categoría</th>
                    {sortBy === 'invoice' && <th className="text-left p-2 text-sm font-medium">Factura #</th>}
                    {(sortBy === 'villa' || filterVilla) && <th className="text-left p-2 text-sm font-medium">Villa</th>}
                    {(sortBy === 'owner' || filterOwner) && <th className="text-left p-2 text-sm font-medium">Propietario</th>}
                    <th className="text-left p-2 text-sm font-medium">Descripción</th>
                    <th className="text-right p-2 text-sm font-medium">Monto</th>
                    <th className="text-right p-2 text-sm font-medium">Pagado</th>
                    <th className="text-right p-2 text-sm font-medium">Restante</th>
                    <th className="text-center p-2 text-sm font-medium">Estado</th>
                    <th className="text-center p-2 text-sm font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredAndSortedExpenses().length > 0 ? (
                    getFilteredAndSortedExpenses().map((expense) => (
                      <tr key={expense.id} className={`border-b hover:bg-gray-100 ${getUrgencyColor(expense)}`}>
                        <td className="p-2 text-sm">
                          {new Date(expense.expense_date).toLocaleDateString('es-DO')}
                        </td>
                        <td className="p-2 text-sm">
                          <div className="space-y-1">
                            <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(expense.category)}`}>
                              {getCategoryLabel(expense.category)}
                            </span>
                            {getExpenseCategoryName(expense.expense_category_id) && (
                              <div className="text-xs text-gray-600 font-semibold">
                                📁 {getExpenseCategoryName(expense.expense_category_id)}
                              </div>
                            )}
                          </div>
                        </td>
                        {sortBy === 'invoice' && (
                          <td className="p-2 text-sm">
                            {getInvoiceNumber(expense)}
                          </td>
                        )}
                        {(sortBy === 'villa' || filterVilla) && (
                          <td className="p-2 text-sm font-semibold text-blue-600">
                            {getVillaCodeFromDescription(expense) || '-'}
                          </td>
                        )}
                        {(sortBy === 'owner' || filterOwner) && (
                          <td className="p-2 text-sm">
                            {(() => {
                              const reservation = getReservationInfo(expense);
                              if (!reservation) return '-';
                              const villa = villas.find(v => v.code === reservation.villa_code);
                              return villa?.owner || '-';
                            })()}
                          </td>
                        )}
                        <td className="p-2 text-sm">
                          <div className="flex items-center space-x-2">
                            {(() => {
                              const expenseDate = new Date(expense.expense_date);
                              const selectedDate = new Date(selectedYear, selectedMonth, 1);
                              const isPreviousMonth = expenseDate < selectedDate && expense.payment_status === 'pending';
                              
                              return (
                                <>
                                  {isPreviousMonth && (
                                    <span className="text-xs px-2 py-1 bg-yellow-600 text-white rounded font-bold" title="Pendiente de mes anterior">
                                      📆 MES ANTERIOR
                                    </span>
                                  )}
                                  {expense.urgency === 'overdue' && (
                                    <span className="text-xs px-2 py-1 bg-red-600 text-white rounded font-semibold" title="Vencido">
                                      🔴 {Math.abs(expense.daysUntil)}d vencido
                                    </span>
                                  )}
                                  {expense.urgency === 'upcoming' && (
                                    <span className="text-xs px-2 py-1 bg-orange-500 text-white rounded font-semibold" title="Próximo a vencer">
                                      🟠 {expense.daysUntil}d restantes
                                    </span>
                                  )}
                                  {expense.category === 'compromiso' && (
                                    <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded font-bold" title="Compromiso Crítico">
                                      ⚠️ COMPROMISO
                                    </span>
                                  )}
                                  <span>{expense.description}</span>
                                  {expenseAbonos[expense.id] && expenseAbonos[expense.id].length > 0 && (
                                    <div className="text-xs text-purple-600 font-medium mt-1">
                                      (Abonos: {expenseAbonos[expense.id].map(a => `#${a.invoice_number}`).join(', ')})
                                    </div>
                                  )}
                                  {expense.has_payment_reminder && (
                                    <Bell size={14} className="text-orange-500" title={`Recordatorio día ${expense.payment_reminder_day}`} />
                                  )}
                                  {expense.is_recurring && (
                                    <span className="text-xs px-1 py-0.5 bg-blue-100 text-blue-700 rounded">Recurrente</span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="p-2 text-sm text-right font-medium">
                          {formatCurrency(expense.amount, expense.currency)}
                        </td>
                        <td className="p-2 text-sm text-right">
                          {formatCurrency(expense.total_paid || 0, expense.currency)}
                        </td>
                        <td className="p-2 text-sm text-right font-medium">
                          <span className={expense.balance_due > 0 ? 'text-orange-600' : 'text-green-600'}>
                            {formatCurrency(expense.balance_due || 0, expense.currency)}
                          </span>
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
                          <div className="flex justify-center space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenAbonoDialog(expense)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Agregar Abono"
                            >
                              <DollarSign size={16} />
                            </Button>
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
                      <td colSpan={8 + (sortBy === 'invoice' ? 1 : 0) + ((sortBy === 'villa' || filterVilla) ? 1 : 0) + ((sortBy === 'owner' || filterOwner) ? 1 : 0)} className="text-center py-8 text-gray-500">
                        No hay gastos registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupExpensesByCategory()).map(([categoryName, categoryExpenses]) => {
                const categoryTotal = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
                return (
                  <div key={categoryName} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="text-lg font-semibold flex items-center">
                        📁 {categoryName}
                        <span className="ml-2 text-sm text-gray-500">({categoryExpenses.length} gastos)</span>
                      </h3>
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(categoryTotal, categoryExpenses[0].currency)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {categoryExpenses.map((expense) => (
                        <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="font-semibold">{expense.description}</p>
                              {expense.has_payment_reminder && (
                                <Bell size={14} className="text-orange-500" />
                              )}
                              {expense.is_recurring && (
                                <span className="text-xs px-1 py-0.5 bg-blue-100 text-blue-700 rounded">Recurrente</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {new Date(expense.expense_date).toLocaleDateString('es-DO')} • 
                              <span className={`ml-2 ${expense.balance_due > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                Restante: {formatCurrency(expense.balance_due || 0, expense.currency)}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <p className="font-bold text-lg mr-4">
                              {formatCurrency(expense.amount, expense.currency)}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenAbonoDialog(expense)}
                              className="text-green-600"
                            >
                              <DollarSign size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(expense)}
                            >
                              <Edit size={16} />
                            </Button>
                            {user?.role === 'admin' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(expense.id)}
                                className="text-red-600"
                              >
                                <Trash2 size={16} />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Abono Dialog */}
      <Dialog open={isAbonoDialogOpen} onOpenChange={setIsAbonoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Abonos - {selectedExpense?.description}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Expense Summary */}
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Monto Total:</p>
                  <p className="font-bold text-lg">
                    {selectedExpense && formatCurrency(selectedExpense.amount, selectedExpense.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Total Pagado:</p>
                  <p className="font-bold text-lg text-green-600">
                    {selectedExpense && formatCurrency(selectedExpense.total_paid || 0, selectedExpense.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Restante:</p>
                  <p className="font-bold text-lg text-orange-600">
                    {selectedExpense && formatCurrency(selectedExpense.balance_due || 0, selectedExpense.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Add Abono Form */}
            <form onSubmit={handleAbonoSubmit} className="border-t pt-4">
              <h3 className="font-semibold mb-3">Agregar Nuevo Abono</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Monto *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={abonoFormData.amount}
                    onChange={(e) => setAbonoFormData({ ...abonoFormData, amount: parseFloat(e.target.value) })}
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
                    <option value="DOP">Pesos Dominicanos (DOP)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
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
                  <div className="col-span-2">
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
                <div className="col-span-2">
                  <Label>Notas</Label>
                  <textarea
                    value={abonoFormData.notes}
                    onChange={(e) => setAbonoFormData({ ...abonoFormData, notes: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    rows="2"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button type="submit">Agregar Abono</Button>
              </div>
            </form>

            {/* Abonos List */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Historial de Abonos ({abonos.length})</h3>
              {abonos.length > 0 ? (
                <div className="space-y-2">
                  {abonos.map((abono) => (
                    <div key={abono.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <span className="font-semibold">
                            {formatCurrency(abono.amount, abono.currency)}
                          </span>
                          <span className="text-sm text-gray-600">
                            {new Date(abono.payment_date).toLocaleDateString('es-DO')}
                          </span>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {abono.payment_method}
                          </span>
                          {abono.invoice_number && (
                            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded font-mono">
                              Factura #{abono.invoice_number}
                            </span>
                          )}
                        </div>
                        {abono.notes && (
                          <p className="text-sm text-gray-500 mt-1">{abono.notes}</p>
                        )}
                      </div>
                      {user?.role === 'admin' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAbono(abono.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X size={16} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No hay abonos registrados</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Expenses;
