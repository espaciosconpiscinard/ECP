"""
Script para agregar is_active=True a categorías importadas que no lo tienen
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def fix_categories():
    # Conectar a MongoDB
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DB_NAME", "espacios_piscina")
    
    print(f"🔗 Conectando a MongoDB: {db_name}")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Buscar categorías sin is_active
    categories = await db.categories.find({}).to_list(None)
    
    print(f"\n📊 Total de categorías: {len(categories)}")
    
    fixed_count = 0
    
    for cat in categories:
        cat_id = cat.get('id')
        name = cat.get('name', 'unknown')
        has_is_active = 'is_active' in cat
        
        if not has_is_active:
            # Agregar is_active=True
            result = await db.categories.update_one(
                {'id': cat_id},
                {'$set': {'is_active': True}}
            )
            
            if result.modified_count > 0:
                fixed_count += 1
                print(f"✅ Categoría '{name}' - agregado is_active=True")
        else:
            print(f"✓ Categoría '{name}' - ya tiene is_active={cat.get('is_active')}")
    
    print(f"\n🎉 Script completado:")
    print(f"   - {fixed_count} categorías actualizadas")
    print(f"   - {len(categories) - fixed_count} ya estaban correctas")
    
    client.close()

if __name__ == "__main__":
    print("🚀 Iniciando corrección de categorías...\n")
    asyncio.run(fix_categories())
