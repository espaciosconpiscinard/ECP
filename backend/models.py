from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List, Literal
from datetime import datetime, timezone
import uuid

# ============ USER MODELS ============
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: Literal["admin", "employee"] = "employee"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class UserResponse(UserBase):
    id: str
    created_at: datetime
    is_active: bool

# ============ CUSTOMER MODELS ============
class CustomerBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    identification: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class Customer(CustomerBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # user_id

# ============ RESERVATION MODELS ============
class ReservationBase(BaseModel):
    customer_id: str
    customer_name: str  # Denormalized for easy display
    villa_name: str
    check_in: datetime
    check_out: datetime
    total_amount: float
    deposit: float = 0.0
    amount_paid: float = 0.0
    currency: Literal["DOP", "USD"] = "DOP"
    guests: int = 1
    extra_hours: float = 0.0
    extra_hours_cost: float = 0.0
    additional_guests: int = 0
    additional_guests_cost: float = 0.0
    notes: Optional[str] = None
    status: Literal["pending", "confirmed", "completed", "cancelled"] = "confirmed"

class ReservationCreate(ReservationBase):
    pass

class ReservationUpdate(BaseModel):
    villa_name: Optional[str] = None
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    total_amount: Optional[float] = None
    deposit: Optional[float] = None
    amount_paid: Optional[float] = None
    currency: Optional[Literal["DOP", "USD"]] = None
    guests: Optional[int] = None
    extra_hours: Optional[float] = None
    extra_hours_cost: Optional[float] = None
    additional_guests: Optional[int] = None
    additional_guests_cost: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[Literal["pending", "confirmed", "completed", "cancelled"]] = None

class Reservation(ReservationBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    balance_due: float  # Calculated: total_amount - amount_paid
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # user_id

# ============ VILLA OWNER MODELS ============
class VillaOwnerBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    villas: List[str] = []  # List of villa names
    commission_percentage: float = 0.0
    notes: Optional[str] = None

class VillaOwnerCreate(VillaOwnerBase):
    pass

class VillaOwnerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    villas: Optional[List[str]] = None
    commission_percentage: Optional[float] = None
    notes: Optional[str] = None

class VillaOwner(VillaOwnerBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    total_owed: float = 0.0
    amount_paid: float = 0.0
    balance_due: float = 0.0  # Calculated: total_owed - amount_paid
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # user_id

# ============ PAYMENT MODELS (for owner payments) ============
class PaymentBase(BaseModel):
    owner_id: str
    amount: float
    currency: Literal["DOP", "USD"] = "DOP"
    payment_method: Optional[str] = "cash"
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # user_id

# ============ EXPENSE MODELS ============
class ExpenseBase(BaseModel):
    category: Literal["local", "nomina", "variable", "otros"] = "otros"
    description: str
    amount: float
    currency: Literal["DOP", "USD"] = "DOP"
    expense_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payment_status: Literal["pending", "paid"] = "paid"
    notes: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    category: Optional[Literal["local", "nomina", "variable", "otros"]] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[Literal["DOP", "USD"]] = None
    expense_date: Optional[datetime] = None
    payment_status: Optional[Literal["pending", "paid"]] = None
    notes: Optional[str] = None

class Expense(ExpenseBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # user_id

# ============ STATS MODELS ============
class DashboardStats(BaseModel):
    total_reservations: int
    pending_reservations: int
    total_revenue_dop: float
    total_revenue_usd: float
    pending_payments_dop: float
    pending_payments_usd: float
    total_expenses_dop: float
    total_expenses_usd: float
    total_owners: int
    owners_balance_due_dop: float
    owners_balance_due_usd: float
    recent_reservations: List[Reservation]
    pending_payment_reservations: List[Reservation]
