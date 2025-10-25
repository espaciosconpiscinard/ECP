from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pathlib import Path
import os
import logging
import io
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
    CommissionCreate, Commission, CommissionUpdate,
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
    
    # Verificar si el número ya existe en reservations o abonos (por factura manual de admin)
    # Si existe, buscar el siguiente número disponible
    max_attempts = 100  # Evitar bucle infinito
    attempts = 0
    
    while attempts < max_attempts:
        invoice_str = str(invoice_num)
        
        # Verificar en reservations
        existing_reservation = await db.reservations.find_one({"invoice_number": invoice_str}, {"_id": 0})
        
        # Verificar en abonos de reservaciones
        existing_res_abono = await db.reservation_abonos.find_one({"invoice_number": invoice_str}, {"_id": 0})
        
        # Verificar en abonos de gastos
        existing_exp_abono = await db.expense_abonos.find_one({"invoice_number": invoice_str}, {"_id": 0})
        
        if not existing_reservation and not existing_res_abono and not existing_exp_abono:
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

async def validate_invoice_number_available(invoice_num: str) -> bool:
    """Check if an invoice number is available (not used in reservations or abonos)"""
    # Verificar en reservations
    existing_reservation = await db.reservations.find_one({"invoice_number": invoice_num}, {"_id": 0})
    if existing_reservation:
        return False
    
    # Verificar en abonos de reservaciones
    existing_res_abono = await db.reservation_abonos.find_one({"invoice_number": invoice_num}, {"_id": 0})
    if existing_res_abono:
        return False
    
    # Verificar en abonos de gastos
    existing_exp_abono = await db.expense_abonos.find_one({"invoice_number": invoice_num}, {"_id": 0})
    if existing_exp_abono:
        return False
    
    return True


# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """Register a new user - Admins need secret code, employees need approval"""
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validar código secreto para administradores
    if user_data.role == "admin":
        if not user_data.admin_code or user_data.admin_code != "ECPROSA":
            raise HTTPException(
                status_code=403, 
                detail="Código secreto de administrador inválido"
            )
        is_approved = True  # Admin aprobado automáticamente
    else:
        is_approved = False  # Empleado necesita aprobación
    
    user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        password_hash=get_password_hash(user_data.password),
        is_approved=is_approved
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
    
    # Validar aprobación de cuenta
    if not user.get("is_approved", True):
        raise HTTPException(
            status_code=403, 
            detail="Cuenta pendiente de aprobación por administrador"
        )
    
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

@api_router.get("/users/pending/list", response_model=List[UserResponse])
async def get_pending_users(current_user: dict = Depends(require_admin)):
    """Get all pending approval users (admin only)"""
    users = await db.users.find({"is_approved": False}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [restore_datetimes(u, ["created_at"]) for u in users]

@api_router.patch("/users/{user_id}/approve")
async def approve_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Approve a pending user (admin only)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("is_approved", False):
        return {"message": "User already approved", "is_approved": True}
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_approved": True}}
    )
    
    return {"message": "User approved successfully", "is_approved": True}

