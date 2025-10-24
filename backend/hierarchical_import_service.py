"""
Servicio de Importación Jerárquica - Procesa archivos Excel separados por entidad
"""

import pandas as pd
from io import BytesIO
from typing import Dict, List, Tuple
import uuid
from datetime import datetime, timezone

async def import_customers(file_content: bytes, db) -> Dict:
    """Importa clientes desde Excel"""
    try:
        df = pd.read_excel(BytesIO(file_content), sheet_name='Clientes')
        
        created = 0
        updated = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # Validar campos obligatorios
                name = str(row.get('Nombre *', '')).strip()
                if not name or name.lower() == 'nan':
                    errors.append(f"Fila {idx+2}: Nombre es obligatorio")
                    continue
                
                # Preparar datos
                customer_data = {
                    'id': str(uuid.uuid4()),
                    'name': name,
                    'email': str(row.get('Email', '')).strip() if pd.notna(row.get('Email')) else '',
                    'phone': str(row.get('Teléfono', '')).strip() if pd.notna(row.get('Teléfono')) else '',
                    'cedula': str(row.get('Cédula/RNC', '')).strip() if pd.notna(row.get('Cédula/RNC')) else '',
                    'address': str(row.get('Dirección', '')).strip() if pd.notna(row.get('Dirección')) else '',
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'created_by': 'import_system'
                }
                
                # Verificar si ya existe (por nombre exacto)
                existing = await db.customers.find_one({'name': customer_data['name']})
                
                if existing:
                    # Actualizar
                    await db.customers.update_one(
                        {'name': customer_data['name']},
                        {'$set': customer_data}
                    )
                    updated += 1
                else:
                    # Crear nuevo
                    await db.customers.insert_one(customer_data)
                    created += 1
                    
            except Exception as e:
                errors.append(f"Fila {idx+2}: {str(e)}")
        
        return {
            'created': created,
            'updated': updated,
            'errors': errors,
            'total': len(df)
        }
        
    except Exception as e:
        return {
            'created': 0,
            'updated': 0,
            'errors': [f"Error al procesar archivo: {str(e)}"],
            'total': 0
        }

async def import_villa_categories(file_content: bytes, db) -> Dict:
    """Importa categorías de villas desde Excel"""
    try:
        df = pd.read_excel(BytesIO(file_content), sheet_name='Categorías')
        
        created = 0
        updated = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # Validar campos obligatorios
                name = str(row.get('Nombre Categoría *', '')).strip()
                if not name or name.lower() == 'nan':
                    errors.append(f"Fila {idx+2}: Nombre es obligatorio")
                    continue
                
                # Preparar datos
                category_data = {
                    'id': str(uuid.uuid4()),
                    'name': name,
                    'description': str(row.get('Descripción', '')).strip() if pd.notna(row.get('Descripción')) else '',
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'created_by': 'import_system'
                }
                
                # Verificar si ya existe
                existing = await db.categories.find_one({'name': category_data['name']})
                
                if existing:
                    await db.categories.update_one(
                        {'name': category_data['name']},
                        {'$set': category_data}
                    )
                    updated += 1
                else:
                    await db.categories.insert_one(category_data)
                    created += 1
                    
            except Exception as e:
                errors.append(f"Fila {idx+2}: {str(e)}")
        
        return {
            'created': created,
            'updated': updated,
            'errors': errors,
            'total': len(df)
        }
        
    except Exception as e:
        return {
            'created': 0,
            'updated': 0,
            'errors': [f"Error al procesar archivo: {str(e)}"],
            'total': 0
        }

