"""Ensure all tables exist. Run before seeds."""
import asyncio
from app.db.session import engine
from app.db.base import Base
from app.models import (
    taxonomy, product, product_child, brand, taxonomy_attribute, product_attribute_value,
    user, order, cart, stock_reservation, customer_address,
    language, product_translation, taxonomy_translation, brand_translation,
    taxonomy_attribute_translation, ui_string, visitor_preference,
)

async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created.")

if __name__ == "__main__":
    asyncio.run(main())