@api_router.patch("/users/{user_id}/reject")
async def reject_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Reject a pending user (delete account) (admin only)"""
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User rejected and deleted successfully"}

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

@api_router.get("/villas/{villa_id}/calculate-price")
async def calculate_villa_price(
    villa_id: str, 
    people: int,
    rental_type: str = "pasadia",
    current_user: dict = Depends(get_current_user)
):
    """Calculate suggested price based on number of people"""
    villa = await db.villas.find_one({"id": villa_id}, {"_id": 0})
    if not villa:
        raise HTTPException(status_code=404, detail="Villa not found")
    
    # Si la villa usa pricing tiers
    if villa.get("use_pricing_tiers") and villa.get("pricing_tiers"):
        pricing_tiers = villa.get("pricing_tiers", [])
        
        # Buscar el tier que corresponda al número de personas
        for tier in pricing_tiers:
            if tier["min_people"] <= people <= tier["max_people"]:
                return {
                    "suggested_client_price": tier["client_price"],
                    "suggested_owner_price": tier["owner_price"],
                    "pricing_type": "tiered",
                    "tier_range": f"{tier['min_people']}-{tier['max_people']} personas"
                }
        
        # Si no hay tier que coincida, retornar mensaje
        return {
            "suggested_client_price": 0,
            "suggested_owner_price": 0,
            "pricing_type": "tiered",
            "message": "No hay rango de precio configurado para este número de personas"
        }
    else:
        # Sistema de precios fijos (compatibilidad)
        price_field_client = f"default_price_{rental_type}"
        price_field_owner = f"owner_price_{rental_type}"
        
        return {
            "suggested_client_price": villa.get(price_field_client, 0),
            "suggested_owner_price": villa.get(price_field_owner, 0),
            "pricing_type": "fixed",
            "rental_type": rental_type
        }

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
    
    # AUTO-CREAR COMISIÓN PARA EL USUARIO
    try:
        # Obtener info de la villa
        villa = await db.villas.find_one({"id": reservation_data.villa_id}, {"_id": 0})
        villa_code = villa.get("code", "N/A") if villa else "N/A"
        villa_name = villa.get("name", "N/A") if villa else "N/A"
        
        commission_data = CommissionCreate(
            reservation_id=reservation.id,
            user_id=current_user["id"],
            user_name=current_user.get("full_name", current_user.get("username", "Unknown")),
            villa_code=villa_code,
            villa_name=villa_name,
            customer_name=reservation_data.customer_name,
            reservation_date=reservation_data.reservation_date.isoformat() if isinstance(reservation_data.reservation_date, datetime) else reservation_data.reservation_date,
            amount=250.0,  # Comisión por defecto
            notes=f"Comisión por reservación #{invoice_number}"
        )
        
        commission = Commission(**commission_data.model_dump(), created_by=current_user["id"])
        comm_doc = prepare_doc_for_insert(commission.model_dump())
        await db.commissions.insert_one(comm_doc)
    except Exception as e:
        # Si falla la comisión, no fallar la reservación
        print(f"Error creating commission: {e}")
    
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
    """Add a payment (abono) to a reservation - each abono gets its own invoice number"""
    reservation = await db.reservations.find_one({"id": reservation_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # Handle invoice_number generation
    if abono_data.invoice_number:
        # Admin provided manual invoice number - validate it's available
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can specify manual invoice numbers")
        
        invoice_num_str = str(abono_data.invoice_number)
        is_available = await validate_invoice_number_available(invoice_num_str)
        if not is_available:
            raise HTTPException(status_code=400, detail=f"Invoice number {invoice_num_str} is already in use")
        invoice_number = invoice_num_str
    else:
        # Auto-generate invoice number for employee/admin
        invoice_number = str(await get_next_invoice_number())
    
    # Create abono record with invoice_number
    abono_dict = abono_data.model_dump()
    abono_dict["invoice_number"] = invoice_number  
    abono = Abono(**abono_dict, created_by=current_user["id"])
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

# ============ COMMISSION ENDPOINTS ============

@api_router.get("/commissions", response_model=List[Commission])
async def get_commissions(current_user: dict = Depends(require_admin)):
    """Get all commissions (admin only)"""
    commissions = await db.commissions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [restore_datetimes(c, ["created_at"]) for c in commissions]

@api_router.get("/commissions/user/{user_id}", response_model=List[Commission])
async def get_user_commissions(user_id: str, current_user: dict = Depends(require_admin)):
    """Get commissions for a specific user (admin only)"""
    commissions = await db.commissions.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [restore_datetimes(c, ["created_at"]) for c in commissions]

@api_router.get("/commissions/stats")
async def get_commission_stats(current_user: dict = Depends(require_admin)):
    """Get commission statistics (admin only)"""
    all_commissions = await db.commissions.find({}, {"_id": 0}).to_list(10000)
    
    total_amount = 0
    total_paid = 0
    total_pending = 0
    
    # Group by user
    user_totals = {}
    for comm in all_commissions:
        user_id = comm.get("user_id")
        user_name = comm.get("user_name", "Unknown")
        amount = comm.get("amount", 0)
        is_paid = comm.get("paid", False)
        
        total_amount += amount
        if is_paid:
            total_paid += amount
        else:
            total_pending += amount
        
        if user_id not in user_totals:
            user_totals[user_id] = {
                "user_id": user_id,
                "user_name": user_name,
                "total_commissions": 0,
                "total_paid": 0,
                "total_pending": 0,
                "commission_count": 0,
                "paid_count": 0,
                "pending_count": 0
            }
        
        user_totals[user_id]["total_commissions"] += amount
        user_totals[user_id]["commission_count"] += 1
        
        if is_paid:
            user_totals[user_id]["total_paid"] += amount
            user_totals[user_id]["paid_count"] += 1
        else:
            user_totals[user_id]["total_pending"] += amount
            user_totals[user_id]["pending_count"] += 1
    
    return {
        "total_commissions": total_amount,
        "total_paid": total_paid,
        "total_pending": total_pending,
        "total_count": len(all_commissions),
        "by_user": list(user_totals.values())
    }

@api_router.patch("/commissions/{commission_id}", response_model=Commission)
async def update_commission(
    commission_id: str, 
    commission_update: CommissionUpdate,
    current_user: dict = Depends(require_admin)
):
    """Update commission amount or notes (admin only)"""
    existing = await db.commissions.find_one({"id": commission_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Commission not found")
    
    update_data = {k: v for k, v in commission_update.model_dump().items() if v is not None}
    
    if update_data:
        await db.commissions.update_one({"id": commission_id}, {"$set": update_data})
    
    updated = await db.commissions.find_one({"id": commission_id}, {"_id": 0})
    return restore_datetimes(updated, ["created_at"])

@api_router.delete("/commissions/{commission_id}")
async def delete_commission(commission_id: str, current_user: dict = Depends(require_admin)):
    """Delete a commission (admin only)"""
    result = await db.commissions.delete_one({"id": commission_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Commission not found")
    return {"message": "Commission deleted successfully"}

@api_router.post("/commissions/{commission_id}/mark-paid")
async def mark_commission_paid(commission_id: str, current_user: dict = Depends(require_admin)):
    """Mark commission as paid (admin only)"""
    existing = await db.commissions.find_one({"id": commission_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Commission not found")
    
    paid_date = datetime.now(timezone.utc).isoformat()
    
    await db.commissions.update_one(
        {"id": commission_id},
        {"$set": {"paid": True, "paid_date": paid_date}}
    )
    
    return {"message": "Commission marked as paid", "paid_date": paid_date}

@api_router.post("/commissions/{commission_id}/mark-unpaid")
async def mark_commission_unpaid(commission_id: str, current_user: dict = Depends(require_admin)):
    """Mark commission as unpaid (admin only)"""
    existing = await db.commissions.find_one({"id": commission_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Commission not found")
    
    await db.commissions.update_one(
        {"id": commission_id},
        {"$set": {"paid": False, "paid_date": None}}
    )
    
    return {"message": "Commission marked as unpaid"}

@api_router.post("/commissions/pay-fortnight")
async def pay_fortnight_commissions(
    user_id: str,
    fortnight: int,  # 1 o 2 (primera o segunda quincena)
    month: int,
    year: int,
    current_user: dict = Depends(require_admin)
):
    """Pay all unpaid commissions for a user in a specific fortnight"""
    # Determinar rango de fechas según quincena
    if fortnight == 1:
        start_day = 1
        end_day = 14
    else:  # fortnight == 2
        start_day = 15
        # Último día del mes
        if month == 2:
            end_day = 28 if year % 4 != 0 else 29
        elif month in [4, 6, 9, 11]:
            end_day = 30
        else:
            end_day = 31
    
    start_date = f"{year}-{month:02d}-{start_day:02d}"
    end_date = f"{year}-{month:02d}-{end_day:02d}"
    
    paid_date = datetime.now(timezone.utc).isoformat()
    
    # Actualizar todas las comisiones no pagadas del usuario en esa quincena
    result = await db.commissions.update_many(
        {
            "user_id": user_id,
            "paid": False,
            "reservation_date": {
                "$gte": start_date,
                "$lte": end_date
            }
        },
        {"$set": {"paid": True, "paid_date": paid_date}}
    )
    
    return {
        "message": f"Paid {result.modified_count} commissions for fortnight {fortnight}",
        "count": result.modified_count,
        "paid_date": paid_date
    }

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
    """Add a payment (abono) to an expense - each abono gets its own invoice number"""
    expense = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Handle invoice_number generation
    if abono_data.invoice_number:
        # Admin provided manual invoice number - validate it's available
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can specify manual invoice numbers")
        
        invoice_num_str = str(abono_data.invoice_number)
        is_available = await validate_invoice_number_available(invoice_num_str)
        if not is_available:
            raise HTTPException(status_code=400, detail=f"Invoice number {invoice_num_str} is already in use")
        invoice_number = invoice_num_str
    else:
        # Auto-generate invoice number for employee/admin
        invoice_number = str(await get_next_invoice_number())
    
    # Create abono record with invoice_number
    abono_dict = abono_data.model_dump()
    abono_dict["invoice_number"] = invoice_number  
    abono = Abono(**abono_dict, created_by=current_user["id"])
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
    # Solo contar como pendiente si balance_due > 0 Y tiene campos requeridos
    pending_reservations = len([
        r for r in all_reservations 
        if r.get("balance_due", 0) > 0 
        and all(key in r for key in ['check_in_time', 'check_out_time', 'base_price', 'subtotal'])
    ])
    
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
    
    # Obtener reservaciones recientes - filtrar las que tengan todos los campos requeridos
    recent_reservations_raw = await db.reservations.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_reservations = []
    for r in recent_reservations_raw:
        # Solo agregar si tiene campos críticos
        if all(key in r for key in ['check_in_time', 'check_out_time', 'base_price', 'subtotal']):
            recent_reservations.append(restore_datetimes(r, ["reservation_date", "created_at", "updated_at"]))
    
    # Obtener reservaciones con pagos pendientes - filtrar las que tengan todos los campos requeridos
    pending_payment_reservations_raw = await db.reservations.find(
        {"balance_due": {"$gt": 0}},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    pending_payment_reservations = []
    for r in pending_payment_reservations_raw:
        # Solo agregar si tiene campos críticos
        if all(key in r for key in ['check_in_time', 'check_out_time', 'base_price', 'subtotal']):
            pending_payment_reservations.append(restore_datetimes(r, ["reservation_date", "created_at", "updated_at"]))
    
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

# ============ BACKUP/RESTORE SYSTEM ============
import json
from bson import json_util

@api_router.get("/backup/download")
async def download_full_backup(current_user: dict = Depends(require_admin)):
    """Descargar backup completo de toda la base de datos"""
    try:
        backup_data = {
            "backup_date": datetime.now(timezone.utc).isoformat(),
            "app_version": "1.0",
            "collections": {}
        }
        
        # Colecciones a respaldar
        collections_to_backup = [
            "users", "customers", "categories", "expense_categories",
            "villas", "extra_services", "reservations", "villa_owners",
            "expenses", "reservation_abonos", "expense_abonos",
            "invoice_counter", "invoice_templates", "logo_config"
        ]
        
        for collection_name in collections_to_backup:
            collection = db[collection_name]
            # Obtener todos los documentos
            documents = await collection.find({}, {"_id": 0}).to_list(None)
            backup_data["collections"][collection_name] = documents
        
        # Convertir a JSON
        json_str = json.dumps(backup_data, indent=2, default=json_util.default, ensure_ascii=False)
        
        # Crear nombre de archivo con fecha
        filename = f"espacios_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # Retornar como descarga
        return StreamingResponse(
            io.BytesIO(json_str.encode('utf-8')),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear backup: {str(e)}")

@api_router.post("/backup/restore")
async def restore_from_backup(file: UploadFile = File(...), current_user: dict = Depends(require_admin)):
    """Restaurar backup completo - CUIDADO: Sobrescribe datos existentes"""
    try:
        # Leer archivo
        content = await file.read()
        backup_data = json.loads(content.decode('utf-8'))
        
        if "collections" not in backup_data:
            raise HTTPException(status_code=400, detail="Formato de backup inválido")
        
        restored_collections = []
        errors = []
        
        for collection_name, documents in backup_data["collections"].items():
            try:
                collection = db[collection_name]
                
                if documents:  # Solo si hay documentos
                    # Eliminar datos existentes (CUIDADO!)
                    await collection.delete_many({})
                    
                    # Insertar documentos del backup
                    if documents:
                        await collection.insert_many(documents)
                    
                    restored_collections.append({
                        "collection": collection_name,
                        "documents": len(documents)
                    })
            except Exception as e:
                errors.append({
                    "collection": collection_name,
                    "error": str(e)
                })
        
        return {
            "message": "Backup restaurado exitosamente",
            "restored": restored_collections,
            "errors": errors if errors else None,
            "backup_date": backup_data.get("backup_date", "Desconocida")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al restaurar backup: {str(e)}")

@api_router.get("/backup/info")
async def get_backup_info(current_user: dict = Depends(require_admin)):
    """Obtener información de estadísticas de la base de datos para backup"""
    try:
        collections_info = []
        
        collection_names = [
            "users", "customers", "categories", "expense_categories",
            "villas", "extra_services", "reservations", "villa_owners",
            "expenses", "reservation_abonos", "expense_abonos"
        ]
        
        for collection_name in collection_names:
            collection = db[collection_name]
            count = await collection.count_documents({})
            collections_info.append({
                "name": collection_name,
                "count": count
            })
        
        return {
            "total_collections": len(collections_info),
            "collections": collections_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener info: {str(e)}")

@api_router.post("/system/reset-all")
async def reset_all_data(admin_code: str, current_user: dict = Depends(require_admin)):
    """BORRAR TODO - Elimina todos los datos de todas las colecciones (excepto admin)
    Requiere código de administrador ECPROSA para ejecutar"""
    
    # Validar código secreto
    if admin_code != "ECPROSA":
        raise HTTPException(status_code=403, detail="Código de administrador inválido")
    
    try:
        deleted_summary = []
        
        # Colecciones a borrar COMPLETAMENTE
        collections_to_clear = [
            "customers", "categories", "expense_categories",
            "villas", "extra_services", "reservations", "villa_owners",
            "expenses", "reservation_abonos", "expense_abonos",
            "invoice_counter", "invoice_templates", "logo_config"
        ]
        
        for collection_name in collections_to_clear:
            collection = db[collection_name]
            result = await collection.delete_many({})
            deleted_summary.append({
                "collection": collection_name,
                "deleted": result.deleted_count
            })
        
        # Usuarios: eliminar todos EXCEPTO administradores
        users_result = await db.users.delete_many({"role": {"$ne": "admin"}})
        deleted_summary.append({
            "collection": "users (solo empleados)",
            "deleted": users_result.deleted_count
        })
        
        return {
            "message": "⚠️ SISTEMA RESETEADO COMPLETAMENTE",
            "warning": "Todos los datos han sido eliminados excepto usuarios administradores",
            "deleted": deleted_summary,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al resetear sistema: {str(e)}")

# ============ EXPORT/IMPORT ENDPOINTS ============
from export_service import create_excel_template, export_data_to_excel
from import_service import import_customers, import_villas, import_reservations, import_expenses
import pandas as pd

@api_router.get("/export/template")
async def download_template(current_user: dict = Depends(get_current_user)):
    """Descargar plantilla Excel vacía para importación"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden descargar plantillas")
    
    template = create_excel_template()
    
    return StreamingResponse(
        template,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=Plantilla_Importacion_Espacios_Con_Piscina.xlsx"
        }
    )

