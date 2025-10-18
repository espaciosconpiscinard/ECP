import React, { useState, useEffect } from 'react';
import { getDashboardStats } from '../api/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { DollarSign, FileText, AlertCircle, Building, TrendingUp, TrendingDown } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await getDashboardStats();
      setStats(response.data);
    } catch (err) {
      setError('Error al cargar estadísticas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency) => {
    const formatted = new Intl.NumberFormat('es-DO').format(amount);
    return currency === 'DOP' ? `RD$ ${formatted}` : `$ ${formatted}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="dashboard-loading">
        <p className="text-gray-500">Cargando estadísticas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="dashboard-error">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">Resumen general de tu negocio</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="total-reservations-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Reservaciones
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_reservations || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="pending-payments-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pagos Pendientes
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_reservations || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="total-owners-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Propietarios
            </CardTitle>
            <Building className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_owners || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="revenue-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Ingresos Totales
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-lg font-bold">
                {formatCurrency(stats?.total_revenue_dop || 0, 'DOP')}
              </div>
              <div className="text-sm text-gray-500">
                {formatCurrency(stats?.total_revenue_usd || 0, 'USD')}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue and Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="pending-payments-detail-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-orange-600" />
              Pagos Pendientes de Cobrar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pesos Dominicanos:</span>
                <span className="font-semibold text-lg">
                  {formatCurrency(stats?.pending_payments_dop || 0, 'DOP')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Dólares:</span>
                <span className="font-semibold text-lg">
                  {formatCurrency(stats?.pending_payments_usd || 0, 'USD')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="expenses-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingDown className="mr-2 h-5 w-5 text-red-600" />
              Gastos Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pesos Dominicanos:</span>
                <span className="font-semibold text-lg">
                  {formatCurrency(stats?.total_expenses_dop || 0, 'DOP')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Dólares:</span>
                <span className="font-semibold text-lg">
                  {formatCurrency(stats?.total_expenses_usd || 0, 'USD')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reservations */}
      <Card data-testid="recent-reservations-card">
        <CardHeader>
          <CardTitle>Reservaciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recent_reservations?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-sm font-medium text-gray-600">Factura</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-600">Cliente</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-600">Villa</th>
                    <th className="text-right p-2 text-sm font-medium text-gray-600">Total</th>
                    <th className="text-right p-2 text-sm font-medium text-gray-600">Restante</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_reservations.map((res) => (
                    <tr key={res.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-sm">{res.invoice_number}</td>
                      <td className="p-2 text-sm">{res.customer_name}</td>
                      <td className="p-2 text-sm">{res.villa_name}</td>
                      <td className="p-2 text-sm text-right">
                        {formatCurrency(res.total_amount, res.currency)}
                      </td>
                      <td className="p-2 text-sm text-right font-medium">
                        <span className={res.balance_due > 0 ? 'text-orange-600' : 'text-green-600'}>
                          {formatCurrency(res.balance_due, res.currency)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No hay reservaciones recientes</p>
          )}
        </CardContent>
      </Card>

      {/* Pending Payments */}
      {stats?.pending_payment_reservations?.length > 0 && (
        <Card data-testid="pending-reservations-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-orange-600" />
              Reservaciones con Pagos Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-sm font-medium text-gray-600">Factura</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-600">Cliente</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-600">Villa</th>
                    <th className="text-right p-2 text-sm font-medium text-gray-600">Total</th>
                    <th className="text-right p-2 text-sm font-medium text-gray-600">Pagado</th>
                    <th className="text-right p-2 text-sm font-medium text-gray-600">Restante</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.pending_payment_reservations.map((res) => (
                    <tr key={res.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-sm">{res.invoice_number}</td>
                      <td className="p-2 text-sm">{res.customer_name}</td>
                      <td className="p-2 text-sm">{res.villa_name}</td>
                      <td className="p-2 text-sm text-right">
                        {formatCurrency(res.total_amount, res.currency)}
                      </td>
                      <td className="p-2 text-sm text-right">
                        {formatCurrency(res.amount_paid, res.currency)}
                      </td>
                      <td className="p-2 text-sm text-right font-medium text-orange-600">
                        {formatCurrency(res.balance_due, res.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
