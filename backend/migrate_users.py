"""
Script de migración para agregar campos is_active y is_approved a usuarios existentes
Ejecutar una sola vez en producción
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def migrate_users():
    # Conectar a MongoDB
    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("DB_NAME", "espacios_piscina")
    
    if not mongo_url:
        print("❌ ERROR: MONGO_URL no configurado")
        return
    
    print(f"🔗 Conectando a MongoDB: {db_name}")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Obtener todos los usuarios
    users = await db.users.find({}).to_list(None)
    print(f"📊 Encontrados {len(users)} usuarios")
    
    updated_count = 0
    
    for user in users:
        user_id = user.get('id') or user.get('_id')
        username = user.get('username', 'unknown')
        
        # Verificar qué campos faltan
        needs_update = False
        update_fields = {}
        
        if 'is_active' not in user:
            update_fields['is_active'] = True
            needs_update = True
            
        if 'is_approved' not in user:
            update_fields['is_approved'] = True
            needs_update = True
        
        if needs_update:
            # Actualizar usuario
            result = await db.users.update_one(
                {'id': user_id},
                {'$set': update_fields}
            )
            
            if result.modified_count > 0:
                updated_count += 1
                print(f"✅ Usuario '{username}' actualizado: {update_fields}")
            else:
                print(f"⚠️ No se pudo actualizar '{username}'")
        else:
            print(f"✓ Usuario '{username}' ya tiene todos los campos")
    
    print(f"\n🎉 Migración completada: {updated_count} usuarios actualizados")
    
    # Verificar resultados
    print("\n📋 Verificando usuarios...")
    all_users = await db.users.find({}).to_list(None)
    for user in all_users:
        username = user.get('username', 'unknown')
        has_active = 'is_active' in user
        has_approved = 'is_approved' in user
        print(f"  {username}: is_active={has_active}, is_approved={has_approved}")
    
    client.close()
    print("\n✅ Script completado exitosamente")

if __name__ == "__main__":
    print("🚀 Iniciando migración de usuarios...\n")
    asyncio.run(migrate_users())