@api_router.get("/export/{data_type}")
async def export_data(data_type: str, current_user: dict = Depends(get_current_user)):
    """Exportar datos existentes a Excel"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden exportar datos")
    
    valid_types = ["customers", "villas", "reservations", "expenses"]
    if data_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Tipo inválido. Debe ser: {', '.join(valid_types)}")
    
    excel_file = await export_data_to_excel(db, data_type)
    
    type_names = {
        "customers": "Clientes",
        "villas": "Villas",
        "reservations": "Reservaciones",
        "expenses": "Gastos"
    }
    
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={type_names[data_type]}_Export.xlsx"
        }
    )

@api_router.post("/import/excel")
async def import_from_excel(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Importar datos desde archivo Excel completo"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden importar datos")
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="El archivo debe ser Excel (.xlsx o .xls)")
    
    try:
        # Leer archivo Excel
        contents = await file.read()
        excel_file = pd.ExcelFile(contents)
        
        results = {
            'customers': {'created': 0, 'updated': 0, 'errors': []},
            'villas': {'created': 0, 'updated': 0, 'errors': []},
            'reservations': {'created': 0, 'updated': 0, 'expenses_created': 0, 'errors': []},
            'expenses': {'created': 0, 'updated': 0, 'errors': []}
        }
        
        # Importar Clientes
        if '👥 Clientes' in excel_file.sheet_names:
            df_customers = pd.read_excel(contents, sheet_name='👥 Clientes', skiprows=[1])  # Skip fila de ejemplo
            df_customers = df_customers[~df_customers['Nombre Completo*'].astype(str).str.contains('Juan Pérez', na=False)]
            if not df_customers.empty:
                created, updated, errors = await import_customers(df_customers, db)
                results['customers'] = {'created': created, 'updated': updated, 'errors': errors}
        
        # Importar Villas
        if '🏠 Villas' in excel_file.sheet_names:
            df_villas = pd.read_excel(contents, sheet_name='🏠 Villas', skiprows=[1])
            df_villas = df_villas[~df_villas['Código Villa*'].astype(str).str.contains('ECPVSH', na=False)]
            if not df_villas.empty:
                created, updated, errors = await import_villas(df_villas, db)
                results['villas'] = {'created': created, 'updated': updated, 'errors': errors}
        
        # Importar Reservaciones (y crear gastos automáticos - OPCIÓN A)
        if '🎫 Reservaciones' in excel_file.sheet_names:
            df_reservations = pd.read_excel(contents, sheet_name='🎫 Reservaciones', skiprows=[1])
            df_reservations = df_reservations[~df_reservations['Número Factura*'].astype(str).str.contains('5815', na=False)]
            if not df_reservations.empty:
                res_created, res_updated, exp_created, errors = await import_reservations(df_reservations, db)
                results['reservations'] = {
                    'created': res_created, 
                    'updated': res_updated, 
                    'expenses_created': exp_created,
                    'errors': errors
                }
        
        # Importar Gastos adicionales
        if '💰 Gastos' in excel_file.sheet_names:
            df_expenses = pd.read_excel(contents, sheet_name='💰 Gastos', skiprows=[1])
            df_expenses = df_expenses[~df_expenses['Descripción*'].astype(str).str.contains('Pago de luz', na=False)]
            if not df_expenses.empty:
                created, updated, errors = await import_expenses(df_expenses, db)
                results['expenses'] = {'created': created, 'updated': updated, 'errors': errors}
        
        # Generar resumen
        summary = f"""
