import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    role: 'employee',
    admin_code: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (isLogin) {
      const result = await login(formData.username, formData.password);
      if (!result.success) {
        setError(result.error);
      }
    } else {
      const result = await register(formData);
      if (result.success) {
        setIsLogin(true);
        setFormData({ username: '', password: '', email: '', full_name: '', role: 'employee', admin_code: '' });
        setError('');
        
        // Mostrar mensaje apropiado según el rol
        if (formData.role === 'admin') {
          setSuccess('✅ Administrador registrado exitosamente. Ya puedes iniciar sesión.');
        } else {
          setSuccess('✅ Cuenta creada. Espera la aprobación del administrador para iniciar sesión.');
        }
      } else {
        setError(result.error);
      }
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md" data-testid="login-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-blue-600">
            Espacios Con Piscina
          </CardTitle>
          <CardDescription className="text-center text-lg font-medium">
            {isLogin ? 'Iniciar Sesión' : 'Registrar Usuario'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nombre Completo</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={handleChange}
                    required={!isLogin}
                    data-testid="fullname-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required={!isLogin}
                    data-testid="email-input"
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                required
                data-testid="username-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                data-testid="password-input"
              />
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md"
                    data-testid="role-select"
                  >
                    <option value="employee">Empleado</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                
                {formData.role === 'admin' && (
                  <div className="space-y-2">
                    <Label htmlFor="admin_code">Código Secreto de Administrador</Label>
                    <Input
                      id="admin_code"
                      name="admin_code"
                      type="text"
                      placeholder="Ingrese código de administrador"
                      value={formData.admin_code}
                      onChange={handleChange}
                      required={formData.role === 'admin'}
                      data-testid="admin-code-input"
                      className="uppercase"
                    />
                    <p className="text-xs text-gray-500">Necesitas el código secreto para crear una cuenta de administrador</p>
                  </div>
                )}
              </>
            )}

            {error && (
              <Alert variant="destructive" data-testid="error-alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="bg-green-50 border-green-200" data-testid="success-alert">
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              data-testid="submit-button"
            >
              {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Registrar')}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccess('');
              }}
              className="text-sm text-blue-600 hover:underline"
              data-testid="toggle-form-button"
            >
              {isLogin ? '¿Necesitas crear una cuenta?' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
