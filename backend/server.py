from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
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
    VillaCreate, Villa,
    ExtraServiceCreate, ExtraService,
    ReservationCreate, ReservationUpdate, Reservation,
    VillaOwnerCreate, VillaOwnerUpdate, VillaOwner,
    PaymentCreate, Payment,
    ExpenseCreate, ExpenseUpdate, Expense,
    DashboardStats, InvoiceCounter
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
app = FastAPI(title="Espacios Con Piscina - Sistema de Gestión")

# Create API router
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ HELPER FUNCTIONS ============

async def get_next_invoice_number() -> str:
    """Get next invoice number starting from 1600"""
    counter = await db.invoice_counter.find_one({"counter_id": "main_counter"})
    
    if not counter:
        # Initialize counter
        counter_doc = {"counter_id": "main_counter", "current_number": 1600}
        await db.invoice_counter.insert_one(counter_doc)
        invoice_num = 1600
    else:
        invoice_num = counter["current_number"]
    
    # Increment counter
    await db.invoice_counter.update_one(
        {"counter_id": "main_counter"},
        {"$set": {"current_number": invoice_num + 1}}
    )
    
    return str(invoice_num)

def calculate_balance(total: float, paid: float) -> float:
    """Calculate balance due"""
    return max(0, total - paid)

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """Register a new user"""
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
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
    return [restore_datetimes(c, ["created_at"]) for c in customers]

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

# ============ VILLA ENDPOINTS ============

@api_router.post("/villas", response_model=Villa)
async def create_villa(villa_data: VillaCreate, current_user: dict = Depends(get_current_user)):
    """Create a new villa"""
    # Check if code already exists
    existing = await db.villas.find_one({"code": villa_data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Villa code already exists")
    
    villa = Villa(**villa_data.model_dump(), created_by=current_user["id"])
    doc = prepare_doc_for_insert(villa.model_dump())
    await db.villas.insert_one(doc)
    return villa

@api_router.get("/villas", response_model=List[Villa])
async def get_villas(current_user: dict = Depends(get_current_user)):
    """Get all villas"""
    villas = await db.villas.find({}, {"_id": 0}).to_list(1000)
    return [restore_datetimes(v, ["created_at"]) for v in villas]

@api_router.get("/villas/{villa_id}", response_model=Villa)
async def get_villa(villa_id: str, current_user: dict = Depends(get_current_user)):
    """Get a villa by ID"""
    villa = await db.villas.find_one({"id": villa_id}, {"_id": 0})
    if not villa:
        raise HTTPException(status_code=404, detail="Villa not found")
    return restore_datetimes(villa, ["created_at"])

@api_router.put("/villas/{villa_id}", response_model=Villa)
async def update_villa(villa_id: str, villa_data: VillaCreate, current_user: dict = Depends(get_current_user)):
    """Update a villa"""
    existing = await db.villas.find_one({"id": villa_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Villa not found")
    
    update_dict = villa_data.model_dump()
    await db.villas.update_one({"id": villa_id}, {"$set": update_dict})
    
    updated = await db.villas.find_one({"id": villa_id}, {"_id": 0})
    return restore_datetimes(updated, ["created_at"])

@api_router.delete("/villas/{villa_id}")
async def delete_villa(villa_id: str, current_user: dict = Depends(require_admin)):
    """Delete a villa (admin only)"""
    result = await db.villas.delete_one({"id": villa_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Villa not found")
    return {"message": "Villa deleted successfully"}

# ============ EXTRA SERVICE ENDPOINTS ============

@api_router.post("/extra-services", response_model=ExtraService)
async def create_extra_service(service_data: ExtraServiceCreate, current_user: dict = Depends(get_current_user)):
    """Create a new extra service"""
    service = ExtraService(**service_data.model_dump(), created_by=current_user["id"])
    doc = prepare_doc_for_insert(service.model_dump())
    await db.extra_services.insert_one(doc)
    return service

@api_router.get("/extra-services", response_model=List[ExtraService])
async def get_extra_services(current_user: dict = Depends(get_current_user)):
    """Get all extra services"""
    services = await db.extra_services.find({}, {"_id": 0}).to_list(1000)
    return [restore_datetimes(s, ["created_at"]) for s in services]

@api_router.put("/extra-services/{service_id}", response_model=ExtraService)
async def update_extra_service(service_id: str, service_data: ExtraServiceCreate, current_user: dict = Depends(get_current_user)):
    """Update an extra service"""
    existing = await db.extra_services.find_one({"id": service_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Service not found")
    
    update_dict = service_data.model_dump()
    await db.extra_services.update_one({"id": service_id}, {"$set": update_dict})
    
    updated = await db.extra_services.find_one({"id": service_id}, {"_id": 0})
    return restore_datetimes(updated, ["created_at"])

@api_router.delete("/extra-services/{service_id}")
async def delete_extra_service(service_id: str, current_user: dict = Depends(require_admin)):
    """Delete an extra service (admin only)"""
    result = await db.extra_services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service deleted successfully"}

# ============ RESERVATION ENDPOINTS ============

@api_router.post("/reservations", response_model=Reservation)
async def create_reservation(reservation_data: ReservationCreate, current_user: dict = Depends(get_current_user)):
    """Create a new reservation"""
    # Get next invoice number
    invoice_number = await get_next_invoice_number()
    
    # Calculate balance
    balance_due = calculate_balance(reservation_data.total_amount, reservation_data.amount_paid)
    
    reservation = Reservation(
        **reservation_data.model_dump(),
        invoice_number=invoice_number,
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
    """Get all reservations"""
    query = {}
    if status:
        query["status"] = status
    
    reservations = await db.reservations.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    datetime_fields = ["reservation_date", "created_at", "updated_at"]
    return [restore_datetimes(r, datetime_fields) for r in reservations]

@api_router.get("/reservations/{reservation_id}", response_model=Reservation)
async def get_reservation(reservation_id: str, current_user: dict = Depends(get_current_user)):
    """Get a reservation by ID"""
    reservation = await db.reservations.find_one({"id": reservation_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return restore_datetimes(reservation, ["reservation_date", "created_at", "updated_at"])

@api_router.put("/reservations/{reservation_id}", response_model=Reservation)
async def update_reservation(
    reservation_id: str,
    update_data: ReservationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a reservation"""
    existing = await db.reservations.find_one({"id": reservation_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    update_dict = {k: v for k, v in update_data.model_dump(exclude_unset=True).items() if v is not None}
    
    if update_dict:
        # Recalculate balance if amounts changed
        total = update_dict.get("total_amount", existing["total_amount"])
        paid = update_dict.get("amount_paid", existing["amount_paid"])
        update_dict["balance_due"] = calculate_balance(total, paid)
        update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
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
    
    updated = await db.reservations.find_one({"id": reservation_id}, {"_id": 0})
    return restore_datetimes(updated, ["reservation_date", "created_at", "updated_at"])

@api_router.delete("/reservations/{reservation_id}")
async def delete_reservation(reservation_id: str, current_user: dict = Depends(require_admin)):
    """Delete a reservation (admin only)"""
    result = await db.reservations.delete_one({"id": reservation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return {"message": "Reservation deleted successfully"}

# Continue with remaining endpoints (owners, expenses, dashboard)...
# (Parte 2 del servidor - necesito continuar en el siguiente mensaje debido al límite de caracteres)
