#!/usr/bin/env python3
"""
Backend Testing Suite for Espacios Con Piscina - Category System
Tests the new category functionality and role-based permissions
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from environment
BACKEND_URL = "https://ecp-manager.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.admin_token = None
        self.employee_token = None
        self.created_categories = []
        self.created_villas = []
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
    
    def test_health_check(self):
        """Test backend health"""
        result = self.make_request("GET", "/health")
        
        if result.get("success"):
            self.log_test("Health Check", True, "Backend is healthy")
        else:
            self.log_test("Health Check", False, "Backend health check failed", result)
    
    def test_register_admin(self):
        """Register admin user"""
        admin_data = {
            "username": "admin",
            "password": "admin123",
            "email": "admin@test.com",
            "full_name": "Admin User",
            "role": "admin"
        }
        
        result = self.make_request("POST", "/auth/register", admin_data)
        
        if result.get("success"):
            self.log_test("Register Admin", True, "Admin user registered successfully")
        elif result.get("status_code") == 400 and "already registered" in str(result.get("data", {})):
            self.log_test("Register Admin", True, "Admin user already exists")
        else:
            self.log_test("Register Admin", False, "Failed to register admin", result)
    
    def test_register_employee(self):
        """Register employee user"""
        employee_data = {
            "username": "emp1",
            "password": "emp123",
            "email": "emp@test.com",
            "full_name": "Empleado Test",
            "role": "employee"
        }
        
        result = self.make_request("POST", "/auth/register", employee_data)
        
        if result.get("success"):
            self.log_test("Register Employee", True, "Employee user registered successfully")
        elif result.get("status_code") == 400 and "already registered" in str(result.get("data", {})):
            self.log_test("Register Employee", True, "Employee user already exists")
        else:
            self.log_test("Register Employee", False, "Failed to register employee", result)
    
    def test_admin_login(self):
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
            else:
                self.log_test("Admin Login", False, f"Wrong role returned: {user_role}")
        else:
            self.log_test("Admin Login", False, "Admin login failed", result)
    
    def test_employee_login(self):
        """Login as employee"""
        login_data = {
            "username": "emp1",
            "password": "emp123"
        }
        
        result = self.make_request("POST", "/auth/login", login_data)
        
        if result.get("success"):
            self.employee_token = result["data"]["access_token"]
            user_role = result["data"]["user"]["role"]
            if user_role == "employee":
                self.log_test("Employee Login", True, f"Employee logged in successfully, role: {user_role}")
            else:
                self.log_test("Employee Login", False, f"Wrong role returned: {user_role}")
        else:
            self.log_test("Employee Login", False, "Employee login failed", result)
    
    def test_create_categories_admin(self):
        """Create categories as admin"""
        categories = [
            {"name": "Premium", "description": "Villas premium de alta gama"},
            {"name": "Zona Norte", "description": "Villas ubicadas en zona norte"},
            {"name": "Económica", "description": "Villas económicas"}
        ]
        
        for cat_data in categories:
            result = self.make_request("POST", "/categories", cat_data, self.admin_token)
            
            if result.get("success"):
                category_id = result["data"]["id"]
                self.created_categories.append({"id": category_id, "name": cat_data["name"]})
                self.log_test(f"Create Category '{cat_data['name']}'", True, f"Category created with ID: {category_id}")
            else:
                self.log_test(f"Create Category '{cat_data['name']}'", False, "Failed to create category", result)
    
    def test_get_categories_admin(self):
        """Get categories as admin - verify alphabetical order"""
        result = self.make_request("GET", "/categories", token=self.admin_token)
        
        if result.get("success"):
            categories = result["data"]
            if len(categories) >= 3:
                # Check alphabetical order
                names = [cat["name"] for cat in categories]
                sorted_names = sorted(names, key=str.lower)
                
                if names == sorted_names:
                    self.log_test("Get Categories (Admin)", True, f"Categories retrieved in alphabetical order: {names}")
                else:
                    self.log_test("Get Categories (Admin)", False, f"Categories not in alphabetical order. Got: {names}, Expected: {sorted_names}")
            else:
                self.log_test("Get Categories (Admin)", False, f"Expected at least 3 categories, got {len(categories)}")
        else:
            self.log_test("Get Categories (Admin)", False, "Failed to get categories", result)
    
    def test_update_category_admin(self):
        """Update a category as admin"""
        if not self.created_categories:
            self.log_test("Update Category (Admin)", False, "No categories available to update")
            return
        
        category = self.created_categories[0]
        update_data = {
            "name": f"{category['name']} Updated",
            "description": "Updated description"
        }
        
        result = self.make_request("PUT", f"/categories/{category['id']}", update_data, self.admin_token)
        
        if result.get("success"):
            self.log_test("Update Category (Admin)", True, f"Category updated successfully")
        else:
            self.log_test("Update Category (Admin)", False, "Failed to update category", result)
    
    def test_get_single_category_admin(self):
        """Get single category by ID as admin"""
        if not self.created_categories:
            self.log_test("Get Single Category (Admin)", False, "No categories available to retrieve")
            return
        
        category = self.created_categories[0]
        result = self.make_request("GET", f"/categories/{category['id']}", token=self.admin_token)
        
        if result.get("success"):
            retrieved_cat = result["data"]
            if retrieved_cat["id"] == category["id"]:
                self.log_test("Get Single Category (Admin)", True, f"Category retrieved successfully: {retrieved_cat['name']}")
            else:
                self.log_test("Get Single Category (Admin)", False, "Retrieved category ID mismatch")
        else:
            self.log_test("Get Single Category (Admin)", False, "Failed to get single category", result)
    
    def test_create_villas_with_categories(self):
        """Create villas with and without categories"""
        if len(self.created_categories) < 2:
            self.log_test("Create Villas with Categories", False, "Need at least 2 categories for this test")
            return
        
        # Find Premium category
        premium_cat = next((cat for cat in self.created_categories if "Premium" in cat["name"]), None)
        if not premium_cat:
            self.log_test("Create Villas with Categories", False, "Premium category not found")
            return
        
        villas = [
            {
                "code": "PREM001",
                "name": "Villa Premium Deluxe",
                "description": "Villa premium con todas las comodidades",
                "location": "Zona Norte",
                "bedrooms": 4,
                "bathrooms": 3,
                "max_guests": 8,
                "price_per_night": 250.0,
                "currency": "USD",
                "category_id": premium_cat["id"]
            },
            {
                "code": "PREM002", 
                "name": "Villa Premium Ocean View",
                "description": "Villa premium con vista al mar",
                "location": "Costa Norte",
                "bedrooms": 3,
                "bathrooms": 2,
                "max_guests": 6,
                "price_per_night": 300.0,
                "currency": "USD",
                "category_id": premium_cat["id"]
            },
            {
                "code": "STD001",
                "name": "Villa Estándar",
                "description": "Villa sin categoría asignada",
                "location": "Centro",
                "bedrooms": 2,
                "bathrooms": 1,
                "max_guests": 4,
                "price_per_night": 100.0,
                "currency": "USD"
                # No category_id
            }
        ]
        
        for villa_data in villas:
            result = self.make_request("POST", "/villas", villa_data, self.admin_token)
            
            if result.get("success"):
                villa_id = result["data"]["id"]
                self.created_villas.append({"id": villa_id, "code": villa_data["code"], "category_id": villa_data.get("category_id")})
                category_info = f"with category {premium_cat['name']}" if villa_data.get("category_id") else "without category"
                self.log_test(f"Create Villa '{villa_data['code']}'", True, f"Villa created {category_info}")
            else:
                self.log_test(f"Create Villa '{villa_data['code']}'", False, "Failed to create villa", result)
    
    def test_get_all_villas(self):
        """Get all villas"""
        result = self.make_request("GET", "/villas", token=self.admin_token)
        
        if result.get("success"):
            villas = result["data"]
            villa_count = len(villas)
            self.log_test("Get All Villas", True, f"Retrieved {villa_count} villas")
        else:
            self.log_test("Get All Villas", False, "Failed to get villas", result)
    
    def test_search_villas(self):
        """Test villa search functionality"""
        if not self.created_villas:
            self.log_test("Search Villas", False, "No villas available for search test")
            return
        
        # Search by name
        search_term = "Premium"
        result = self.make_request("GET", "/villas", {"search": search_term}, self.admin_token)
        
        if result.get("success"):
            villas = result["data"]
            matching_villas = [v for v in villas if search_term.lower() in v.get("name", "").lower()]
            
            if len(matching_villas) > 0:
                self.log_test("Search Villas by Name", True, f"Found {len(matching_villas)} villas matching '{search_term}'")
            else:
                self.log_test("Search Villas by Name", False, f"No villas found matching '{search_term}'")
        else:
            self.log_test("Search Villas by Name", False, "Villa search failed", result)
    
    def test_filter_villas_by_category(self):
        """Test villa filtering by category"""
        if not self.created_categories:
            self.log_test("Filter Villas by Category", False, "No categories available for filter test")
            return
        
        premium_cat = next((cat for cat in self.created_categories if "Premium" in cat["name"]), None)
        if not premium_cat:
            self.log_test("Filter Villas by Category", False, "Premium category not found")
            return
        
        result = self.make_request("GET", "/villas", {"category_id": premium_cat["id"]}, self.admin_token)
        
        if result.get("success"):
            villas = result["data"]
            premium_villas = [v for v in villas if v.get("category_id") == premium_cat["id"]]
            
            if len(premium_villas) >= 2:
                self.log_test("Filter Villas by Category", True, f"Found {len(premium_villas)} villas in Premium category")
            else:
                self.log_test("Filter Villas by Category", False, f"Expected at least 2 Premium villas, found {len(premium_villas)}")
        else:
            self.log_test("Filter Villas by Category", False, "Villa category filter failed", result)
    
    def test_delete_category_and_unassign_villas(self):
        """Delete category and verify villas are unassigned"""
        # Find Económica category
        economica_cat = next((cat for cat in self.created_categories if "Económica" in cat["name"]), None)
        if not economica_cat:
            self.log_test("Delete Category", False, "Económica category not found")
            return
        
        # Delete the category
        result = self.make_request("DELETE", f"/categories/{economica_cat['id']}", token=self.admin_token)
        
        if result.get("success"):
            self.log_test("Delete Category", True, "Económica category deleted successfully")
            
            # Verify villas are unassigned
            villas_result = self.make_request("GET", "/villas", token=self.admin_token)
            if villas_result.get("success"):
                villas = villas_result["data"]
                unassigned_villas = [v for v in villas if v.get("category_id") is None]
                self.log_test("Verify Villa Unassignment", True, f"Found {len(unassigned_villas)} villas without category after deletion")
            else:
                self.log_test("Verify Villa Unassignment", False, "Failed to verify villa unassignment")
        else:
            self.log_test("Delete Category", False, "Failed to delete category", result)
    
    def test_employee_permissions(self):
        """Test employee permissions"""
        if not self.employee_token:
            self.log_test("Employee Permissions", False, "Employee token not available")
            return
        
        # Employee CAN view categories (for selection)
        result = self.make_request("GET", "/categories", token=self.employee_token)
        if result.get("success"):
            self.log_test("Employee View Categories", True, "Employee can view categories")
        else:
            self.log_test("Employee View Categories", False, "Employee cannot view categories", result)
        
        # Employee CANNOT create categories (should get 403)
        category_data = {"name": "Test Category", "description": "Should fail"}
        result = self.make_request("POST", "/categories", category_data, self.employee_token)
        
        if result.get("status_code") == 403:
            self.log_test("Employee Create Category (Forbidden)", True, "Employee correctly forbidden from creating categories")
        elif result.get("status_code") == 401:
            self.log_test("Employee Create Category (Forbidden)", True, "Employee correctly unauthorized to create categories")
        else:
            self.log_test("Employee Create Category (Forbidden)", False, f"Expected 403/401, got {result.get('status_code')}", result)
        
        # Employee CAN view villas
        result = self.make_request("GET", "/villas", token=self.employee_token)
        if result.get("success"):
            villas = result["data"]
            self.log_test("Employee View Villas", True, f"Employee can view {len(villas)} villas")
        else:
            self.log_test("Employee View Villas", False, "Employee cannot view villas", result)
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend Testing Suite for Category System")
        print("=" * 60)
        
        # Health check
        self.test_health_check()
        
        # Auth and setup
        print("\n📝 Auth & Setup Tests")
        self.test_register_admin()
        self.test_register_employee()
        self.test_admin_login()
        self.test_employee_login()
        
        # Category tests (admin)
        print("\n🏷️ Category Tests (Admin)")
        self.test_create_categories_admin()
        self.test_get_categories_admin()
        self.test_update_category_admin()
        self.test_get_single_category_admin()
        
        # Villa tests
        print("\n🏠 Villa Tests")
        self.test_create_villas_with_categories()
        self.test_get_all_villas()
        self.test_search_villas()
        self.test_filter_villas_by_category()
        
        # Category deletion
        print("\n🗑️ Category Deletion Tests")
        self.test_delete_category_and_unassign_villas()
        
        # Employee permissions
        print("\n👤 Employee Permission Tests")
        self.test_employee_permissions()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
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
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed!")
        sys.exit(1)