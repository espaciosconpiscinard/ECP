#!/usr/bin/env python3
"""
Focused Invoice Number Testing for Abonos
Tests the new invoice number functionality as requested
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from environment
BACKEND_URL = "https://villa-expense-mgr.preview.emergentagent.com/api"

class InvoiceNumberTester:
    def __init__(self):
        self.admin_token = None
        self.employee_token = None
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
    
    def login_users(self):
        """Login admin and employee users"""
        # Login admin
        admin_login = {
            "username": "admin",
            "password": "admin123"
        }
        
        result = self.make_request("POST", "/auth/login", admin_login)
        if result.get("success"):
            self.admin_token = result["data"]["access_token"]
            self.log_test("Admin Login", True, "Admin logged in successfully")
        else:
            self.log_test("Admin Login", False, "Admin login failed", result)
            return False
        
        # Login employee
        employee_login = {
            "username": "emp1",
            "password": "emp123"
        }
        
        result = self.make_request("POST", "/auth/login", employee_login)
        if result.get("success"):
            self.employee_token = result["data"]["access_token"]
            self.log_test("Employee Login", True, "Employee logged in successfully")
        else:
            self.log_test("Employee Login", False, "Employee login failed", result)
            return False
        
        return True
    
    def setup_test_data(self):
        """Create test customer and reservation"""
        # Create test customer
        customer_data = {
            "name": "Test Cliente Abonos",
            "phone": "809-555-9999",
            "email": "test.abonos@email.com",
            "address": "Santo Domingo, RD"
        }
        
        customer_result = self.make_request("POST", "/customers", customer_data, self.admin_token)
        if not customer_result.get("success"):
            self.log_test("Create Test Customer", False, "Failed to create test customer", customer_result)
            return None, None, None
        
        test_customer = customer_result["data"]
        self.log_test("Create Test Customer", True, f"Created customer: {test_customer['name']}")
        
        # Get a villa
        villas_result = self.make_request("GET", "/villas", token=self.admin_token)
        if not villas_result.get("success") or not villas_result["data"]:
            self.log_test("Get Villa", False, "No villas available")
            return None, None, None
        
        test_villa = villas_result["data"][0]
        
        # Create reservation with owner_price > 0
        reservation_data = {
            "customer_id": test_customer["id"],
            "customer_name": test_customer["name"],
            "villa_id": test_villa["id"],
            "villa_code": test_villa["code"],
            "rental_type": "pasadia",
            "reservation_date": "2025-01-15T00:00:00Z",
            "check_in_time": "10:00 AM",
            "check_out_time": "8:00 PM",
            "guests": 6,
            "base_price": 20000.0,
            "owner_price": 12000.0,
            "subtotal": 20000.0,
            "total_amount": 20000.0,
            "amount_paid": 5000.0,
            "currency": "DOP",
            "status": "confirmed",
            "notes": "Test reservation for invoice number testing"
        }
        
        reservation_result = self.make_request("POST", "/reservations", reservation_data, self.admin_token)
        if not reservation_result.get("success"):
            self.log_test("Create Test Reservation", False, "Failed to create test reservation", reservation_result)
            return None, None, None
        
        test_reservation = reservation_result["data"]
        self.log_test("Create Test Reservation", True, f"Created reservation #{test_reservation['invoice_number']}")
        
        # Find auto-generated expense
        expenses_result = self.make_request("GET", "/expenses", token=self.admin_token)
        if not expenses_result.get("success"):
            return test_customer, test_reservation, None
        
        auto_expense = None
        for expense in expenses_result["data"]:
            if (expense.get("category") == "pago_propietario" and 
                expense.get("related_reservation_id") == test_reservation["id"]):
                auto_expense = expense
                break
        
        if auto_expense:
            self.log_test("Find Auto-Generated Expense", True, f"Found auto-generated expense: {auto_expense['id']}")
        else:
            self.log_test("Find Auto-Generated Expense", False, "Auto-generated expense not found")
        
        return test_customer, test_reservation, auto_expense
    
    def test_reservation_abonos(self, reservation):
        """Test invoice number system for reservation abonos"""
        print("\n🧾 Testing Reservation Abonos Invoice Numbers")
        
        # Test 1.1: Employee creates abono with auto-generated invoice_number
        print("   Test 1.1: Employee abono with auto-generated invoice_number")
        
        abono_data_employee = {
            "amount": 1000.0,
            "currency": "DOP",
            "payment_method": "efectivo",
            "payment_date": "2025-01-15T10:00:00Z",
            "notes": "Primer abono - auto-generado"
        }
        
        abono_result = self.make_request("POST", f"/reservations/{reservation['id']}/abonos", 
                                       abono_data_employee, self.employee_token)
        
        if abono_result.get("success"):
            created_abono = abono_result["data"]
            if created_abono.get("invoice_number"):
                self.log_test("Employee Auto-Generated Invoice (Reservation)", True, 
                             f"Employee abono created with invoice_number: {created_abono['invoice_number']}")
                employee_invoice_num = created_abono["invoice_number"]
            else:
                self.log_test("Employee Auto-Generated Invoice (Reservation)", False, 
                             "Employee abono missing invoice_number")
                return
        else:
            self.log_test("Employee Auto-Generated Invoice (Reservation)", False, 
                         "Failed to create employee abono", abono_result)
            return
        
        # Test 1.2: Admin creates abono with manual invoice_number
        print("   Test 1.2: Admin abono with manual invoice_number")
        
        manual_invoice_num = "9999"
        abono_data_admin = {
            "amount": 500.0,
            "currency": "DOP",
            "payment_method": "transferencia",
            "payment_date": "2025-01-16T10:00:00Z",
            "notes": "Segundo abono - número manual",
            "invoice_number": manual_invoice_num
        }
        
        admin_abono_result = self.make_request("POST", f"/reservations/{reservation['id']}/abonos", 
                                             abono_data_admin, self.admin_token)
        
        if admin_abono_result.get("success"):
            admin_abono = admin_abono_result["data"]
            if admin_abono.get("invoice_number") == manual_invoice_num:
                self.log_test("Admin Manual Invoice (Reservation)", True, 
                             f"Admin abono created with manual invoice_number: {manual_invoice_num}")
            else:
                self.log_test("Admin Manual Invoice (Reservation)", False, 
                             f"Admin abono has wrong invoice_number: {admin_abono.get('invoice_number')}")
        else:
            self.log_test("Admin Manual Invoice (Reservation)", False, 
                         "Failed to create admin abono with manual invoice_number", admin_abono_result)
        
        # Test 1.3: Try to create duplicate invoice_number (should fail)
        print("   Test 1.3: Duplicate invoice_number validation")
        
        duplicate_abono_data = {
            "amount": 300.0,
            "currency": "DOP",
            "payment_method": "efectivo",
            "payment_date": "2025-01-17T10:00:00Z",
            "notes": "Intento de duplicado",
            "invoice_number": manual_invoice_num
        }
        
        duplicate_result = self.make_request("POST", f"/reservations/{reservation['id']}/abonos", 
                                           duplicate_abono_data, self.admin_token)
        
        if duplicate_result.get("status_code") == 400:
            error_message = duplicate_result.get("data", {}).get("detail", "")
            if "already in use" in error_message or "ya existe" in error_message:
                self.log_test("Duplicate Invoice Validation (Reservation)", True, 
                             f"Duplicate invoice_number correctly rejected")
            else:
                self.log_test("Duplicate Invoice Validation (Reservation)", False, 
                             f"Wrong error message: {error_message}")
        else:
            self.log_test("Duplicate Invoice Validation (Reservation)", False, 
                         f"Duplicate invoice_number not rejected. Status: {duplicate_result.get('status_code')}")
        
        # Test 1.4: Employee cannot specify manual invoice_number
        print("   Test 1.4: Employee forbidden from manual invoice_number")
        
        employee_manual_data = {
            "amount": 200.0,
            "currency": "DOP",
            "payment_method": "efectivo",
            "payment_date": "2025-01-18T10:00:00Z",
            "notes": "Empleado intenta número manual",
            "invoice_number": "8888"
        }
        
        employee_manual_result = self.make_request("POST", f"/reservations/{reservation['id']}/abonos", 
                                                 employee_manual_data, self.employee_token)
        
        if employee_manual_result.get("status_code") == 403:
            self.log_test("Employee Manual Invoice Forbidden (Reservation)", True, 
                         "Employee correctly forbidden from specifying manual invoice_number")
        else:
            self.log_test("Employee Manual Invoice Forbidden (Reservation)", False, 
                         f"Employee manual invoice_number not properly forbidden. Status: {employee_manual_result.get('status_code')}")
        
        # Verify abonos in list
        abonos_result = self.make_request("GET", f"/reservations/{reservation['id']}/abonos", 
                                        token=self.admin_token)
        
        if abonos_result.get("success"):
            abonos = abonos_result["data"]
            abonos_with_invoice = [a for a in abonos if a.get("invoice_number")]
            
            if len(abonos_with_invoice) == len(abonos):
                self.log_test("All Reservation Abonos Have Invoice Numbers", True, 
                             f"All {len(abonos)} reservation abonos have invoice_number")
            else:
                self.log_test("All Reservation Abonos Have Invoice Numbers", False, 
                             f"Only {len(abonos_with_invoice)}/{len(abonos)} reservation abonos have invoice_number")
        
        return manual_invoice_num
    
    def test_expense_abonos(self, expense, reservation_invoice_num):
        """Test invoice number system for expense abonos"""
        print("\n💰 Testing Expense Abonos Invoice Numbers")
        
        if not expense:
            self.log_test("Expense Abonos Test", False, "No expense available for testing")
            return
        
        # Test 2.1: Employee creates abono with auto-generated invoice_number
        print("   Test 2.1: Employee abono with auto-generated invoice_number")
        
        expense_abono_employee = {
            "amount": 2000.0,
            "currency": "DOP",
            "payment_method": "efectivo",
            "payment_date": "2025-01-19T10:00:00Z",
            "notes": "Abono a gasto - auto-generado"
        }
        
        expense_abono_result = self.make_request("POST", f"/expenses/{expense['id']}/abonos", 
                                               expense_abono_employee, self.employee_token)
        
        if expense_abono_result.get("success"):
            expense_abono = expense_abono_result["data"]
            if expense_abono.get("invoice_number"):
                self.log_test("Employee Auto-Generated Invoice (Expense)", True, 
                             f"Employee expense abono created with invoice_number: {expense_abono['invoice_number']}")
            else:
                self.log_test("Employee Auto-Generated Invoice (Expense)", False, 
                             "Employee expense abono missing invoice_number")
        else:
            self.log_test("Employee Auto-Generated Invoice (Expense)", False, 
                         "Failed to create employee expense abono", expense_abono_result)
        
        # Test 2.2: Admin creates abono with manual invoice_number
        print("   Test 2.2: Admin abono with manual invoice_number")
        
        manual_expense_invoice = "7777"
        expense_abono_admin = {
            "amount": 1500.0,
            "currency": "DOP",
            "payment_method": "transferencia",
            "payment_date": "2025-01-20T10:00:00Z",
            "notes": "Abono a gasto - número manual",
            "invoice_number": manual_expense_invoice
        }
        
        admin_expense_abono_result = self.make_request("POST", f"/expenses/{expense['id']}/abonos", 
                                                     expense_abono_admin, self.admin_token)
        
        if admin_expense_abono_result.get("success"):
            admin_expense_abono = admin_expense_abono_result["data"]
            if admin_expense_abono.get("invoice_number") == manual_expense_invoice:
                self.log_test("Admin Manual Invoice (Expense)", True, 
                             f"Admin expense abono created with manual invoice_number: {manual_expense_invoice}")
            else:
                self.log_test("Admin Manual Invoice (Expense)", False, 
                             f"Admin expense abono has wrong invoice_number: {admin_expense_abono.get('invoice_number')}")
        else:
            self.log_test("Admin Manual Invoice (Expense)", False, 
                         "Failed to create admin expense abono with manual invoice_number", admin_expense_abono_result)
        
        # Test 2.3: Cross-collection validation
        print("   Test 2.3: Cross-collection duplicate validation")
        
        cross_duplicate_data = {
            "amount": 800.0,
            "currency": "DOP",
            "payment_method": "efectivo",
            "payment_date": "2025-01-21T10:00:00Z",
            "notes": "Intento usar número de reservación",
            "invoice_number": reservation_invoice_num
        }
        
        cross_duplicate_result = self.make_request("POST", f"/expenses/{expense['id']}/abonos", 
                                                 cross_duplicate_data, self.admin_token)
        
        if cross_duplicate_result.get("status_code") == 400:
            error_message = cross_duplicate_result.get("data", {}).get("detail", "")
            if "already in use" in error_message or "ya existe" in error_message:
                self.log_test("Cross-Collection Duplicate Validation", True, 
                             f"Cross-collection duplicate correctly rejected")
            else:
                self.log_test("Cross-Collection Duplicate Validation", False, 
                             f"Wrong error message for cross-collection duplicate: {error_message}")
        else:
            self.log_test("Cross-Collection Duplicate Validation", False, 
                         f"Cross-collection duplicate not rejected. Status: {cross_duplicate_result.get('status_code')}")
        
        # Verify expense abonos
        exp_abonos_result = self.make_request("GET", f"/expenses/{expense['id']}/abonos", 
                                            token=self.admin_token)
        
        if exp_abonos_result.get("success"):
            exp_abonos = exp_abonos_result["data"]
            exp_abonos_with_invoice = [a for a in exp_abonos if a.get("invoice_number")]
            
            if len(exp_abonos_with_invoice) == len(exp_abonos):
                self.log_test("All Expense Abonos Have Invoice Numbers", True, 
                             f"All {len(exp_abonos)} expense abonos have invoice_number")
            else:
                self.log_test("All Expense Abonos Have Invoice Numbers", False, 
                             f"Only {len(exp_abonos_with_invoice)}/{len(exp_abonos)} expense abonos have invoice_number")
    
    def test_unique_auto_generated_numbers(self, reservation):
        """Test that auto-generated numbers are unique and consecutive"""
        print("\n🔢 Testing Unique Auto-Generated Numbers")
        
        auto_generated_numbers = []
        
        for i in range(3):
            auto_abono_data = {
                "amount": 100.0 + (i * 50),
                "currency": "DOP",
                "payment_method": "efectivo",
                "payment_date": f"2025-01-{22+i}T10:00:00Z",
                "notes": f"Auto abono #{i+1}"
            }
            
            auto_result = self.make_request("POST", f"/reservations/{reservation['id']}/abonos", 
                                          auto_abono_data, self.employee_token)
            
            if auto_result.get("success"):
                auto_abono = auto_result["data"]
                invoice_num = auto_abono.get("invoice_number")
                if invoice_num:
                    auto_generated_numbers.append(invoice_num)
        
        if len(auto_generated_numbers) == 3:
            unique_numbers = set(auto_generated_numbers)
            if len(unique_numbers) == 3:
                self.log_test("Unique Auto-Generated Numbers", True, 
                             f"All auto-generated numbers are unique: {auto_generated_numbers}")
                
                # Check if numbers are consecutive
                try:
                    sorted_numbers = sorted([int(num) for num in auto_generated_numbers])
                    is_consecutive = all(sorted_numbers[i] == sorted_numbers[i-1] + 1 for i in range(1, len(sorted_numbers)))
                    
                    if is_consecutive:
                        self.log_test("Consecutive Invoice Numbers", True, 
                                     f"Auto-generated numbers are consecutive: {sorted_numbers}")
                    else:
                        self.log_test("Consecutive Invoice Numbers", False, 
                                     f"Auto-generated numbers are not consecutive: {sorted_numbers}")
                except ValueError:
                    self.log_test("Consecutive Invoice Numbers", False, 
                                 f"Non-numeric invoice numbers: {auto_generated_numbers}")
            else:
                self.log_test("Unique Auto-Generated Numbers", False, 
                             f"Duplicate auto-generated numbers found: {auto_generated_numbers}")
        else:
            self.log_test("Create Multiple Auto Abonos", False, 
                         f"Failed to create 3 auto abonos. Created: {len(auto_generated_numbers)}")
    
    def run_tests(self):
        """Run all invoice number tests"""
        print("🧾 Starting Invoice Number System Tests for Abonos")
        print("=" * 60)
        
        # Login users
        if not self.login_users():
            return False
        
        # Setup test data
        customer, reservation, expense = self.setup_test_data()
        if not customer or not reservation:
            return False
        
        # Test reservation abonos
        reservation_invoice_num = self.test_reservation_abonos(reservation)
        
        # Test expense abonos
        self.test_expense_abonos(expense, reservation_invoice_num)
        
        # Test unique auto-generated numbers
        self.test_unique_auto_generated_numbers(reservation)
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 INVOICE NUMBER TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['message']}")
        
        return failed == 0

if __name__ == "__main__":
    tester = InvoiceNumberTester()
    success = tester.run_tests()
    
    if success:
        print("\n🎉 All invoice number tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some invoice number tests failed!")
        sys.exit(1)