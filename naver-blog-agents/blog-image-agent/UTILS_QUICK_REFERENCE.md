# Utils Module - Quick Reference

## Import

```python
from utils import Config, load_config, ImageCache, CacheStats, KeywordTranslator
```

## Config

### Load Configuration
```python
# Auto-detect (YAML → ENV → defaults)
config = load_config()

# From specific YAML
config = load_config("config/production.yaml")

# From environment only
config = Config.from_env()

# Validate
issues = config.validate()
```

### Access Settings
```python
config.google_api_key          # str | None
config.default_model           # str (default: "gemini-2.0-flash")
config.image_quality           # int (default: 85)
config.cache_enabled           # bool (default: True)
config.cache_dir               # str (default: ".cache/images")
config.cache_ttl_days          # int (default: 7)
config.collection_priority     # list[str] (default: ["google", "stock", "nanobanana"])
config.min_images_per_content  # int (default: 3)
config.max_images_per_content  # int (default: 15)
```

## ImageCache

### Initialize
```python
cache = ImageCache(
    cache_dir=".cache/images",  # Where to store cached images
    ttl_days=7,                 # How long to keep cached images
    max_size_mb=500             # Maximum cache size
)
```

### Basic Operations
```python
# Check cache
path = cache.get(keywords=["김치찌개", "맛집"], source="google")

# Store in cache
cached_path = cache.put(
    keywords=["김치찌개", "맛집"],
    source="google",
    local_path="temp/image.jpg",
    url="https://example.com/image.jpg",
    metadata={"width": 800, "height": 600}
)

# Remove from cache
cache.invalidate(keywords=["김치찌개", "맛집"], source="google")
```

### Maintenance
```python
# Get statistics
stats = cache.get_stats()
print(f"Hit rate: {stats.hit_rate:.1%}")
print(f"Size: {stats.total_size_mb:.2f} MB")

# Clean expired entries
removed = cache.cleanup_expired()

# Clear all cache
cache.clear()
```

## KeywordTranslator

### Initialize
```python
# Dictionary-based only
translator = KeywordTranslator(use_ai=False)

# With AI fallback
translator = KeywordTranslator(use_ai=True)
```

### Translate
```python
# Basic translation
english = translator.translate(["김치찌개", "맛집"])
# Returns: "kimchi stew restaurant food"

# AI translation (async)
english = await translator.translate_with_ai(["현대적인 카페"])
```

### Supported Mappings (63 total)

**Food (22)**:
- 김치찌개 → kimchi stew
- 삼겹살 → Korean BBQ pork belly samgyeopsal
- 비빔밥 → bibimbap Korean rice bowl
- 떡볶이 → tteokbokki spicy rice cakes
- [18 more...]

**Places (19)**:
- 서울 → Seoul Korea
- 제주 → Jeju Island Korea
- 강남 → Gangnam Seoul
- 홍대 → Hongdae Seoul
- [15 more...]

**General (22)**:
- 여행 → travel trip
- 맛집 → restaurant food
- 카페 → cafe coffee shop
- 야경 → night view nightscape
- [18 more...]

## Complete Workflow Example

```python
from utils import load_config, ImageCache, KeywordTranslator

# Setup
config = load_config()
cache = ImageCache(config.cache_dir, config.cache_ttl_days)
translator = KeywordTranslator()

# Workflow
async def collect_image(keywords: list[str], source: str):
    # 1. Translate keywords
    english_query = translator.translate(keywords)

    # 2. Check cache
    cached = cache.get(keywords, source)
    if cached:
        return cached

    # 3. Collect new image
    collector = get_collector(source)
    result = await collector.search(english_query)

    # 4. Cache result
    if result:
        return cache.put(
            keywords=keywords,
            source=source,
            local_path=result.path,
            url=result.url,
            metadata={"width": result.width, "height": result.height}
        )

    return None

# Usage
image = await collect_image(["김치찌개", "맛집", "서울"], "google")
```

## Configuration File (config/default.yaml)

