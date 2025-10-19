#!/usr/bin/env python3
"""
Script para agregar usuarios a la aplicación Espacios Con Piscina
Uso: python add_user.py
"""

import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from datetime import datetime, timezone
import uuid

# Configuración
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def add_user():
    """Agregar un nuevo usuario"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.espacios_piscina
    
    print("\n=== AGREGAR NUEVO USUARIO ===\n")
    
    # Solicitar datos
    username = input("Username: ").strip()
    if not username:
        print("❌ Username es requerido")
        return
    
    # Verificar si existe
    existing = await db.users.find_one({"username": username})
    if existing:
        print(f"❌ El usuario '{username}' ya existe")
        return
    
    email = input("Email: ").strip()
    if not email:
        print("❌ Email es requerido")
        return
    
    # Verificar email
    existing_email = await db.users.find_one({"email": email})
    if existing_email:
        print(f"❌ El email '{email}' ya está registrado")
        return
    
    full_name = input("Nombre completo: ").strip()
    password = input("Password: ").strip()
    
    print("\nSelecciona el rol:")
    print("1. Admin (acceso completo)")
    print("2. Employee (empleado, sin acceso a configuración)")
    role_choice = input("Opción (1 o 2): ").strip()
    
    role = "admin" if role_choice == "1" else "employee"
    
    # Crear usuario
    user_data = {
        "id": str(uuid.uuid4()),
        "username": username,
        "email": email,
        "full_name": full_name,
        "role": role,
        "password_hash": pwd_context.hash(password),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_data)
    
    print(f"\n✅ Usuario '{username}' creado exitosamente")
    print(f"   Email: {email}")
    print(f"   Rol: {role}")
    print(f"   Nombre: {full_name}")
    
    client.close()

async def list_users():
    """Listar usuarios existentes"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.espacios_piscina
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    
    print("\n=== USUARIOS REGISTRADOS ===\n")
    for user in users:
        print(f"• {user['username']} ({user['role']})")
        print(f"  Email: {user['email']}")
        print(f"  Nombre: {user['full_name']}")
        print(f"  Estado: {'Activo' if user.get('is_active', True) else 'Inactivo'}")
        print()
    
    print(f"Total: {len(users)} usuarios\n")
    
    client.close()

async def main():
    """Menú principal"""
    print("\n" + "="*50)
    print("   GESTIÓN DE USUARIOS - ESPACIOS CON PISCINA")
    print("="*50)
    
    while True:
        print("\nOpciones:")
        print("1. Agregar nuevo usuario")
        print("2. Listar usuarios existentes")
        print("3. Salir")
        
        choice = input("\nSelecciona una opción: ").strip()
        
        if choice == "1":
            await add_user()
        elif choice == "2":
            await list_users()
        elif choice == "3":
            print("\n¡Hasta luego!\n")
            break
        else:
            print("❌ Opción inválida")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n¡Hasta luego!\n")
        sys.exit(0)