✅ IMPORTACIÓN COMPLETADA

👥 Clientes: {results['customers']['created']} creados, {results['customers']['updated']} actualizados
🏠 Villas: {results['villas']['created']} creadas, {results['villas']['updated']} actualizadas
🎫 Reservaciones: {results['reservations']['created']} creadas, {results['reservations']['updated']} actualizadas
💰 Gastos Propietario: {results['reservations']['expenses_created']} creados automáticamente
💰 Gastos Adicionales: {results['expenses']['created']} creados

Total errores: {sum(len(r.get('errors', [])) for r in results.values())}
        """
        
        return {
            "success": True,
            "summary": summary,
            "details": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar archivo: {str(e)}")



# ============ HIERARCHICAL EXPORT/IMPORT ENDPOINTS ============
from hierarchical_export_service import (
    generate_customers_template,
    generate_villa_categories_template,
    generate_villas_template,
    generate_services_template,
    generate_expense_categories_template,
    generate_reservations_template,
    get_all_templates_info
)


from hierarchical_import_service import (
    import_customers,
    import_villa_categories,
    import_villas,
    import_services,
    import_expense_categories,
    import_reservations
)


@api_router.get("/import/templates/info")
async def get_templates_info(current_user: dict = Depends(get_current_user)):
    """Obtener información de todas las plantillas disponibles"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden acceder")
    
    templates_info = await get_all_templates_info(db)
    return {"templates": templates_info}

