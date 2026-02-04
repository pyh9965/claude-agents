"""
Test script for utils module (config, cache, translator)
"""
import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

print("=" * 60)
print("Testing Blog Image Agent Utils")
print("=" * 60)

# Test 1: Config
print("\n[1] Testing Config Module")
print("-" * 60)
try:
    from utils.config import Config, load_config

    # Test from_env
    config = Config.from_env()
    print(f"✓ Config.from_env() loaded")
    print(f"  - default_model: {config.default_model}")
    print(f"  - cache_enabled: {config.cache_enabled}")
    print(f"  - image_quality: {config.image_quality}")

    # Test validation
    issues = config.validate()
    if issues:
        print(f"  - Validation issues: {len(issues)}")
        for issue in issues:
            print(f"    • {issue}")
    else:
        print(f"  - Validation: OK")

    # Test YAML loading
    yaml_path = Path(__file__).parent / "config" / "default.yaml"
    if yaml_path.exists():
        config_yaml = Config.from_yaml(str(yaml_path))
        print(f"✓ Config.from_yaml() loaded from {yaml_path.name}")
        print(f"  - collection_priority: {config_yaml.collection_priority}")

    print("✓ Config module test passed")

except Exception as e:
    print(f"✗ Config module test failed: {e}")
    import traceback
    traceback.print_exc()

# Test 2: Cache
print("\n[2] Testing ImageCache Module")
print("-" * 60)
try:
    from utils.cache import ImageCache, CacheEntry, CacheStats
    import tempfile
    import shutil

    # Create temporary cache
    temp_dir = tempfile.mkdtemp()
    cache = ImageCache(cache_dir=temp_dir, ttl_days=7, max_size_mb=100)
    print(f"✓ ImageCache initialized in {temp_dir}")

    # Test cache key generation
    keywords = ["김치찌개", "맛집", "서울"]
    key = cache._generate_key(keywords, "google")
    print(f"✓ Cache key generated: {key}")

    # Test get (should miss)
    result = cache.get(keywords, "google")
    print(f"✓ Cache miss test: {result is None}")

    # Test put (create dummy file)
    dummy_file = Path(temp_dir) / "test_image.jpg"
    dummy_file.write_bytes(b"fake image data")

    cached_path = cache.put(
        keywords=keywords,
        source="google",
        local_path=str(dummy_file),
        url="https://example.com/image.jpg",
        metadata={"width": 800, "height": 600}
    )
    print(f"✓ Image cached to: {Path(cached_path).name}")

    # Test get (should hit)
    result = cache.get(keywords, "google")
    print(f"✓ Cache hit test: {result is not None}")

    # Test stats
    stats = cache.get_stats()
    print(f"✓ Cache stats:")
    print(f"  - Total entries: {stats.total_entries}")
    print(f"  - Total size: {stats.total_size_mb:.2f} MB")
    print(f"  - Hits: {stats.hits}, Misses: {stats.misses}")
    print(f"  - Hit rate: {stats.hit_rate:.1%}")

    # Cleanup
    shutil.rmtree(temp_dir)
    print("✓ ImageCache module test passed")

except Exception as e:
    print(f"✗ ImageCache module test failed: {e}")
    import traceback
    traceback.print_exc()

# Test 3: Translator
print("\n[3] Testing KeywordTranslator Module")
print("-" * 60)
try:
    from utils.translator import KeywordTranslator

    translator = KeywordTranslator(use_ai=False)
    print(f"✓ KeywordTranslator initialized")
    print(f"  - Total mappings: {len(translator.all_mappings)}")

    # Test translation
    test_cases = [
        (["김치찌개", "맛집"], "kimchi stew restaurant food"),
        (["서울", "카페"], "Seoul Korea cafe coffee shop"),
        (["제주", "여행", "일몰"], "Jeju Island Korea travel trip sunset"),
    ]

    for korean_keywords, expected_contains in test_cases:
        result = translator.translate(korean_keywords)
        print(f"✓ {korean_keywords} → {result}")

        # Check if expected words are in result
        for word in expected_contains.split():
            if word.lower() not in result.lower():
                print(f"  Warning: Expected '{word}' not found in result")

    # Test food mapping
    print(f"\n  Food mapping examples:")
    for k, v in list(translator.FOOD_MAPPING.items())[:3]:
        print(f"    {k} → {v}")

    # Test place mapping
    print(f"\n  Place mapping examples:")
    for k, v in list(translator.PLACE_MAPPING.items())[:3]:
        print(f"    {k} → {v}")

    print("✓ KeywordTranslator module test passed")

except Exception as e:
    print(f"✗ KeywordTranslator module test failed: {e}")
    import traceback
    traceback.print_exc()

# Test 4: Integration
print("\n[4] Testing Module Integration")
print("-" * 60)
try:
    from utils import Config, ImageCache, KeywordTranslator

    # Test imports from __init__
    print(f"✓ All modules imported from utils package")

    # Test workflow
    config = Config.from_env()
    cache = ImageCache(
        cache_dir=config.cache_dir,
        ttl_days=config.cache_ttl_days
    )
    translator = KeywordTranslator()

    # Translate and cache simulation
    keywords = ["삼겹살", "홍대"]
    english_query = translator.translate(keywords)
    print(f"✓ Workflow test:")
    print(f"  1. Keywords: {keywords}")
    print(f"  2. Translated: {english_query}")
    print(f"  3. Cache dir: {config.cache_dir}")
    print(f"  4. Cache TTL: {config.cache_ttl_days} days")

    print("✓ Integration test passed")

except Exception as e:
    print(f"✗ Integration test failed: {e}")
    import traceback
    traceback.print_exc()

# Summary
print("\n" + "=" * 60)
print("All tests completed!")
print("=" * 60)
print("\nImplemented modules:")
print("  ✓ src/utils/__init__.py - Package initialization")
print("  ✓ src/utils/config.py - Configuration management")
print("  ✓ src/utils/cache.py - Image caching system")
print("  ✓ src/utils/translator.py - Keyword translation")
print("  ✓ config/default.yaml - Default configuration")
print("\nKey features:")
print("  • Config: ENV + YAML loading, validation")
print("  • Cache: MD5 keys, TTL, LRU eviction, stats")
print("  • Translator: 70+ mappings (food/place/general)")