```yaml
# AI Model
default_model: gemini-2.0-flash

# Image Processing
image_quality: 85
convert_to_webp: true
max_image_width: 1200
max_image_height: 1200

# Cache
cache_enabled: true
cache_dir: .cache/images
cache_ttl_days: 7

# Collection
collection_priority:
  - google
  - stock
  - nanobanana

min_images_per_content: 3
max_images_per_content: 15
```

## Environment Variables

```bash
# Required for AI features
GOOGLE_API_KEY=your_google_api_key

# Optional for Places API
GOOGLE_PLACES_API_KEY=your_places_key

# Optional for stock images
UNSPLASH_ACCESS_KEY=your_unsplash_key
PEXELS_API_KEY=your_pexels_key

# Optional overrides
DEFAULT_MODEL=gemini-2.0-flash
IMAGE_QUALITY=85
CACHE_ENABLED=true
CACHE_DIR=.cache/images
CACHE_TTL_DAYS=7
```

## Cache Statistics

```python
stats = cache.get_stats()

stats.total_entries  # int - Number of cached images
stats.total_size_mb  # float - Total cache size in MB
stats.hits           # int - Number of cache hits
stats.misses         # int - Number of cache misses
stats.hit_rate       # float - Hit rate (0.0 to 1.0)
```

## Common Patterns

### Pattern 1: Cache-First Collection
```python
def get_image(keywords, source):
    # Try cache first
    cached = cache.get(keywords, source)
    if cached:
        return cached

    # Download if not cached
    image = download(keywords, source)
    return cache.put(keywords, source, image)
```

### Pattern 2: Multi-Source Fallback
```python
async def collect_with_fallback(keywords):
    sources = config.collection_priority  # ["google", "stock", "nanobanana"]

    for source in sources:
        # Translate keywords
        query = translator.translate(keywords)

        # Check cache
        cached = cache.get(keywords, source)
        if cached:
            return cached

        # Try source
        result = await collect_from_source(source, query)
        if result:
            return cache.put(keywords, source, result)

    return None
```

### Pattern 3: Batch Processing
```python
async def collect_batch(keyword_list):
    results = []

    for keywords in keyword_list:
        # Check cache
        cached = cache.get(keywords, "google")
        if cached:
            results.append(cached)
            continue

        # Collect new
        query = translator.translate(keywords)
        result = await collector.search(query)

        if result:
            cached = cache.put(keywords, "google", result)
            results.append(cached)

    return results
```

## Performance Tips

### Cache
- Use consistent keyword ordering (cache handles this)
- Clean expired entries periodically
- Monitor cache size and hit rate
- Adjust TTL based on content freshness needs

### Translation
- Pre-translate common keywords
- Use dictionary translation for speed
- Reserve AI translation for complex queries
- Cache translated queries separately

### Configuration
- Use YAML for team-wide settings
- Use ENV for secrets and per-environment config
- Validate on startup
- Profile different configurations

## Troubleshooting

### Cache not working?
```python
# Check if cache is enabled
if not config.cache_enabled:
    print("Cache is disabled in config")

# Check cache directory
print(f"Cache dir: {cache.cache_dir}")
print(f"Exists: {cache.cache_dir.exists()}")

# Check cache stats
stats = cache.get_stats()
print(f"Entries: {stats.total_entries}")
```

### Translation not working?
```python
# Check mappings loaded
translator = KeywordTranslator()
print(f"Mappings: {len(translator.all_mappings)}")

# Test translation
result = translator.translate(["김치찌개"])
print(f"Translation: {result}")
```

### Config not loading?
```python
# Check what's loaded
config = load_config()
issues = config.validate()
if issues:
    print("Issues:", issues)

# Check specific setting
print(f"API key: {config.google_api_key is not None}")
```

## API Reference

See `UTILS_IMPLEMENTATION.md` for complete API documentation.

---
**Quick Start**: `python test_utils_simple.py`
**Full Docs**: See `UTILS_IMPLEMENTATION.md`
**Examples**: See test files in `tests/`
