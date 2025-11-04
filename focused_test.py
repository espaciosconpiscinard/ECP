#!/usr/bin/env python3
"""
Focused Backend Testing for New Functionality
Tests DNI field in customers and auto-generated expense deletion
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from environment
BACKEND_URL = "https://piscinapp-1.preview.emergentagent.com/api"

class FocusedTester:
    def __init__(self):
        self.admin_token = None
        self.test_results = []
        
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
    
    def login_admin(self):
        """Login as admin"""
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        result = self.make_request("POST", "/auth/login", login_data)
        
        if result.get("success"):
            self.admin_token = result["data"]["access_token"]
            self.log_test("Admin Login", True, "Admin logged in successfully")
            return True
        else:
            self.log_test("Admin Login", False, "Admin login failed", result)
            return False

    def test_customer_dni_field(self):
        """Test DNI field functionality in Customer model"""
        print("\n📋 TESTING: Campo DNI en Customer")
        print("=" * 50)
        
        # Test 1: Create customer WITH DNI
        print("\n1️⃣ Crear cliente CON DNI")
        customer_with_dni = {
            "name": "Juan Pérez",
            "phone": "809-555-1234",
            "dni": "001-1234567-8",
            "email": "juan@test.com"
        }
        
        result = self.make_request("POST", "/customers", customer_with_dni, self.admin_token)
        
        if result.get("success"):
            created_customer = result["data"]
            if created_customer.get("dni") == "001-1234567-8":
                self.log_test("Crear Cliente CON DNI", True, f"Cliente creado con DNI: {created_customer['dni']}")
                customer_with_dni_id = created_customer["id"]
            else:
                self.log_test("Crear Cliente CON DNI", False, f"Campo DNI faltante o incorrecto: {created_customer.get('dni')}")
                return False
        else:
            self.log_test("Crear Cliente CON DNI", False, "Error al crear cliente con DNI", result)
            return False
        
        # Test 2: Create customer WITHOUT DNI (optional field)
        print("\n2️⃣ Crear cliente SIN DNI (campo opcional)")
        customer_without_dni = {
            "name": "María González",
            "phone": "809-555-5678",
            "email": "maria@test.com"
        }
        
        result = self.make_request("POST", "/customers", customer_without_dni, self.admin_token)
        
        if result.get("success"):
            created_customer = result["data"]
            dni_value = created_customer.get("dni")
            if dni_value is None or dni_value == "":
                self.log_test("Crear Cliente SIN DNI", True, "Cliente creado exitosamente sin campo DNI")
                customer_without_dni_id = created_customer["id"]
            else:
                self.log_test("Crear Cliente SIN DNI", False, f"Valor DNI inesperado: {dni_value}")
                return False
        else:
            self.log_test("Crear Cliente SIN DNI", False, "Error al crear cliente sin DNI", result)
            return False
        
        # Test 3: Get customers list and verify DNI field is present
        print("\n3️⃣ Obtener lista de clientes y verificar campo DNI")
        result = self.make_request("GET", "/customers", token=self.admin_token)
        
        if result.get("success"):
            customers = result["data"]
            
            # Find our test customers
            customer_with_dni_found = None
            customer_without_dni_found = None
            
            for customer in customers:
                if customer.get("id") == customer_with_dni_id:
                    customer_with_dni_found = customer
                elif customer.get("id") == customer_without_dni_id:
                    customer_without_dni_found = customer
            
            # Verify customer with DNI
            if customer_with_dni_found:
                if customer_with_dni_found.get("dni") == "001-1234567-8":
                    self.log_test("Verificar Cliente CON DNI en Lista", True, f"Campo DNI presente y correcto: {customer_with_dni_found['dni']}")
                else:
                    self.log_test("Verificar Cliente CON DNI en Lista", False, f"Campo DNI incorrecto: {customer_with_dni_found.get('dni')}")
            else:
                self.log_test("Verificar Cliente CON DNI en Lista", False, "Cliente con DNI no encontrado en lista")
            
            # Verify customer without DNI
            if customer_without_dni_found:
                dni_value = customer_without_dni_found.get("dni")
                if dni_value is None or dni_value == "":
                    self.log_test("Verificar Cliente SIN DNI en Lista", True, "Cliente sin DNI muestra correctamente valor nulo")
                else:
                    self.log_test("Verificar Cliente SIN DNI en Lista", False, f"Valor DNI inesperado: {dni_value}")
            else:
                self.log_test("Verificar Cliente SIN DNI en Lista", False, "Cliente sin DNI no encontrado en lista")
            
            # Test 4: Verify DNI field structure in API response
            dni_field_present = any("dni" in customer for customer in customers)
            if dni_field_present:
                self.log_test("Estructura Campo DNI", True, "Campo DNI presente en respuestas de API de clientes")
            else:
                self.log_test("Estructura Campo DNI", False, "Campo DNI faltante en respuestas de API de clientes")
                
            return True
        else:
            self.log_test("Obtener Lista Clientes", False, "Error al obtener lista de clientes", result)
            return False

    def test_auto_generated_expense_deletion(self):
        """Test deletion of auto-generated expenses"""
        print("\n🗑️ TESTING: Eliminación de gastos auto-generados")
        print("=" * 50)
        
        # Step 1: Get a villa and customer for testing
        print("\n1️⃣ Obtener villa y cliente para prueba")
        villas_result = self.make_request("GET", "/villas", token=self.admin_token)
        if not villas_result.get("success") or not villas_result["data"]:
            self.log_test("Obtener Villa para Prueba", False, "No hay villas disponibles")
            return False
        
        test_villa = villas_result["data"][0]
        self.log_test("Obtener Villa para Prueba", True, f"Usando villa: {test_villa['code']}")
        
        customers_result = self.make_request("GET", "/customers", token=self.admin_token)
        if not customers_result.get("success") or not customers_result["data"]:
            self.log_test("Obtener Cliente para Prueba", False, "No hay clientes disponibles")
            return False
        
        test_customer = customers_result["data"][0]
        self.log_test("Obtener Cliente para Prueba", True, f"Usando cliente: {test_customer['name']}")
        
        # Step 2: Create reservation with owner_price > 0 to auto-generate expense
        print("\n2️⃣ Crear reservación con owner_price > 0 (auto-genera gasto)")
        reservation_data = {
            "customer_id": test_customer["id"],
            "customer_name": test_customer["name"],
            "villa_id": test_villa["id"],
            "villa_code": test_villa["code"],
            "rental_type": "pasadia",
            "reservation_date": "2024-01-17T00:00:00Z",
            "check_in_time": "10:00 AM",
            "check_out_time": "6:00 PM",
            "guests": 4,
            "base_price": 12000.0,
            "owner_price": 5000.0,  # This will trigger auto-expense creation
            "subtotal": 12000.0,
            "total_amount": 12000.0,
            "amount_paid": 6000.0,
            "currency": "DOP",
            "status": "confirmed",
            "notes": "Reservación de prueba para eliminación de gastos"
        }
        
        reservation_result = self.make_request("POST", "/reservations", reservation_data, self.admin_token)
        
        if not reservation_result.get("success"):
            self.log_test("Crear Reservación con Owner Price", False, "Error al crear reservación", reservation_result)
            return False
        
        created_reservation = reservation_result["data"]
        self.log_test("Crear Reservación con Owner Price", True, f"Reservación creada #{created_reservation['invoice_number']} con owner_price: 5000.0")
        
        # Step 3: Get expenses and find the auto-generated one
        print("\n3️⃣ Obtener gastos y verificar gasto auto-generado")
        expenses_result = self.make_request("GET", "/expenses", token=self.admin_token)
        
        if not expenses_result.get("success"):
            self.log_test("Obtener Gastos", False, "Error al obtener gastos", expenses_result)
            return False
        
        expenses = expenses_result["data"]
        
        # Find the auto-generated expense
        auto_expense = None
        for expense in expenses:
            if (expense.get("category") == "pago_propietario" and 
                expense.get("related_reservation_id") == created_reservation["id"]):
                auto_expense = expense
                break
        
        if not auto_expense:
            self.log_test("Encontrar Gasto Auto-generado", False, "Gasto auto-generado no encontrado")
            return False
        
        self.log_test("Encontrar Gasto Auto-generado", True, f"Gasto auto-generado encontrado con ID: {auto_expense['id']}")
        
        # Verify the expense has related_reservation_id
        if auto_expense.get("related_reservation_id"):
            self.log_test("Verificar Marcador Auto-generado", True, f"Gasto tiene related_reservation_id: {auto_expense['related_reservation_id']}")
        else:
            self.log_test("Verificar Marcador Auto-generado", False, "Gasto sin related_reservation_id")
        
        # Step 4: Attempt to delete the auto-generated expense (this MUST work now)
        print("\n4️⃣ Intentar eliminar gasto auto-generado (DEBE funcionar)")
        delete_result = self.make_request("DELETE", f"/expenses/{auto_expense['id']}", token=self.admin_token)
        
        if delete_result.get("success"):
            self.log_test("Eliminar Gasto Auto-generado", True, "Gasto auto-generado eliminado exitosamente")
        else:
            self.log_test("Eliminar Gasto Auto-generado", False, f"Error al eliminar gasto auto-generado. Status: {delete_result.get('status_code')}", delete_result)
            return False
        
        # Step 5: Verify the expense was actually deleted
        print("\n5️⃣ Verificar que el gasto fue eliminado exitosamente")
        verify_result = self.make_request("GET", "/expenses", token=self.admin_token)
        
        if verify_result.get("success"):
            remaining_expenses = verify_result["data"]
            
            # Check if the deleted expense is still in the list
            deleted_expense_found = any(exp.get("id") == auto_expense["id"] for exp in remaining_expenses)
            
            if not deleted_expense_found:
                self.log_test("Verificar Eliminación de Gasto", True, "Gasto auto-generado eliminado exitosamente de la lista")
            else:
                self.log_test("Verificar Eliminación de Gasto", False, "Gasto auto-generado aún aparece en la lista")
                return False
        else:
            self.log_test("Verificar Eliminación de Gasto", False, "Error al verificar eliminación", verify_result)
            return False
        
        return True

    def run_focused_tests(self):
        """Run focused tests for new functionality"""
        print("🎯 PRUEBAS ENFOCADAS - NUEVAS FUNCIONALIDADES")
        print("=" * 60)
        print("Sistema: Espacios Con Piscina")
        print("Usuario: admin/admin123")
        print("=" * 60)
        
        # Login
        if not self.login_admin():
            print("❌ Error en login - abortando pruebas")
            return False
        
        # Test DNI field
        dni_success = self.test_customer_dni_field()
        
        # Test auto-generated expense deletion
        expense_success = self.test_auto_generated_expense_deletion()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 RESUMEN DE PRUEBAS")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"Total Pruebas: {len(self.test_results)}")
        print(f"✅ Exitosas: {passed}")
        print(f"❌ Fallidas: {failed}")
        
        if failed > 0:
            print("\n🔍 PRUEBAS FALLIDAS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['message']}")
        
        # Detailed validation results
        print("\n🎯 VALIDACIONES ESPERADAS:")
        print("✅ Campo DNI presente en respuesta de clientes" if dni_success else "❌ Campo DNI no funcional")
        print("✅ Clientes se pueden crear con y sin DNI" if dni_success else "❌ Problemas con creación de clientes")
        print("✅ Gastos auto-generados tienen related_reservation_id" if expense_success else "❌ Gastos auto-generados sin marcador")
        print("✅ Gastos auto-generados se pueden eliminar exitosamente (código 200)" if expense_success else "❌ No se pueden eliminar gastos auto-generados")
        print("✅ Después de eliminar, el gasto no aparece en GET /api/expenses" if expense_success else "❌ Gasto eliminado aún aparece en lista")
        
        return failed == 0

if __name__ == "__main__":
    tester = FocusedTester()
    success = tester.run_focused_tests()
    
    if success:
        print("\n🎉 ¡Todas las pruebas pasaron exitosamente!")
        sys.exit(0)
    else:
        print("\n💥 ¡Algunas pruebas fallaron!")
        sys.exit(1)