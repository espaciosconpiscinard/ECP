from motor.motor_asyncio import AsyncIOMotorClient
import os
from typing import Optional, List, Dict
from datetime import datetime

class Database:
    client: Optional[AsyncIOMotorClient] = None
    db = None

    @classmethod
    def get_db(cls):
        if cls.db is None:
            mongo_url = os.environ['MONGO_URL']
            cls.client = AsyncIOMotorClient(mongo_url)
            cls.db = cls.client[os.environ.get('DB_NAME', 'villa_management')]
        return cls.db

    @classmethod
    def close_db(cls):
        if cls.client:
            cls.client.close()

def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    
    # Remove MongoDB _id
    if '_id' in doc:
        del doc['_id']
    
    # Convert datetime objects to ISO strings
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    
    return doc

def serialize_docs(docs: List[dict]) -> List[dict]:
    """Convert list of MongoDB documents to JSON-serializable list"""
    return [serialize_doc(doc) for doc in docs]

def prepare_doc_for_insert(doc: dict) -> dict:
    """Prepare a document for MongoDB insertion"""
    prepared = doc.copy()
    
    # Convert datetime objects to ISO strings for MongoDB
    for key, value in prepared.items():
        if isinstance(value, datetime):
            prepared[key] = value.isoformat()
    
    return prepared

def restore_datetimes(doc: dict, datetime_fields: List[str]) -> dict:
    """Restore datetime fields from ISO strings"""
    for field in datetime_fields:
        if field in doc and isinstance(doc[field], str):
            doc[field] = datetime.fromisoformat(doc[field])
    return doc
