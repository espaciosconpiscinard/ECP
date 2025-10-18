from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pathlib import Path
import os
import logging
from typing import List, Optional
from datetime import datetime, timezone, timedelta

# Import local modules
from models import (
    UserCreate, UserLogin, User, UserResponse,
    CustomerCreate, Customer,
    ReservationCreate, ReservationUpdate, Reservation,
    VillaOwnerCreate, VillaOwnerUpdate, VillaOwner,
    PaymentCreate, Payment,
    ExpenseCreate, ExpenseUpdate, Expense,
    DashboardStats
)
from auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, require_admin
)
from database import Database, serialize_doc, serialize_docs, prepare_doc_for_insert, restore_datetimes

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Get database
db = Database.get_db()

# Create the main app
app = FastAPI(title="Villa Management System")

# Create API router
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """Register a new user (admin only in production, open for first user)"""
    # Check if user already exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Check if email already exists
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        password_hash=get_password_hash(user_data.password)
    )
    
    doc = prepare_doc_for_insert(user.model_dump())
    await db.users.insert_one(doc)
    
    return UserResponse(**user.model_dump())

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Login and get access token"""
    user = await db.users.find_one({"username": credentials.username}, {"_id": 0})
    
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=400, detail="User account is inactive")
    
    # Create access token
    access_token = create_access_token(
        data={
            "sub": user["id"],
            "username": user["username"],
            "role": user["role"],
            "email": user["email"],
            "full_name": user["full_name"]
        }
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"]
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)

# ============ CUSTOMER ENDPOINTS ============

@api_router.post("/customers", response_model=Customer)
async def create_customer(customer_data: CustomerCreate, current_user: dict = Depends(get_current_user)):
    """Create a new customer"""
    customer = Customer(**customer_data.model_dump(), created_by=current_user["id"])
    doc = prepare_doc_for_insert(customer.model_dump())
    await db.customers.insert_one(doc)
    return customer

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(current_user: dict = Depends(get_current_user)):
    """Get all customers"""
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    datetime_fields = ["created_at"]
    return [restore_datetimes(c, datetime_fields) for c in customers]

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    """Get a customer by ID"""
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return restore_datetimes(customer, ["created_at"])

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(require_admin)):
    """Delete a customer (admin only)"""
    result = await db.customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully"}

# ============ RESERVATION ENDPOINTS ============

def calculate_balance(total: float, paid: float) -> float:
    """Calculate balance due"""
    return max(0, total - paid)

def generate_invoice_number() -> str:
    """Generate invoice number based on timestamp"""
    now = datetime.now(timezone.utc)
    return f"INV-{now.strftime('%Y%m%d%H%M%S')}"

@api_router.post("/reservations", response_model=Reservation)
async def create_reservation(reservation_data: ReservationCreate, current_user: dict = Depends(get_current_user)):
    """Create a new reservation"""
    # Calculate balance
    balance_due = calculate_balance(reservation_data.total_amount, reservation_data.amount_paid)
    
    reservation = Reservation(
        **reservation_data.model_dump(),
        invoice_number=generate_invoice_number(),
        balance_due=balance_due,
        created_by=current_user["id"]
    )
    
    doc = prepare_doc_for_insert(reservation.model_dump())
    await db.reservations.insert_one(doc)
    
    return reservation

@api_router.get("/reservations", response_model=List[Reservation])
async def get_reservations(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all reservations, optionally filtered by status"""
    query = {}
    if status:
        query["status"] = status
    
    reservations = await db.reservations.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    datetime_fields = ["check_in", "check_out", "created_at", "updated_at"]
    return [restore_datetimes(r, datetime_fields) for r in reservations]

