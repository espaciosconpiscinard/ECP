"""
Servicio de Importación de Datos desde Excel
Procesa archivos Excel y los guarda en la base de datos
"""
from datetime import datetime
from typing import List, Dict, Any, Tuple
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

async def import_customers(df: pd.DataFrame, db: AsyncIOMotorDatabase) -> Tuple[int, int, List[str]]:
    """
    Importa clientes desde DataFrame
    Returns: (creados, actualizados, errores)
    """
    created = 0
    updated = 0
    errors = []
    
    for idx, row in df.iterrows():
        try:
            # Validar campos obligatorios
            if pd.isna(row.get('Nombre Completo')) or pd.isna(row.get('Teléfono')):
                errors.append(f"Fila {idx + 2}: Nombre o Teléfono faltante")
                continue
            
            customer_data = {
                'id': str(uuid.uuid4()),
                'name': str(row['Nombre Completo']).strip(),
                'phone': str(row['Teléfono']).strip(),
                'email': str(row.get('Email', '')).strip() if not pd.isna(row.get('Email')) else '',
                'identification_document': str(row.get('Cédula/Pasaporte/RNC', '')).strip() if not pd.isna(row.get('Cédula/Pasaporte/RNC')) else '',
                'address': str(row.get('Dirección', '')).strip() if not pd.isna(row.get('Dirección')) else ''
            }
            
            # Buscar si ya existe por teléfono
            existing = await db.customers.find_one({'phone': customer_data['phone']})
            
            if existing:
                # Actualizar existente
                await db.customers.update_one(
                    {'id': existing['id']},
                    {'$set': customer_data}
                )
                updated += 1
            else:
                # Crear nuevo
                await db.customers.insert_one(customer_data)
                created += 1
                
        except Exception as e:
            errors.append(f"Fila {idx + 2}: {str(e)}")
    
    return created, updated, errors


async def import_villas(df: pd.DataFrame, db: AsyncIOMotorDatabase) -> Tuple[int, int, List[str]]:
    """
    Importa villas desde DataFrame
    Returns: (creadas, actualizadas, errores)
    """
    created = 0
    updated = 0
    errors = []
    
    for idx, row in df.iterrows():
        try:
            # Validar campos obligatorios
            required_fields = ['Código Villa', 'Nombre Villa', 'Categoría', 'Precio Pasadía DOP', 
                             'Precio Amanecida DOP', 'Precio Evento DOP', 'Precio Propietario DOP',
                             'Incluye ITBIS', 'Estado']
            
            missing = [f for f in required_fields if pd.isna(row.get(f))]
            if missing:
                errors.append(f"Fila {idx + 2}: Campos faltantes: {', '.join(missing)}")
                continue
            
            # Buscar categoría por nombre
            category_name = str(row['Categoría']).strip()
            category = await db.categories.find_one({'name': category_name}, {'_id': 0})
            if not category:
                errors.append(f"Fila {idx + 2}: Categoría '{category_name}' no encontrada. Créala primero.")
                continue
            
            villa_data = {
                'id': str(uuid.uuid4()),
                'code': str(row['Código Villa']).strip().upper(),
                'name': str(row['Nombre Villa']).strip(),
                'category_id': category['id'],
                'pricing': {
                    'pasadia': {
                        'price_dop': float(row['Precio Pasadía DOP']),
                        'price_usd': 0.0
                    },
                    'amanecida': {
                        'price_dop': float(row['Precio Amanecida DOP']),
                        'price_usd': 0.0
                    },
                    'evento': {
                        'price_dop': float(row['Precio Evento DOP']),
                        'price_usd': 0.0
                    }
                },
                'owner_price': float(row['Precio Propietario DOP']),
                'description': str(row.get('Descripción', '')).strip() if not pd.isna(row.get('Descripción')) else '',
                'owner': str(row.get('Propietario', '')).strip() if not pd.isna(row.get('Propietario')) else '',
                'phone': str(row.get('Teléfono Propietario', '')).strip() if not pd.isna(row.get('Teléfono Propietario')) else '',
                'schedule': '9:00 AM - 8:00 PM',
                'include_itbis': str(row['Incluye ITBIS']).strip().upper() in ['SI', 'YES', 'TRUE', '1'],
                'is_active': str(row['Estado']).strip().lower() == 'activo'
            }
            
            # Buscar si ya existe por código
            existing = await db.villas.find_one({'code': villa_data['code']})
            
            if existing:
                # Actualizar existente
                await db.villas.update_one(
                    {'id': existing['id']},
                    {'$set': villa_data}
                )
                updated += 1
            else:
                # Crear nueva
                await db.villas.insert_one(villa_data)
                created += 1
                
        except Exception as e:
            errors.append(f"Fila {idx + 2}: {str(e)}")
    
    return created, updated, errors


