#!/usr/bin/env python3
"""
Critical Bug Fixes Testing - Focused Test for the Two Priority Issues
"""

import requests
import json
import sys
import time
from typing import Dict, Any, Optional

# Backend URL from environment
BACKEND_URL = "https://rental-quoter-1.preview.emergentagent.com/api"

class CriticalBugTester:
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
    
    def setup_admin_login(self):
        """Login as admin"""
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        result = self.make_request("POST", "/auth/login", login_data)
        
        if result.get("success"):
            self.admin_token = result["data"]["access_token"]
            user_role = result["data"]["user"]["role"]
            if user_role == "admin":
                self.log_test("Admin Login", True, f"Admin logged in successfully, role: {user_role}")
                return True
            else:
                self.log_test("Admin Login", False, f"Wrong role returned: {user_role}")
                return False
        else:
            self.log_test("Admin Login", False, "Admin login failed", result)
            return False

    def test_ghost_invoice_bug_cliente_rapido(self):
        """Test Fix: Ghost Invoice Bug - Cliente Rápido"""
        print("\n👻 Testing Ghost Invoice Bug Fix - Cliente Rápido")
        
        # Step 1: Count existing invoices/reservations before test
        reservations_before_result = self.make_request("GET", "/reservations", token=self.admin_token)
        if not reservations_before_result.get("success"):
            self.log_test("Get Reservations Count Before", False, "Failed to get reservations", reservations_before_result)
            return False
        
        reservations_before = reservations_before_result["data"]
        count_before = len(reservations_before)
        self.log_test("Get Reservations Count Before", True, f"Found {count_before} existing reservations")
        
        # Step 2: Create a new customer (simulating "Cliente Rápido" functionality)
        new_customer_data = {
            "name": "Cliente Rápido Test Critical",
            "phone": "809-555-9999",
            "email": "cliente.rapido.critical@test.com",
            "address": "Santo Domingo, RD",
            "dni": "001-9876543-9"
        }
        
        customer_result = self.make_request("POST", "/customers", new_customer_data, self.admin_token)
        
        if not customer_result.get("success"):
            self.log_test("Create Cliente Rápido", False, "Failed to create new customer", customer_result)
            return False
        
        created_customer = customer_result["data"]
        self.log_test("Create Cliente Rápido", True, f"Created customer: {created_customer['name']} (ID: {created_customer['id']})")
        
        # Step 3: Verify NO ghost invoice was created
        time.sleep(1)  # Brief pause to ensure any async operations complete
        
        reservations_after_result = self.make_request("GET", "/reservations", token=self.admin_token)
        if not reservations_after_result.get("success"):
            self.log_test("Get Reservations Count After", False, "Failed to get reservations after customer creation", reservations_after_result)
            return False
        
        reservations_after = reservations_after_result["data"]
        count_after = len(reservations_after)
        
        # The count should remain the same - NO new reservations should be created
        if count_after == count_before:
            self.log_test("Verify No Ghost Invoice Created", True, f"✅ No ghost invoice created. Count remained at {count_before}")
            ghost_test_passed = True
        else:
            self.log_test("Verify No Ghost Invoice Created", False, f"❌ Ghost invoice detected! Count increased from {count_before} to {count_after}")
            ghost_test_passed = False
            
            # Debug: Show the new reservations
            print("   🔍 New reservations found:")
            for reservation in reservations_after:
                if reservation not in reservations_before:
                    print(f"      - Invoice #{reservation.get('invoice_number')}: {reservation.get('customer_name')} - {reservation.get('total_amount', 0)} {reservation.get('currency', 'DOP')}")
        
        # Step 4: Verify customer was created and can be retrieved
        customers_result = self.make_request("GET", "/customers", token=self.admin_token)
        if customers_result.get("success"):
            customers = customers_result["data"]
            created_customer_found = any(c.get("id") == created_customer["id"] for c in customers)
            
            if created_customer_found:
                self.log_test("Verify Customer Created Successfully", True, "✅ New customer appears in customers list")
            else:
                self.log_test("Verify Customer Created Successfully", False, "❌ New customer not found in customers list")
                ghost_test_passed = False
        else:
            self.log_test("Get Customers List", False, "Failed to verify customer creation", customers_result)
            ghost_test_passed = False
        
        print(f"   🎯 GHOST INVOICE BUG TEST: {'✅ PASSED' if ghost_test_passed else '❌ FAILED'}")
        return ghost_test_passed

    def test_solo_servicios_expense_display(self):
        """Test Fix: Solo Servicios Expense Display"""
        print("\n🛠️ Testing Solo Servicios Expense Display Fix")
        
        # Step 1: Get current expenses in "pago_servicios" category
        expenses_before_result = self.make_request("GET", "/expenses", token=self.admin_token)
        if not expenses_before_result.get("success"):
            self.log_test("Get Expenses Before Solo Servicios", False, "Failed to get expenses", expenses_before_result)
            return False
        
        expenses_before = expenses_before_result["data"]
        pago_servicios_before = [e for e in expenses_before if e.get("category") == "pago_servicios"]
        count_before = len(pago_servicios_before)
        
        self.log_test("Get Pago Servicios Expenses Before", True, f"Found {count_before} existing 'pago_servicios' expenses")
        
        # Step 2: Get a customer for the test
        customers_result = self.make_request("GET", "/customers", token=self.admin_token)
        if not customers_result.get("success") or not customers_result["data"]:
            self.log_test("Get Customer for Solo Servicios", False, "No customers available")
            return False
        
        test_customer = customers_result["data"][0]
        self.log_test("Get Customer for Solo Servicios", True, f"Using customer: {test_customer['name']}")
        
        # Step 3: Get or create extra services
        services_result = self.make_request("GET", "/extra-services", token=self.admin_token)
        if not services_result.get("success") or not services_result["data"]:
            # Create test services
            service1_data = {
                "name": "Decoración con Globos Critical",
                "description": "Servicio de decoración con globos",
                "default_price": 3500.0,
                "currency": "DOP"
            }
            service1_result = self.make_request("POST", "/extra-services", service1_data, self.admin_token)
            
            service2_data = {
                "name": "Servicio de DJ Critical",
                "description": "Servicio de DJ profesional",
                "default_price": 5000.0,
                "currency": "DOP"
            }
            service2_result = self.make_request("POST", "/extra-services", service2_data, self.admin_token)
            
            if service1_result.get("success") and service2_result.get("success"):
                service1_id = service1_result["data"]["id"]
                service2_id = service2_result["data"]["id"]
                self.log_test("Create Test Services", True, "Created test services for Solo Servicios")
            else:
                self.log_test("Create Test Services", False, "Failed to create test services")
                return False
        else:
            services = services_result["data"]
            service1_id = services[0]["id"]
            service2_id = services[1]["id"] if len(services) > 1 else services[0]["id"]
        
        # Step 4: Create a "Solo Servicios" invoice (NO villa, only services)
        solo_servicios_data = {
            "customer_id": test_customer["id"],
            "customer_name": test_customer["name"],
            # NO villa_id - this is key for "Solo Servicios"
            "rental_type": "pasadia",  # Use valid rental_type
            "reservation_date": "2025-01-21T00:00:00Z",
            "check_in_time": "",
            "check_out_time": "",
            "guests": 0,
            "base_price": 0.0,
            "owner_price": 0.0,
            "subtotal": 8500.0,
            "total_amount": 8500.0,
            "amount_paid": 4000.0,
            "currency": "DOP",
            "status": "confirmed",
            "notes": "Factura Solo Servicios - Critical Testing",
            "extra_services": [
                {
                    "service_id": service1_id,
                    "service_name": "Decoración con Globos Critical",
                    "supplier_name": "Decoraciones Bella",
                    "quantity": 1,
                    "unit_price": 3500.0,
                    "supplier_cost": 2800.0,
                    "total": 3500.0
                },
                {
                    "service_id": service2_id,
                    "service_name": "Servicio de DJ Critical",
                    "supplier_name": "DJ Professional",
                    "quantity": 1,
                    "unit_price": 5000.0,
                    "supplier_cost": 4000.0,
                    "total": 5000.0
                }
            ]
        }
        
        # Create the Solo Servicios invoice
        solo_servicios_result = self.make_request("POST", "/reservations", solo_servicios_data, self.admin_token)
        
        if not solo_servicios_result.get("success"):
            self.log_test("Create Solo Servicios Invoice", False, "Failed to create Solo Servicios invoice", solo_servicios_result)
            return False
        
        created_invoice = solo_servicios_result["data"]
        self.log_test("Create Solo Servicios Invoice", True, f"✅ Created Solo Servicios invoice #{created_invoice['invoice_number']}")
        
        # Step 5: Verify that a container expense was created with category "pago_servicios"
        time.sleep(3)  # Wait for async expense creation
        
        expenses_after_result = self.make_request("GET", "/expenses", token=self.admin_token)
        if not expenses_after_result.get("success"):
            self.log_test("Get Expenses After Solo Servicios", False, "Failed to get expenses after invoice creation", expenses_after_result)
            return False
        
        expenses_after = expenses_after_result["data"]
        pago_servicios_after = [e for e in expenses_after if e.get("category") == "pago_servicios"]
        count_after = len(pago_servicios_after)
        
        # Should have one more "pago_servicios" expense
        if count_after > count_before:
            self.log_test("Verify Pago Servicios Expense Created", True, f"✅ New 'pago_servicios' expense created. Count: {count_before} → {count_after}")
            
            # Find the new expense
            new_expense = None
            for expense in pago_servicios_after:
                if expense.get("related_reservation_id") == created_invoice["id"]:
                    new_expense = expense
                    break
            
            if new_expense:
                # Step 6: Verify expense details
                checks = []
                
                # Check category
                if new_expense.get("category") == "pago_servicios":
                    checks.append("✓ Category: pago_servicios")
                else:
                    checks.append(f"✗ Category: {new_expense.get('category')} (expected: pago_servicios)")
                
                # Check description contains "Servicios - Factura #"
                description = new_expense.get("description", "")
                if "Servicios - Factura #" in description and created_invoice["invoice_number"] in description:
                    checks.append(f"✓ Description: {description}")
                else:
                    checks.append(f"✗ Description: {description} (should contain 'Servicios - Factura #{created_invoice['invoice_number']}')")
                
                # Check amount = sum of supplier costs
                expected_amount = 2800.0 + 4000.0  # supplier_cost * quantity for each service
                actual_amount = new_expense.get("amount", 0)
                if abs(actual_amount - expected_amount) < 0.01:  # Allow for floating point precision
                    checks.append(f"✓ Amount: {actual_amount} (expected: {expected_amount})")
                else:
                    checks.append(f"✗ Amount: {actual_amount} (expected: {expected_amount})")
                
                # Check services_details is present
                if new_expense.get("services_details"):
                    services_details = new_expense["services_details"]
                    if len(services_details) == 2:  # Should have 2 services
                        checks.append(f"✓ Services Details: {len(services_details)} services")
                    else:
                        checks.append(f"✗ Services Details: {len(services_details)} services (expected: 2)")
                else:
                    checks.append("✗ Services Details: Missing")
                
                # Check related_reservation_id
                if new_expense.get("related_reservation_id") == created_invoice["id"]:
                    checks.append("✓ Related Reservation ID: Correct")
                else:
                    checks.append(f"✗ Related Reservation ID: {new_expense.get('related_reservation_id')}")
                
                # Check payment_status
                if new_expense.get("payment_status") == "pending":
                    checks.append("✓ Payment Status: pending")
                else:
                    checks.append(f"✗ Payment Status: {new_expense.get('payment_status')} (expected: pending)")
                
                all_checks_passed = all("✓" in check for check in checks)
                
                if all_checks_passed:
                    self.log_test("Solo Servicios Expense Details Verification", True, 
                                 f"✅ All expense fields correct:\n   " + "\n   ".join(checks))
                else:
                    self.log_test("Solo Servicios Expense Details Verification", False, 
                                 f"❌ Some expense fields incorrect:\n   " + "\n   ".join(checks))
                
                # Log full expense details for debugging
                print(f"   📋 Solo Servicios expense details:")
                print(f"      ID: {new_expense.get('id')}")
                print(f"      Category: {new_expense.get('category')}")
                print(f"      Description: {new_expense.get('description')}")
                print(f"      Amount: {new_expense.get('amount')} {new_expense.get('currency')}")
                print(f"      Payment Status: {new_expense.get('payment_status')}")
                print(f"      Services Count: {len(new_expense.get('services_details', []))}")
                print(f"      Related Reservation: {new_expense.get('related_reservation_id')}")
                
                # Step 7: Verify expense is visible in main expenses list (not filtered out)
                main_expenses_result = self.make_request("GET", "/expenses", token=self.admin_token)
                if main_expenses_result.get("success"):
                    main_expenses = main_expenses_result["data"]
                    expense_visible = any(e.get("id") == new_expense["id"] for e in main_expenses)
                    
                    if expense_visible:
                        self.log_test("Solo Servicios Expense Visible in Main List", True, 
                                     "✅ Solo Servicios expense is visible in main expenses list")
                    else:
                        self.log_test("Solo Servicios Expense Visible in Main List", False, 
                                     "❌ Solo Servicios expense is NOT visible in main expenses list")
                        all_checks_passed = False
                else:
                    self.log_test("Get Main Expenses List", False, "Failed to get main expenses list")
                    all_checks_passed = False
                
                print(f"   🎯 SOLO SERVICIOS TEST: {'✅ PASSED' if all_checks_passed else '❌ FAILED'}")
                return all_checks_passed
                
            else:
                self.log_test("Find New Solo Servicios Expense", False, "❌ New 'pago_servicios' expense not found with correct related_reservation_id")
                
                # Debug: Show all pago_servicios expenses
                print("   🔍 All 'pago_servicios' expenses found:")
                for i, expense in enumerate(pago_servicios_after):
                    print(f"      {i+1}. ID: {expense.get('id')}, Related: {expense.get('related_reservation_id')}, Amount: {expense.get('amount')}")
                
                return False
        else:
            self.log_test("Verify Pago Servicios Expense Created", False, 
                         f"❌ No new 'pago_servicios' expense created. Count remained at {count_before}")
            return False

    def run_critical_tests(self):
        """Run the two critical bug fix tests"""
        print("🐛 CRITICAL BUG FIXES TESTING")
        print("=" * 50)
        
        # Setup
        if not self.setup_admin_login():
            print("❌ Cannot continue without admin login")
            return False
        
        # Test 1: Ghost Invoice Bug
        ghost_test_passed = self.test_ghost_invoice_bug_cliente_rapido()
        
        # Test 2: Solo Servicios Expense Display
        solo_servicios_test_passed = self.test_solo_servicios_expense_display()
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 CRITICAL TESTS SUMMARY")
        print("=" * 50)
        
        passed = len([t for t in self.test_results if t["success"]])
        failed = len([t for t in self.test_results if not t["success"]])
        total = len(self.test_results)
        
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📊 Total: {total}")
        print(f"📈 Success Rate: {(passed/total)*100:.1f}%")
        
        print(f"\n🎯 CRITICAL BUG FIXES:")
        print(f"   👻 Ghost Invoice Bug: {'✅ FIXED' if ghost_test_passed else '❌ NOT FIXED'}")
        print(f"   🛠️ Solo Servicios Display: {'✅ FIXED' if solo_servicios_test_passed else '❌ NOT FIXED'}")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for test in self.test_results:
                if not test["success"]:
                    print(f"   - {test['test']}: {test['message']}")
        
        both_critical_tests_passed = ghost_test_passed and solo_servicios_test_passed
        print(f"\n🎉 OVERALL RESULT: {'✅ BOTH CRITICAL BUGS FIXED' if both_critical_tests_passed else '❌ CRITICAL ISSUES REMAIN'}")
        
        return both_critical_tests_passed

if __name__ == "__main__":
    tester = CriticalBugTester()
    success = tester.run_critical_tests()
    
    if success:
        print("\n🎉 All critical bug fixes verified!")
        sys.exit(0)
    else:
        print("\n💥 Critical issues remain!")
        sys.exit(1)