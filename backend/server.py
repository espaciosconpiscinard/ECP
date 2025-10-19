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
    CategoryCreate, CategoryUpdate, Category,
    VillaCreate, Villa,
    ExtraServiceCreate, ExtraService,
    ReservationCreate, ReservationUpdate, Reservation,
    VillaOwnerCreate, VillaOwnerUpdate, VillaOwner,
    PaymentCreate, Payment,
    AbonoCreate, Abono,
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

# ============ CATEGORY ENDPOINTS ============

@api_router.post("/categories", response_model=Category)
async def create_category(category_data: CategoryCreate, current_user: dict = Depends(require_admin)):
    """Create a new category (admin only)"""
    category = Category(**category_data.model_dump(), created_by=current_user["id"])
    doc = prepare_doc_for_insert(category.model_dump())
    await db.categories.insert_one(doc)
    return category

@api_router.get("/categories", response_model=List[Category])
async def get_categories(current_user: dict = Depends(get_current_user)):
    """Get all categories ordered alphabetically"""
    categories = await db.categories.find({"is_active": True}, {"_id": 0}).to_list(1000)
    # Ordenar alfabéticamente por nombre
    sorted_categories = sorted([restore_datetimes(c, ["created_at"]) for c in categories], key=lambda x: x.get("name", "").lower())
    return sorted_categories

