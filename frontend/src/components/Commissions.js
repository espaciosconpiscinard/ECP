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

  useEffect(() => {
    fetchCommissions();
    fetchStats();
  }, []);

  useEffect(() => {
    // Filtrar comisiones por usuario seleccionado
    if (selectedUser === 'all') {
      setFilteredCommissions(commissions);
    } else {
      setFilteredCommissions(commissions.filter(c => c.user_id === selectedUser));
    }
  }, [selectedUser, commissions]);

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
          <h3 className="text-xl font-bold mb-3">👥 Comisiones Acumuladas por Empleado</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.by_user.map((userStat) => (
              <div key={userStat.user_id} className="bg-gradient-to-br from-blue-50 to-purple-50 p-5 rounded-lg border-2 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                    {userStat.user_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-lg">{userStat.user_name}</p>
                    <p className="text-xs text-gray-600">{userStat.commission_count} reservaciones</p>
                  </div>
                </div>
                <div className="bg-white p-3 rounded border border-blue-300">
                  <p className="text-xs text-gray-600 mb-1">Total Acumulado</p>
                  <p className="text-2xl font-bold text-blue-700">
                    RD$ {userStat.total_commissions?.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estadísticas Generales */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
            <p className="text-sm text-blue-600 font-medium">Total General Comisiones</p>
            <p className="text-2xl font-bold text-blue-900">RD$ {stats.total_commissions?.toLocaleString()}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
            <p className="text-sm text-green-600 font-medium">Total Reservaciones</p>
            <p className="text-2xl font-bold text-green-900">{stats.total_count}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
            <p className="text-sm text-purple-600 font-medium">Empleados con Comisiones</p>
            <p className="text-2xl font-bold text-purple-900">{stats.by_user?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Tabla de comisiones */}
      <div className="bg-white rounded-lg shadow overflow-hidden border">
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">📋 Historial de Comisiones</h3>
            
            {/* Filtro por Usuario */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Filtrar por empleado:</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="all">Todos los empleados</option>
                {stats?.by_user?.map((userStat) => (
                  <option key={userStat.user_id} value={userStat.user_id}>
                    {userStat.user_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200 text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
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
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    {selectedUser === 'all' 
                      ? 'No hay comisiones registradas' 
                      : 'Este empleado no tiene comisiones registradas'}
                  </td>
                </tr>
              ) : (
                filteredCommissions.map((commission) => (
                  <tr key={commission.id} className="hover:bg-gray-50">
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
