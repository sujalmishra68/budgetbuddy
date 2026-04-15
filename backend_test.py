import requests
import sys
import json
from datetime import datetime, timedelta

class ExpenseTrackerAPITester:
    def __init__(self, base_url="https://budget-dash-63.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user = None
        self.test_user = None
        self.test_category_id = None
        self.test_expense_id = None
        self.test_budget_id = None
        self.test_recurring_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth_flow(self):
        """Test complete authentication flow"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION FLOW")
        print("="*50)
        
        # Test admin login
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@example.com", "password": "admin123"}
        )
        if success:
            self.admin_user = response
            print(f"   Admin user: {response.get('name')} ({response.get('email')})")
        
        # Test get current user
        self.run_test("Get Current User", "GET", "auth/me", 200)
        
        # Test user registration
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={"email": test_email, "password": "testpass123", "name": "Test User"}
        )
        if success:
            self.test_user = response
            print(f"   Test user created: {response.get('name')} ({response.get('email')})")
        
        # Test logout
        self.run_test("Logout", "POST", "auth/logout", 200)
        
        # Test login with test user
        success, response = self.run_test(
            "Test User Login",
            "POST",
            "auth/login",
            200,
            data={"email": test_email, "password": "testpass123"}
        )
        if success:
            self.test_user = response
        
        return success

    def test_categories(self):
        """Test category management"""
        print("\n" + "="*50)
        print("TESTING CATEGORIES")
        print("="*50)
        
        # Get categories (should include predefined ones)
        success, response = self.run_test("Get Categories", "GET", "categories", 200)
        if success:
            categories = response
            print(f"   Found {len(categories)} categories")
            predefined = [c for c in categories if c.get('is_predefined')]
            custom = [c for c in categories if not c.get('is_predefined')]
            print(f"   Predefined: {len(predefined)}, Custom: {len(custom)}")
        
        # Create custom category
        success, response = self.run_test(
            "Create Category",
            "POST",
            "categories",
            200,
            data={"name": "Test Category", "icon": "tag", "color": "#FF5733"}
        )
        if success:
            self.test_category_id = response.get('id')
            print(f"   Created category ID: {self.test_category_id}")
        
        # Update category
        if self.test_category_id:
            self.run_test(
                "Update Category",
                "PUT",
                f"categories/{self.test_category_id}",
                200,
                data={"name": "Updated Test Category", "icon": "tag", "color": "#33FF57"}
            )
        
        return success

    def test_expenses(self):
        """Test expense management"""
        print("\n" + "="*50)
        print("TESTING EXPENSES")
        print("="*50)
        
        # Get expenses (initially empty for new user)
        success, response = self.run_test("Get Expenses", "GET", "expenses", 200)
        if success:
            print(f"   Initial expenses: {response.get('total', 0)}")
        
        # Create expense
        expense_data = {
            "amount": 25.50,
            "category_id": self.test_category_id or "test-cat-id",
            "category_name": "Test Category",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Test expense for API testing",
            "payment_method": "credit_card"
        }
        success, response = self.run_test(
            "Create Expense",
            "POST",
            "expenses",
            200,
            data=expense_data
        )
        if success:
            self.test_expense_id = response.get('id')
            print(f"   Created expense ID: {self.test_expense_id}")
        
        # Update expense
        if self.test_expense_id:
            self.run_test(
                "Update Expense",
                "PUT",
                f"expenses/{self.test_expense_id}",
                200,
                data={"amount": 30.75, "notes": "Updated test expense"}
            )
        
        # Get expenses with filters
        self.run_test("Get Expenses with Search", "GET", "expenses?search=test", 200)
        self.run_test("Get Expenses with Date Filter", "GET", f"expenses?start_date={datetime.now().strftime('%Y-%m-%d')}", 200)
        
        return success

    def test_budgets(self):
        """Test budget management"""
        print("\n" + "="*50)
        print("TESTING BUDGETS")
        print("="*50)
        
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        # Get budgets
        success, response = self.run_test("Get Budgets", "GET", f"budgets?month={current_month}&year={current_year}", 200)
        if success:
            print(f"   Current budgets: {len(response)}")
        
        # Create budget
        budget_data = {
            "category_id": self.test_category_id,
            "category_name": "Test Category",
            "amount": 500.00,
            "month": current_month,
            "year": current_year
        }
        success, response = self.run_test(
            "Create Budget",
            "POST",
            "budgets",
            200,
            data=budget_data
        )
        if success:
            self.test_budget_id = response.get('id')
            print(f"   Created budget ID: {self.test_budget_id}")
        
        # Update budget
        if self.test_budget_id:
            self.run_test(
                "Update Budget",
                "PUT",
                f"budgets/{self.test_budget_id}",
                200,
                data={**budget_data, "amount": 600.00}
            )
        
        return success

    def test_dashboard(self):
        """Test dashboard endpoints"""
        print("\n" + "="*50)
        print("TESTING DASHBOARD")
        print("="*50)
        
        # Get dashboard stats
        success, response = self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)
        if success:
            stats = response
            print(f"   Total expenses: ${stats.get('total_expenses', 0)}")
            print(f"   Month expenses: ${stats.get('month_expenses', 0)}")
            print(f"   Expense count: {stats.get('expense_count', 0)}")
        
        # Get trends
        self.run_test("Dashboard Trends (Monthly)", "GET", "dashboard/trends?period=monthly", 200)
        self.run_test("Dashboard Trends (Weekly)", "GET", "dashboard/trends?period=weekly", 200)
        
        return success

    def test_recurring_expenses(self):
        """Test recurring expenses"""
        print("\n" + "="*50)
        print("TESTING RECURRING EXPENSES")
        print("="*50)
        
        # Get recurring expenses
        success, response = self.run_test("Get Recurring Expenses", "GET", "recurring-expenses", 200)
        if success:
            print(f"   Current recurring expenses: {len(response)}")
        
        # Create recurring expense
        recurring_data = {
            "amount": 100.00,
            "category_id": self.test_category_id or "test-cat-id",
            "category_name": "Test Category",
            "notes": "Test recurring expense",
            "payment_method": "bank_transfer",
            "frequency": "monthly",
            "next_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "is_active": True
        }
        success, response = self.run_test(
            "Create Recurring Expense",
            "POST",
            "recurring-expenses",
            200,
            data=recurring_data
        )
        if success:
            self.test_recurring_id = response.get('id')
            print(f"   Created recurring expense ID: {self.test_recurring_id}")
        
        return success

    def test_profile(self):
        """Test profile management"""
        print("\n" + "="*50)
        print("TESTING PROFILE")
        print("="*50)
        
        # Get profile
        success, response = self.run_test("Get Profile", "GET", "profile", 200)
        if success:
            print(f"   Profile: {response.get('name')} ({response.get('email')})")
        
        # Update profile
        self.run_test(
            "Update Profile",
            "PUT",
            "profile",
            200,
            data={"name": "Updated Test User"}
        )
        
        return success

    def test_export(self):
        """Test export functionality"""
        print("\n" + "="*50)
        print("TESTING EXPORT")
        print("="*50)
        
        # Test CSV export (should return file)
        success, _ = self.run_test("Export CSV", "GET", "export/csv", 200)
        
        # Test PDF export (should return file)
        success, _ = self.run_test("Export PDF", "GET", "export/pdf", 200)
        
        return success

    def cleanup(self):
        """Clean up test data"""
        print("\n" + "="*50)
        print("CLEANING UP TEST DATA")
        print("="*50)
        
        # Delete test data in reverse order
        if self.test_recurring_id:
            self.run_test("Delete Recurring Expense", "DELETE", f"recurring-expenses/{self.test_recurring_id}", 200)
        
        if self.test_budget_id:
            self.run_test("Delete Budget", "DELETE", f"budgets/{self.test_budget_id}", 200)
        
        if self.test_expense_id:
            self.run_test("Delete Expense", "DELETE", f"expenses/{self.test_expense_id}", 200)
        
        if self.test_category_id:
            self.run_test("Delete Category", "DELETE", f"categories/{self.test_category_id}", 200)

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Expense Tracker API Tests")
        print(f"Backend URL: {self.base_url}")
        
        try:
            # Test authentication first
            if not self.test_auth_flow():
                print("❌ Authentication failed, stopping tests")
                return False
            
            # Test all features
            self.test_categories()
            self.test_expenses()
            self.test_budgets()
            self.test_dashboard()
            self.test_recurring_expenses()
            self.test_profile()
            self.test_export()
            
            # Cleanup
            self.cleanup()
            
            # Print results
            print("\n" + "="*50)
            print("TEST RESULTS")
            print("="*50)
            print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
            success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
            print(f"📈 Success rate: {success_rate:.1f}%")
            
            if success_rate >= 90:
                print("🎉 Excellent! Backend is working well")
                return True
            elif success_rate >= 70:
                print("⚠️  Good, but some issues found")
                return True
            else:
                print("❌ Multiple issues found, needs attention")
                return False
                
        except Exception as e:
            print(f"💥 Test suite failed with error: {str(e)}")
            return False

def main():
    tester = ExpenseTrackerAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())