@api_router.get("/categories/{category_id}", response_model=Category)
async def get_category(category_id: str, current_user: dict = Depends(get_current_user)):
    """Get a category by ID"""
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return restore_datetimes(category, ["created_at"])

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, update_data: CategoryUpdate, current_user: dict = Depends(require_admin)):
    """Update a category (admin only)"""
    existing = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_dict = {k: v for k, v in update_data.model_dump(exclude_unset=True).items() if v is not None}
    
    if update_dict:
        await db.categories.update_one({"id": category_id}, {"$set": update_dict})
    
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    return restore_datetimes(updated, ["created_at"])

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(require_admin)):
    """Delete a category (admin only) - villas quedan sin categoría"""
    # Remover category_id de todas las villas que la tengan asignada
    await db.villas.update_many(
        {"category_id": category_id},
        {"$set": {"category_id": None}}
    )
    
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully, villas unassigned"}

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
async def get_villas(
    search: Optional[str] = None,
    category_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all villas with optional search and category filter"""
    query = {}
    
    # Filtro por categoría
    if category_id:
        query["category_id"] = category_id
    
    # Búsqueda por nombre o código
    if search:
        query["$or"] = [
            {"code": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}}
        ]
    
    villas = await db.villas.find(query, {"_id": 0}).to_list(1000)
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
    
    # AUTO-CREAR GASTO PARA PAGO AL PROPIETARIO
    if reservation_data.owner_price > 0 and reservation_data.villa_id:
        villa = await db.villas.find_one({"id": reservation_data.villa_id}, {"_id": 0})
        if villa:
            # Crear gasto automático para el pago al propietario
            from models import Expense
            import uuid
            
            expense = {
                "id": str(uuid.uuid4()),
                "category": "pago_propietario",
                "category_id": None,
                "description": f"Pago propietario villa {villa['code']} - Factura #{invoice_number}",
                "amount": reservation_data.owner_price,
                "currency": reservation_data.currency,
                "expense_date": reservation_data.reservation_date.isoformat() if isinstance(reservation_data.reservation_date, datetime) else reservation_data.reservation_date,
                "payment_status": "pending",
                "notes": f"Auto-generado por reservación. Cliente: {reservation_data.customer_name}",
                "related_reservation_id": reservation.id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user["id"]
            }
            
            await db.expenses.insert_one(expense)
    
    # Si hay owner_price, crear/actualizar deuda al propietario de la villa
    if reservation_data.owner_price > 0 and reservation_data.villa_id:
        villa = await db.villas.find_one({"id": reservation_data.villa_id}, {"_id": 0})
        if villa:
            # Buscar si ya existe un registro del propietario
            owner_name = f"Propietario {villa['code']}"
            owner = await db.villa_owners.find_one({"name": owner_name}, {"_id": 0})
            
            if not owner:
                # Crear nuevo propietario
                from models import VillaOwner
                import uuid
                owner = {
                    "id": str(uuid.uuid4()),
                    "name": owner_name,
                    "phone": villa.get("phone", ""),
                    "email": "",
                    "villas": [villa["code"]],
                    "commission_percentage": 0,
                    "total_owed": reservation_data.owner_price,
                    "amount_paid": 0,
                    "balance_due": reservation_data.owner_price,
                    "notes": f"Auto-generado para {villa['code']}",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "created_by": current_user["id"]
                }
                await db.villa_owners.insert_one(owner)
            else:
                # Actualizar deuda existente
                new_total = owner.get("total_owed", 0) + reservation_data.owner_price
                new_balance = new_total - owner.get("amount_paid", 0)
                await db.villa_owners.update_one(
                    {"id": owner["id"]},
                    {"$set": {"total_owed": new_total, "balance_due": new_balance}}
                )
    
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

# ============ ABONOS TO RESERVATIONS ============

@api_router.post("/reservations/{reservation_id}/abonos", response_model=Abono)
async def add_abono_to_reservation(reservation_id: str, abono_data: AbonoCreate, current_user: dict = Depends(get_current_user)):
    """Add a payment (abono) to a reservation"""
    reservation = await db.reservations.find_one({"id": reservation_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # Create abono record
    abono = Abono(**abono_data.model_dump(), created_by=current_user["id"])
    abono_doc = prepare_doc_for_insert(abono.model_dump())
    
    # Store in reservation_abonos collection
    abono_doc["reservation_id"] = reservation_id
    await db.reservation_abonos.insert_one(abono_doc)
    
    # Update reservation amount_paid and balance_due
    new_amount_paid = reservation.get("amount_paid", 0) + abono_data.amount
    new_balance_due = calculate_balance(reservation.get("total_amount", 0), new_amount_paid)
    
    await db.reservations.update_one(
        {"id": reservation_id},
        {"$set": {
            "amount_paid": new_amount_paid,
            "balance_due": new_balance_due,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return abono

@api_router.get("/reservations/{reservation_id}/abonos", response_model=List[Abono])
async def get_reservation_abonos(reservation_id: str, current_user: dict = Depends(get_current_user)):
    """Get all abonos for a reservation"""
    abonos = await db.reservation_abonos.find({"reservation_id": reservation_id}, {"_id": 0}).sort("payment_date", -1).to_list(100)
    return [restore_datetimes(a, ["payment_date", "created_at"]) for a in abonos]

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
async def update_owner(owner_id: str, update_data: VillaOwnerUpdate, current_user: dict = Depends(get_current_user)):
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

@api_router.post("/owners/{owner_id}/payments", response_model=Payment)
async def create_owner_payment(owner_id: str, payment_data: PaymentCreate, current_user: dict = Depends(get_current_user)):
    """Record a payment to an owner"""
    owner = await db.villa_owners.find_one({"id": owner_id}, {"_id": 0})
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    
    payment = Payment(**payment_data.model_dump(), created_by=current_user["id"])
    doc = prepare_doc_for_insert(payment.model_dump())
    await db.owner_payments.insert_one(doc)
    
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
async def update_owner_amounts(owner_id: str, total_owed: float, current_user: dict = Depends(get_current_user)):
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
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all expenses with optional filters and search"""
    query = {}
    if category:
        query["category"] = category
    if category_id:
        query["category_id"] = category_id
    
    # Advanced search: invoice, villa, customer, owner
    if search:
        # Search in description and notes
        search_query = {
            "$or": [
                {"description": {"$regex": search, "$options": "i"}},
                {"notes": {"$regex": search, "$options": "i"}}
            ]
        }
        
        # If query already has conditions, combine with $and
        if query:
            query = {"$and": [query, search_query]}
        else:
            query = search_query
    
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
async def update_expense(expense_id: str, update_data: ExpenseUpdate, current_user: dict = Depends(get_current_user)):
    """Update an expense"""
    existing = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    update_dict = {k: v for k, v in update_data.model_dump(exclude_unset=True).items() if v is not None}
    
    if update_dict:
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

# ============ ABONOS TO EXPENSES ============

@api_router.post("/expenses/{expense_id}/abonos", response_model=Abono)
async def add_abono_to_expense(expense_id: str, abono_data: AbonoCreate, current_user: dict = Depends(get_current_user)):
    """Add a payment (abono) to an expense"""
    expense = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Create abono record
    abono = Abono(**abono_data.model_dump(), created_by=current_user["id"])
    abono_doc = prepare_doc_for_insert(abono.model_dump())
    
    # Store in expense_abonos collection
    abono_doc["expense_id"] = expense_id
    await db.expense_abonos.insert_one(abono_doc)
    
    # Get total abonos for this expense
    all_abonos = await db.expense_abonos.find({"expense_id": expense_id}, {"_id": 0}).to_list(1000)
    total_paid = sum(a.get("amount", 0) for a in all_abonos)
    
    # Update expense payment status
    new_status = "paid" if total_paid >= expense.get("amount", 0) else "pending"
    
    await db.expenses.update_one(
        {"id": expense_id},
        {"$set": {"payment_status": new_status}}
    )
    
    return abono

@api_router.get("/expenses/{expense_id}/abonos", response_model=List[Abono])
async def get_expense_abonos(expense_id: str, current_user: dict = Depends(get_current_user)):
    """Get all abonos for an expense"""
    abonos = await db.expense_abonos.find({"expense_id": expense_id}, {"_id": 0}).sort("payment_date", -1).to_list(100)
    return [restore_datetimes(a, ["payment_date", "created_at"]) for a in abonos]

# ============ DASHBOARD & STATS ENDPOINTS ============

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    all_reservations = await db.reservations.find({}, {"_id": 0}).to_list(10000)
    
    total_reservations = len(all_reservations)
    pending_reservations = len([r for r in all_reservations if r.get("balance_due", 0) > 0])
    
    total_revenue_dop = sum(r.get("amount_paid", 0) for r in all_reservations if r.get("currency") == "DOP")
    total_revenue_usd = sum(r.get("amount_paid", 0) for r in all_reservations if r.get("currency") == "USD")
    
    pending_payments_dop = sum(r.get("balance_due", 0) for r in all_reservations if r.get("currency") == "DOP")
    pending_payments_usd = sum(r.get("balance_due", 0) for r in all_reservations if r.get("currency") == "USD")
    
    all_expenses = await db.expenses.find({}, {"_id": 0}).to_list(10000)
    total_expenses_dop = sum(e.get("amount", 0) for e in all_expenses if e.get("currency") == "DOP")
    total_expenses_usd = sum(e.get("amount", 0) for e in all_expenses if e.get("currency") == "USD")
    
    all_owners = await db.villa_owners.find({}, {"_id": 0}).to_list(1000)
    total_owners = len(all_owners)
    owners_balance_due_dop = sum(o.get("balance_due", 0) for o in all_owners)
    owners_balance_due_usd = 0
    
    recent_reservations_raw = await db.reservations.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_reservations = [restore_datetimes(r, ["reservation_date", "created_at", "updated_at"]) for r in recent_reservations_raw]
    
    pending_payment_reservations_raw = await db.reservations.find(
        {"balance_due": {"$gt": 0}},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    pending_payment_reservations = [restore_datetimes(r, ["reservation_date", "created_at", "updated_at"]) for r in pending_payment_reservations_raw]
    
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
    return {"status": "healthy", "service": "espacios-con-piscina-api"}

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
