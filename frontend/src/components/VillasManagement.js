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
  
  // Estados para selección múltiple
  const [selectedVillas, setSelectedVillas] = useState([]);
  const [selectAllVillas, setSelectAllVillas] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectAllServices, setSelectAllServices] = useState(false);
  
  // Estados para precios flexibles - sin rangos de personas, solo listas ordenadas
  const [flexiblePrices, setFlexiblePrices] = useState({
    pasadia: [],
    amanecida: [],
    evento: []
  });
  
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
    is_active: true,
    use_flexible_pricing: false,
    flexible_prices: { pasadia: [], amanecida: [], evento: [] }
  });

  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    description: '',
    default_price: 0,
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [villasResponse, categoriesResponse, servicesResponse] = await Promise.all([
        getVillas(),
        getCategories(),
        getExtraServices()
      ]);
      setVillas(villasResponse.data);
      setCategories(categoriesResponse.data);
      setServices(servicesResponse.data);
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
      // Actualizar formData con los precios flexibles antes de guardar
      const dataToSave = {
        ...formData,
        flexible_prices: flexiblePrices
      };
      
      if (editingVilla) {
        await updateVilla(editingVilla.id, dataToSave);
        alert('✅ Villa actualizada exitosamente');
        setIsFormOpen(false);
        resetForm();
      } else {
        await createVilla(dataToSave);
        alert('✅ Villa agregada exitosamente. Puedes agregar otra villa.');
        // NO cerrar el formulario - mantenerlo abierto para agregar más
        // setIsFormOpen(false);
        resetForm();
      }
      await fetchData();
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
      is_active: villa.is_active !== false,
      use_flexible_pricing: villa.use_flexible_pricing || false,
      flexible_prices: villa.flexible_prices || { pasadia: [], amanecida: [], evento: [] }
    });
    setFlexiblePrices(villa.flexible_prices || { pasadia: [], amanecida: [], evento: [] });
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
      is_active: true,
      use_flexible_pricing: false,
      flexible_prices: { pasadia: [], amanecida: [], evento: [] }
    });
    setFlexiblePrices({ pasadia: [], amanecida: [], evento: [] });
  };

  // ============ FLEXIBLE PRICING FUNCTIONS ============
  const handleAddFlexiblePrice = (rentalType) => {
    const newPrice = { client_price: 0, owner_price: 0 };
    setFlexiblePrices({
      ...flexiblePrices,
      [rentalType]: [...flexiblePrices[rentalType], newPrice]
    });
  };

  const handleRemoveFlexiblePrice = (rentalType, index) => {
    const updated = flexiblePrices[rentalType].filter((_, i) => i !== index);
    setFlexiblePrices({
      ...flexiblePrices,
      [rentalType]: updated
    });
  };

  const handleUpdateFlexiblePrice = (rentalType, index, field, value) => {
    const updated = [...flexiblePrices[rentalType]];
    updated[index][field] = parseFloat(value) || 0;
    setFlexiblePrices({
      ...flexiblePrices,
      [rentalType]: updated
    });
  };

  // ============ SERVICIOS FUNCTIONS ============
  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (editingService) {
        await updateExtraService(editingService.id, serviceFormData);
        alert('✅ Servicio actualizado exitosamente');
        setIsFormOpen(false);
        resetServiceForm();
      } else {
        await createExtraService(serviceFormData);
        alert('✅ Servicio agregado exitosamente. Puedes agregar otro servicio.');
        // NO cerrar el formulario - mantenerlo abierto
        // setIsFormOpen(false);
        resetServiceForm();
      }
      await fetchData();
    } catch (err) {
      console.error('Error al guardar servicio:', err);
      const errorMsg = err.response?.data?.detail 
        ? (typeof err.response.data.detail === 'string' 
          ? err.response.data.detail 
          : JSON.stringify(err.response.data.detail))
        : err.message || 'Error al guardar servicio';
      setError(errorMsg);
    }
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setServiceFormData({
      name: service.name,
      description: service.description || '',
      default_price: service.default_price || 0,
      is_active: service.is_active !== undefined ? service.is_active : true
    });
    setIsFormOpen(true);
  };

  const handleDeleteService = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este servicio?')) {
      try {
        await deleteExtraService(id);
        await fetchData();
        alert('✅ Servicio eliminado exitosamente');
      } catch (err) {
        console.error('Error al eliminar servicio:', err);
        const errorMsg = err.response?.data?.detail 
          ? (typeof err.response.data.detail === 'string' 
            ? err.response.data.detail 
            : 'Error al eliminar servicio')
          : 'Error al eliminar servicio';
        alert(errorMsg);
      }
    }
  };

  // ============ FUNCIONES DE SELECCIÓN MÚLTIPLE - VILLAS ============
  const handleSelectVilla = (villaId) => {
    setSelectedVillas(prev => {
      if (prev.includes(villaId)) {
        return prev.filter(id => id !== villaId);
      } else {
        return [...prev, villaId];
      }
    });
  };

  const handleSelectAllVillas = () => {
    if (selectAllVillas) {
      setSelectedVillas([]);
      setSelectAllVillas(false);
    } else {
      setSelectedVillas(filteredVillas.map(v => v.id));
      setSelectAllVillas(true);
    }
  };

  const handleDeleteSelectedVillas = async () => {
    if (selectedVillas.length === 0) {
      alert('No hay villas seleccionadas');
      return;
    }
    
    if (window.confirm(`¿Estás seguro de eliminar ${selectedVillas.length} villa(s)?`)) {
      try {
        await Promise.all(selectedVillas.map(id => deleteVilla(id)));
        setSelectedVillas([]);
        setSelectAllVillas(false);
        await fetchData();
        alert('✅ Villas eliminadas exitosamente');
      } catch (err) {
        setError('Error al eliminar villas');
        console.error(err);
      }
    }
  };

  // ============ FUNCIONES DE SELECCIÓN MÚLTIPLE - SERVICIOS ============
  const handleSelectService = (serviceId) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleSelectAllServices = () => {
    if (selectAllServices) {
      setSelectedServices([]);
      setSelectAllServices(false);
    } else {
      setSelectedServices(filteredServices.map(s => s.id));
      setSelectAllServices(true);
    }
  };

  const handleDeleteSelectedServices = async () => {
    if (selectedServices.length === 0) {
      alert('No hay servicios seleccionados');
      return;
    }
    
    if (window.confirm(`¿Estás seguro de eliminar ${selectedServices.length} servicio(s)?`)) {
      try {
        await Promise.all(selectedServices.map(id => deleteExtraService(id)));
        setSelectedServices([]);
        setSelectAllServices(false);
        await fetchData();
        alert('✅ Servicios eliminados exitosamente');
      } catch (err) {
        setError('Error al eliminar servicios');
        console.error(err);
      }
    }
  };

  const resetServiceForm = () => {
    setEditingService(null);
    setServiceFormData({
      name: '',
      description: '',
      default_price: 0,
      is_active: true
    });
  };

  const handleOpenForm = () => {
    if (itemType === 'villa') {
      resetForm();
    } else {
      resetServiceForm();
    }
    setIsFormOpen(true);
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

  // Filtrar servicios por búsqueda
  const filteredServices = services.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      {/* Header con selector de tipo */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Villas y Servicios</h2>
          <p className="text-gray-500 mt-1">Administra las villas y servicios disponibles</p>
        </div>
        {isAdmin && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenForm}>
                <Plus className="mr-2 h-4 w-4" /> 
                {itemType === 'villa' ? 'Nueva Villa' : 'Nuevo Servicio'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {itemType === 'villa' 
                    ? (editingVilla ? 'Editar Villa' : 'Nueva Villa')
                    : (editingService ? 'Editar Servicio' : 'Nuevo Servicio')
                  }
                </DialogTitle>
              </DialogHeader>

              {/* Formulario de Villa */}
              {itemType === 'villa' ? (
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

                  {/* SISTEMA DE PRECIOS FLEXIBLES */}
                  <div className="col-span-2 bg-purple-50 p-4 rounded-md border-2 border-purple-200">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-lg text-purple-800">🔢 Precios Flexibles (Opcional)</h3>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.use_flexible_pricing}
                          onChange={(e) => setFormData({ ...formData, use_flexible_pricing: e.target.checked })}
                          className="w-5 h-5"
                        />
                        <span className="text-sm font-medium">Activar</span>
                      </label>
                    </div>
                    
                    {formData.use_flexible_pricing && (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600 mb-2">
                          Agrega múltiples precios para cada tipo de renta. Ordénalos tú mismo según tus criterios.
                        </p>
                        
                        {/* PASADÍA */}
                        <div className="bg-blue-50 p-3 rounded border">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-blue-800">Precio de Pasadía</h4>
                            <button
                              type="button"
                              onClick={() => handleAddFlexiblePrice('pasadia')}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                            >
                              ➕
                            </button>
                          </div>
                          <div className="space-y-1">
                            <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-600 mb-1">
                              <span>Cliente</span>
                              <span>Propietario</span>
                              <span></span>
                            </div>
                            {flexiblePrices.pasadia.map((price, index) => (
                              <div key={index} className="grid grid-cols-3 gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={price.client_price}
                                  onChange={(e) => handleUpdateFlexiblePrice('pasadia', index, 'client_price', e.target.value)}
                                  className="px-2 py-1 border rounded text-sm"
                                  placeholder="5000"
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  value={price.owner_price}
                                  onChange={(e) => handleUpdateFlexiblePrice('pasadia', index, 'owner_price', e.target.value)}
                                  className="px-2 py-1 border rounded text-sm"
                                  placeholder="3000"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFlexiblePrice('pasadia', index)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  🗑️
                                </button>
                              </div>
                            ))}
                            {flexiblePrices.pasadia.length === 0 && (
                              <p className="text-xs text-gray-500 italic">Presiona ➕ para agregar precios</p>
                            )}
                          </div>
                        </div>

                        {/* AMANECIDA */}
                        <div className="bg-indigo-50 p-3 rounded border">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-indigo-800">Precio de Amanecida</h4>
                            <button
                              type="button"
                              onClick={() => handleAddFlexiblePrice('amanecida')}
                              className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                            >
                              ➕
                            </button>
                          </div>
                          <div className="space-y-1">
                            <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-600 mb-1">
                              <span>Cliente</span>
                              <span>Propietario</span>
                              <span></span>
                            </div>
                            {flexiblePrices.amanecida.map((price, index) => (
                              <div key={index} className="grid grid-cols-3 gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={price.client_price}
                                  onChange={(e) => handleUpdateFlexiblePrice('amanecida', index, 'client_price', e.target.value)}
                                  className="px-2 py-1 border rounded text-sm"
                                  placeholder="10000"
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  value={price.owner_price}
                                  onChange={(e) => handleUpdateFlexiblePrice('amanecida', index, 'owner_price', e.target.value)}
                                  className="px-2 py-1 border rounded text-sm"
                                  placeholder="8000"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFlexiblePrice('amanecida', index)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  🗑️
                                </button>
                              </div>
                            ))}
                            {flexiblePrices.amanecida.length === 0 && (
                              <p className="text-xs text-gray-500 italic">Presiona ➕ para agregar precios</p>
                            )}
                          </div>
                        </div>

                        {/* EVENTO */}
                        <div className="bg-purple-50 p-3 rounded border">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-purple-800">Precio de Evento</h4>
                            <button
                              type="button"
                              onClick={() => handleAddFlexiblePrice('evento')}
                              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                            >
                              ➕
                            </button>
                          </div>
                          <div className="space-y-1">
                            <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-600 mb-1">
                              <span>Cliente</span>
                              <span>Propietario</span>
                              <span></span>
                            </div>
                            {flexiblePrices.evento.map((price, index) => (
                              <div key={index} className="grid grid-cols-3 gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={price.client_price}
                                  onChange={(e) => handleUpdateFlexiblePrice('evento', index, 'client_price', e.target.value)}
                                  className="px-2 py-1 border rounded text-sm"
                                  placeholder="15000"
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  value={price.owner_price}
                                  onChange={(e) => handleUpdateFlexiblePrice('evento', index, 'owner_price', e.target.value)}
                                  className="px-2 py-1 border rounded text-sm"
                                  placeholder="12000"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFlexiblePrice('evento', index)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  🗑️
                                </button>
                              </div>
                            ))}
                            {flexiblePrices.evento.length === 0 && (
                              <p className="text-xs text-gray-500 italic">Presiona ➕ para agregar precios</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
              ) : (
                /* Formulario de Servicio */
                <form onSubmit={handleServiceSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Nombre del Servicio *</Label>
                      <Input
                        value={serviceFormData.name}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                        placeholder="Ej: Decoración, DJ, Fotografía, Sillas Plásticas"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>Descripción</Label>
                      <textarea
                        value={serviceFormData.description}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                        className="w-full p-2 border rounded-md"
                        rows="3"
                        placeholder="Describe el servicio..."
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>Precio por Defecto *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={serviceFormData.default_price}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, default_price: parseFloat(e.target.value) })}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Este precio se usará como base al agregar el servicio a una reservación
                      </p>
                    </div>

                    <div className="col-span-2 flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={serviceFormData.is_active}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, is_active: e.target.checked })}
                        id="service_active"
                      />
                      <Label htmlFor="service_active">Servicio activo</Label>
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
                      {editingService ? 'Actualizar Servicio' : 'Guardar Servicio'}
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Selector de Tipo (Tabs) */}
      <div className="flex space-x-2 border-b">
        <button
          onClick={() => setItemType('villa')}
          className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${
            itemType === 'villa' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building size={18} />
          Villas ({villas.length})
        </button>
        <button
          onClick={() => setItemType('service')}
          className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${
            itemType === 'service' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package size={18} />
          Servicios ({services.length})
        </button>
      </div>

      {/* Buscador */}
      <div className="flex items-center space-x-2">
        <Search className="text-gray-400" size={20} />
        <Input
          placeholder={itemType === 'villa' ? "Buscar por código, nombre o categoría..." : "Buscar servicios..."}
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

      {/* Vista de Villas */}
      {itemType === 'villa' && (
        <div className="space-y-4">
          {selectedVillas.length > 0 && user?.role === 'admin' && (
            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-md">
              <span className="text-sm font-medium">{selectedVillas.length} villa(s) seleccionada(s)</span>
              <div className="flex space-x-2">
                <Button onClick={handleSelectAllVillas} variant="outline" size="sm">
                  {selectAllVillas ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
                </Button>
                <Button onClick={handleDeleteSelectedVillas} variant="destructive" size="sm">
                  <Trash2 size={16} className="mr-2" />
                  Eliminar Seleccionadas
                </Button>
              </div>
            </div>
          )}
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
                      <div className="p-4 flex items-center justify-between">
                        {user?.role === 'admin' && (
                          <div className="mr-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedVillas.includes(villa.id)}
                              onChange={() => handleSelectVilla(villa.id)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </div>
                        )}
                        <div 
                          className="flex-1 grid grid-cols-4 gap-4 items-center cursor-pointer"
                          onClick={() => toggleExpand(villa.id)}
                        >
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
      )}

      {/* Vista de Servicios */}
      {itemType === 'service' && (
        <div className="space-y-4">
          {selectedServices.length > 0 && user?.role === 'admin' && (
            <div className="flex items-center justify-between bg-green-50 p-3 rounded-md">
              <span className="text-sm font-medium">{selectedServices.length} servicio(s) seleccionado(s)</span>
              <div className="flex space-x-2">
                <Button onClick={handleSelectAllServices} variant="outline" size="sm">
                  {selectAllServices ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                </Button>
                <Button onClick={handleDeleteSelectedServices} variant="destructive" size="sm">
                  <Trash2 size={16} className="mr-2" />
                  Eliminar Seleccionados
                </Button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <Card key={service.id} className={!service.is_active ? 'opacity-50' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  {user?.role === 'admin' && (
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(service.id)}
                      onChange={() => handleSelectService(service.id)}
                      className="w-4 h-4 cursor-pointer mr-2"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                  </div>
                    {!service.is_active && (
                      <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                        Inactivo
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {service.description && (
                  <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                )}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Precio por Defecto:</span>
                    <span className="font-bold text-lg text-blue-600">
                      RD$ {(service.default_price || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex justify-end space-x-2 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditService(service)}
                      className="hover:bg-gray-100"
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteService(service.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {filteredServices.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Package size={64} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No hay servicios que coincidan con la búsqueda</p>
            </div>
          )}
          </div>
        </div>
      )}

    </div>
  );
};

export default VillasManagementNew;
