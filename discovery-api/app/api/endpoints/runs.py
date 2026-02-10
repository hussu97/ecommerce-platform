import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.discovered_product import DiscoveredProduct
from app.schemas.product import RunRequest, RunResponse
from app.strategies import get_strategy, get_enabled_strategy_ids

router = APIRouter()


@router.post("", response_model=RunResponse)
async def trigger_run(
    body: RunRequest,
    db: AsyncSession = Depends(get_db),
):
    """Run one or all strategies and persist results. Deduplicates by (strategy_id, source_url)."""
    run_id = str(uuid.uuid4())
    strategy_ids: list[str] = []
    if body.strategy_id.lower() == "all":
        strategy_ids = get_enabled_strategy_ids()
    else:
        strategy = get_strategy(body.strategy_id)
        if strategy is None:
            raise HTTPException(status_code=400, detail=f"Unknown strategy: {body.strategy_id}")
        strategy_ids = [body.strategy_id]

    total = 0
    for sid in strategy_ids:
        strategy = get_strategy(sid)
        if strategy is None:
            continue
        products = strategy.run()
        for p in products:
            # Optional dedupe: check existing (strategy_id, source_url)
            result = await db.execute(
                select(DiscoveredProduct).where(
                    DiscoveredProduct.strategy_id == sid,
                    DiscoveredProduct.source_url == p["source_url"],
                )
            )
            if result.scalar_one_or_none() is not None:
                continue
            raw = p.get("raw_payload")
            raw_str = json.dumps(raw) if raw is not None else None
            row = DiscoveredProduct(
                strategy_id=sid,
                brand=p.get("brand"),
                title=p["title"],
                image_url=p.get("image_url"),
                source_url=p["source_url"],
                price=p.get("price"),
                currency=p.get("currency"),
                delivers_to_uae=p.get("delivers_to_uae"),
                raw_payload=raw_str,
                run_id=run_id,
            )
            db.add(row)
            total += 1
    await db.commit()
    return RunResponse(run_id=run_id, count=total)
