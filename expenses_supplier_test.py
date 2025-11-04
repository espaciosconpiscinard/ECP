#!/usr/bin/env python3
"""
Comprehensive Testing Suite for Expenses Module - Supplier Payments and Extra Services
Testing exhaustivo del módulo de gastos (Expenses) con enfoque en pagos a suplidores y servicios extras.
"""

import requests
import json
import sys
from typing import Dict, Any, Optional
import uuid

# Backend URL from environment
BACKEND_URL = "https://piscinapp-1.preview.emergentagent.com/api"

class ExpensesSupplierTester:
    def __init__(self):
        self.admin_token = None
        self.employee_token = None
        self.test_results = []
        self.test_customer = None
        self.test_villa = None
        self.created_reservations = []
        self.created_expenses = []
        
    def log_test(self, test_name: str, success: bool, message: str, details: Any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, token: str = None) -> Dict:
        """Make HTTP request to backend"""
        url = f"{BACKEND_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, params=data)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=data)
            elif method == "PATCH":
                response = requests.patch(url, headers=headers, json=data)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers)
            else:
                return {"error": f"Unsupported method: {method}"}
            
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "success": 200 <= response.status_code < 300
            }
        except Exception as e:
            return {"error": str(e), "success": False}
    
    def setup_authentication(self):
        """Setup admin and employee authentication"""
        print("🔐 Setting up authentication...")
        
        # Login as admin
        admin_login = {
            "username": "admin",
            "password": "admin123"
        }
        
        result = self.make_request("POST", "/auth/login", admin_login)
        if result.get("success"):
            self.admin_token = result["data"]["access_token"]
            self.log_test("Admin Login", True, "Admin authenticated successfully")
        else:
            self.log_test("Admin Login", False, "Failed to authenticate admin", result)
            return False
        
        # Approve employee if needed
        self.approve_employee()
        
        # Login as employee
        employee_login = {
            "username": "emp1",
            "password": "emp123"
        }
        
        result = self.make_request("POST", "/auth/login", employee_login)
        if result.get("success"):
            self.employee_token = result["data"]["access_token"]
            self.log_test("Employee Login", True, "Employee authenticated successfully")
        else:
            self.log_test("Employee Login", False, "Failed to authenticate employee", result)
            return False
        
        return True
    
    def approve_employee(self):
        """Approve employee user (admin only)"""
        # Get pending users
        result = self.make_request("GET", "/users/pending/list", token=self.admin_token)
        
        if result.get("success"):
            pending_users = result["data"]
            emp_user = next((u for u in pending_users if u["username"] == "emp1"), None)
            
            if emp_user:
                # Approve the employee
                approve_result = self.make_request("PATCH", f"/users/{emp_user['id']}/approve", token=self.admin_token)
                if approve_result.get("success"):
                    self.log_test("Approve Employee", True, "Employee user approved successfully")
                else:
                    self.log_test("Approve Employee", False, "Failed to approve employee", approve_result)
            else:
                self.log_test("Find Pending Employee", True, "Employee already approved or not found in pending list")
        else:
            self.log_test("Get Pending Users", False, "Failed to get pending users", result)
    
    def setup_test_data(self):
        """Setup test customer, villa, and extra services"""
        print("📋 Setting up test data...")
        
        # Create test customer
        customer_data = {
            "name": "Cliente Test Suplidores",
            "phone": "809-555-0001",
            "email": "cliente.suplidores@test.com",
            "address": "Santo Domingo, RD",
            "dni": "001-9999999-9"
        }
        
        result = self.make_request("POST", "/customers", customer_data, self.admin_token)
        if result.get("success"):
            self.test_customer = result["data"]
            self.log_test("Create Test Customer", True, f"Created customer: {self.test_customer['name']}")
        else:
            self.log_test("Create Test Customer", False, "Failed to create test customer", result)
            return False
        
        # Get existing villa ECPVKLK or use first available villa
        villas_result = self.make_request("GET", "/villas", {"search": "ECPVKLK"}, self.admin_token)
        if villas_result.get("success") and villas_result["data"]:
            self.test_villa = villas_result["data"][0]
            self.log_test("Get Test Villa ECPVKLK", True, f"Using villa: {self.test_villa['code']}")
        else:
            # Get any available villa
            all_villas_result = self.make_request("GET", "/villas", token=self.admin_token)
            if all_villas_result.get("success") and all_villas_result["data"]:
                self.test_villa = all_villas_result["data"][0]
                self.log_test("Get Any Test Villa", True, f"Using villa: {self.test_villa['code']}")
            else:
                self.log_test("Get Test Villa", False, "No villas available for testing")
                return False
        
        # Setup extra services for testing
        self.setup_extra_services()
        
        return True
    
    def setup_extra_services(self):
        """Create extra services for testing"""
        # Get existing extra services
        services_result = self.make_request("GET", "/extra-services", token=self.admin_token)
        
        if services_result.get("success"):
            existing_services = services_result["data"]
            self.log_test("Get Existing Extra Services", True, f"Found {len(existing_services)} existing services")
            
            # Store existing services for use in tests
            self.extra_services = existing_services
            
            # Create additional services if needed
            services_to_create = [
                {
                    "name": "Comida",
                    "description": "Servicio de catering",
                    "default_price": 800.0,
                    "suppliers": [
                        {
                            "name": "Restaurant ABC",
                            "description": "Catering premium",
                            "client_price": 800.0,
                            "supplier_cost": 500.0,
                            "is_default": True
                        }
                    ]
                },
                {
                    "name": "Música",
                    "description": "Servicio de DJ",
                    "default_price": 4000.0,
                    "suppliers": [
                        {
                            "name": "DJ Pro",
                            "description": "DJ profesional",
                            "client_price": 4000.0,
                            "supplier_cost": 3000.0,
                            "is_default": True
                        }
                    ]
                },
                {
                    "name": "Decoración",
                    "description": "Servicio de decoración",
                    "default_price": 4000.0,
                    "suppliers": [
                        {
                            "name": "Decoraciones Elite",
                            "description": "Decoración premium",
                            "client_price": 4000.0,
                            "supplier_cost": 2500.0,
                            "is_default": True
                        }
                    ]
                },
                {
                    "name": "Fotografía",
                    "description": "Servicio de fotografía",
                    "default_price": 3500.0,
                    "suppliers": [
                        {
                            "name": "Foto Studio",
                            "description": "Fotografía profesional",
                            "client_price": 3500.0,
                            "supplier_cost": 2000.0,
                            "is_default": True
                        }
                    ]
                }
            ]
            
            for service_data in services_to_create:
                # Check if service already exists
                existing = next((s for s in existing_services if s["name"].lower() == service_data["name"].lower()), None)
                
                if not existing:
                    result = self.make_request("POST", "/extra-services", service_data, self.admin_token)
                    if result.get("success"):
                        created_service = result["data"]
                        self.extra_services.append(created_service)
                        self.log_test(f"Create Extra Service '{service_data['name']}'", True, 
                                     f"Created service: {created_service['id']}")
                    else:
                        self.log_test(f"Create Extra Service '{service_data['name']}'", False, 
                                     "Failed to create service", result)
        else:
            self.log_test("Get Existing Extra Services", False, "Failed to get extra services", services_result)
            self.extra_services = []
    
    def test_1_reservation_with_extra_services(self):
        """Test 1: Crear reservación con 2 servicios extras diferentes"""
        print("\n🛎️ TEST 1: Crear reservación con servicios extras que generen gastos de suplidores")
        
        # Find services for testing
        comida_service = next((s for s in self.extra_services if s["name"].lower() == "comida"), None)
        musica_service = next((s for s in self.extra_services if s["name"].lower() in ["música", "dj"]), None)
        
        if not comida_service:
            comida_service = self.extra_services[0] if self.extra_services else None
        if not musica_service:
            musica_service = self.extra_services[-1] if len(self.extra_services) > 1 else self.extra_services[0] if self.extra_services else None
        
        if not comida_service or not musica_service:
            self.log_test("Find Services for Test", False, "Not enough extra services available")
            return None
        
        # Datos de la reservación con servicios extras
        reservation_data = {
            "customer_id": self.test_customer["id"],
            "customer_name": self.test_customer["name"],
            "villa_id": self.test_villa["id"],
            "villa_code": self.test_villa["code"],
            "rental_type": "pasadia",
            "reservation_date": "2025-01-25T00:00:00Z",
            "check_in_time": "9:00 AM",
            "check_out_time": "8:00 PM",
            "guests": 10,
            "base_price": 18000.0,
            "owner_price": 12000.0,
            "subtotal": 23500.0,
            "total_amount": 23500.0,
            "amount_paid": 10000.0,
            "currency": "DOP",
            "status": "confirmed",
            "notes": "Reservación con servicios extras para testing",
            "extra_services": [
                {
                    "service_id": comida_service["id"],
                    "service_name": "Comida",
                    "supplier_name": "Restaurant ABC",
                    "quantity": 10,
                    "unit_price": 800.0,
                    "supplier_cost": 500.0,
                    "total": 8000.0
                },
                {
                    "service_id": musica_service["id"],
                    "service_name": "Música",
                    "supplier_name": "DJ Pro",
                    "quantity": 1,
                    "unit_price": 4000.0,
                    "supplier_cost": 3000.0,
                    "total": 4000.0
                }
            ]
        }
        
        # Obtener conteo de gastos antes de crear la reservación
        expenses_before_result = self.make_request("GET", "/expenses", token=self.admin_token)
        expenses_before_count = len(expenses_before_result["data"]) if expenses_before_result.get("success") else 0
        
        # Crear la reservación
        result = self.make_request("POST", "/reservations", reservation_data, self.admin_token)
        
        if not result.get("success"):
            self.log_test("Create Reservation with Extra Services", False, "Failed to create reservation", result)
            return None
        
        created_reservation = result["data"]
        self.created_reservations.append(created_reservation)
        self.log_test("Create Reservation with Extra Services", True, 
                     f"Created reservation #{created_reservation['invoice_number']} with 2 extra services")
        
        # Verificar que se crearon los gastos automáticamente
        expenses_after_result = self.make_request("GET", "/expenses", token=self.admin_token)
        
        if not expenses_after_result.get("success"):
            self.log_test("Get Expenses After Reservation", False, "Failed to get expenses", expenses_after_result)
            return None
        
        expenses_after = expenses_after_result["data"]
        expenses_after_count = len(expenses_after)
        
        # Buscar gastos relacionados con esta reservación
        related_expenses = [exp for exp in expenses_after 
                          if exp.get("related_reservation_id") == created_reservation["id"]]
        
        # Verificar gasto del propietario
        owner_expense = next((exp for exp in related_expenses 
                            if exp.get("category") == "pago_propietario"), None)
        
        if owner_expense:
            self.log_test("Owner Expense Auto-Created", True, 
                         f"Owner expense created: RD$ {owner_expense['amount']}")
            self.created_expenses.append(owner_expense)
        else:
            self.log_test("Owner Expense Auto-Created", False, "Owner expense not found")
        
        # Verificar gastos de suplidores
        supplier_expenses = [exp for exp in related_expenses 
                           if exp.get("category") == "pago_suplidor"]
        
        if len(supplier_expenses) == 2:
            self.log_test("Supplier Expenses Auto-Created", True, 
                         f"Created {len(supplier_expenses)} supplier expenses as expected")
            
            # Verificar detalles de cada gasto de suplidor
            for i, supplier_expense in enumerate(supplier_expenses):
                self.created_expenses.append(supplier_expense)
                
                # Verificar campos requeridos
                checks = []
                
                if supplier_expense.get("category") == "pago_suplidor":
                    checks.append("✓ Category: pago_suplidor")
                else:
                    checks.append(f"✗ Category: {supplier_expense.get('category')}")
                
                if supplier_expense.get("related_reservation_id") == created_reservation["id"]:
                    checks.append("✓ Related reservation ID correct")
                else:
                    checks.append("✗ Related reservation ID incorrect")
                
                if supplier_expense.get("payment_status") == "pending":
                    checks.append("✓ Payment status: pending")
                else:
                    checks.append(f"✗ Payment status: {supplier_expense.get('payment_status')}")
                
                # Verificar que el supplier_name está en la descripción
                description = supplier_expense.get("description", "")
                if "Restaurant ABC" in description or "DJ Pro" in description:
                    checks.append("✓ Supplier name in description")
                else:
                    checks.append("✗ Supplier name not in description")
                
                # Verificar montos
                expected_amounts = [5000.0, 3000.0]  # 10 * 500, 1 * 3000
                if supplier_expense.get("amount") in expected_amounts:
                    checks.append(f"✓ Amount: RD$ {supplier_expense.get('amount')}")
                else:
                    checks.append(f"✗ Amount: RD$ {supplier_expense.get('amount')} (expected one of {expected_amounts})")
                
                all_checks_passed = all("✓" in check for check in checks)
                
                self.log_test(f"Supplier Expense {i+1} Verification", all_checks_passed,
                             f"Supplier expense details:\n   " + "\n   ".join(checks))
        else:
            self.log_test("Supplier Expenses Auto-Created", False, 
                         f"Expected 2 supplier expenses, found {len(supplier_expenses)}")
        
        return created_reservation
    
    def test_2_add_partial_payments_to_suppliers(self):
        """Test 2: Agregar abonos parciales a cada suplidor"""
        print("\n💰 TEST 2: Agregar abonos parciales a gastos de suplidores")
        
        if not self.created_expenses:
            self.log_test("Find Supplier Expenses for Payments", False, "No supplier expenses available")
            return
        
        # Buscar gastos de suplidores
        supplier_expenses = [exp for exp in self.created_expenses 
                           if exp.get("category") == "pago_suplidor"]
        
        if len(supplier_expenses) < 2:
            self.log_test("Find Supplier Expenses for Payments", False, 
                         f"Need at least 2 supplier expenses, found {len(supplier_expenses)}")
            return
        
        # Test 2.1: Abono a Restaurant ABC (RD$ 2,000 de RD$ 5,000 total)
        restaurant_expense = None
        dj_expense = None
        
        for exp in supplier_expenses:
            if "Restaurant ABC" in exp.get("description", ""):
                restaurant_expense = exp
            elif "DJ Pro" in exp.get("description", ""):
                dj_expense = exp
        
        if not restaurant_expense or not dj_expense:
            self.log_test("Identify Supplier Expenses", False, "Could not identify Restaurant ABC and DJ Pro expenses")
            return
        
        # Abono a Restaurant ABC
        restaurant_abono_data = {
            "amount": 2000.0,
            "currency": "DOP",
            "payment_method": "efectivo",
            "payment_date": "2025-01-25T14:00:00Z",
            "notes": "Abono parcial a Restaurant ABC"
        }
        
        result = self.make_request("POST", f"/expenses/{restaurant_expense['id']}/abonos", 
                                 restaurant_abono_data, self.admin_token)
        
        if result.get("success"):
            restaurant_abono = result["data"]
            self.log_test("Add Payment to Restaurant ABC", True, 
                         f"Added RD$ 2,000 payment to Restaurant ABC (Invoice: {restaurant_abono.get('invoice_number')})")
            
            # Verificar balance_due y payment_status
            updated_expense_result = self.make_request("GET", f"/expenses/{restaurant_expense['id']}", 
                                                     token=self.admin_token)
            
            if updated_expense_result.get("success"):
                updated_expense = updated_expense_result["data"]
                
                # Calcular balance_due esperado: 5000 - 2000 = 3000
                expected_balance = 3000.0
                actual_balance = updated_expense.get("balance_due", 0)
                
                if abs(actual_balance - expected_balance) < 0.01:
                    self.log_test("Restaurant ABC Balance Calculation", True, 
                                 f"Balance due correctly calculated: RD$ {actual_balance}")
                else:
                    self.log_test("Restaurant ABC Balance Calculation", False, 
                                 f"Balance due incorrect: RD$ {actual_balance} (expected: RD$ {expected_balance})")
                
                # Verificar payment_status
                expected_status = "partial"
                actual_status = updated_expense.get("payment_status")
                
                if actual_status == expected_status:
                    self.log_test("Restaurant ABC Payment Status", True, 
                                 f"Payment status correctly updated to: {actual_status}")
                else:
                    self.log_test("Restaurant ABC Payment Status", False, 
                                 f"Payment status incorrect: {actual_status} (expected: {expected_status})")
        else:
            self.log_test("Add Payment to Restaurant ABC", False, "Failed to add payment", result)
            return
        
        # Test 2.2: Abono a DJ Pro (RD$ 1,000 de RD$ 3,000 total)
        dj_abono_data = {
            "amount": 1000.0,
            "currency": "DOP",
            "payment_method": "transferencia",
            "payment_date": "2025-01-25T15:00:00Z",
            "notes": "Abono parcial a DJ Pro"
        }
        
        result = self.make_request("POST", f"/expenses/{dj_expense['id']}/abonos", 
                                 dj_abono_data, self.admin_token)
        
        if result.get("success"):
            dj_abono = result["data"]
            self.log_test("Add Payment to DJ Pro", True, 
                         f"Added RD$ 1,000 payment to DJ Pro (Invoice: {dj_abono.get('invoice_number')})")
            
            # Verificar balance_due y payment_status
            updated_expense_result = self.make_request("GET", f"/expenses/{dj_expense['id']}", 
                                                     token=self.admin_token)
            
            if updated_expense_result.get("success"):
                updated_expense = updated_expense_result["data"]
                
                # Calcular balance_due esperado: 3000 - 1000 = 2000
                expected_balance = 2000.0
                actual_balance = updated_expense.get("balance_due", 0)
                
                if abs(actual_balance - expected_balance) < 0.01:
                    self.log_test("DJ Pro Balance Calculation", True, 
                                 f"Balance due correctly calculated: RD$ {actual_balance}")
                else:
                    self.log_test("DJ Pro Balance Calculation", False, 
                                 f"Balance due incorrect: RD$ {actual_balance} (expected: RD$ {expected_balance})")
                
                # Verificar payment_status
                expected_status = "partial"
                actual_status = updated_expense.get("payment_status")
                
                if actual_status == expected_status:
                    self.log_test("DJ Pro Payment Status", True, 
                                 f"Payment status correctly updated to: {actual_status}")
                else:
                    self.log_test("DJ Pro Payment Status", False, 
                                 f"Payment status incorrect: {actual_status} (expected: {expected_status})")
        else:
            self.log_test("Add Payment to DJ Pro", False, "Failed to add payment", result)
        
        return {"restaurant_expense": restaurant_expense, "dj_expense": dj_expense}
    
    def test_3_delete_payment_and_verify_recalculation(self):
        """Test 3: Eliminar un abono y verificar recálculo"""
        print("\n🗑️ TEST 3: Eliminar abono y verificar recálculo de balance")
        
        # Buscar gasto de DJ Pro
        dj_expense = None
        for exp in self.created_expenses:
            if exp.get("category") == "pago_suplidor" and "DJ Pro" in exp.get("description", ""):
                dj_expense = exp
                break
        
        if not dj_expense:
            self.log_test("Find DJ Pro Expense", False, "DJ Pro expense not found")
            return
        
        # Obtener abonos del gasto de DJ Pro
        abonos_result = self.make_request("GET", f"/expenses/{dj_expense['id']}/abonos", 
                                        token=self.admin_token)
        
        if not abonos_result.get("success"):
            self.log_test("Get DJ Pro Payments", False, "Failed to get DJ Pro payments", abonos_result)
            return
        
        abonos = abonos_result["data"]
        
        if not abonos:
            self.log_test("Find DJ Pro Payment to Delete", False, "No payments found for DJ Pro")
            return
        
        # Tomar el primer abono para eliminar
        abono_to_delete = abonos[0]
        abono_amount = abono_to_delete.get("amount", 0)
        
        self.log_test("Find DJ Pro Payment to Delete", True, 
                     f"Found payment to delete: RD$ {abono_amount} (ID: {abono_to_delete['id']})")
        
        # Eliminar el abono
        delete_result = self.make_request("DELETE", f"/expenses/{dj_expense['id']}/abonos/{abono_to_delete['id']}", 
                                        token=self.admin_token)
        
        if not delete_result.get("success"):
            self.log_test("Delete DJ Pro Payment", False, "Failed to delete payment", delete_result)
            return
        
        self.log_test("Delete DJ Pro Payment", True, f"Successfully deleted RD$ {abono_amount} payment")
        
        # Verificar que el gasto se recalculó correctamente
        updated_expense_result = self.make_request("GET", f"/expenses/{dj_expense['id']}", 
                                                 token=self.admin_token)
        
        if not updated_expense_result.get("success"):
            self.log_test("Get Updated DJ Pro Expense", False, "Failed to get updated expense")
            return
        
        updated_expense = updated_expense_result["data"]
        
        # Verificar balance_due (debería volver a RD$ 3,000)
        expected_balance = 3000.0
        actual_balance = updated_expense.get("balance_due", 0)
        
        if abs(actual_balance - expected_balance) < 0.01:
            self.log_test("DJ Pro Balance Recalculation", True, 
                         f"Balance due correctly recalculated: RD$ {actual_balance}")
        else:
            self.log_test("DJ Pro Balance Recalculation", False, 
                         f"Balance due incorrect after deletion: RD$ {actual_balance} (expected: RD$ {expected_balance})")
        
        # Verificar payment_status (debería volver a 'pending')
        expected_status = "pending"
        actual_status = updated_expense.get("payment_status")
        
        if actual_status == expected_status:
            self.log_test("DJ Pro Payment Status After Deletion", True, 
                         f"Payment status correctly reverted to: {actual_status}")
        else:
            self.log_test("DJ Pro Payment Status After Deletion", False, 
                         f"Payment status incorrect after deletion: {actual_status} (expected: {expected_status})")
        
        # Verificar total_paid
        expected_total_paid = 0.0
        actual_total_paid = updated_expense.get("total_paid", 0)
        
        if abs(actual_total_paid - expected_total_paid) < 0.01:
            self.log_test("DJ Pro Total Paid After Deletion", True, 
                         f"Total paid correctly updated: RD$ {actual_total_paid}")
        else:
            self.log_test("DJ Pro Total Paid After Deletion", False, 
                         f"Total paid incorrect after deletion: RD$ {actual_total_paid} (expected: RD$ {expected_total_paid})")
    
    def test_4_solo_servicios_invoice(self):
        """Test 4: Factura Solo Servicios (sin villa)"""
        print("\n🛎️ TEST 4: Crear factura Solo Servicios sin villa")
        
        # Datos de factura Solo Servicios (sin villa_id)
        solo_servicios_data = {
            "customer_id": self.test_customer["id"],
            "customer_name": self.test_customer["name"],
            # NO villa_id - esto es clave para Solo Servicios
            "rental_type": "servicio",
            "reservation_date": "2025-01-26T00:00:00Z",
            "guests": 0,
            "base_price": 0.0,
            "owner_price": 0.0,
            "subtotal": 7500.0,
            "total_amount": 7500.0,
            "amount_paid": 3000.0,
            "currency": "DOP",
            "status": "confirmed",
            "notes": "Factura Solo Servicios para testing",
            "extra_services": [
                {
                    "service_name": "Decoración",
                    "supplier_name": "Decoraciones Elite",
                    "quantity": 1,
                    "unit_price": 4000.0,
                    "supplier_cost": 2500.0,
                    "total": 4000.0
                },
                {
                    "service_name": "Fotografía",
                    "supplier_name": "Foto Studio",
                    "quantity": 1,
                    "unit_price": 3500.0,
                    "supplier_cost": 2000.0,
                    "total": 3500.0
                }
            ]
        }
        
        # Obtener conteo de gastos antes
        expenses_before_result = self.make_request("GET", "/expenses", token=self.admin_token)
        expenses_before_count = len(expenses_before_result["data"]) if expenses_before_result.get("success") else 0
        
        # Crear factura Solo Servicios
        result = self.make_request("POST", "/reservations", solo_servicios_data, self.admin_token)
        
        if not result.get("success"):
            self.log_test("Create Solo Servicios Invoice", False, "Failed to create Solo Servicios invoice", result)
            return None
        
        solo_servicios_reservation = result["data"]
        self.created_reservations.append(solo_servicios_reservation)
        self.log_test("Create Solo Servicios Invoice", True, 
                     f"Created Solo Servicios invoice #{solo_servicios_reservation['invoice_number']}")
        
        # Verificar que se creó el gasto contenedor
        expenses_after_result = self.make_request("GET", "/expenses", token=self.admin_token)
        
        if not expenses_after_result.get("success"):
            self.log_test("Get Expenses After Solo Servicios", False, "Failed to get expenses")
            return None
        
        expenses_after = expenses_after_result["data"]
        
        # Buscar gasto contenedor con category='pago_servicios'
        container_expense = None
        for exp in expenses_after:
            if (exp.get("category") == "pago_servicios" and 
                exp.get("related_reservation_id") == solo_servicios_reservation["id"]):
                container_expense = exp
                break
        
        if container_expense:
            self.log_test("Solo Servicios Container Expense Created", True, 
                         f"Container expense created with category 'pago_servicios'")
            self.created_expenses.append(container_expense)
            
            # Verificar campos del gasto contenedor
            checks = []
            
            if container_expense.get("category") == "pago_servicios":
                checks.append("✓ Category: pago_servicios")
            else:
                checks.append(f"✗ Category: {container_expense.get('category')}")
            
            # Verificar amount = suma de supplier_cost * quantity
            expected_amount = (2500.0 * 1) + (2000.0 * 1)  # 4500.0
            actual_amount = container_expense.get("amount", 0)
            
            if abs(actual_amount - expected_amount) < 0.01:
                checks.append(f"✓ Amount: RD$ {actual_amount} (sum of supplier costs)")
            else:
                checks.append(f"✗ Amount: RD$ {actual_amount} (expected: RD$ {expected_amount})")
            
            # Verificar services_details
            services_details = container_expense.get("services_details")
            if services_details and isinstance(services_details, list) and len(services_details) == 2:
                checks.append(f"✓ Services details: {len(services_details)} services")
                
                # Verificar contenido de services_details
                service_names = [svc.get("service_name") for svc in services_details]
                if "Decoración" in service_names and "Fotografía" in service_names:
                    checks.append("✓ Service names in details: Decoración, Fotografía")
                else:
                    checks.append(f"✗ Service names in details: {service_names}")
            else:
                checks.append(f"✗ Services details: {services_details}")
            
            # Verificar description
            description = container_expense.get("description", "")
            if "Servicios" in description and solo_servicios_reservation["invoice_number"] in description:
                checks.append("✓ Description contains 'Servicios' and invoice number")
            else:
                checks.append(f"✗ Description: {description}")
            
            all_checks_passed = all("✓" in check for check in checks)
            
            self.log_test("Solo Servicios Container Expense Verification", all_checks_passed,
                         f"Container expense details:\n   " + "\n   ".join(checks))
        else:
            self.log_test("Solo Servicios Container Expense Created", False, 
                         "Container expense with category 'pago_servicios' not found")
        
        # Verificar que también se crearon gastos individuales de suplidores
        supplier_expenses = [exp for exp in expenses_after 
                           if (exp.get("category") == "pago_suplidor" and 
                               exp.get("related_reservation_id") == solo_servicios_reservation["id"])]
        
        if len(supplier_expenses) == 2:
            self.log_test("Solo Servicios Supplier Expenses", True, 
                         f"Created {len(supplier_expenses)} individual supplier expenses")
        else:
            self.log_test("Solo Servicios Supplier Expenses", False, 
                         f"Expected 2 supplier expenses, found {len(supplier_expenses)}")
        
        return solo_servicios_reservation
    
    def test_5_payment_status_synchronization(self):
        """Test 5: Sincronización de Payment Status"""
        print("\n🔄 TEST 5: Verificar sincronización de payment_status entre owner y suplidores")
        
        # Buscar la primera reservación con servicios extras
        if not self.created_reservations:
            self.log_test("Find Reservation for Sync Test", False, "No reservations available")
            return
        
        test_reservation = self.created_reservations[0]  # Primera reservación con servicios
        
        # Obtener gastos relacionados
        expenses_result = self.make_request("GET", "/expenses", token=self.admin_token)
        if not expenses_result.get("success"):
            self.log_test("Get Expenses for Sync Test", False, "Failed to get expenses")
            return
        
        all_expenses = expenses_result["data"]
        related_expenses = [exp for exp in all_expenses 
                          if exp.get("related_reservation_id") == test_reservation["id"]]
        
        # Identificar gasto del propietario
        owner_expense = next((exp for exp in related_expenses 
                            if exp.get("category") == "pago_propietario"), None)
        
        # Identificar gastos de suplidores
        supplier_expenses = [exp for exp in related_expenses 
                           if exp.get("category") == "pago_suplidor"]
        
        if not owner_expense:
            self.log_test("Find Owner Expense for Sync", False, "Owner expense not found")
            return
        
        if len(supplier_expenses) < 2:
            self.log_test("Find Supplier Expenses for Sync", False, 
                         f"Need at least 2 supplier expenses, found {len(supplier_expenses)}")
            return
        
        self.log_test("Setup Sync Test", True, 
                     f"Found owner expense and {len(supplier_expenses)} supplier expenses")
        
        # Test 5.1: Pagar completamente al propietario (pero no a suplidores)
        print("\n   💰 Test 5.1: Pagar completamente al propietario")
        
        owner_amount = owner_expense.get("amount", 0)
        owner_payment_data = {
            "amount": owner_amount,
            "currency": "DOP",
            "payment_method": "transferencia",
            "payment_date": "2025-01-26T10:00:00Z",
            "notes": "Pago completo al propietario"
        }
        
        result = self.make_request("POST", f"/expenses/{owner_expense['id']}/abonos", 
                                 owner_payment_data, self.admin_token)
        
        if result.get("success"):
            self.log_test("Pay Owner Completely", True, f"Paid owner completely: RD$ {owner_amount}")
            
            # Verificar que el gasto del propietario sigue en 'pending' (porque suplidores no están pagados)
            updated_owner_result = self.make_request("GET", f"/expenses/{owner_expense['id']}", 
                                                   token=self.admin_token)
            
            if updated_owner_result.get("success"):
                updated_owner = updated_owner_result["data"]
                owner_status = updated_owner.get("payment_status")
                
                # El status debería seguir siendo 'pending' porque los suplidores no están pagados
                if owner_status == "pending":
                    self.log_test("Owner Status Sync (Suppliers Unpaid)", True, 
                                 f"Owner status remains 'pending' while suppliers are unpaid")
                else:
                    self.log_test("Owner Status Sync (Suppliers Unpaid)", False, 
                                 f"Owner status is '{owner_status}' but should be 'pending' while suppliers unpaid")
        else:
            self.log_test("Pay Owner Completely", False, "Failed to pay owner", result)
            return
        
        # Test 5.2: Pagar completamente a todos los suplidores
        print("\n   💰 Test 5.2: Pagar completamente a todos los suplidores")
        
        for i, supplier_expense in enumerate(supplier_expenses):
            supplier_amount = supplier_expense.get("amount", 0)
            supplier_payment_data = {
                "amount": supplier_amount,
                "currency": "DOP",
                "payment_method": "efectivo",
                "payment_date": "2025-01-26T11:00:00Z",
                "notes": f"Pago completo a suplidor {i+1}"
            }
            
            result = self.make_request("POST", f"/expenses/{supplier_expense['id']}/abonos", 
                                     supplier_payment_data, self.admin_token)
            
            if result.get("success"):
                self.log_test(f"Pay Supplier {i+1} Completely", True, 
                             f"Paid supplier {i+1} completely: RD$ {supplier_amount}")
            else:
                self.log_test(f"Pay Supplier {i+1} Completely", False, 
                             f"Failed to pay supplier {i+1}", result)
                return
        
        # Test 5.3: Verificar que ahora el gasto del propietario cambia a 'paid'
        print("\n   ✅ Test 5.3: Verificar sincronización final")
        
        final_owner_result = self.make_request("GET", f"/expenses/{owner_expense['id']}", 
                                             token=self.admin_token)
        
        if final_owner_result.get("success"):
            final_owner = final_owner_result["data"]
            final_owner_status = final_owner.get("payment_status")
            
            # Ahora el status debería ser 'paid' porque tanto el propietario como todos los suplidores están pagados
            if final_owner_status == "paid":
                self.log_test("Owner Status Final Sync", True, 
                             f"Owner status correctly updated to 'paid' after all suppliers paid")
            else:
                self.log_test("Owner Status Final Sync", False, 
                             f"Owner status is '{final_owner_status}' but should be 'paid' after all payments")
        else:
            self.log_test("Get Final Owner Status", False, "Failed to get final owner status")
    
    def run_all_tests(self):
        """Run all expense supplier tests"""
        print("🚀 Starting Comprehensive Expenses Supplier Testing")
        print("=" * 80)
        
        # Setup
        if not self.setup_authentication():
            print("❌ Authentication setup failed. Aborting tests.")
            return
        
        if not self.setup_test_data():
            print("❌ Test data setup failed. Aborting tests.")
            return
        
        # Run tests
        print("\n" + "=" * 80)
        self.test_1_reservation_with_extra_services()
        
        print("\n" + "=" * 80)
        self.test_2_add_partial_payments_to_suppliers()
        
        print("\n" + "=" * 80)
        self.test_3_delete_payment_and_verify_recalculation()
        
        print("\n" + "=" * 80)
        self.test_4_solo_servicios_invoice()
        
        print("\n" + "=" * 80)
        self.test_5_payment_status_synchronization()
        
        # Summary
        print("\n" + "=" * 80)
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"📊 TEST SUMMARY")
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for test in self.test_results:
                if not test["success"]:
                    print(f"   - {test['test']}: {test['message']}")
        
        print("\n🎯 TESTING COMPLETED")

if __name__ == "__main__":
    tester = ExpensesSupplierTester()
    tester.run_all_tests()