@api_router.get("/import/template/customers")
async def download_customers_template(current_user: dict = Depends(get_current_user)):
    """PASO 1: Descargar plantilla de Clientes"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden descargar plantillas")
    
    template = generate_customers_template()
    
    return StreamingResponse(
        template,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=Paso_1_Clientes.xlsx"
        }
    )

@api_router.get("/import/template/villa-categories")
async def download_villa_categories_template(current_user: dict = Depends(get_current_user)):
    """PASO 2: Descargar plantilla de Categorías de Villas"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden descargar plantillas")
    
    template = generate_villa_categories_template()
    
    return StreamingResponse(
        template,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=Paso_2_Categorias_Villas.xlsx"
        }
    )

@api_router.get("/import/template/villas")
async def download_villas_template(current_user: dict = Depends(get_current_user)):
    """PASO 3: Descargar plantilla de Villas (con dropdown de categorías)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden descargar plantillas")
    
    template = await generate_villas_template(db)
    
    return StreamingResponse(
        template,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=Paso_3_Villas.xlsx"
        }
    )

@api_router.get("/import/template/services")
async def download_services_template(current_user: dict = Depends(get_current_user)):
    """PASO 4: Descargar plantilla de Servicios Extra"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden descargar plantillas")
    
    template = generate_services_template()
    
    return StreamingResponse(
        template,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=Paso_4_Servicios_Extra.xlsx"
        }
    )

