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
export const updateCustomer = (id, data) => axios.put(`${API}/customers/${id}`, data);
export const deleteCustomer = (id) => axios.delete(`${API}/customers/${id}`);

// ============ CATEGORIES (FOR VILLAS) ============
export const getCategories = () => axios.get(`${API}/categories`);
export const getCategory = (id) => axios.get(`${API}/categories/${id}`);
export const createCategory = (data) => axios.post(`${API}/categories`, data);
export const updateCategory = (id, data) => axios.put(`${API}/categories/${id}`, data);
export const deleteCategory = (id) => axios.delete(`${API}/categories/${id}`);

// ============ EXPENSE CATEGORIES (SEPARATE) ============
export const getExpenseCategories = () => axios.get(`${API}/expense-categories`);
export const createExpenseCategory = (data) => axios.post(`${API}/expense-categories`, data);
export const updateExpenseCategory = (id, data) => axios.put(`${API}/expense-categories/${id}`, data);
export const deleteExpenseCategory = (id) => axios.delete(`${API}/expense-categories/${id}`);

// ============ VILLAS ============
export const getVillas = (search = null, categoryId = null) => {
  let url = `${API}/villas`;
  const params = [];
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (categoryId) params.push(`category_id=${categoryId}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  return axios.get(url);
};
export const getVilla = (id) => axios.get(`${API}/villas/${id}`);
export const createVilla = (data) => axios.post(`${API}/villas`, data);
export const updateVilla = (id, data) => axios.put(`${API}/villas/${id}`, data);
export const deleteVilla = (id) => axios.delete(`${API}/villas/${id}`);

// ============ EXTRA SERVICES ============
export const getExtraServices = () => axios.get(`${API}/extra-services`);
export const createExtraService = (data) => axios.post(`${API}/extra-services`, data);
export const updateExtraService = (id, data) => axios.put(`${API}/extra-services/${id}`, data);
export const deleteExtraService = (id) => axios.delete(`${API}/extra-services/${id}`);

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
export const getExpenses = (category = null, search = null) => {
  let url = `${API}/expenses`;
  const params = [];
  if (category) params.push(`category=${category}`);
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  return axios.get(url);
};
export const getExpense = (id) => axios.get(`${API}/expenses/${id}`);
export const createExpense = (data) => axios.post(`${API}/expenses`, data);
export const updateExpense = (id, data) => axios.put(`${API}/expenses/${id}`, data);
export const deleteExpense = (id) => axios.delete(`${API}/expenses/${id}`);

// Abonos to expenses
export const addAbonoToExpense = (expenseId, data) => axios.post(`${API}/expenses/${expenseId}/abonos`, data);
export const getExpenseAbonos = (expenseId) => axios.get(`${API}/expenses/${expenseId}/abonos`);
export const deleteExpenseAbono = (expenseId, abonoId) => axios.delete(`${API}/expenses/${expenseId}/abonos/${abonoId}`);

// Abonos to reservations
export const addAbonoToReservation = (reservationId, data) => axios.post(`${API}/reservations/${reservationId}/abonos`, data);
export const getReservationAbonos = (reservationId) => axios.get(`${API}/reservations/${reservationId}/abonos`);
export const deleteReservationAbono = (reservationId, abonoId) => axios.delete(`${API}/reservations/${reservationId}/abonos/${abonoId}`);

// ============ DASHBOARD ============
export const getDashboardStats = () => axios.get(`${API}/dashboard/stats`);


// ============ QUOTATIONS (COTIZACIONES) ============
export const getQuotations = (status = null, customerId = null) => {
  let url = `${API}/quotations`;
  const params = [];
  if (status) params.push(`status=${status}`);
  if (customerId) params.push(`customer_id=${customerId}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  return axios.get(url);
};
export const getQuotation = (id) => axios.get(`${API}/quotations/${id}`);
export const createQuotation = (data) => axios.post(`${API}/quotations`, data);
export const updateQuotation = (id, data) => axios.put(`${API}/quotations/${id}`, data);
export const deleteQuotation = (id) => axios.delete(`${API}/quotations/${id}`);
export const convertQuotationToInvoice = (id) => axios.post(`${API}/quotations/${id}/convert-to-invoice`);

// ============ CONDUCES (DELIVERY NOTES) ============
export const getConduces = (status = null, recipientType = null) => {
  let url = `${API}/conduces`;
  const params = [];
  if (status) params.push(`status=${status}`);
  if (recipientType) params.push(`recipient_type=${recipientType}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  return axios.get(url);
};
export const getConduce = (id) => axios.get(`${API}/conduces/${id}`);
export const createConduce = (data) => axios.post(`${API}/conduces`, data);
export const updateConduce = (id, data) => axios.put(`${API}/conduces/${id}`, data);
export const deleteConduce = (id) => axios.delete(`${API}/conduces/${id}`);

