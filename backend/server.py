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
    ExpenseCategoryCreate, ExpenseCategoryUpdate, ExpenseCategory,
    VillaCreate, Villa,
    ExtraServiceCreate, ExtraService,
    ReservationCreate, ReservationUpdate, Reservation,
    VillaOwnerCreate, VillaOwnerUpdate, VillaOwner,
    PaymentCreate, Payment,
    AbonoCreate, Abono,
    ExpenseCreate, ExpenseUpdate, Expense,
    DashboardStats, InvoiceCounter,
    InvoiceTemplateCreate, InvoiceTemplateUpdate, InvoiceTemplate,
    LogoConfig
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

async def get_next_invoice_number() -> int:
    """Get next available invoice number starting from 1600 - skips manually created numbers"""
    counter = await db.invoice_counter.find_one({"counter_id": "main_counter"})
    
    if not counter:
        # Initialize counter
        counter_doc = {"counter_id": "main_counter", "current_number": 1600}
        await db.invoice_counter.insert_one(counter_doc)
        invoice_num = 1600
    else:
        invoice_num = counter["current_number"]
    
    # Verificar si el número ya existe (por factura manual de admin)
    # Si existe, buscar el siguiente número disponible
    max_attempts = 100  # Evitar bucle infinito
    attempts = 0
    
    while attempts < max_attempts:
        existing = await db.reservations.find_one({"invoice_number": invoice_num}, {"_id": 0})
        if not existing:
            # Número disponible encontrado
            break
        # Número ya existe, probar el siguiente
        invoice_num += 1
        attempts += 1
    
    # Actualizar contador al siguiente número después del encontrado
    await db.invoice_counter.update_one(
        {"counter_id": "main_counter"},
        {"$set": {"current_number": invoice_num + 1}}
    )
    
    return invoice_num

def calculate_balance(total: float, paid: float, deposit: float = 0) -> float:
    """Calculate balance due - includes deposit in calculation"""
    return max(0, total + deposit - paid)

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