@api_router.get("/import/template/expense-categories")
async def download_expense_categories_template(current_user: dict = Depends(get_current_user)):
    """PASO 5: Descargar plantilla de Categorías de Gastos"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden descargar plantillas")
    
    template = generate_expense_categories_template()
    
    return StreamingResponse(
        template,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=Paso_5_Categorias_Gastos.xlsx"
        }
    )

@api_router.get("/import/template/reservations")
async def download_reservations_template(current_user: dict = Depends(get_current_user)):
    """PASO 6: Descargar plantilla de Reservaciones (con dropdowns de clientes, villas, servicios)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden descargar plantillas")
    
    template = await generate_reservations_template(db)
    
    return StreamingResponse(
        template,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=Paso_6_Reservaciones.xlsx"
        }
    )

# Include router in app
@api_router.post("/import/customers")
async def import_customers_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """PASO 1: Importar clientes desde Excel"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden importar")
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Archivo debe ser Excel (.xlsx o .xls)")
    
    try:
        content = await file.read()
        result = await import_customers(content, db)
        
        summary = f"""✅ Importación de Clientes completada:

📊 Total procesado: {result['total']} filas
✅ Creados: {result['created']}
🔄 Actualizados: {result['updated']}
❌ Errores: {len(result['errors'])}

