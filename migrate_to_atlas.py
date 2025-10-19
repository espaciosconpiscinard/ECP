#!/usr/bin/env python3
"""
Script para migrar datos de MongoDB local a MongoDB Atlas
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

# Configuración
LOCAL_MONGO_URL = "mongodb://localhost:27017"
LOCAL_DB_NAME = "test_database"

ATLAS_MONGO_URL = "mongodb+srv://espaciosconpiscinard_db_user:GLOZOk0eNG9wDAiO@cluster0.hyk9vvo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0&tls=true&tlsAllowInvalidCertificates=true"
ATLAS_DB_NAME = "espacios_con_piscina"

# Colecciones a migrar
COLLECTIONS = [
    "users",
    "customers",
    "categories",
    "expense_categories",
    "villas",
    "extra_services",
    "villa_owners",
    "reservations",
    "reservation_abonos",
    "expenses",
    "expense_abonos",
    "invoice_counter"
]

async def migrate_data():
    """Migrar todos los datos de local a Atlas"""
    print("🚀 Iniciando migración a MongoDB Atlas...")
    print(f"   Origen: {LOCAL_DB_NAME} (local)")
    print(f"   Destino: {ATLAS_DB_NAME} (Atlas)")
    print()
    
    # Conectar a ambas bases de datos
    local_client = AsyncIOMotorClient(LOCAL_MONGO_URL)
    local_db = local_client[LOCAL_DB_NAME]
    
    atlas_client = AsyncIOMotorClient(ATLAS_MONGO_URL)
    atlas_db = atlas_client[ATLAS_DB_NAME]
    
    try:
        # Verificar conexión a Atlas
        await atlas_client.admin.command('ping')
        print("✅ Conexión a MongoDB Atlas exitosa")
        print()
        
        total_docs = 0
        
        # Migrar cada colección
        for collection_name in COLLECTIONS:
            print(f"📦 Migrando colección: {collection_name}")
            
            # Obtener documentos de la colección local
            local_collection = local_db[collection_name]
            documents = await local_collection.find().to_list(length=None)
            
            if not documents:
                print(f"   ⚠️  No hay documentos en {collection_name}")
                continue
            
            # Insertar en Atlas
            atlas_collection = atlas_db[collection_name]
            
            # Eliminar documentos existentes en Atlas (para evitar duplicados)
            delete_result = await atlas_collection.delete_many({})
            if delete_result.deleted_count > 0:
                print(f"   🗑️  Eliminados {delete_result.deleted_count} documentos existentes")
            
            # Insertar nuevos documentos
            result = await atlas_collection.insert_many(documents)
            print(f"   ✅ Migrados {len(result.inserted_ids)} documentos")
            total_docs += len(result.inserted_ids)
            print()
        
        print(f"✅ ¡Migración completada exitosamente!")
        print(f"   Total de documentos migrados: {total_docs}")
        
    except Exception as e:
        print(f"❌ Error durante la migración: {e}")
        raise
    finally:
        # Cerrar conexiones
        local_client.close()
        atlas_client.close()

if __name__ == "__main__":
    asyncio.run(migrate_data())
