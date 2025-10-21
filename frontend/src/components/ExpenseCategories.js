import React, { useState, useEffect } from 'react';
import { getExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory } from '../api/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ExpenseCategories = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  // Estados para selección múltiple
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await getExpenseCategories();
      setCategories(response.data);
    } catch (err) {
      setError('Error al cargar categorías');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (editingCategory) {
        await updateExpenseCategory(editingCategory.id, formData);
      } else {
        await createExpenseCategory(formData);
      }
      await fetchCategories();
      setIsFormOpen(false);
      resetForm();
      alert('✅ Categoría guardada exitosamente');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar categoría');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      is_active: category.is_active
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta categoría? Los gastos asociados quedarán sin categoría.')) {
      try {
        await deleteExpenseCategory(id);
        await fetchCategories();
        alert('✅ Categoría eliminada exitosamente');
      } catch (err) {
        setError('Error al eliminar categoría');
      }
    }
  };

  // Funciones de selección múltiple
  const handleSelectCategory = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCategories([]);
      setSelectAll(false);
    } else {
      setSelectedCategories(categories.map(c => c.id));
      setSelectAll(true);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCategories.length === 0) {
      alert('No hay categorías seleccionadas');
      return;
    }
    
    if (window.confirm(`¿Estás seguro de eliminar ${selectedCategories.length} categoría(s)?`)) {
      try {
        await Promise.all(selectedCategories.map(id => deleteExpenseCategory(id)));
        setSelectedCategories([]);
        setSelectAll(false);
        await fetchCategories();
        alert('✅ Categorías eliminadas exitosamente');
      } catch (err) {
        setError('Error al eliminar categorías');
        console.error(err);
      }
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      is_active: true
    });
  };

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Categorías de Gastos</h2>
          <p className="text-gray-500 mt-1">Gestiona las categorías personalizadas para tus gastos</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" /> Nueva Categoría
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nombre de la Categoría *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Luz, Internet, Mantenimiento"
                  required
                />
              </div>

              <div>
                <Label>Descripción (Opcional)</Label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  rows="2"
                  placeholder="Descripción de la categoría"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  id="is_active"
                />
                <Label htmlFor="is_active">Categoría activa</Label>
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
                  {editingCategory ? 'Actualizar' : 'Guardar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && !isFormOpen && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Bulk actions bar */}
      {selectedCategories.length > 0 && user?.role === 'admin' && (
        <div className="flex items-center justify-between bg-purple-50 p-3 rounded-md">
          <span className="text-sm font-medium">{selectedCategories.length} categoría(s) seleccionada(s)</span>
          <div className="flex space-x-2">
            <Button onClick={handleSelectAll} variant="outline" size="sm">
              {selectAll ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
            </Button>
            <Button onClick={handleDeleteSelected} variant="destructive" size="sm">
              <Trash2 size={16} className="mr-2" />
              Eliminar Seleccionadas
            </Button>
          </div>
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.length > 0 ? (
          categories.map((category) => (
            <Card key={category.id} className={!category.is_active ? 'opacity-50' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  {user?.role === 'admin' && (
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => handleSelectCategory(category.id)}
                      className="w-4 h-4 cursor-pointer mr-2"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Tag className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                  </div>
                    {!category.is_active && (
                      <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                        Inactiva
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {category.description && (
                  <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                )}
                <div className="flex justify-end space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(category)}
                    className="hover:bg-gray-100"
                  >
                    <Edit size={16} />
                  </Button>
                  {user?.role === 'admin' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-gray-500">
              <Tag className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No hay categorías de gastos creadas</p>
              <p className="text-sm mt-1">Crea tu primera categoría para organizar tus gastos</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ExpenseCategories;