{chr(10).join(result['errors'][:10]) if result['errors'] else ''}
"""
        return {"success": True, "summary": summary, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al importar: {str(e)}")

@api_router.post("/import/villa-categories")
async def import_villa_categories_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """PASO 2: Importar categorías de villas desde Excel"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden importar")
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Archivo debe ser Excel (.xlsx o .xls)")
    
    try:
        content = await file.read()
        result = await import_villa_categories(content, db)
        
        summary = f"""✅ Importación de Categorías de Villas completada:

📊 Total procesado: {result['total']} filas
✅ Creados: {result['created']}
🔄 Actualizados: {result['updated']}
❌ Errores: {len(result['errors'])}

{chr(10).join(result['errors'][:10]) if result['errors'] else ''}
"""
        return {"success": True, "summary": summary, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al importar: {str(e)}")

@api_router.post("/import/villas")
async def import_villas_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """PASO 3: Importar villas desde Excel"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden importar")
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Archivo debe ser Excel (.xlsx o .xls)")
    
    try:
        content = await file.read()
        result = await import_villas(content, db)
        
        summary = f"""✅ Importación de Villas completada:

📊 Total procesado: {result['total']} filas
✅ Creados: {result['created']}
🔄 Actualizados: {result['updated']}
❌ Errores: {len(result['errors'])}

{chr(10).join(result['errors'][:10]) if result['errors'] else ''}
"""
        return {"success": True, "summary": summary, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al importar: {str(e)}")

@api_router.post("/import/services")
async def import_services_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """PASO 4: Importar servicios extra desde Excel"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden importar")
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Archivo debe ser Excel (.xlsx o .xls)")
    
    try:
        content = await file.read()
        result = await import_services(content, db)
        
        summary = f"""✅ Importación de Servicios Extra completada:

📊 Total procesado: {result['total']} filas
✅ Creados: {result['created']}
🔄 Actualizados: {result['updated']}
❌ Errores: {len(result['errors'])}

{chr(10).join(result['errors'][:10]) if result['errors'] else ''}
"""
        return {"success": True, "summary": summary, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al importar: {str(e)}")

@api_router.post("/import/expense-categories")
async def import_expense_categories_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """PASO 5: Importar categorías de gastos desde Excel"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden importar")
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Archivo debe ser Excel (.xlsx o .xls)")
    
    try:
        content = await file.read()
        result = await import_expense_categories(content, db)
        
        summary = f"""✅ Importación de Categorías de Gastos completada:

📊 Total procesado: {result['total']} filas
✅ Creados: {result['created']}
🔄 Actualizados: {result['updated']}
❌ Errores: {len(result['errors'])}

{chr(10).join(result['errors'][:10]) if result['errors'] else ''}
"""
        return {"success": True, "summary": summary, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al importar: {str(e)}")

@api_router.post("/import/reservations")
async def import_reservations_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """PASO 6: Importar reservaciones desde Excel"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden importar")
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Archivo debe ser Excel (.xlsx o .xls)")
    
    try:
        content = await file.read()
        result = await import_reservations(content, db)
        
        summary = f"""✅ Importación de Reservaciones completada:

📊 Total procesado: {result['total']} filas
✅ Creados: {result['created']}
🔄 Actualizados: {result['updated']}
❌ Errores: {len(result['errors'])}

{chr(10).join(result['errors'][:10]) if result['errors'] else ''}
"""
        return {"success": True, "summary": summary, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al importar: {str(e)}")

app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"]
)


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    Database.close_db()