async def import_villas(file_content: bytes, db) -> Dict:
    """Importa villas desde Excel"""
    try:
        df = pd.read_excel(BytesIO(file_content), sheet_name='Villas')
        
        created = 0
        updated = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # Validar campos obligatorios
                code = str(row.get('Código Villa *', '')).strip().upper()
                name = str(row.get('Nombre Villa *', '')).strip()
                client_price = row.get('Precio Cliente *')
                
                if not code or code == 'NAN':
                    errors.append(f"Fila {idx+2}: Código Villa es obligatorio")
                    continue
                if not name or name.lower() == 'nan':
                    errors.append(f"Fila {idx+2}: Nombre Villa es obligatorio")
                    continue
                if pd.isna(client_price):
                    errors.append(f"Fila {idx+2}: Precio Cliente es obligatorio")
                    continue
                
                # Buscar categoría si se especificó
                category_id = None
                category_name = str(row.get('Categoría', '')).strip()
                if category_name and category_name.lower() != 'nan':
                    category = await db.categories.find_one({'name': category_name})
                    if category:
                        category_id = category['id']
                
                # Convertir precio único a precios por tipo
                client_price_val = float(client_price)
                owner_price_val = float(row.get('Precio Propietario', 0)) if pd.notna(row.get('Precio Propietario')) else 0
                
                # Preparar datos con el esquema correcto del modelo
                villa_data = {
                    'id': str(uuid.uuid4()),
                    'code': code,
                    'name': name,
                    'description': str(row.get('Descripción', '')).strip() if pd.notna(row.get('Descripción')) else '',
                    'phone': None,
                    'category_id': category_id,
                    'default_check_in_time': str(row.get('Horario Check-in', '9:00 AM')).strip() if pd.notna(row.get('Horario Check-in')) else '9:00 AM',
                    'default_check_out_time': str(row.get('Horario Check-out', '8:00 PM')).strip() if pd.notna(row.get('Horario Check-out')) else '8:00 PM',
                    'default_price_pasadia': client_price_val,
                    'default_price_amanecida': client_price_val,
                    'default_price_evento': client_price_val,
                    'owner_price_pasadia': owner_price_val,
                    'owner_price_amanecida': owner_price_val,
                    'owner_price_evento': owner_price_val,
                    'max_guests': 0,
                    'amenities': [],
                    'is_active': True,
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'created_by': 'import_system'
                }
                
                # Verificar si ya existe
                existing = await db.villas.find_one({'code': villa_data['code']})
                
                if existing:
                    await db.villas.update_one(
                        {'code': villa_data['code']},
                        {'$set': villa_data}
                    )
                    updated += 1
                else:
                    await db.villas.insert_one(villa_data)
                    created += 1
                    
            except Exception as e:
                errors.append(f"Fila {idx+2}: {str(e)}")
        
        return {
            'created': created,
            'updated': updated,
            'errors': errors,
            'total': len(df)
        }
        
    except Exception as e:
        return {
            'created': 0,
            'updated': 0,
            'errors': [f"Error al procesar archivo: {str(e)}"],
            'total': 0
        }

async def import_services(file_content: bytes, db) -> Dict:
    """Importa servicios extra desde Excel"""
    try:
        df = pd.read_excel(BytesIO(file_content), sheet_name='Servicios Extra')
        
        created = 0
        updated = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # Validar campos obligatorios
                name = str(row.get('Nombre Servicio *', '')).strip()
                price = row.get('Precio *')
                
                if not name or name.lower() == 'nan':
                    errors.append(f"Fila {idx+2}: Nombre Servicio es obligatorio")
                    continue
                if pd.isna(price):
                    errors.append(f"Fila {idx+2}: Precio es obligatorio")
                    continue
                
                # Preparar datos
                service_data = {
                    'id': str(uuid.uuid4()),
                    'name': name,
                    'price': float(price),
                    'description': str(row.get('Descripción', '')).strip() if pd.notna(row.get('Descripción')) else '',
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'created_by': 'import_system'
                }
                
                # Verificar si ya existe
                existing = await db.extra_services.find_one({'name': service_data['name']})
                
                if existing:
                    await db.extra_services.update_one(
                        {'name': service_data['name']},
                        {'$set': service_data}
                    )
                    updated += 1
                else:
                    await db.extra_services.insert_one(service_data)
                    created += 1
                    
            except Exception as e:
                errors.append(f"Fila {idx+2}: {str(e)}")
        
        return {
            'created': created,
            'updated': updated,
            'errors': errors,
            'total': len(df)
        }
        
    except Exception as e:
        return {
            'created': 0,
            'updated': 0,
            'errors': [f"Error al procesar archivo: {str(e)}"],
            'total': 0
        }

async def import_expense_categories(file_content: bytes, db) -> Dict:
    """Importa categorías de gastos desde Excel"""
    try:
        df = pd.read_excel(BytesIO(file_content), sheet_name='Categorías Gastos')
        
        created = 0
        updated = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # Validar campos obligatorios
                name = str(row.get('Nombre Categoría *', '')).strip()
                if not name or name.lower() == 'nan':
                    errors.append(f"Fila {idx+2}: Nombre es obligatorio")
                    continue
                
                # Preparar datos
                category_data = {
                    'id': str(uuid.uuid4()),
                    'name': name,
                    'description': str(row.get('Descripción', '')).strip() if pd.notna(row.get('Descripción')) else '',
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'created_by': 'import_system'
                }
                
                # Verificar si ya existe
                existing = await db.expense_categories.find_one({'name': category_data['name']})
                
                if existing:
                    await db.expense_categories.update_one(
                        {'name': category_data['name']},
                        {'$set': category_data}
                    )
                    updated += 1
                else:
                    await db.expense_categories.insert_one(category_data)
                    created += 1
                    
            except Exception as e:
                errors.append(f"Fila {idx+2}: {str(e)}")
        
        return {
            'created': created,
            'updated': updated,
            'errors': errors,
            'total': len(df)
        }
        
    except Exception as e:
        return {
            'created': 0,
            'updated': 0,
            'errors': [f"Error al procesar archivo: {str(e)}"],
            'total': 0
        }

