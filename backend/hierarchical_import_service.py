"""
Servicio de Importación Jerárquica - Procesa archivos Excel separados por entidad
"""

import pandas as pd
from io import BytesIO
from typing import Dict, List, Tuple
import uuid
from datetime import datetime, timezone

def parse_prices_from_excel(price_string: str) -> List[Dict]:
    """
    Parsea string de precios del Excel al formato del modelo
    Formato esperado: "regular:12000|cliente:15000|oferta:10000|temporada_alta:18000|cliente_alta:22000"
    
    Returns: [
        {"type": "regular", "owner_price": 12000, "client_price": 15000},
        {"type": "oferta", "owner_price": 10000, "client_price": 15000},
        {"type": "temporada_alta", "owner_price": 18000, "client_price": 22000}
    ]
    """
    if not price_string or pd.isna(price_string) or str(price_string).strip() == '':
        return []
    
    try:
        price_string = str(price_string).strip()
        prices = []
        
        # Parsear cada par key:value separado por |
        pairs = price_string.split('|')
        price_dict = {}
        
        for pair in pairs:
            if ':' in pair:
                key, value = pair.split(':', 1)
                price_dict[key.strip()] = float(value.strip())
        
        # Crear objetos de precio según el tipo
        if 'regular' in price_dict:
            prices.append({
                "type": "regular",
                "owner_price": price_dict.get('regular', 0),
                "client_price": price_dict.get('cliente', price_dict.get('regular', 0))
            })
        
        if 'oferta' in price_dict:
            prices.append({
                "type": "oferta",
                "owner_price": price_dict.get('oferta', 0),
                "client_price": price_dict.get('cliente', price_dict.get('oferta', 0))
            })
        
        if 'temporada_alta' in price_dict:
            prices.append({
                "type": "temporada_alta",
                "owner_price": price_dict.get('temporada_alta', 0),
                "client_price": price_dict.get('cliente_alta', price_dict.get('temporada_alta', 0))
            })
        
        return prices
        
    except Exception as e:
        print(f"Error parseando precios: {price_string} - {e}")
        return []

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
                    'is_active': True,  # Siempre activo al importar
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
    """Importa villas desde Excel con soporte para modalidades (Pasadía, Amanecida, Evento)"""
    try:
        df = pd.read_excel(BytesIO(file_content), sheet_name='Villas')
        
        created = 0
        updated = 0
        errors = []
        skipped_example = 0
        
        for idx, row in df.iterrows():
            try:
                # Validar campos obligatorios
                code = str(row.get('Código Villa *', '')).strip().upper()
                name = str(row.get('Nombre Villa *', '')).strip()
                
                if not code or code == 'NAN':
                    errors.append(f"Fila {idx+2}: Código Villa es obligatorio")
                    continue
                if not name or name.lower() == 'nan':
                    errors.append(f"Fila {idx+2}: Nombre Villa es obligatorio")
                    continue
                
                # SKIP EJEMPLO: Si es la fila de ejemplo del template, saltarla
                if code == 'ECPVSH' and name == 'Villa Shangrila':
                    skipped_example += 1
                    continue
                
                # Buscar categoría si se especificó
                category_id = None
                category_name = str(row.get('Categoría', '')).strip()
                if category_name and category_name.lower() != 'nan':
                    category = await db.categories.find_one({'name': category_name})
                    if category:
                        category_id = category['id']
                
                # MODALIDAD PASADÍA
                has_pasadia = True  # Por defecto todas tienen pasadía
                if pd.notna(row.get('Tiene Pasadía')):
                    has_pasadia = str(row.get('Tiene Pasadía', 'SI')).strip().upper() in ['SI', 'SÍ', 'YES', 'TRUE', '1']
                
                pasadia_prices = parse_prices_from_excel(row.get('Precios Pasadía *', ''))
                if not pasadia_prices and has_pasadia:
                    errors.append(f"Fila {idx+2}: Precios Pasadía es obligatorio si tiene pasadía")
                    continue
                
                # MODALIDAD AMANECIDA
                has_amanecida = False
                if pd.notna(row.get('Tiene Amanecida')):
                    has_amanecida = str(row.get('Tiene Amanecida', 'NO')).strip().upper() in ['SI', 'SÍ', 'YES', 'TRUE', '1']
                
                amanecida_prices = parse_prices_from_excel(row.get('Precios Amanecida', '')) if has_amanecida else []
                
                # MODALIDAD EVENTO
                has_evento = False
                if pd.notna(row.get('Tiene Evento')):
                    has_evento = str(row.get('Tiene Evento', 'NO')).strip().upper() in ['SI', 'SÍ', 'YES', 'TRUE', '1']
                
                evento_prices = parse_prices_from_excel(row.get('Precios Evento', '')) if has_evento else []
                
                # Preparar datos con el esquema actualizado
                villa_data = {
                    'id': str(uuid.uuid4()),
                    'code': code,
                    'name': name,
                    'category_id': category_id,
                    
                    # MODALIDAD PASADÍA
                    'has_pasadia': has_pasadia,
                    'description_pasadia': str(row.get('Descripción Pasadía', '')).strip() if pd.notna(row.get('Descripción Pasadía')) else '',
                    'pasadia_prices': pasadia_prices,
                    'pasadia_currency': str(row.get('Moneda Pasadía', 'DOP')).strip() if pd.notna(row.get('Moneda Pasadía')) else 'DOP',
                    'default_check_in_time_pasadia': str(row.get('Check-in Pasadía', '9:00 AM')).strip() if pd.notna(row.get('Check-in Pasadía')) else '9:00 AM',
                    'default_check_out_time_pasadia': str(row.get('Check-out Pasadía', '8:00 PM')).strip() if pd.notna(row.get('Check-out Pasadía')) else '8:00 PM',
                    
                    # MODALIDAD AMANECIDA
                    'has_amanecida': has_amanecida,
                    'description_amanecida': str(row.get('Descripción Amanecida', '')).strip() if pd.notna(row.get('Descripción Amanecida')) else '',
                    'amanecida_prices': amanecida_prices,
                    'amanecida_currency': str(row.get('Moneda Amanecida', 'DOP')).strip() if pd.notna(row.get('Moneda Amanecida')) else 'DOP',
                    'default_check_in_time_amanecida': str(row.get('Check-in Amanecida', '9:00 AM')).strip() if pd.notna(row.get('Check-in Amanecida')) else '9:00 AM',
                    'default_check_out_time_amanecida': str(row.get('Check-out Amanecida', '8:00 AM')).strip() if pd.notna(row.get('Check-out Amanecida')) else '8:00 AM',
                    
                    # MODALIDAD EVENTO
                    'has_evento': has_evento,
                    'description_evento': str(row.get('Descripción Evento', '')).strip() if pd.notna(row.get('Descripción Evento')) else '',
                    'evento_prices': evento_prices,
                    'evento_currency': str(row.get('Moneda Evento', 'DOP')).strip() if pd.notna(row.get('Moneda Evento')) else 'DOP',
                    'default_check_in_time_evento': str(row.get('Check-in Evento', '9:00 AM')).strip() if pd.notna(row.get('Check-in Evento')) else '9:00 AM',
                    'default_check_out_time_evento': str(row.get('Check-out Evento', '8:00 PM')).strip() if pd.notna(row.get('Check-out Evento')) else '8:00 PM',
                    
                    # Campos generales
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
        skipped_examples = 0
        skipped_empty = 0
        
        for idx, row in df.iterrows():
            try:
                # Validar campos obligatorios
                name = str(row.get('Nombre Servicio *', '')).strip()
                price = row.get('Precio *')
                
                # Saltar filas completamente vacías
                if not name or name.lower() in ['nan', '']:
                    skipped_empty += 1
                    continue
                    
                if pd.isna(price) or price == '':
                    skipped_empty += 1
                    continue
                
                # SKIP EJEMPLOS del template (pero NO DJ que puede ser servicio real)
                if name in ['Chef privado', 'Decoración']:
                    skipped_examples += 1
                    continue
                
                # Preparar datos
                price_float = float(price)
                
                # Debug logging
                print(f"Importando servicio: {name}, Precio del Excel: {price}, Precio convertido: {price_float}")
                
                service_data = {
                    'id': str(uuid.uuid4()),
                    'name': name,
                    'default_price': price_float,
                    'description': str(row.get('Descripción', '')).strip() if pd.notna(row.get('Descripción')) else '',
                    'is_active': True,
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'created_by': 'import_system'
                }
                
                # Verificar si ya existe (por nombre - case insensitive)
                existing = await db.extra_services.find_one({'name': {'$regex': f'^{name}$', '$options': 'i'}})
                
                if existing:
                    existing_price = existing.get('default_price', 0)
                    print(f"  → Servicio existe: precio actual={existing_price}, nuevo precio={price_float}")
                    
                    # SIEMPRE actualizar el precio del Excel (no comparar)
                    await db.extra_services.update_one(
                        {'id': existing['id']},
                        {'$set': {
                            'default_price': price_float, 
                            'description': service_data['description'], 
                            'is_active': True
                        }}
                    )
                    updated += 1
                    print(f"  → ACTUALIZADO: {name} de {existing_price} a {price_float}")
                else:
                    await db.extra_services.insert_one(service_data)
                    created += 1
                    print(f"  → CREADO: {name} con precio {price_float}")
                    
            except Exception as e:
                errors.append(f"Fila {idx+2}: {str(e)}")
        
        return {
            'created': created,
            'updated': updated,
            'errors': errors,
            'total': len(df),
            'skipped_examples': skipped_examples,
            'skipped_empty': skipped_empty
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