# ============ USER MANAGEMENT ENDPOINTS (ADMIN ONLY) ============

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(require_admin)):
    """Get all users (admin only)"""
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [restore_datetimes(u, ["created_at"]) for u in users]

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Get a user by ID (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return restore_datetimes(user, ["created_at"])

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserCreate,
    current_user: dict = Depends(require_admin)
):
    """Update a user (admin only)"""
    existing_user = await db.users.find_one({"id": user_id})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if username is taken by another user
    username_taken = await db.users.find_one({
        "username": user_data.username,
        "id": {"$ne": user_id}
    })
    if username_taken:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Check if email is taken by another user
    email_taken = await db.users.find_one({
        "email": user_data.email,
        "id": {"$ne": user_id}
    })
    if email_taken:
        raise HTTPException(status_code=400, detail="Email already taken")
    
    update_data = {
        "username": user_data.username,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "password_hash": get_password_hash(user_data.password)
    }
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return restore_datetimes(updated_user, ["created_at"])

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Delete a user (admin only)"""
    # Prevent deleting yourself
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

@api_router.patch("/users/{user_id}/toggle-status")
async def toggle_user_status(user_id: str, current_user: dict = Depends(require_admin)):
    """Toggle user active status (admin only)"""
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not user.get("is_active", True)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {"message": f"User {'activated' if new_status else 'deactivated'} successfully", "is_active": new_status}

# ============ CONFIGURATION ENDPOINTS (ADMIN ONLY) ============

@api_router.get("/config/invoice-counter")
async def get_invoice_counter(current_user: dict = Depends(require_admin)):
    """Get current invoice counter configuration (admin only)"""
    counter = await db.invoice_counter.find_one({"counter_id": "main_counter"}, {"_id": 0})
    
    if not counter:
        # Initialize counter with default value
        counter_doc = {"counter_id": "main_counter", "current_number": 1600}
        await db.invoice_counter.insert_one(counter_doc)
        return {"counter_id": "main_counter", "current_number": 1600, "next_invoice": "1600"}
    
    return {
        "counter_id": counter["counter_id"],
        "current_number": counter["current_number"],
        "next_invoice": str(counter["current_number"])
    }

@api_router.put("/config/invoice-counter")
async def update_invoice_counter(
    new_start: int,
    current_user: dict = Depends(require_admin)
):
    """Update invoice counter starting number (admin only)"""
    if new_start < 1:
        raise HTTPException(status_code=400, detail="El número de factura debe ser mayor a 0")
    
    # Check if there are existing reservations
    reservation_count = await db.reservations.count_documents({})
    
    # Update or create counter
    await db.invoice_counter.update_one(
        {"counter_id": "main_counter"},
        {"$set": {"current_number": new_start}},
        upsert=True
    )
    
    return {
        "message": "Contador de facturas actualizado exitosamente",
        "new_start": new_start,
        "next_invoice": str(new_start),
        "warning": f"Ya existen {reservation_count} reservaciones en el sistema" if reservation_count > 0 else None
    }

@api_router.post("/config/reset-invoice-counter")
async def reset_invoice_counter(
    start_number: int,
    confirm: bool,
    current_user: dict = Depends(require_admin)
):
    """Reset invoice counter (admin only, requires confirmation)"""
    if not confirm:
        raise HTTPException(status_code=400, detail="Debes confirmar para resetear el contador")
    
    if start_number < 1:
        raise HTTPException(status_code=400, detail="El número debe ser mayor a 0")
    
    # Check reservations
    reservation_count = await db.reservations.count_documents({})
    
    if reservation_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede resetear. Existen {reservation_count} reservaciones. Elimina las reservaciones primero o usa 'actualizar' en su lugar."
        )
    
    # Reset counter
    await db.invoice_counter.update_one(
        {"counter_id": "main_counter"},
        {"$set": {"current_number": start_number}},
        upsert=True
    )
    
    return {
        "message": "Contador reseteado exitosamente",
        "new_start": start_number,
        "next_invoice": str(start_number)
    }

# ============ INVOICE TEMPLATE ENDPOINTS (ADMIN ONLY) ============

@api_router.get("/config/invoice-template", response_model=InvoiceTemplate)
async def get_invoice_template(current_user: dict = Depends(require_admin)):
    """Get invoice template configuration (admin only)"""
    template = await db.invoice_templates.find_one({"template_id": "main_template"}, {"_id": 0})
    
    if not template:
        # Create default template
        default_template = InvoiceTemplate(
            template_id="main_template",
            created_by=current_user["id"]
        )
        doc = prepare_doc_for_insert(default_template.model_dump())
        await db.invoice_templates.insert_one(doc)
        return default_template
    
    return restore_datetimes(template, ["created_at", "updated_at"])

@api_router.put("/config/invoice-template", response_model=InvoiceTemplate)
async def update_invoice_template(
    template_data: InvoiceTemplateUpdate,
    current_user: dict = Depends(require_admin)
):
    """Update invoice template (admin only)"""
    existing_template = await db.invoice_templates.find_one({"template_id": "main_template"})
    
    # Prepare update data
    update_dict = {k: v for k, v in template_data.model_dump(exclude_unset=True).items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if not existing_template:
        # Create new template
        new_template = InvoiceTemplate(
            **template_data.model_dump(exclude_unset=True),
            template_id="main_template",
            created_by=current_user["id"]
        )
        doc = prepare_doc_for_insert(new_template.model_dump())
        await db.invoice_templates.insert_one(doc)
        return new_template
    else:
        # Update existing template
        await db.invoice_templates.update_one(
            {"template_id": "main_template"},
            {"$set": update_dict}
        )
        
        updated_template = await db.invoice_templates.find_one({"template_id": "main_template"}, {"_id": 0})
        return restore_datetimes(updated_template, ["created_at", "updated_at"])

@api_router.post("/config/invoice-template/reset")
async def reset_invoice_template(current_user: dict = Depends(require_admin)):
    """Reset invoice template to default (admin only)"""
    default_template = InvoiceTemplate(
        template_id="main_template",
        created_by=current_user["id"]
    )
    
    doc = prepare_doc_for_insert(default_template.model_dump())
    
    await db.invoice_templates.update_one(
        {"template_id": "main_template"},
        {"$set": doc},
        upsert=True
    )
    
    return {"message": "Plantilla reseteada a valores por defecto", "template": default_template}

# ============ LOGO ENDPOINTS (ADMIN ONLY) ============

@api_router.get("/config/logo")
async def get_logo(current_user: dict = Depends(get_current_user)):
    """Get current logo (all users can view)"""
    logo = await db.logo_config.find_one({"config_id": "main_logo"}, {"_id": 0})
    
    if not logo:
        return {"logo_data": None, "logo_filename": None}
    
    return {
        "logo_data": logo.get("logo_data"),
        "logo_filename": logo.get("logo_filename"),
        "logo_mimetype": logo.get("logo_mimetype")
    }

@api_router.post("/config/logo")
async def upload_logo(
    logo_data: str,
    logo_filename: str,
    logo_mimetype: str,
    current_user: dict = Depends(require_admin)
):
    """Upload new logo (admin only)"""
    logo_config = LogoConfig(
        config_id="main_logo",
        logo_data=logo_data,
        logo_filename=logo_filename,
        logo_mimetype=logo_mimetype,
        uploaded_by=current_user["id"]
    )
    
    doc = prepare_doc_for_insert(logo_config.model_dump())
    
    await db.logo_config.update_one(
        {"config_id": "main_logo"},
        {"$set": doc},
        upsert=True
    )
    
    return {"message": "Logo subido exitosamente", "logo_filename": logo_filename}

@api_router.delete("/config/logo")
async def delete_logo(current_user: dict = Depends(require_admin)):
    """Delete logo (admin only)"""
    result = await db.logo_config.delete_one({"config_id": "main_logo"})
    
    if result.deleted_count == 0:
        return {"message": "No hay logo para eliminar"}
    
    return {"message": "Logo eliminado exitosamente"}

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
    """Get all customers ordered alphabetically by name"""
    customers = await db.customers.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
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

# ============ EXPENSE CATEGORY ENDPOINTS (SEPARATE) ============

@api_router.post("/expense-categories", response_model=ExpenseCategory)
async def create_expense_category(category_data: ExpenseCategoryCreate, current_user: dict = Depends(require_admin)):
    """Create a new expense category (admin only)"""
    category = ExpenseCategory(**category_data.model_dump(), created_by=current_user["id"])
    doc = prepare_doc_for_insert(category.model_dump())
    await db.expense_categories.insert_one(doc)
    return category

@api_router.get("/expense-categories", response_model=List[ExpenseCategory])
async def get_expense_categories(current_user: dict = Depends(get_current_user)):
    """Get all expense categories ordered alphabetically"""
    categories = await db.expense_categories.find({"is_active": True}, {"_id": 0}).to_list(1000)
    sorted_categories = sorted([restore_datetimes(c, ["created_at"]) for c in categories], key=lambda x: x.get("name", "").lower())
    return sorted_categories

@api_router.put("/expense-categories/{category_id}", response_model=ExpenseCategory)
async def update_expense_category(category_id: str, update_data: ExpenseCategoryUpdate, current_user: dict = Depends(require_admin)):
    """Update an expense category (admin only)"""
    existing = await db.expense_categories.find_one({"id": category_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Expense category not found")
    
    update_dict = {k: v for k, v in update_data.model_dump(exclude_unset=True).items() if v is not None}
    
    if update_dict:
        await db.expense_categories.update_one({"id": category_id}, {"$set": update_dict})
    
    updated = await db.expense_categories.find_one({"id": category_id}, {"_id": 0})
    return restore_datetimes(updated, ["created_at"])

@api_router.delete("/expense-categories/{category_id}")
async def delete_expense_category(category_id: str, current_user: dict = Depends(require_admin)):
    """Delete an expense category (admin only) - expenses quedan sin categoría"""
    await db.expenses.update_many(
        {"expense_category_id": category_id},
        {"$set": {"expense_category_id": None}}
    )
    
    result = await db.expense_categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense category not found")
    return {"message": "Expense category deleted successfully, expenses unassigned"}

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
    # Si el usuario es admin y proporciona un invoice_number, usarlo
    # De lo contrario, obtener el siguiente número disponible
    if hasattr(reservation_data, 'invoice_number') and reservation_data.invoice_number is not None and current_user.get("role") == "admin":
        # Admin proporcionó un número manual - convertir a string
        invoice_number = str(reservation_data.invoice_number)
        
        # Verificar si ya existe
        existing = await db.reservations.find_one({"invoice_number": invoice_number}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail=f"El número de factura {invoice_number} ya existe")
    else:
        # Obtener siguiente número automático disponible
        invoice_number_int = await get_next_invoice_number()
        invoice_number = str(invoice_number_int)
    
    # Calculate balance: Total + Depósito - Pagado
    balance_due = calculate_balance(
        reservation_data.total_amount, 
        reservation_data.amount_paid,
        reservation_data.deposit
    )
    
    reservation = Reservation(
        **reservation_data.model_dump(exclude={'invoice_number'}),
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
    """Get all reservations with customer identification"""
    query = {}
    if status:
        query["status"] = status
    
    reservations = await db.reservations.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    datetime_fields = ["reservation_date", "created_at", "updated_at"]
    
    # Enrich with customer identification document
    enriched_reservations = []
    for r in reservations:
        restored = restore_datetimes(r, datetime_fields)
        
        # Get customer identification if customer_id exists
        if r.get("customer_id"):
            customer = await db.customers.find_one({"id": r["customer_id"]}, {"_id": 0})
            if customer:
                restored["customer_identification_document"] = customer.get("identification_document") or customer.get("dni")
        
        enriched_reservations.append(restored)
    
    return enriched_reservations

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
        # Recalculate balance if amounts changed: Total + Depósito - Pagado
        total = update_dict.get("total_amount", existing["total_amount"])
        paid = update_dict.get("amount_paid", existing["amount_paid"])
        deposit = update_dict.get("deposit", existing.get("deposit", 0))
        update_dict["balance_due"] = calculate_balance(total, paid, deposit)
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
    """Delete a reservation (admin only) - También elimina gasto asociado si existe"""
    # Eliminar gasto auto-generado asociado a esta reservación
    await db.expenses.delete_many({"related_reservation_id": reservation_id})
    
    # Eliminar abonos de la reservación
    await db.reservation_abonos.delete_many({"reservation_id": reservation_id})
    
    # Eliminar la reservación
    result = await db.reservations.delete_one({"id": reservation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return {"message": "Reservation and related expenses deleted successfully"}

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
    
    # Update reservation amount_paid and balance_due: Total + Depósito - Pagado
    new_amount_paid = reservation.get("amount_paid", 0) + abono_data.amount
    new_balance_due = calculate_balance(
        reservation.get("total_amount", 0), 
        new_amount_paid,
        reservation.get("deposit", 0)
    )
    
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

@api_router.delete("/reservations/{reservation_id}/abonos/{abono_id}")
async def delete_reservation_abono(reservation_id: str, abono_id: str, current_user: dict = Depends(require_admin)):
    """Delete an abono from a reservation (admin only) - to correct errors"""
    # Get the abono to delete
    abono_to_delete = await db.reservation_abonos.find_one({"reservation_id": reservation_id, "id": abono_id}, {"_id": 0})
    if not abono_to_delete:
        raise HTTPException(status_code=404, detail="Abono not found")
    
    # Delete the abono
    await db.reservation_abonos.delete_one({"reservation_id": reservation_id, "id": abono_id})
    
    # Recalculate reservation balance: Total + Depósito - Pagado
    reservation = await db.reservations.find_one({"id": reservation_id}, {"_id": 0})
    if reservation:
        # Recalculate total paid from remaining abonos
        all_abonos = await db.reservation_abonos.find({"reservation_id": reservation_id}, {"_id": 0}).to_list(1000)
        total_from_abonos = sum(a.get("amount", 0) for a in all_abonos)
        
        # Original payment is stored in the reservation
        new_amount_paid = reservation.get("amount_paid", 0) - abono_to_delete.get("amount", 0)
        new_balance_due = calculate_balance(
            reservation.get("total_amount", 0), 
            new_amount_paid,
            reservation.get("deposit", 0)
        )
        
        await db.reservations.update_one(
            {"id": reservation_id},
            {"$set": {
                "amount_paid": new_amount_paid,
                "balance_due": new_balance_due
            }}
        )
    
    return {"message": "Abono deleted successfully"}

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
    """Get all expenses with optional filters and search, including balance_due calculation"""
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
    
    # Calculate balance_due for each expense based on abonos
    for expense in expenses:
        expense_id = expense.get("id")
        # Get all abonos for this expense
        abonos = await db.expense_abonos.find({"expense_id": expense_id}, {"_id": 0}).to_list(1000)
        total_paid = sum(a.get("amount", 0) for a in abonos)
        
        # Calculate balance_due: original amount - total paid
        expense["total_paid"] = total_paid
        expense["balance_due"] = expense.get("amount", 0) - total_paid
    
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
    """Delete an expense (admin only) - Permite eliminar cualquier gasto incluyendo auto-generados"""
    # Verificar si el gasto existe
    expense = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Eliminar abonos asociados
    await db.expense_abonos.delete_many({"expense_id": expense_id})
    
    # Eliminar el gasto
    result = await db.expenses.delete_one({"id": expense_id})
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

@api_router.delete("/expenses/{expense_id}/abonos/{abono_id}")
async def delete_expense_abono(expense_id: str, abono_id: str, current_user: dict = Depends(require_admin)):
    """Delete an abono from an expense (admin only) - to correct errors"""
    # Delete the abono
    result = await db.expense_abonos.delete_one({"expense_id": expense_id, "id": abono_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Abono not found")
    
    # Recalculate expense status
    expense = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if expense:
        all_abonos = await db.expense_abonos.find({"expense_id": expense_id}, {"_id": 0}).to_list(1000)
        total_paid = sum(a.get("amount", 0) for a in all_abonos)
        new_status = "paid" if total_paid >= expense.get("amount", 0) else "pending"
        await db.expenses.update_one(
            {"id": expense_id},
            {"$set": {"payment_status": new_status}}
        )
    
    return {"message": "Abono deleted successfully"}

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
    
    # Calcular compromisos del mes actual
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    current_month = now.month
    current_year = now.year
    
    # Obtener todos los gastos con categoría "compromiso" del mes actual
    commitments = []
    for expense in all_expenses:
        if expense.get("category") == "compromiso":
            expense_date = expense.get("expense_date")
            if isinstance(expense_date, str):
                expense_date = datetime.fromisoformat(expense_date.replace('Z', '+00:00'))
            if expense_date and expense_date.month == current_month and expense_date.year == current_year:
                commitments.append(expense)
    
    commitments_count = len(commitments)
    commitments_total_dop = sum(c.get("amount", 0) for c in commitments if c.get("currency") == "DOP")
    commitments_total_usd = sum(c.get("amount", 0) for c in commitments if c.get("currency") == "USD")
    commitments_paid_count = len([c for c in commitments if c.get("payment_status") == "paid"])
    commitments_pending_count = len([c for c in commitments if c.get("payment_status") == "pending"])
    
    # Contar compromisos vencidos (pendientes con fecha pasada)
    commitments_overdue_count = 0
    for commitment in commitments:
        if commitment.get("payment_status") == "pending":
            expense_date = commitment.get("expense_date")
            if isinstance(expense_date, str):
                expense_date = datetime.fromisoformat(expense_date.replace('Z', '+00:00'))
            if expense_date and expense_date.date() < now.date():
                commitments_overdue_count += 1
    
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
        pending_payment_reservations=pending_payment_reservations,
        commitments_count=commitments_count,
        commitments_total_dop=commitments_total_dop,
        commitments_total_usd=commitments_total_usd,
        commitments_paid_count=commitments_paid_count,
        commitments_pending_count=commitments_pending_count,
        commitments_overdue_count=commitments_overdue_count
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
