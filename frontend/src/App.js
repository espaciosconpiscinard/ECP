import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Reservations from './components/Reservations';
import VillasManagement from './components/VillasManagement';
import Categories from './components/Categories';
import ExpenseCategories from './components/ExpenseCategories';
import Customers from './components/Customers';
import Expenses from './components/Expenses';
import Users from './components/Users';
import Configuration from './components/Configuration';
import './App.css';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="app-loading">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'reservations':
        return <Reservations />;
      case 'villas':
        return <VillasManagement />;
      case 'categories':
        return <Categories />;
      case 'expense-categories':
        return <ExpenseCategories />;
      case 'customers':
        return <Customers />;
      case 'expenses':
        return <Expenses />;
      case 'users':
        return <Users />;
      case 'configuration':
        return <Configuration />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView}>
      {renderView()}
    </Layout>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
