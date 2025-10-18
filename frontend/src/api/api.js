import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Configure axios
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// ============ CUSTOMERS ============
export const getCustomers = () => axios.get(`${API}/customers`);
export const getCustomer = (id) => axios.get(`${API}/customers/${id}`);
export const createCustomer = (data) => axios.post(`${API}/customers`, data);
export const deleteCustomer = (id) => axios.delete(`${API}/customers/${id}`);

// ============ RESERVATIONS ============
export const getReservations = (status = null) => {
  const url = status ? `${API}/reservations?status=${status}` : `${API}/reservations`;
  return axios.get(url);
};
export const getReservation = (id) => axios.get(`${API}/reservations/${id}`);
export const createReservation = (data) => axios.post(`${API}/reservations`, data);
export const updateReservation = (id, data) => axios.put(`${API}/reservations/${id}`, data);
export const deleteReservation = (id) => axios.delete(`${API}/reservations/${id}`);

// ============ VILLA OWNERS ============
export const getOwners = () => axios.get(`${API}/owners`);
export const getOwner = (id) => axios.get(`${API}/owners/${id}`);
export const createOwner = (data) => axios.post(`${API}/owners`, data);
export const updateOwner = (id, data) => axios.put(`${API}/owners/${id}`, data);
export const deleteOwner = (id) => axios.delete(`${API}/owners/${id}`);

// Owner payments
export const createOwnerPayment = (ownerId, data) => axios.post(`${API}/owners/${ownerId}/payments`, data);
export const getOwnerPayments = (ownerId) => axios.get(`${API}/owners/${ownerId}/payments`);
export const updateOwnerAmounts = (ownerId, totalOwed) => 
  axios.put(`${API}/owners/${ownerId}/amounts?total_owed=${totalOwed}`);

// ============ EXPENSES ============
export const getExpenses = (category = null) => {
  const url = category ? `${API}/expenses?category=${category}` : `${API}/expenses`;
  return axios.get(url);
};
export const getExpense = (id) => axios.get(`${API}/expenses/${id}`);
export const createExpense = (data) => axios.post(`${API}/expenses`, data);
export const updateExpense = (id, data) => axios.put(`${API}/expenses/${id}`, data);
export const deleteExpense = (id) => axios.delete(`${API}/expenses/${id}`);

// ============ DASHBOARD ============
export const getDashboardStats = () => axios.get(`${API}/dashboard/stats`);
