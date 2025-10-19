import React, { useState, useEffect } from 'react';
import { 
  getVillas, getCategories, createVilla, updateVilla, deleteVilla,
  getExtraServices, createExtraService, updateExtraService, deleteExtraService
} from '../api/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Edit, Trash2, Building, ChevronDown, ChevronUp, Search, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const VillasManagementNew = () => {
  const { user } = useAuth();
  const [itemType, setItemType] = useState('villa'); // 'villa' o 'service'
  const [villas, setVillas] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVilla, setEditingVilla] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedVillas, setExpandedVillas] = useState({});
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    phone: '',
    category_id: '',
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

  const [serviceFormData, setServiceFormData] = useState({
    service_name: '',
    description: '',
    unit_price: 0,
    currency: 'DOP',
    category: 'otros',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [villasResponse, categoriesResponse] = await Promise.all([
        getVillas(),
        getCategories()
      ]);
      setVillas(villasResponse.data);
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
      if (editingVilla) {
        await updateVilla(editingVilla.id, formData);
      } else {
        await createVilla(formData);
      }
      await fetchData();
      setIsFormOpen(false);
      resetForm();
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
      category_id: villa.category_id || '',
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
        await fetchData();
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
      category_id: '',
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

  const toggleExpand = (villaId) => {
    setExpandedVillas(prev => ({
      ...prev,
      [villaId]: !prev[villaId]
    }));
  };

  const formatCurrency = (amount) => {
    return `RD$ ${new Intl.NumberFormat('es-DO').format(amount)}`;
  };

  // Filtrar villas por búsqueda
  const filteredVillas = villas.filter(v => 
    v.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    categories.find(c => c.id === v.category_id)?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupar villas por categoría
  const groupedVillas = {};
  filteredVillas.forEach(villa => {
    const categoryId = villa.category_id || 'sin_categoria';
    if (!groupedVillas[categoryId]) {
      groupedVillas[categoryId] = [];
    }
    groupedVillas[categoryId].push(villa);
  });

  // Ordenar categorías alfabéticamente
  const sortedCategories = [
    ...categories.filter(c => groupedVillas[c.id]),
    { id: 'sin_categoria', name: 'Sin Categoría' }
  ].filter(c => groupedVillas[c.id]);

  const isAdmin = user?.role === 'admin';

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Gestión de Villas</h2>
          <p className="text-gray-500 mt-1">Administra las villas y sus precios</p>
        </div>
        {isAdmin && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
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
                    />
                  </div>
                  <div>
                    <Label>Nombre (Interno) *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Villa Sabrina"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Categoría</Label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">Sin categoría</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
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
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Teléfono del Propietario (Opcional)</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="829-123-4567"
                    />
                  </div>

                  {/* HORARIOS */}
                  <div className="col-span-2 bg-purple-50 p-4 rounded-md border-2 border-purple-200">
                    <h3 className="font-bold text-lg mb-3 text-purple-800">🕐 Horario Por Defecto</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Hora de Entrada *</Label>
                        <Input
                          value={formData.default_check_in_time}
                          onChange={(e) => setFormData({ ...formData, default_check_in_time: e.target.value })}
                          placeholder="9:00 AM"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Hora de Salida *</Label>
                        <Input
                          value={formData.default_check_out_time}
                          onChange={(e) => setFormData({ ...formData, default_check_out_time: e.target.value })}
                          placeholder="8:00 PM"
                          required
                        />
                      </div>
                    </div>
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
                        />
                      </div>
                    </div>
                  </div>

                  {/* PRECIOS AL PROPIETARIO - Solo Admin */}
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
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Máximo de Huéspedes</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.max_guests}
                      onChange={(e) => setFormData({ ...formData, max_guests: parseInt(e.target.value) || 0 })}
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
                  <Button type="submit">
                    {editingVilla ? 'Actualizar Villa' : 'Guardar Villa'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Buscador */}
      <div className="flex items-center space-x-2">
        <Search className="text-gray-400" size={20} />
        <Input
          placeholder="Buscar por código, nombre o categoría..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Villas agrupadas por categoría */}
      <div className="space-y-6">
        {sortedCategories.map((category) => (
          <Card key={category.id}>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
              <CardTitle className="flex items-center">
                <Building className="mr-2 text-blue-600" size={24} />
                <span className="text-xl">{category.name}</span>
                <span className="ml-2 text-sm text-gray-500">({groupedVillas[category.id].length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {groupedVillas[category.id].map((villa) => {
                  const isExpanded = expandedVillas[villa.id];
                  return (
                    <div key={villa.id} className="hover:bg-gray-50 transition-colors">
                      {/* Vista compacta */}
                      <div
                        className="p-4 cursor-pointer flex items-center justify-between"
                        onClick={() => toggleExpand(villa.id)}
                      >
                        <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                          <div>
                            <span className="font-bold text-blue-600">{villa.code}</span>
                            <p className="text-xs text-gray-500">{villa.name}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Precio Cliente</p>
                            <p className="text-sm text-gray-700">{formatCurrency(villa.default_price_pasadia)}</p>
                          </div>
                          {isAdmin && (
                            <div>
                              <p className="text-sm font-medium">Pago Propietario</p>
                              <p className="text-sm text-green-600 font-semibold">{formatCurrency(villa.owner_price_pasadia)}</p>
                            </div>
                          )}
                          <div className="flex items-center justify-end space-x-2">
                            {isAdmin && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(villa);
                                  }}
                                >
                                  <Edit size={14} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(villa.id);
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </>
                            )}
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                        </div>
                      </div>

                      {/* Vista expandida */}
                      {isExpanded && (
                        <div className="px-4 pb-4 bg-gray-50 border-t">
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                              <p className="text-xs text-gray-500 font-medium mb-1">DESCRIPCIÓN:</p>
                              <p className="text-sm text-gray-700">{villa.description}</p>
                            </div>
                            {villa.phone && (
                              <div>
                                <p className="text-xs text-gray-500 font-medium mb-1">TELÉFONO:</p>
                                <p className="text-sm text-gray-700">{villa.phone}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-gray-500 font-medium mb-1">HORARIOS:</p>
                              <p className="text-sm text-gray-700">{villa.default_check_in_time} - {villa.default_check_out_time}</p>
                            </div>
                            {villa.max_guests > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 font-medium mb-1">CAPACIDAD:</p>
                                <p className="text-sm text-gray-700">{villa.max_guests} personas</p>
                              </div>
                            )}
                          </div>

                          {/* Precios detallados */}
                          <div className="grid grid-cols-2 gap-4 mt-4">
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

                            {isAdmin && (
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
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredVillas.length === 0 && (
          <div className="text-center py-12">
            <Building size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No hay villas que coincidan con la búsqueda</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VillasManagementNew;
