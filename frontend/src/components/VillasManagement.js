import React, { useState, useEffect } from 'react';
import { getVillas, createVilla, updateVilla, deleteVilla } from '../api/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Edit, Trash2, Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const VillasManagement = () => {
  const { user } = useAuth();
  const [villas, setVillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVilla, setEditingVilla] = useState(null);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    phone: '',
    default_check_in_time: '9:00 AM',
    default_check_out_time: '8:00 PM',
    default_price_pasadia: 0,
    default_price_amanecida: 0,
    default_price_evento: 0,
    owner_price_pasadia: 0,
    owner_price_amanecida: 0,
    owner_price_evento: 0,
    max_guests: 0,
    amenities: [],
    is_active: true
  });

  useEffect(() => {
    fetchVillas();
  }, []);

  const fetchVillas = async () => {
    try {
      const response = await getVillas();
      setVillas(response.data);
    } catch (err) {
      setError('Error al cargar villas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (editingVilla) {
        await updateVilla(editingVilla.id, formData);
      } else {
        await createVilla(formData);
      }
      await fetchVillas();
      setIsFormOpen(false);
      resetForm();
      alert('Villa guardada exitosamente');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar villa');
    }
  };

  const handleEdit = (villa) => {
    setEditingVilla(villa);
    setFormData({
      code: villa.code,
      name: villa.name,
      description: villa.description || '',
      phone: villa.phone || '',
      default_check_in_time: villa.default_check_in_time || '9:00 AM',
      default_check_out_time: villa.default_check_out_time || '8:00 PM',
      default_price_pasadia: villa.default_price_pasadia || 0,
      default_price_amanecida: villa.default_price_amanecida || 0,
      default_price_evento: villa.default_price_evento || 0,
      owner_price_pasadia: villa.owner_price_pasadia || 0,
      owner_price_amanecida: villa.owner_price_amanecida || 0,
      owner_price_evento: villa.owner_price_evento || 0,
      max_guests: villa.max_guests || 0,
      amenities: villa.amenities || [],
      is_active: villa.is_active !== false
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta villa?')) {
      try {
        await deleteVilla(id);
        await fetchVillas();
      } catch (err) {
        setError('Error al eliminar villa');
      }
    }
  };

  const resetForm = () => {
    setEditingVilla(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      phone: '',
      default_check_in_time: '9:00 AM',
      default_check_out_time: '8:00 PM',
      default_price_pasadia: 0,
      default_price_amanecida: 0,
      default_price_evento: 0,
      owner_price_pasadia: 0,
      owner_price_amanecida: 0,
      owner_price_evento: 0,
      max_guests: 0,
      amenities: [],
      is_active: true
    });
  };

  const formatCurrency = (amount) => {
    return `RD$ ${new Intl.NumberFormat('es-DO').format(amount)}`;
  };

  if (loading) {
    return <div className="text-center py-8" data-testid="villas-loading">Cargando...</div>;
  }

  return (
    <div className="space-y-6" data-testid="villas-page">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Gestión de Villas</h2>
          <p className="text-gray-500 mt-1">Administra las villas y sus precios</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} data-testid="add-villa-button">
              <Plus className="mr-2 h-4 w-4" /> Nueva Villa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingVilla ? 'Editar Villa' : 'Nueva Villa'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Código de Villa *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="ECPVSH"
                    required
                    data-testid="villa-code-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">Ejemplo: ECPVSH, ECPVWLSL</p>
                </div>
                <div>
                  <Label>Nombre (Interno) *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Villa Sabrina"
                    required
                    data-testid="villa-name-input"
                  />
                </div>

                <div className="col-span-2">
                  <Label>Descripción de la Villa *</Label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    rows="3"
                    placeholder="Piscina, Jacuzzi, BBQ, Gazebo, etc."
                    required
                    data-testid="villa-description-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">Esta descripción aparecerá en la factura</p>
                </div>

                <div className="col-span-2">
                  <Label>Teléfono del Propietario (Opcional)</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="829-123-4567"
                    data-testid="villa-phone-input"
                  />
                </div>

                {/* PRECIOS AL CLIENTE */}
                <div className="col-span-2 bg-blue-50 p-4 rounded-md border-2 border-blue-200">
                  <h3 className="font-bold text-lg mb-3 text-blue-800">💰 Precios al Cliente</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-sm">Pasadía *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.default_price_pasadia}
                        onChange={(e) => setFormData({ ...formData, default_price_pasadia: parseFloat(e.target.value) || 0 })}
                        required
                        data-testid="price-pasadia-input"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Amanecida *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.default_price_amanecida}
                        onChange={(e) => setFormData({ ...formData, default_price_amanecida: parseFloat(e.target.value) || 0 })}
                        required
                        data-testid="price-amanecida-input"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Evento *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.default_price_evento}
                        onChange={(e) => setFormData({ ...formData, default_price_evento: parseFloat(e.target.value) || 0 })}
                        required
                        data-testid="price-evento-input"
                      />
                    </div>
                  </div>
                </div>

                {/* PRECIOS AL PROPIETARIO */}
                <div className="col-span-2 bg-green-50 p-4 rounded-md border-2 border-green-200">
                  <h3 className="font-bold text-lg mb-3 text-green-800">💵 Pago al Propietario</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-sm">Pasadía *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.owner_price_pasadia}
                        onChange={(e) => setFormData({ ...formData, owner_price_pasadia: parseFloat(e.target.value) || 0 })}
                        required
                        data-testid="owner-price-pasadia-input"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Amanecida *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.owner_price_amanecida}
                        onChange={(e) => setFormData({ ...formData, owner_price_amanecida: parseFloat(e.target.value) || 0 })}
                        required
                        data-testid="owner-price-amanecida-input"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Evento *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.owner_price_evento}
                        onChange={(e) => setFormData({ ...formData, owner_price_evento: parseFloat(e.target.value) || 0 })}
                        required
                        data-testid="owner-price-evento-input"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">Este es el monto que debes pagar al propietario de la villa</p>
                </div>

                <div>
                  <Label>Máximo de Huéspedes</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.max_guests}
                    onChange={(e) => setFormData({ ...formData, max_guests: parseInt(e.target.value) || 0 })}
                    data-testid="max-guests-input"
                  />
                </div>

                <div>
                  <Label>Estado</Label>
                  <select
                    value={formData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="active">Activa</option>
                    <option value="inactive">Inactiva</option>
                  </select>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" data-testid="save-villa-button">
                  {editingVilla ? 'Actualizar Villa' : 'Guardar Villa'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {villas.length > 0 ? (
          villas.map((villa) => (
            <Card key={villa.id} data-testid={`villa-card-${villa.id}`} className="hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Building className="mr-2 text-blue-600" size={24} />
                    <span className="text-xl font-bold text-blue-900">{villa.code}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${villa.is_active ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                    {villa.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </CardTitle>
                <p className="text-sm text-gray-600">{villa.name}</p>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">DESCRIPCIÓN:</p>
                  <p className="text-sm text-gray-700">{villa.description}</p>
                </div>

                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-xs font-bold text-blue-800 mb-2">PRECIOS AL CLIENTE:</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Pasadía:</span>
                      <span className="font-semibold">{formatCurrency(villa.default_price_pasadia)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amanecida:</span>
                      <span className="font-semibold">{formatCurrency(villa.default_price_amanecida)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Evento:</span>
                      <span className="font-semibold">{formatCurrency(villa.default_price_evento)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded-md">
                  <p className="text-xs font-bold text-green-800 mb-2">PAGO AL PROPIETARIO:</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Pasadía:</span>
                      <span className="font-semibold">{formatCurrency(villa.owner_price_pasadia)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amanecida:</span>
                      <span className="font-semibold">{formatCurrency(villa.owner_price_amanecida)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Evento:</span>
                      <span className="font-semibold">{formatCurrency(villa.owner_price_evento)}</span>
                    </div>
                  </div>
                </div>

                {villa.max_guests > 0 && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Máx. Huéspedes:</span> {villa.max_guests}
                  </div>
                )}

                {villa.phone && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Tel:</span> {villa.phone}
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(villa)}
                    className="flex-1"
                    data-testid="edit-villa-button"
                  >
                    <Edit size={14} className="mr-1" /> Editar
                  </Button>
                  {user?.role === 'admin' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(villa.id)}
                      className="text-red-600 hover:text-red-700 hover:border-red-600"
                      data-testid="delete-villa-button"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Building size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No hay villas registradas</p>
            <p className="text-gray-400 text-sm mt-2">Haz clic en "Nueva Villa" para agregar una</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VillasManagement;
