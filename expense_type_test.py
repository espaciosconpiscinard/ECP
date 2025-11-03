#!/usr/bin/env python3
"""
Focused Backend Testing for Expense Type System
Tests the expense_type functionality as requested in the review
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from environment
BACKEND_URL = "https://quoteinvoice-6.preview.emergentagent.com/api"

class ExpenseTypeTester:
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
    
    def setup_auth(self):
        """Setup authentication"""
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        result = self.make_request("POST", "/auth/login", login_data)
        
        if result.get("success"):
            self.admin_token = result["data"]["access_token"]
            self.log_test("Admin Login", True, "Admin authenticated successfully")
            return True
        else:
            self.log_test("Admin Login", False, "Failed to authenticate admin", result)
            return False
    
    def test_existing_expenses_verification(self):
        """Test 1: Verify existing expenses with expense_type"""
        print("\n🔍 TEST 1: Verificar Gastos Existentes")
        
        result = self.make_request("GET", "/expenses", token=self.admin_token)
        
        if not result.get("success"):
            self.log_test("GET /api/expenses", False, "Failed to get expenses", result)
            return
        
        expenses = result["data"]
        self.log_test("GET /api/expenses", True, f"Retrieved {len(expenses)} expenses")
        
        # Verify expense_type field presence
        expenses_with_type = []
        valid_types = ['variable', 'fijo', 'unico']
        
        print("   📊 Existing expenses breakdown:")
        for expense in expenses:
            expense_type = expense.get("expense_type")
            description = expense.get("description", "")
            amount = expense.get("amount", 0)
            
            if expense_type in valid_types:
                expenses_with_type.append(expense)
                print(f"      - {expense_type.upper()}: {description} (${amount})")
            elif expense_type:
                print(f"      - INVALID TYPE '{expense_type}': {description} (${amount})")
            else:
                print(f"      - NO TYPE: {description} (${amount})")
        
        # Count by type
        variable_count = len([e for e in expenses_with_type if e.get("expense_type") == "variable"])
        fijo_count = len([e for e in expenses_with_type if e.get("expense_type") == "fijo"])
        unico_count = len([e for e in expenses_with_type if e.get("expense_type") == "unico"])
        
        self.log_test("Expense Types Verification", True, 
                     f"Found: {variable_count} variable, {fijo_count} fijo, {unico_count} unico")
        
        return expenses_with_type
    
    def test_create_variable_expense(self):
        """Test 2: Create variable expense"""
        print("\n🔄 TEST 2: Crear Gasto Variable")
        
        variable_data = {
            "category": "otros",
            "description": "Compra de materiales",
            "amount": 5000,
            "currency": "DOP",
            "expense_date": "2025-10-25T00:00:00Z",
            "payment_status": "pending",
            "expense_type": "variable",
            "reservation_check_in": "2025-10-25T00:00:00Z"
        }
        
        result = self.make_request("POST", "/expenses", variable_data, self.admin_token)
        
        if result.get("success"):
            created = result["data"]
            
            # Verify fields
            checks = []
            if created.get("expense_type") == "variable":
                checks.append("✓ expense_type: variable")
            else:
                checks.append(f"✗ expense_type: {created.get('expense_type')}")
            
            if created.get("amount") == 5000:
                checks.append("✓ amount: 5000")
            else:
                checks.append(f"✗ amount: {created.get('amount')}")
            
            if "reservation_check_in" in created:
                checks.append("✓ reservation_check_in: present")
            else:
                checks.append("✗ reservation_check_in: missing")
            
            all_passed = all("✓" in check for check in checks)
            self.log_test("Create Variable Expense", all_passed, 
                         f"Variable expense creation: {', '.join(checks)}")
            return created if all_passed else None
        else:
            self.log_test("Create Variable Expense", False, "Failed to create variable expense", result)
            return None
    
    def test_create_fijo_expense(self):
        """Test 3: Create fijo expense"""
        print("\n🔁 TEST 3: Crear Gasto Fijo")
        
        fijo_data = {
            "category": "otros",
            "description": "Agua mensual",
            "amount": 800,
            "currency": "DOP",
            "expense_date": "2025-10-21T00:00:00Z",
            "payment_status": "pending",
            "expense_type": "fijo",
            "has_payment_reminder": True,
            "payment_reminder_day": 5,
            "is_recurring": True
        }
        
        result = self.make_request("POST", "/expenses", fijo_data, self.admin_token)
        
        if result.get("success"):
            created = result["data"]
            
            # Verify fields
            checks = []
            if created.get("expense_type") == "fijo":
                checks.append("✓ expense_type: fijo")
            else:
                checks.append(f"✗ expense_type: {created.get('expense_type')}")
            
            if created.get("has_payment_reminder") is True:
                checks.append("✓ has_payment_reminder: true")
            else:
                checks.append(f"✗ has_payment_reminder: {created.get('has_payment_reminder')}")
            
            if created.get("payment_reminder_day") == 5:
                checks.append("✓ payment_reminder_day: 5")
            else:
                checks.append(f"✗ payment_reminder_day: {created.get('payment_reminder_day')}")
            
            if created.get("is_recurring") is True:
                checks.append("✓ is_recurring: true")
            else:
                checks.append(f"✗ is_recurring: {created.get('is_recurring')}")
            
            all_passed = all("✓" in check for check in checks)
            self.log_test("Create Fijo Expense", all_passed, 
                         f"Fijo expense creation: {', '.join(checks)}")
            return created if all_passed else None
        else:
            self.log_test("Create Fijo Expense", False, "Failed to create fijo expense", result)
            return None
    
    def test_create_unico_expense(self):
        """Test 4: Create unico expense"""
        print("\n💰 TEST 4: Crear Gasto Único")
        
        unico_data = {
            "category": "otros",
            "description": "Compra de escritorio",
            "amount": 15000,
            "currency": "DOP",
            "expense_date": "2025-10-20T00:00:00Z",
            "payment_status": "paid",
            "expense_type": "unico"
        }
        
        result = self.make_request("POST", "/expenses", unico_data, self.admin_token)
        
        if result.get("success"):
            created = result["data"]
            
            # Verify fields
            checks = []
            if created.get("expense_type") == "unico":
                checks.append("✓ expense_type: unico")
            else:
                checks.append(f"✗ expense_type: {created.get('expense_type')}")
            
            if created.get("payment_status") == "paid":
                checks.append("✓ payment_status: paid")
            else:
                checks.append(f"✗ payment_status: {created.get('payment_status')}")
            
            if created.get("amount") == 15000:
                checks.append("✓ amount: 15000")
            else:
                checks.append(f"✗ amount: {created.get('amount')}")
            
            all_passed = all("✓" in check for check in checks)
            self.log_test("Create Unico Expense", all_passed, 
                         f"Unico expense creation: {', '.join(checks)}")
            return created if all_passed else None
        else:
            self.log_test("Create Unico Expense", False, "Failed to create unico expense", result)
            return None
    
    def test_update_expense_type(self, expense_id: str):
        """Test 5: Update expense type"""
        print("\n🔄 TEST 5: Actualizar Tipo de Gasto")
        
        update_data = {
            "expense_type": "fijo",
            "has_payment_reminder": True,
            "payment_reminder_day": 15
        }
        
        result = self.make_request("PUT", f"/expenses/{expense_id}", update_data, self.admin_token)
        
        if result.get("success"):
            updated = result["data"]
            
            if updated.get("expense_type") == "fijo":
                self.log_test("Update Expense Type", True, 
                             f"Expense type updated to 'fijo' successfully")
                return True
            else:
                self.log_test("Update Expense Type", False, 
                             f"Expense type not updated correctly: {updated.get('expense_type')}")
        else:
            self.log_test("Update Expense Type", False, "Failed to update expense type", result)
        
        return False
    
    def test_delete_expense(self, expense_id: str, expense_type: str):
        """Test 6: Delete expense"""
        print(f"\n🗑️ TEST 6: Eliminar Gasto {expense_type.upper()}")
        
        result = self.make_request("DELETE", f"/expenses/{expense_id}", token=self.admin_token)
        
        if result.get("success"):
            self.log_test(f"Delete {expense_type.title()} Expense", True, 
                         f"{expense_type.title()} expense deleted successfully")
            
            # Verify deletion
            verify_result = self.make_request("GET", "/expenses", token=self.admin_token)
            if verify_result.get("success"):
                remaining = verify_result["data"]
                still_exists = any(e.get("id") == expense_id for e in remaining)
                
                if not still_exists:
                    self.log_test(f"Verify {expense_type.title()} Deletion", True, 
                                 f"{expense_type.title()} expense removed from list")
                    return True
                else:
                    self.log_test(f"Verify {expense_type.title()} Deletion", False, 
                                 f"{expense_type.title()} expense still in list")
        else:
            self.log_test(f"Delete {expense_type.title()} Expense", False, 
                         f"Failed to delete {expense_type} expense", result)
        
        return False
    
    def run_expense_type_tests(self):
        """Run all expense type tests"""
        print("🚀 TESTING SISTEMA DE EXPENSE_TYPE")
        print("=" * 60)
        
        # Setup
        if not self.setup_auth():
            return False
        
        # Test 1: Verify existing expenses
        existing_expenses = self.test_existing_expenses_verification()
        
        # Test 2-4: Create expenses by type
        variable_expense = self.test_create_variable_expense()
        fijo_expense = self.test_create_fijo_expense()
        unico_expense = self.test_create_unico_expense()
        
        # Test 5: Update expense type (if we have a variable expense)
        if variable_expense:
            self.test_update_expense_type(variable_expense["id"])
        
        # Test 6: Delete expenses (if created)
        created_expenses = [
            (fijo_expense, "fijo"),
            (unico_expense, "unico")
        ]
        
        for expense, expense_type in created_expenses:
            if expense:
                self.test_delete_expense(expense["id"], expense_type)
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 EXPENSE TYPE TEST SUMMARY")
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
    tester = ExpenseTypeTester()
    success = tester.run_expense_type_tests()
    
    if success:
        print("\n🎉 All expense type tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some expense type tests failed!")
        sys.exit(1)