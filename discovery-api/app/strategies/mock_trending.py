from app.strategies.base import BaseStrategy


class MockTrendingStrategy(BaseStrategy):
    strategy_id = "mock_trending"
    name = "Mock Trending"
    description = "Returns sample products for testing the pipeline."

    def run(self) -> list[dict]:
        return [
            {
                "brand": "Acme",
                "title": "Wireless Earbuds Pro",
                "image_url": "https://picsum.photos/200/200?r=1",
                "source_url": "https://example.com/products/earbuds-pro",
                "price": 149.99,
                "currency": "AED",
                "delivers_to_uae": True,
                "raw_payload": {"platform": "mock"},
            },
            {
                "brand": "TechCo",
                "title": "Portable Power Bank 20K mAh",
                "image_url": "https://picsum.photos/200/200?r=2",
                "source_url": "https://example.com/products/power-bank",
                "price": 89.0,
                "currency": "AED",
                "delivers_to_uae": True,
                "raw_payload": {"platform": "mock"},
            },
            {
                "brand": None,
                "title": "Handmade Ceramic Mug",
                "image_url": "https://picsum.photos/200/200?r=3",
                "source_url": "https://example.com/products/mug",
                "price": 35.0,
                "currency": "USD",
                "delivers_to_uae": False,
                "raw_payload": {"platform": "mock"},
            },
            {
                "brand": "FashionBrand",
                "title": "Cotton Summer T-Shirt",
                "image_url": "https://picsum.photos/200/200?r=4",
                "source_url": "https://example.com/products/tshirt",
                "price": 59.99,
                "currency": "AED",
                "delivers_to_uae": True,
                "raw_payload": {"platform": "mock"},
            },
            {
                "brand": "HomeGear",
                "title": "LED Desk Lamp with USB",
                "image_url": "https://picsum.photos/200/200?r=5",
                "source_url": "https://example.com/products/lamp",
                "price": 120.0,
                "currency": "AED",
                "delivers_to_uae": True,
                "raw_payload": {"platform": "mock"},
            },
            {
                "brand": "SportLife",
                "title": "Yoga Mat Non-Slip",
                "image_url": "https://picsum.photos/200/200?r=6",
                "source_url": "https://example.com/products/yoga-mat",
                "price": 45.0,
                "currency": "AED",
                "delivers_to_uae": True,
                "raw_payload": {"platform": "mock"},
            },
        ]
