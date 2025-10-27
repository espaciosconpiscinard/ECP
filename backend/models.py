from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List, Literal, Dict
from datetime import datetime, timezone, time
import uuid

# ============ USER MODELS ============
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: Literal["admin", "employee"] = "employee"

class UserCreate(UserBase):
    password: str
    admin_code: Optional[str] = None  # Código secreto para crear admin

class UserLogin(BaseModel):
    username: str
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True
    is_approved: bool = True  # Nuevo campo: aprobación de cuenta

class UserResponse(UserBase):
    id: str
    created_at: datetime
    is_active: bool
    is_approved: bool

# ============ CUSTOMER MODELS ============
class CustomerBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    identification: Optional[str] = None
    identification_document: Optional[str] = None  # Cedula/Pasaporte/RNC
    dni: Optional[str] = None  # DNI field as requested
    address: Optional[str] = None
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class Customer(CustomerBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # user_id

# ============ CATEGORY MODELS (FOR VILLAS) ============
class CategoryBase(BaseModel):
    name: str  # Nombre de la categoría (ej: "Premium", "Zona Norte", etc.)
    description: Optional[str] = None
    is_active: bool = True

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class Category(CategoryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

# ============ EXPENSE CATEGORY MODELS (SEPARATE FROM VILLA CATEGORIES) ============
class ExpenseCategoryBase(BaseModel):
    name: str  # Luz, Internet, Local, Nómina, etc.
    description: Optional[str] = None
    is_active: bool = True

class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass

class ExpenseCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class ExpenseCategory(ExpenseCategoryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

# ============ FLEXIBLE PRICE MODEL ============
class FlexiblePrice(BaseModel):
    people_count: str = ""  # Ej: "1-10", "11-20", "21+", etc. - usuario decide
    client_price: float
    owner_price: float
    is_default: bool = False  # Marca si este precio debe mostrarse por defecto en la lista

class FlexiblePrices(BaseModel):
    pasadia: List[FlexiblePrice] = []
    amanecida: List[FlexiblePrice] = []
    evento: List[FlexiblePrice] = []

# ============ VILLA MODELS ============
class VillaBase(BaseModel):
    code: str  # ECPVSH, ECPVWLSL, etc.
    name: str  # Villa Sabrina (interno)
    description: Optional[str] = None  # Descripción de lo que contiene
    phone: Optional[str] = None  # Teléfono del propietario (opcional)
    category_id: Optional[str] = None  # ID de la categoría asignada
    
    # Horarios por defecto
    default_check_in_time: str = "9:00 AM"
    default_check_out_time: str = "8:00 PM"
    
    # Precios al cliente (compatibilidad con sistema antiguo)
    default_price_pasadia: float = 0.0
    default_price_amanecida: float = 0.0
    default_price_evento: float = 0.0
    
    # Precios al propietario (lo que debemos pagar - compatibilidad)
    owner_price_pasadia: float = 0.0
    owner_price_amanecida: float = 0.0
    owner_price_evento: float = 0.0
    
    # Sistema de precios flexibles (NUEVO - sin rangos, solo listas ordenadas)
    use_flexible_pricing: bool = False  # Si es True, usar flexible_prices
    flexible_prices: Optional[FlexiblePrices] = None  # Precios flexibles por tipo
    
    # Precios por extras (aplican a cualquier tipo de renta)
    extra_hours_price: float = 0.0  # Precio por hora extra
    extra_people_price: float = 0.0  # Precio por persona extra
    
    max_guests: int = 0
    amenities: List[str] = []  # Piscina, Jacuzzi, BBQ, etc.
    is_active: bool = True

class VillaCreate(VillaBase):
    pass

class Villa(VillaBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

# ============ EXTRA SERVICE MODELS ============
class ExtraServiceBase(BaseModel):
    name: str  # Buffet, Decoración, DJ, etc.
    description: Optional[str] = None
    default_price: float = 0.0
    is_active: bool = True

class ExtraServiceCreate(ExtraServiceBase):
    pass

class ExtraService(ExtraServiceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

# ============ RESERVATION MODELS ============
class ReservationExtraService(BaseModel):
    service_id: str
    service_name: str
    quantity: int = 1
    unit_price: float
    total: float

class ReservationBase(BaseModel):
    customer_id: str
    customer_name: str
    villa_id: str
    villa_code: str  # ECPVSH
    villa_description: Optional[str] = None
    
    # Tipo de renta
    rental_type: Literal["pasadia", "amanecida", "evento"] = "pasadia"
    event_type: Optional[str] = None  # Si es evento, qué tipo
    
    # Fechas y horarios
    reservation_date: datetime
    check_in_time: str  # "9:00 AM"
    check_out_time: str  # "8:00 PM"
    
    # Personas
    guests: int = 1
    
    # Precios
    base_price: float  # Precio base de la villa al cliente
    owner_price: float = 0.0  # Precio a pagar al propietario
    extra_hours: float = 0.0
    extra_hours_cost: float = 0.0
    
    # Servicios extras
    extra_services: List[ReservationExtraService] = []
    extra_services_total: float = 0.0
    
    # Totales
    subtotal: float
    discount: float = 0.0
    include_itbis: bool = False  # Si se incluye ITBIS
    itbis_amount: float = 0.0  # Monto del ITBIS (18%)
    total_amount: float
    
    # Pagos
    deposit: float = 0.0
    payment_method: Literal["efectivo", "deposito", "transferencia", "mixto"] = "efectivo"
    payment_details: Optional[str] = None  # Detalles del pago
    amount_paid: float = 0.0
    
    # Estado
    currency: Literal["DOP", "USD"] = "DOP"
    notes: Optional[str] = None
    status: Literal["pending", "confirmed", "completed", "cancelled"] = "confirmed"

class ReservationCreate(ReservationBase):
    invoice_number: Optional[int] = None  # Opcional: solo admin puede proporcionar número manual

class ReservationUpdate(BaseModel):
    villa_id: Optional[str] = None
    villa_code: Optional[str] = None
    villa_description: Optional[str] = None
    rental_type: Optional[Literal["pasadia", "amanecida", "evento"]] = None
    event_type: Optional[str] = None
    reservation_date: Optional[datetime] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    guests: Optional[int] = None
    base_price: Optional[float] = None
    owner_price: Optional[float] = None
    extra_hours: Optional[float] = None
    extra_hours_cost: Optional[float] = None
    extra_services: Optional[List[ReservationExtraService]] = None
    extra_services_total: Optional[float] = None
    subtotal: Optional[float] = None
    discount: Optional[float] = None
    include_itbis: Optional[bool] = None
    itbis_amount: Optional[float] = None
    total_amount: Optional[float] = None
    deposit: Optional[float] = None
    payment_method: Optional[Literal["efectivo", "deposito", "transferencia", "mixto"]] = None
    payment_details: Optional[str] = None
    amount_paid: Optional[float] = None
    currency: Optional[Literal["DOP", "USD"]] = None
    notes: Optional[str] = None
    status: Optional[Literal["pending", "confirmed", "completed", "cancelled"]] = None

class Reservation(ReservationBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str  # Comenzará desde 1600
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
    balance_due: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

# ============ PAYMENT/ABONO MODELS ============
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
    created_by: str

# ============ ABONO (PAYMENT TO RESERVATION/EXPENSE) MODELS ============
class AbonoBase(BaseModel):
    amount: float
    currency: Literal["DOP", "USD"] = "DOP"
    payment_method: Literal["efectivo", "deposito", "transferencia", "mixto"] = "efectivo"
    payment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None

class AbonoCreate(AbonoBase):
    invoice_number: Optional[str] = None  # Opcional: solo admin puede proporcionar número manual

class Abono(AbonoBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str  # Número de factura único para este abono
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

# ============ EXPENSE MODELS ============
class ExpenseBase(BaseModel):
    category: Literal["local", "nomina", "variable", "pago_propietario", "compromiso", "otros"] = "otros"
    expense_category_id: Optional[str] = None  # ID de categoría de gasto personalizada (luz, internet, etc.)
    description: str
    amount: float
    currency: Literal["DOP", "USD"] = "DOP"
    expense_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payment_status: Literal["pending", "paid"] = "pending"
    notes: Optional[str] = None
    related_reservation_id: Optional[str] = None  # Para gastos auto-generados por reservaciones
    
    # Tipo de gasto
    expense_type: Literal["fijo", "variable", "unico"] = "variable"  # fijo=recurrente, variable=con fecha, unico=sin fecha pago
    
    # Fecha de check-in de la reserva (para ordenar)
    reservation_check_in: Optional[datetime] = None
    
    # Recordatorio de pago recurrente
    has_payment_reminder: bool = False
    payment_reminder_day: Optional[int] = None  # Día del mes (1-31) para recordatorio
    is_recurring: bool = False  # Si es un gasto recurrente mensual
    
    # Para gastos únicos: mostrar también en variables
    show_in_variables: bool = False  # Si un gasto único debe aparecer también en el tab Variables

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    category: Optional[Literal["local", "nomina", "variable", "pago_propietario", "compromiso", "otros"]] = None
    expense_category_id: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[Literal["DOP", "USD"]] = None
    expense_date: Optional[datetime] = None
    payment_status: Optional[Literal["pending", "paid"]] = None
    notes: Optional[str] = None
    expense_type: Optional[Literal["fijo", "variable", "unico"]] = None
    reservation_check_in: Optional[datetime] = None
    has_payment_reminder: Optional[bool] = None
    payment_reminder_day: Optional[int] = None
    is_recurring: Optional[bool] = None
    show_in_variables: Optional[bool] = None  # Para gastos únicos

class Expense(ExpenseBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str
    total_paid: float = 0  # Total de abonos pagados
    balance_due: float = 0  # Saldo restante (puede ser negativo si se paga de más)

# ============ INVOICE COUNTER MODEL ============
class InvoiceCounter(BaseModel):
    model_config = ConfigDict(extra="ignore")
    counter_id: str = "main_counter"
    current_number: int = 1600  # Comenzar desde 1600

# ============ STATS MODELS ============
# ============ COMMISSION MODELS ============
class CommissionBase(BaseModel):
    reservation_id: str
    user_id: str  # Usuario que creó la reservación
    user_name: str  # Nombre del usuario
    villa_code: str
    villa_name: str
    customer_name: str
    reservation_date: str
    amount: float = 250.0  # Comisión default
    notes: Optional[str] = None
    paid: bool = False  # Si ya se pagó la comisión
    paid_date: Optional[str] = None  # Fecha cuando se pagó

class CommissionCreate(CommissionBase):
    pass

class Commission(CommissionBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = "system"

class CommissionUpdate(BaseModel):
    amount: Optional[float] = None
    notes: Optional[str] = None
    paid: Optional[bool] = None
    paid_date: Optional[str] = None

# ============ DASHBOARD MODELS ============
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
    
    # Compromisos del mes actual
    commitments_count: int = 0
    commitments_total_dop: float = 0
    commitments_total_usd: float = 0
    commitments_paid_count: int = 0
    commitments_pending_count: int = 0
    commitments_overdue_count: int = 0

# ============ INVOICE TEMPLATE MODEL ============
class InvoiceTemplateBase(BaseModel):
    # Campos visibles
    show_customer_name: bool = True
    show_customer_phone: bool = True
    show_customer_identification: bool = True
    show_villa_code: bool = True
    show_villa_description: bool = True
    show_rental_type: bool = True
    show_reservation_date: bool = True
    show_check_in_time: bool = True
    show_check_out_time: bool = True
    show_guests: bool = True
    show_extra_services: bool = True
    show_payment_method: bool = True
    show_deposit: bool = True
    
    # Políticas y términos (cada una puede estar activa o no)
    policies: List[str] = [
        "El depósito no es reembolsable",
        "Check-in: horario establecido | Check-out: horario establecido",
        "Capacidad máxima de personas debe respetarse",
        "Prohibido fumar dentro de las instalaciones",
        "El cliente es responsable de cualquier daño a la propiedad"
    ]
    
    # Campos personalizados adicionales
    custom_fields: Dict[str, str] = {}  # {"nombre_campo": "valor_por_defecto"}
    
    # Notas adicionales
    footer_note: Optional[str] = "¡Gracias por su preferencia!"
    
    # Colores (hex)
    primary_color: str = "#2563eb"  # Azul
    secondary_color: str = "#1e40af"  # Azul oscuro
    
    # Logo
    show_logo: bool = True
    
class InvoiceTemplateCreate(InvoiceTemplateBase):
    pass

class InvoiceTemplateUpdate(BaseModel):
    show_customer_name: Optional[bool] = None
    show_customer_phone: Optional[bool] = None
    show_customer_identification: Optional[bool] = None
    show_villa_code: Optional[bool] = None
    show_villa_description: Optional[bool] = None
    show_rental_type: Optional[bool] = None
    show_reservation_date: Optional[bool] = None
    show_check_in_time: Optional[bool] = None
    show_check_out_time: Optional[bool] = None
    show_guests: Optional[bool] = None
    show_extra_services: Optional[bool] = None
    show_payment_method: Optional[bool] = None
    show_deposit: Optional[bool] = None
    policies: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, str]] = None
    footer_note: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    show_logo: Optional[bool] = None

class InvoiceTemplate(InvoiceTemplateBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    template_id: str = "main_template"  # Solo una plantilla principal
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

# ============ LOGO MODEL ============
class LogoConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    config_id: str = "main_logo"  # Solo un logo principal
    logo_data: Optional[str] = None  # Base64 encoded image
    logo_filename: Optional[str] = None
    logo_mimetype: Optional[str] = None
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    uploaded_by: str


