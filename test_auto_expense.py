#!/usr/bin/env python3
"""
Focused test for auto-expense creation when reservation has owner_price > 0
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from environment
BACKEND_URL = "https://piscina-dashboard.preview.emergentagent.com/api"

class AutoExpenseTest:
    def __init__(self):
        self.admin_token = None
        
    def log_test(self, test_name: str, success: bool, message: str, details: Any = None):
        """Log test result"""
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
    
    def test_auto_expense_creation(self):
        """Test the complete auto-expense creation flow"""
        print("🎯 TESTING AUTO-EXPENSE CREATION FLOW")
        print("=" * 50)
        
        # Step 1: Login
        if not self.login_admin():
            return False
        
        # Step 2: Get villas
        villas_result = self.make_request("GET", "/villas", token=self.admin_token)
        if not villas_result.get("success") or not villas_result["data"]:
            self.log_test("Get Villas", False, "No villas available")
            return False
        
        villa = villas_result["data"][0]
        print(f"📍 Using villa: {villa['code']} - {villa['name']}")
        
        # Step 3: Get customers
        customers_result = self.make_request("GET", "/customers", token=self.admin_token)
        if not customers_result.get("success") or not customers_result["data"]:
            self.log_test("Get Customers", False, "No customers available")
            return False
        
        customer = customers_result["data"][0]
        print(f"👤 Using customer: {customer['name']}")
        
        # Step 4: Get expenses count before
        expenses_before_result = self.make_request("GET", "/expenses", token=self.admin_token)
        expenses_before_count = len(expenses_before_result["data"]) if expenses_before_result.get("success") else 0
        print(f"📊 Expenses before: {expenses_before_count}")
        
        # Step 5: Create reservation with owner_price > 0
        reservation_data = {
            "customer_id": customer["id"],
            "customer_name": customer["name"],
            "villa_id": villa["id"],
            "villa_code": villa["code"],
            "rental_type": "pasadia",
            "reservation_date": "2024-01-15T00:00:00Z",
            "check_in_time": "9:00 AM",
            "check_out_time": "8:00 PM",
            "guests": 6,
            "base_price": 15000.0,
            "owner_price": 8000.0,  # CRITICAL: > 0 to trigger auto-expense
            "subtotal": 15000.0,
            "total_amount": 15000.0,
            "amount_paid": 7500.0,
            "currency": "DOP",
            "status": "confirmed",
            "notes": "Test reservation for auto-expense creation"
        }
        
        print(f"💰 Creating reservation with owner_price: {reservation_data['owner_price']} DOP")
        
        reservation_result = self.make_request("POST", "/reservations", reservation_data, self.admin_token)
        
        if not reservation_result.get("success"):
            self.log_test("Create Reservation", False, "Failed to create reservation", reservation_result)
            return False
        
        reservation = reservation_result["data"]
        print(f"📋 Created reservation #{reservation['invoice_number']}")
        
        # Step 6: Verify auto-created expense
        expenses_after_result = self.make_request("GET", "/expenses", token=self.admin_token)
        
        if not expenses_after_result.get("success"):
            self.log_test("Get Expenses After", False, "Failed to get expenses")
            return False
        
        expenses_after = expenses_after_result["data"]
        expenses_after_count = len(expenses_after)
        print(f"📊 Expenses after: {expenses_after_count}")
        
        if expenses_after_count <= expenses_before_count:
            self.log_test("Auto-Expense Creation", False, "No new expense was created")
            return False
        
        # Find the auto-created expense
        auto_expense = None
        for expense in expenses_after:
            if (expense.get("category") == "pago_propietario" and 
                expense.get("related_reservation_id") == reservation["id"]):
                auto_expense = expense
                break
        
        if not auto_expense:
            self.log_test("Find Auto-Expense", False, "Auto-created expense not found")
            print("🔍 Available expenses:")
            for i, exp in enumerate(expenses_after):
                print(f"   {i+1}. Category: {exp.get('category')}, Amount: {exp.get('amount')}, Related: {exp.get('related_reservation_id')}")
            return False
        
        # Verify expense details
        print("\n✅ AUTO-EXPENSE VERIFICATION:")
        print(f"   ID: {auto_expense['id']}")
        print(f"   Category: {auto_expense['category']}")
        print(f"   Amount: {auto_expense['amount']} {auto_expense['currency']}")
        print(f"   Description: {auto_expense['description']}")
        print(f"   Payment Status: {auto_expense['payment_status']}")
        print(f"   Related Reservation: {auto_expense['related_reservation_id']}")
        print(f"   Expense Date: {auto_expense['expense_date']}")
        
        # Validate all fields
        validations = [
            (auto_expense.get("category") == "pago_propietario", "Category is 'pago_propietario'"),
            (auto_expense.get("amount") == 8000.0, "Amount matches owner_price (8000.0)"),
            (villa["code"] in auto_expense.get("description", ""), f"Description contains villa code '{villa['code']}'"),
            (auto_expense.get("related_reservation_id") == reservation["id"], "Related reservation ID matches"),
            (auto_expense.get("payment_status") == "pending", "Payment status is 'pending'"),
            (auto_expense.get("currency") == "DOP", "Currency is 'DOP'"),
        ]
        
        all_valid = True
        print("\n🔍 VALIDATION RESULTS:")
        for is_valid, description in validations:
            status = "✅" if is_valid else "❌"
            print(f"   {status} {description}")
            if not is_valid:
                all_valid = False
        
        if all_valid:
            print("\n🎉 SUCCESS: Auto-expense creation flow working perfectly!")
            return True
        else:
            print("\n❌ FAILURE: Some validations failed")
            return False

if __name__ == "__main__":
    tester = AutoExpenseTest()
    success = tester.test_auto_expense_creation()
    
    if success:
        print("\n✅ AUTO-EXPENSE CREATION TEST PASSED")
        sys.exit(0)
    else:
        print("\n❌ AUTO-EXPENSE CREATION TEST FAILED")
        sys.exit(1)