async def import_reservations(file_content: bytes, db) -> Dict:
    """Importa reservaciones desde Excel"""
    try:
        df = pd.read_excel(BytesIO(file_content), sheet_name='Reservaciones')
        
        created = 0
        updated = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # Validar campos obligatorios
                invoice_number = str(row.get('N° Factura *', '')).strip()
                customer_name = str(row.get('Cliente *', '')).strip()
                villa_code = str(row.get('Villa *', '')).strip().upper()
                price = row.get('Precio *')
                
                if not invoice_number or invoice_number.lower() == 'nan':
                    errors.append(f"Fila {idx+2}: N° Factura es obligatorio")
                    continue
                if not customer_name or customer_name.lower() == 'nan':
                    errors.append(f"Fila {idx+2}: Cliente es obligatorio")
                    continue
                if not villa_code or villa_code == 'NAN':
                    errors.append(f"Fila {idx+2}: Villa es obligatoria")
                    continue
                if pd.isna(price):
                    errors.append(f"Fila {idx+2}: Precio es obligatorio")
                    continue
                
                # Buscar cliente
                customer = await db.customers.find_one({'name': customer_name})
                if not customer:
                    errors.append(f"Fila {idx+2}: Cliente '{customer_name}' no encontrado. Debe importar clientes primero.")
                    continue
                
                # Buscar villa
                villa = await db.villas.find_one({'code': villa_code})
                if not villa:
                    errors.append(f"Fila {idx+2}: Villa '{villa_code}' no encontrada. Debe importar villas primero.")
                    continue
                
                # Preparar datos de reservación
                reservation_date = pd.to_datetime(row.get('Fecha Reservación *')).isoformat() if pd.notna(row.get('Fecha Reservación *')) else datetime.now(timezone.utc).isoformat()
                
                reservation_data = {
                    'id': str(uuid.uuid4()),
                    'invoice_number': invoice_number,
                    'reservation_date': reservation_date,
                    'customer_id': customer['id'],
                    'customer_name': customer['name'],
                    'villa_id': villa['id'],
                    'villa_code': villa['code'],
                    'rental_type': str(row.get('Tipo Alquiler *', 'pasadia')).strip().lower(),
                    'checkin_time': str(row.get('Check-in', '08:00')).strip() if pd.notna(row.get('Check-in')) else '08:00',
                    'checkout_time': str(row.get('Check-out', '18:00')).strip() if pd.notna(row.get('Check-out')) else '18:00',
                    'num_people': int(row.get('N° Personas', 0)) if pd.notna(row.get('N° Personas')) else 0,
                    'total_amount': float(price),
                    'currency': str(row.get('Moneda *', 'DOP')).strip().upper(),
                    'payment_method': str(row.get('Método Pago *', 'efectivo')).strip().lower(),
                    'amount_paid': float(row.get('Monto Pagado', 0)) if pd.notna(row.get('Monto Pagado')) else 0,
                    'deposit': float(row.get('Depósito', 0)) if pd.notna(row.get('Depósito')) else 0,
                    'include_itbis': str(row.get('Incluir ITBIS', 'NO')).strip().upper() == 'SI',
                    'notes': str(row.get('Notas', '')).strip() if pd.notna(row.get('Notas')) else '',
                    'extra_services': [],
                    'status': 'confirmed',
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'created_by': 'import_system'
                }
                
                # Calcular balance_due
                reservation_data['balance_due'] = reservation_data['total_amount'] + reservation_data['deposit'] - reservation_data['amount_paid']
                
                # Verificar si ya existe (por número de factura)
                existing = await db.reservations.find_one({'invoice_number': invoice_number})
                
                if existing:
                    await db.reservations.update_one(
                        {'invoice_number': invoice_number},
                        {'$set': reservation_data}
                    )
                    updated += 1
                else:
                    await db.reservations.insert_one(reservation_data)
                    created += 1
                    
            except Exception as e:
                errors.append(f"Fila {idx+2}: {str(e)}")
        
        return {
            'created': created,
            'updated': updated,
            'errors': errors,
            'total': len(df)
        }
        
    except Exception as e:
        return {
            'created': 0,
            'updated': 0,
            'errors': [f"Error al procesar archivo: {str(e)}"],
            'total': 0
        }