async def import_reservations(df: pd.DataFrame, db: AsyncIOMotorDatabase) -> Tuple[int, int, int, List[str]]:
    """
    Importa reservaciones desde DataFrame
    Returns: (reservaciones_creadas, reservaciones_actualizadas, gastos_creados, errores)
    """
    reservations_created = 0
    reservations_updated = 0
    expenses_created = 0
    errors = []
    
    for idx, row in df.iterrows():
        try:
            # Validar campos obligatorios
            required_fields = ['Número Factura', 'Nombre Cliente', 'Código Villa', 'Tipo Renta',
                             'Fecha Reserva', 'Huéspedes', 'Precio Base', 'Total', 
                             'Monto Pagado', 'Método Pago', 'Moneda', 'Estado']
            
            missing = [f for f in required_fields if pd.isna(row.get(f))]
            if missing:
                errors.append(f"Fila {idx + 2}: Campos faltantes: {', '.join(missing)}")
                continue
            
            # Buscar cliente por nombre
            customer_name = str(row['Nombre Cliente']).strip()
            customer = await db.customers.find_one({'name': customer_name}, {'_id': 0})
            if not customer:
                errors.append(f"Fila {idx + 2}: Cliente '{customer_name}' no encontrado. Créalo primero en hoja Clientes.")
                continue
            
            # Buscar villa por código
            villa_code = str(row['Código Villa']).strip().upper()
            villa = await db.villas.find_one({'code': villa_code}, {'_id': 0})
            if not villa:
                errors.append(f"Fila {idx + 2}: Villa '{villa_code}' no encontrada. Créala primero en hoja Villas.")
                continue
            
            # Parsear fecha
            fecha_reserva = row['Fecha Reserva']
            if isinstance(fecha_reserva, str):
                try:
                    fecha_obj = datetime.strptime(fecha_reserva, '%d/%m/%Y')
                except:
                    try:
                        fecha_obj = datetime.strptime(fecha_reserva, '%Y-%m-%d')
                    except:
                        errors.append(f"Fila {idx + 2}: Formato de fecha inválido. Use DD/MM/YYYY")
                        continue
            else:
                fecha_obj = pd.to_datetime(fecha_reserva)
            
            reservation_data = {
                'id': str(uuid.uuid4()),
                'invoice_number': str(int(row['Número Factura'])),
                'customer_id': customer['id'],
                'customer_name': customer['name'],
                'villa_id': villa['id'],
                'villa_code': villa['code'],
                'villa_description': villa.get('name', ''),
                'rental_type': str(row['Tipo Renta']).strip().lower(),
                'reservation_date': fecha_obj.isoformat(),
                'check_out_date': fecha_obj.isoformat(),
                'check_in_time': str(row.get('Hora Check-In', '9:00 AM')).strip(),
                'check_out_time': str(row.get('Hora Check-Out', '8:00 PM')).strip(),
                'guests': int(row['Huéspedes']),
                'base_price': float(row['Precio Base']),
                'owner_price': villa.get('owner_price', 0.0),
                'extra_hours': int(row.get('Horas Extra', 0)) if not pd.isna(row.get('Horas Extra')) else 0,
                'extra_hours_cost': float(row.get('Costo Horas Extra', 0)) if not pd.isna(row.get('Costo Horas Extra')) else 0,
                'extra_services': [],
                'extra_services_total': 0,
                'subtotal': float(row['Precio Base']),
                'discount': float(row.get('Descuento', 0)) if not pd.isna(row.get('Descuento')) else 0,
                'include_itbis': str(row.get('Incluye ITBIS', 'NO')).strip().upper() in ['SI', 'YES', 'TRUE', '1'],
                'itbis_amount': 0,
                'total_amount': float(row['Total']),
                'deposit': float(row.get('Depósito', 0)) if not pd.isna(row.get('Depósito')) else 0,
                'amount_paid': float(row['Monto Pagado']),
                'balance_due': float(row['Total']) + float(row.get('Depósito', 0)) - float(row['Monto Pagado']),
                'payment_method': str(row['Método Pago']).strip().lower(),
                'payment_details': '',
                'currency': str(row['Moneda']).strip().upper(),
                'notes': str(row.get('Notas', '')).strip() if not pd.isna(row.get('Notas')) else '',
                'status': str(row['Estado']).strip().lower(),
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat(),
                'created_by': 'import_system'
            }
            
            # Buscar si ya existe por número de factura
            existing = await db.reservations.find_one({'invoice_number': reservation_data['invoice_number']})
            
            if existing:
                # Actualizar existente
                await db.reservations.update_one(
                    {'id': existing['id']},
                    {'$set': reservation_data}
                )
                reservations_updated += 1
                reservation_id = existing['id']
            else:
                # Crear nueva
                await db.reservations.insert_one(reservation_data)
                reservations_created += 1
                reservation_id = reservation_data['id']
            
            # OPCIÓN A: Crear gasto automático si owner_price > 0
            if villa.get('owner_price', 0) > 0:
                # Verificar si ya existe un gasto para esta reservación
                existing_expense = await db.expenses.find_one({
                    'related_reservation_id': reservation_id
                })
                
                if not existing_expense:
                    expense_data = {
                        'id': str(uuid.uuid4()),
                        'category': 'pago_propietario',
                        'expense_category_id': None,
                        'description': f"Pago propietario villa {villa['code']} - Factura #{reservation_data['invoice_number']}",
                        'amount': villa['owner_price'],
                        'currency': reservation_data['currency'],
                        'expense_date': reservation_data['reservation_date'],
                        'payment_status': 'pending',
                        'notes': f"Auto-generado por importación - Reservación {customer['name']}",
                        'expense_type': 'variable',
                        'reservation_check_in': reservation_data['reservation_date'],
                        'has_payment_reminder': False,
                        'payment_reminder_day': None,
                        'is_recurring': False,
                        'related_reservation_id': reservation_id,
                        'abonos': []
                    }
                    
                    await db.expenses.insert_one(expense_data)
                    expenses_created += 1
                
        except Exception as e:
            errors.append(f"Fila {idx + 2}: {str(e)}")
    
    return reservations_created, reservations_updated, expenses_created, errors