@api_router.get("/reservations/{reservation_id}", response_model=Reservation)
async def get_reservation(reservation_id: str, current_user: dict = Depends(get_current_user)):
    """Get a reservation by ID"""
    reservation = await db.reservations.find_one({"id": reservation_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return restore_datetimes(reservation, ["check_in", "check_out", "created_at", "updated_at"])

@api_router.put("/reservations/{reservation_id}", response_model=Reservation)
async def update_reservation(
    reservation_id: str,
    update_data: ReservationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a reservation"""
    # Get existing reservation
    existing = await db.reservations.find_one({"id": reservation_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # Update fields
    update_dict = {k: v for k, v in update_data.model_dump(exclude_unset=True).items() if v is not None}
    
    if update_dict:
        # Recalculate balance if amounts changed
        total = update_dict.get("total_amount", existing["total_amount"])
        paid = update_dict.get("amount_paid", existing["amount_paid"])
        update_dict["balance_due"] = calculate_balance(total, paid)
        update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Prepare for MongoDB
        prepared_update = {}
        for key, value in update_dict.items():
            if isinstance(value, datetime):
                prepared_update[key] = value.isoformat()
            else:
                prepared_update[key] = value
        
        await db.reservations.update_one(
            {"id": reservation_id},
            {"$set": prepared_update}
        )
    
    # Get updated reservation
    updated = await db.reservations.find_one({"id": reservation_id}, {"_id": 0})
    return restore_datetimes(updated, ["check_in", "check_out", "created_at", "updated_at"])

@api_router.delete("/reservations/{reservation_id}")
async def delete_reservation(reservation_id: str, current_user: dict = Depends(require_admin)):
    """Delete a reservation (admin only)"""
    result = await db.reservations.delete_one({"id": reservation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return {"message": "Reservation deleted successfully"}

# ============ VILLA OWNER ENDPOINTS ============

@api_router.post("/owners", response_model=VillaOwner)
async def create_owner(owner_data: VillaOwnerCreate, current_user: dict = Depends(get_current_user)):
    """Create a new villa owner"""
    owner = VillaOwner(**owner_data.model_dump(), created_by=current_user["id"])
    doc = prepare_doc_for_insert(owner.model_dump())
    await db.villa_owners.insert_one(doc)
    return owner

@api_router.get("/owners", response_model=List[VillaOwner])
async def get_owners(current_user: dict = Depends(get_current_user)):
    """Get all villa owners"""
    owners = await db.villa_owners.find({}, {"_id": 0}).to_list(1000)
    return [restore_datetimes(o, ["created_at"]) for o in owners]

@api_router.get("/owners/{owner_id}", response_model=VillaOwner)
async def get_owner(owner_id: str, current_user: dict = Depends(get_current_user)):
    """Get an owner by ID"""
    owner = await db.villa_owners.find_one({"id": owner_id}, {"_id": 0})
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    return restore_datetimes(owner, ["created_at"])

@api_router.put("/owners/{owner_id}", response_model=VillaOwner)
async def update_owner(
    owner_id: str,
    update_data: VillaOwnerUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an owner"""
    existing = await db.villa_owners.find_one({"id": owner_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Owner not found")
    
    update_dict = {k: v for k, v in update_data.model_dump(exclude_unset=True).items() if v is not None}
    
    if update_dict:
        await db.villa_owners.update_one({"id": owner_id}, {"$set": update_dict})
    
    updated = await db.villa_owners.find_one({"id": owner_id}, {"_id": 0})
    return restore_datetimes(updated, ["created_at"])

@api_router.delete("/owners/{owner_id}")
async def delete_owner(owner_id: str, current_user: dict = Depends(require_admin)):
    """Delete an owner (admin only)"""
    result = await db.villa_owners.delete_one({"id": owner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Owner not found")
    return {"message": "Owner deleted successfully"}

# ============ OWNER PAYMENT ENDPOINTS ============

@api_router.post("/owners/{owner_id}/payments", response_model=Payment)
async def create_owner_payment(
    owner_id: str,
    payment_data: PaymentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Record a payment to an owner"""
    # Verify owner exists
    owner = await db.villa_owners.find_one({"id": owner_id}, {"_id": 0})
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    
    # Create payment
    payment = Payment(**payment_data.model_dump(), created_by=current_user["id"])
    doc = prepare_doc_for_insert(payment.model_dump())
    await db.owner_payments.insert_one(doc)
    
    # Update owner's amount_paid and balance_due
    new_amount_paid = owner.get("amount_paid", 0) + payment_data.amount
    new_balance_due = calculate_balance(owner.get("total_owed", 0), new_amount_paid)
    
    await db.villa_owners.update_one(
        {"id": owner_id},
        {"$set": {"amount_paid": new_amount_paid, "balance_due": new_balance_due}}
    )
    
    return payment

@api_router.get("/owners/{owner_id}/payments", response_model=List[Payment])
async def get_owner_payments(owner_id: str, current_user: dict = Depends(get_current_user)):
    """Get all payments for an owner"""
    payments = await db.owner_payments.find({"owner_id": owner_id}, {"_id": 0}).sort("payment_date", -1).to_list(1000)
    return [restore_datetimes(p, ["payment_date"]) for p in payments]

@api_router.put("/owners/{owner_id}/amounts")
async def update_owner_amounts(
    owner_id: str,
    total_owed: float,
    current_user: dict = Depends(get_current_user)
):
    """Update owner's total owed and recalculate balance"""
    owner = await db.villa_owners.find_one({"id": owner_id}, {"_id": 0})
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    
    amount_paid = owner.get("amount_paid", 0)
    balance_due = calculate_balance(total_owed, amount_paid)
    
    await db.villa_owners.update_one(
        {"id": owner_id},
        {"$set": {"total_owed": total_owed, "balance_due": balance_due}}
    )
    
    return {"message": "Amounts updated successfully", "balance_due": balance_due}

# ============ EXPENSE ENDPOINTS ============

@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense_data: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    """Create a new expense"""
    expense = Expense(**expense_data.model_dump(), created_by=current_user["id"])
    doc = prepare_doc_for_insert(expense.model_dump())
    await db.expenses.insert_one(doc)
    return expense

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all expenses, optionally filtered by category"""
    query = {}
    if category:
        query["category"] = category
    
    expenses = await db.expenses.find(query, {"_id": 0}).sort("expense_date", -1).to_list(1000)
    return [restore_datetimes(e, ["expense_date", "created_at"]) for e in expenses]

@api_router.get("/expenses/{expense_id}", response_model=Expense)
async def get_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    """Get an expense by ID"""
    expense = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return restore_datetimes(expense, ["expense_date", "created_at"])

@api_router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(
    expense_id: str,
    update_data: ExpenseUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an expense"""
    existing = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    update_dict = {k: v for k, v in update_data.model_dump(exclude_unset=True).items() if v is not None}
    
    if update_dict:
        # Prepare for MongoDB
        prepared_update = {}
        for key, value in update_dict.items():
            if isinstance(value, datetime):
                prepared_update[key] = value.isoformat()
            else:
                prepared_update[key] = value
        
        await db.expenses.update_one({"id": expense_id}, {"$set": prepared_update})
    
    updated = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    return restore_datetimes(updated, ["expense_date", "created_at"])

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(require_admin)):
    """Delete an expense (admin only)"""
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted successfully"}

# ============ DASHBOARD & STATS ENDPOINTS ============

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    # Get all reservations
    all_reservations = await db.reservations.find({}, {"_id": 0}).to_list(10000)
    
    # Calculate reservation stats
    total_reservations = len(all_reservations)
    pending_reservations = len([r for r in all_reservations if r.get("balance_due", 0) > 0])
    
    # Calculate revenue by currency
    total_revenue_dop = sum(r.get("amount_paid", 0) for r in all_reservations if r.get("currency") == "DOP")
    total_revenue_usd = sum(r.get("amount_paid", 0) for r in all_reservations if r.get("currency") == "USD")
    
    pending_payments_dop = sum(r.get("balance_due", 0) for r in all_reservations if r.get("currency") == "DOP")
    pending_payments_usd = sum(r.get("balance_due", 0) for r in all_reservations if r.get("currency") == "USD")
    
    # Get expenses
    all_expenses = await db.expenses.find({}, {"_id": 0}).to_list(10000)
    total_expenses_dop = sum(e.get("amount", 0) for e in all_expenses if e.get("currency") == "DOP")
    total_expenses_usd = sum(e.get("amount", 0) for e in all_expenses if e.get("currency") == "USD")
    
    # Get owners
    all_owners = await db.villa_owners.find({}, {"_id": 0}).to_list(1000)
    total_owners = len(all_owners)
    owners_balance_due_dop = sum(o.get("balance_due", 0) for o in all_owners)
    owners_balance_due_usd = 0  # If you track owner payments in USD too
    
    # Get recent reservations (last 5)
    recent_reservations_raw = await db.reservations.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_reservations = [restore_datetimes(r, ["check_in", "check_out", "created_at", "updated_at"]) for r in recent_reservations_raw]
    
    # Get pending payment reservations
    pending_payment_reservations_raw = await db.reservations.find(
        {"balance_due": {"$gt": 0}},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    pending_payment_reservations = [restore_datetimes(r, ["check_in", "check_out", "created_at", "updated_at"]) for r in pending_payment_reservations_raw]
    
    return DashboardStats(
        total_reservations=total_reservations,
        pending_reservations=pending_reservations,
        total_revenue_dop=total_revenue_dop,
        total_revenue_usd=total_revenue_usd,
        pending_payments_dop=pending_payments_dop,
        pending_payments_usd=pending_payments_usd,
        total_expenses_dop=total_expenses_dop,
        total_expenses_usd=total_expenses_usd,
        total_owners=total_owners,
        owners_balance_due_dop=owners_balance_due_dop,
        owners_balance_due_usd=owners_balance_due_usd,
        recent_reservations=recent_reservations,
        pending_payment_reservations=pending_payment_reservations
    )

# ============ HEALTH CHECK ============

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "villa-management-api"}

# Include router in app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    Database.close_db()
