import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function Commissions() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [filteredCommissions, setFilteredCommissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingCommission, setEditingCommission] = useState(null);
  const [editAmount, setEditAmount] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedFortnight, setSelectedFortnight] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('pending'); // pending, paid, all
  const [showDeletedInvoices, setShowDeletedInvoices] = useState(false); // Nuevo filtro
  
  // Estados para selección múltiple
  const [selectedCommissions, setSelectedCommissions] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    fetchCommissions();
    fetchStats();
  }, []);

  useEffect(() => {
    // Filtrar comisiones por usuario, mes, quincena y estado
    let filtered = commissions;
    
    // Filtro por facturas eliminadas
    if (showDeletedInvoices) {
      filtered = filtered.filter(c => c.invoice_deleted === true);
    } else {
      filtered = filtered.filter(c => !c.invoice_deleted);
    }
    
    // Filtro por estado (pendientes/pagadas/todas)
    if (selectedStatus === 'pending') {
      filtered = filtered.filter(c => !c.paid);
    } else if (selectedStatus === 'paid') {
      filtered = filtered.filter(c => c.paid);
    }
    // Si es 'all', no filtramos
    
    // Filtro por usuario
    if (selectedUser !== 'all') {
      filtered = filtered.filter(c => c.user_id === selectedUser);
    }
    
    // Filtro por mes
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(c => {
        if (!c.reservation_date) return false;
        const reservationMonth = c.reservation_date.substring(0, 7); // YYYY-MM
        return reservationMonth === selectedMonth;
      });
    }
    
    // Filtro por quincena (usa reservation_date, NO created_at)
    if (selectedFortnight !== 'all') {
      filtered = filtered.filter(c => {
        if (!c.reservation_date) return false;
        const day = parseInt(c.reservation_date.split('-')[2]);
        
        if (selectedFortnight === '1') {
          return day >= 1 && day <= 14;
        } else if (selectedFortnight === '2') {
          return day >= 15 && day <= 31;
        }
        return true;
      });
    }
    
    setFilteredCommissions(filtered);
  }, [selectedUser, selectedMonth, selectedFortnight, selectedStatus, commissions, showDeletedInvoices]);

  const fetchCommissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/commissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Error al cargar comisiones');
      
      const data = await response.json();
      setCommissions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/commissions/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Error al cargar estadísticas');
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error stats:', err);
    }
  };

  const handleEdit = (commission) => {
    setEditingCommission(commission.id);
    setEditAmount(commission.amount);
    setEditNotes(commission.notes || '');
  };

  const handleSave = async (commissionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/commissions/${commissionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(editAmount),
          notes: editNotes
        })
      });

      if (!response.ok) throw new Error('Error al actualizar comisión');

      await fetchCommissions();
      await fetchStats();
      setEditingCommission(null);
      alert('✅ Comisión actualizada');
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  const handleDelete = async (commissionId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta comisión?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/commissions/${commissionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Error al eliminar comisión');

      await fetchCommissions();
      await fetchStats();
      alert('✅ Comisión eliminada');
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  const handleTogglePaid = async (commissionId, currentPaidStatus) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = currentPaidStatus ? 'mark-unpaid' : 'mark-paid';
      
      const response = await fetch(`${API_URL}/api/commissions/${commissionId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Error al actualizar estado de pago');

      await fetchCommissions();
      await fetchStats();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  // Funciones de selección múltiple
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCommissions([]);
      setSelectAll(false);
    } else {
      setSelectedCommissions(filteredCommissions.map(c => c.id));
      setSelectAll(true);
    }
  };

  const handleSelectCommission = (commissionId) => {
    if (selectedCommissions.includes(commissionId)) {
      setSelectedCommissions(selectedCommissions.filter(id => id !== commissionId));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedCommissions, commissionId];
      setSelectedCommissions(newSelected);
      if (newSelected.length === filteredCommissions.length) {
        setSelectAll(true);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCommissions.length === 0) {
      alert('Por favor selecciona al menos una comisión');
      return;
    }

    if (!window.confirm(`¿Eliminar ${selectedCommissions.length} comisión(es) seleccionada(s)?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      for (const commissionId of selectedCommissions) {
        await fetch(`${API_URL}/api/commissions/${commissionId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      await fetchCommissions();
      await fetchStats();
      setSelectedCommissions([]);
      setSelectAll(false);
      alert(`✅ ${selectedCommissions.length} comisión(es) eliminada(s)`);
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  const handleBulkMarkPaid = async () => {
    if (selectedCommissions.length === 0) {
      alert('Por favor selecciona al menos una comisión');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      for (const commissionId of selectedCommissions) {
        await fetch(`${API_URL}/api/commissions/${commissionId}/mark-paid`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      await fetchCommissions();
      await fetchStats();
      setSelectedCommissions([]);
      setSelectAll(false);
      alert(`✅ ${selectedCommissions.length} comisión(es) marcada(s) como pagada(s)`);
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  const handleBulkMarkUnpaid = async () => {
    if (selectedCommissions.length === 0) {
      alert('Por favor selecciona al menos una comisión');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      for (const commissionId of selectedCommissions) {
        await fetch(`${API_URL}/api/commissions/${commissionId}/mark-unpaid`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      await fetchCommissions();
      await fetchStats();
      setSelectedCommissions([]);
      setSelectAll(false);
      alert(`✅ ${selectedCommissions.length} comisión(es) marcada(s) como no pagada(s)`);
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 font-semibold">⚠️ Solo administradores pueden ver las comisiones</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Cargando comisiones...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Comisiones de Empleados</h2>
        <p className="text-gray-500 mt-1">Seguimiento automático de comisiones por reservaciones</p>
      </div>

      {/* Cards por Usuario (Acumulado Individual) */}
      {stats?.by_user && stats.by_user.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-3">👥 Comisiones por Empleado - Control de Pagos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.by_user.map((userStat) => (
              <div key={userStat.user_id} className="bg-gradient-to-br from-blue-50 to-purple-50 p-5 rounded-lg border-2 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                    {userStat.user_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-lg">{userStat.user_name}</p>
                    <p className="text-xs text-gray-600">{userStat.commission_count} comisiones</p>
                  </div>
                </div>
                
                {/* Total */}
                <div className="bg-white p-3 rounded border border-blue-300 mb-2">
                  <p className="text-xs text-gray-600 mb-1">💰 Total Comisiones</p>
                  <p className="text-xl font-bold text-blue-700">
                    RD$ {userStat.total_commissions?.toLocaleString()}
                  </p>
                </div>
                
                {/* Pagado y Pendiente */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 p-2 rounded border border-green-300">
                    <p className="text-xs text-green-700 mb-1">✅ Pagado</p>
                    <p className="text-sm font-bold text-green-800">
                      RD$ {userStat.total_paid?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-gray-600">{userStat.paid_count || 0}</p>
                  </div>
                  <div className="bg-orange-50 p-2 rounded border border-orange-300">
                    <p className="text-xs text-orange-700 mb-1">⏳ Pendiente</p>
                    <p className="text-sm font-bold text-orange-800">
                      RD$ {userStat.total_pending?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-gray-600">{userStat.pending_count || 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estadísticas Generales */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
            <p className="text-sm text-blue-600 font-medium">💰 Total Comisiones</p>
            <p className="text-2xl font-bold text-blue-900">RD$ {stats.total_commissions?.toLocaleString()}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
            <p className="text-sm text-green-600 font-medium">✅ Total Pagado</p>
            <p className="text-2xl font-bold text-green-900">RD$ {stats.total_paid?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
            <p className="text-sm text-orange-600 font-medium">⏳ Total Pendiente</p>
            <p className="text-2xl font-bold text-orange-900">RD$ {stats.total_pending?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
            <p className="text-sm text-purple-600 font-medium">👥 Empleados</p>
            <p className="text-2xl font-bold text-purple-900">{stats.by_user?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Tabla de comisiones */}
      <div className="bg-white rounded-lg shadow overflow-hidden border">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-xl font-bold mb-4">📋 Historial de Comisiones</h3>
          
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Filtro por Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">🔵 Estado:</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="pending">⏳ Pendientes</option>
                <option value="paid">✅ Pagadas</option>
                <option value="all">📋 Todas</option>
              </select>
            </div>

            {/* Filtro por Usuario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">👤 Empleado:</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="all">Todos los empleados</option>
                {stats?.by_user?.map((userStat) => (
                  <option key={userStat.user_id} value={userStat.user_id}>
                    {userStat.user_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Mes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">📅 Mes (fecha reserva):</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="all">Todos los meses</option>
                <option value="2025-01">Enero 2025</option>
                <option value="2025-02">Febrero 2025</option>
                <option value="2025-03">Marzo 2025</option>
                <option value="2025-04">Abril 2025</option>
                <option value="2025-05">Mayo 2025</option>
                <option value="2025-06">Junio 2025</option>
                <option value="2025-07">Julio 2025</option>
                <option value="2025-08">Agosto 2025</option>
                <option value="2025-09">Septiembre 2025</option>
                <option value="2025-10">Octubre 2025</option>
                <option value="2025-11">Noviembre 2025</option>
                <option value="2025-12">Diciembre 2025</option>
                <option value="2024-12">Diciembre 2024</option>
                <option value="2024-11">Noviembre 2024</option>
                <option value="2024-10">Octubre 2024</option>
              </select>
            </div>

            {/* Filtro por Quincena */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">🗓️ Quincena (fecha reserva):</label>
              <select
                value={selectedFortnight}
                onChange={(e) => setSelectedFortnight(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="all">Todas</option>
                <option value="1">1ra Quincena (1-14) - Pago día 15</option>
                <option value="2">2da Quincena (15-31) - Pago día 30</option>
              </select>
            </div>
          </div>
          
          {/* Checkbox para Facturas Eliminadas */}
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDeletedInvoices}
                onChange={(e) => setShowDeletedInvoices(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <span className="text-sm font-medium text-gray-700">
                🗑️ Mostrar solo comisiones de facturas eliminadas
              </span>
            </label>
          </div>

          {/* Resumen de filtros activos */}
          <div className="mt-3 flex flex-wrap gap-2">
            {showDeletedInvoices && (
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                🗑️ Facturas Eliminadas
                <button onClick={() => setShowDeletedInvoices(false)} className="ml-2 text-red-600 hover:text-red-800">✕</button>
              </span>
            )}
            {selectedStatus !== 'pending' && (
              <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-medium">
                🔵 {selectedStatus === 'paid' ? '✅ Pagadas' : '📋 Todas'}
                <button onClick={() => setSelectedStatus('pending')} className="ml-2 text-teal-600 hover:text-teal-800">✕</button>
              </span>
            )}
            {selectedUser !== 'all' && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                👤 {stats?.by_user?.find(u => u.user_id === selectedUser)?.user_name}
                <button onClick={() => setSelectedUser('all')} className="ml-2 text-blue-600 hover:text-blue-800">✕</button>
              </span>
            )}
            {selectedMonth !== 'all' && (
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                📅 {selectedMonth}
                <button onClick={() => setSelectedMonth('all')} className="ml-2 text-purple-600 hover:text-purple-800">✕</button>
              </span>
            )}
            {selectedFortnight !== 'all' && (
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                🗓️ {selectedFortnight === '1' ? '1ra Quincena (1-14)' : '2da Quincena (15-31)'}
                <button onClick={() => setSelectedFortnight('all')} className="ml-2 text-orange-600 hover:text-orange-800">✕</button>
              </span>
            )}
            {(selectedStatus !== 'pending' || selectedUser !== 'all' || selectedMonth !== 'all' || selectedFortnight !== 'all' || showDeletedInvoices) && (
              <button
                onClick={() => {
                  setSelectedStatus('pending');
                  setSelectedUser('all');
                  setSelectedMonth('all');
                  setSelectedFortnight('all');
                  setShowDeletedInvoices(false);
                }}
                className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm hover:bg-red-200"
              >
                🗑️ Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Botones de acción masiva */}
        {selectedCommissions.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-blue-900">
                {selectedCommissions.length} comisión(es) seleccionada(s)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkMarkPaid}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  ✓ Marcar como Pagadas
                </button>
                <button
                  onClick={handleBulkMarkUnpaid}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                >
                  ⏳ Marcar como No Pagadas
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200 text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="h-4 w-4 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pagado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Reserva</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Villa</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    {selectedUser === 'all' && selectedMonth === 'all' && selectedFortnight === 'all'
                      ? 'No hay comisiones registradas' 
                      : 'No hay comisiones con los filtros seleccionados'}
                  </td>
                </tr>
              ) : (
                filteredCommissions.map((commission) => (
                  <tr key={commission.id} className={`hover:bg-gray-50 ${commission.paid ? 'bg-green-50' : commission.invoice_deleted ? 'bg-red-50' : 'bg-white'}`}>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCommissions.includes(commission.id)}
                        onChange={() => handleSelectCommission(commission.id)}
                        className="h-4 w-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {commission.invoice_deleted ? (
                        <div>
                          <span className="inline-block px-2 py-1 bg-red-600 text-white rounded text-xs font-bold mb-1">
                            🗑️ FACTURA ELIMINADA
                          </span>
                          {commission.invoice_deleted_date && (
                            <p className="text-xs text-red-600">
                              {new Date(commission.invoice_deleted_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : commission.paid ? (
                        <div>
                          <span className="inline-block px-2 py-1 bg-green-600 text-white rounded text-xs font-bold mb-1">
                            ✅ PAGADO
                          </span>
                          {commission.paid_date && (
                            <p className="text-xs text-green-600">
                              {new Date(commission.paid_date).toLocaleDateString()}
                            </p>
                          )}
                          <button
                            onClick={() => {
                              if (window.confirm('¿Revertir a NO PAGADO?')) {
                                handleTogglePaid(commission.id, commission.paid);
                              }
                            }}
                            className="mt-1 px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
                          >
                            Revertir
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (window.confirm('¿Marcar esta comisión como PAGADA?')) {
                              handleTogglePaid(commission.id, commission.paid);
                            }
                          }}
                          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm"
                        >
                          💰 Marcar Pagado
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {commission.reservation_date}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {commission.user_name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-semibold text-blue-600">{commission.villa_code}</span>
                      <p className="text-xs text-gray-500">{commission.villa_name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {commission.customer_name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {editingCommission === commission.id ? (
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-24 px-2 py-1 border rounded text-sm"
                        />
                      ) : (
                        <span className="font-bold text-green-700">
                          RD$ {commission.amount?.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {editingCommission === commission.id ? (
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                          placeholder="Notas..."
                        />
                      ) : (
                        commission.notes || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {editingCommission === commission.id ? (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleSave(commission.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                          >
                            ✓ Guardar
                          </button>
                          <button
                            onClick={() => setEditingCommission(null)}
                            className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-xs"
                          >
                            ✕ Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(commission)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDelete(commission.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Commissions;