async def import_expenses(df: pd.DataFrame, db: AsyncIOMotorDatabase) -> Tuple[int, int, List[str]]:
    """
    Importa gastos desde DataFrame
    Returns: (creados, actualizados, errores)
    """
    created = 0
    updated = 0
    errors = []
    
    for idx, row in df.iterrows():
        try:
            # Validar campos obligatorios
            required_fields = ['Categoría', 'Descripción', 'Monto', 'Moneda', 'Fecha', 'Estado Pago', 'Tipo Gasto']
            
            missing = [f for f in required_fields if pd.isna(row.get(f))]
            if missing:
                errors.append(f"Fila {idx + 2}: Campos faltantes: {', '.join(missing)}")
                continue
            
            # Parsear fecha
            fecha_gasto = row['Fecha']
            if isinstance(fecha_gasto, str):
                try:
                    fecha_obj = datetime.strptime(fecha_gasto, '%d/%m/%Y')
                except:
                    try:
                        fecha_obj = datetime.strptime(fecha_gasto, '%Y-%m-%d')
                    except:
                        errors.append(f"Fila {idx + 2}: Formato de fecha inválido. Use DD/MM/YYYY")
                        continue
            else:
                fecha_obj = pd.to_datetime(fecha_gasto)
            
            expense_data = {
                'id': str(uuid.uuid4()),
                'category': str(row['Categoría']).strip().lower(),
                'expense_category_id': None,
                'description': str(row['Descripción']).strip(),
                'amount': float(row['Monto']),
                'currency': str(row['Moneda']).strip().upper(),
                'expense_date': fecha_obj.isoformat(),
                'payment_status': str(row['Estado Pago']).strip().lower(),
                'notes': str(row.get('Notas', '')).strip() if not pd.isna(row.get('Notas')) else '',
                'expense_type': str(row['Tipo Gasto']).strip().lower(),
                'has_payment_reminder': str(row.get('Tiene Recordatorio', 'NO')).strip().upper() in ['SI', 'YES', 'TRUE', '1'],
                'payment_reminder_day': int(row.get('Día Recordatorio', 1)) if not pd.isna(row.get('Día Recordatorio')) else None,
                'is_recurring': str(row.get('Es Recurrente', 'NO')).strip().upper() in ['SI', 'YES', 'TRUE', '1'],
                'related_reservation_id': None,
                'abonos': []
            }
            
            # Crear nuevo (no buscamos duplicados en gastos)
            await db.expenses.insert_one(expense_data)
            created += 1
                
        except Exception as e:
            errors.append(f"Fila {idx + 2}: {str(e)}")
    
    return created, updated, errors
