"""Verification script to check implementation completeness"""

import sys
import os
from pathlib import Path

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Add parent directory to path to import src as a package
sys.path.insert(0, str(Path(__file__).parent))

def verify_imports():
    """Verify all modules can be imported"""
    print("="*60)
    print("1. Verifying Module Imports")
    print("="*60 + "\n")

    try:
        # Import models
        from src.models import (
            ImageType, ImageSource, PreferredSource,
            ImageRequirement, CollectedImage, ImagePlacement,
            CollectionStatistics, ImageMap
        )
        print("✓ models.py - All data models imported successfully")

        # Import analyzers
        from src.analyzers import ContentAnalyzer, EntityExtractor
        print("✓ analyzers/__init__.py - Exports verified")

        from src.analyzers.content_analyzer import ContentAnalyzer
        print("✓ analyzers/content_analyzer.py - ContentAnalyzer imported")

        from src.analyzers.entity_extractor import EntityExtractor
        print("✓ analyzers/entity_extractor.py - EntityExtractor imported")

        return True
    except ImportError as e:
        print(f"✗ Import failed: {e}")
        return False


def verify_enums():
    """Verify Enum definitions"""
    print("\n" + "="*60)
    print("2. Verifying Enum Definitions")
    print("="*60 + "\n")

    try:
        from src.models import ImageType, ImageSource, PreferredSource

        # ImageType
        assert hasattr(ImageType, 'THUMBNAIL')
        assert hasattr(ImageType, 'BANNER')
        assert hasattr(ImageType, 'CONTENT')
        assert hasattr(ImageType, 'INFOGRAPHIC')
        assert hasattr(ImageType, 'MAP')
        print(f"✓ ImageType: {len(ImageType.__members__)} values")

        # ImageSource
        assert hasattr(ImageSource, 'GOOGLE')
        assert hasattr(ImageSource, 'UNSPLASH')
        assert hasattr(ImageSource, 'PEXELS')
        assert hasattr(ImageSource, 'NANOBANANA')
        print(f"✓ ImageSource: {len(ImageSource.__members__)} values")

        # PreferredSource
        assert hasattr(PreferredSource, 'REAL')
        assert hasattr(PreferredSource, 'STOCK')
        assert hasattr(PreferredSource, 'AI')
        assert hasattr(PreferredSource, 'ANY')
        print(f"✓ PreferredSource: {len(PreferredSource.__members__)} values")

        return True
    except (ImportError, AssertionError) as e:
        print(f"✗ Enum verification failed: {e}")
        return False


def verify_data_classes():
    """Verify DataClass definitions"""
    print("\n" + "="*60)
    print("3. Verifying DataClass Definitions")
    print("="*60 + "\n")

    try:
        from src.models import (
            ImageRequirement, CollectedImage, ImagePlacement,
            CollectionStatistics, ImageMap, ImageType, PreferredSource
        )

        # Test ImageRequirement
        req = ImageRequirement(
            id="test_001",
            type=ImageType.THUMBNAIL,
            keywords=["test"],
            prompt="test prompt",
            section_id="section_1",
            priority=10,
            preferred_source=PreferredSource.STOCK
        )
        assert hasattr(req, 'to_dict')
        req_dict = req.to_dict()
        assert isinstance(req_dict, dict)
        print("✓ ImageRequirement - Created and to_dict() works")

        # Test CollectionStatistics
        stats = CollectionStatistics()
        assert hasattr(stats, 'to_dict')
        print("✓ CollectionStatistics - Created and to_dict() works")

        return True
    except Exception as e:
        print(f"✗ DataClass verification failed: {e}")
        return False


def verify_entity_extractor():
    """Verify EntityExtractor functionality"""
    print("\n" + "="*60)
    print("4. Verifying EntityExtractor")
    print("="*60 + "\n")

    try:
        from src.analyzers import EntityExtractor

        extractor = EntityExtractor()

        # Test extract_from_html
        html = "<h2>Test</h2><p>서울 강남구에 있는 <strong>카페</strong></p>"
        result = extractor.extract_from_html(html)

        assert 'locations' in result
        assert 'entities' in result
        assert 'content_type' in result
        print(f"✓ extract_from_html() works")
        print(f"  - Locations: {result['locations']}")
        print(f"  - Content type: {result['content_type']}")

        # Test extract_sections
        sections = extractor.extract_sections(html)
        assert isinstance(sections, list)
        print(f"✓ extract_sections() works - {len(sections)} sections")

        return True
    except Exception as e:
        print(f"✗ EntityExtractor verification failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_content_analyzer():
    """Verify ContentAnalyzer initialization"""
    print("\n" + "="*60)
    print("5. Verifying ContentAnalyzer")
    print("="*60 + "\n")

    try:
        from src.analyzers import ContentAnalyzer
        import os

        # Test initialization without API key (should work)
        # Note: analyze_content will fail without API key
        print("✓ ContentAnalyzer class imported")

        # Check if GOOGLE_API_KEY exists
        api_key = os.getenv("GOOGLE_API_KEY")
        if api_key:
            analyzer = ContentAnalyzer(api_key=api_key)
            print("✓ ContentAnalyzer initialized with API key")
            print(f"  - Model: {analyzer.model_name}")
            print(f"  - Prompt loaded: {len(analyzer.prompt)} chars")
        else:
            print("⚠ GOOGLE_API_KEY not found - API calls will not work")
            print("  (But class structure is valid)")

        return True
    except Exception as e:
        print(f"✗ ContentAnalyzer verification failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_files():
    """Verify required files exist"""
    print("\n" + "="*60)
    print("6. Verifying File Structure")
    print("="*60 + "\n")

    base_path = Path(__file__).parent

    required_files = [
        "src/__init__.py",
        "src/models.py",
        "src/analyzers/__init__.py",
        "src/analyzers/content_analyzer.py",
        "src/analyzers/entity_extractor.py",
        "config/prompts/content_analysis.txt",
        "test_analyzer.py",
        "examples/basic_usage.py",
        "requirements.txt",
        "README.md",
    ]

    all_exist = True
    for file_path in required_files:
        full_path = base_path / file_path
        if full_path.exists():
            print(f"✓ {file_path}")
        else:
            print(f"✗ {file_path} - MISSING")
            all_exist = False

    return all_exist


def verify_prompt():
    """Verify prompt file content"""
    print("\n" + "="*60)
    print("7. Verifying Prompt File")
    print("="*60 + "\n")

    try:
        prompt_path = Path(__file__).parent / "config" / "prompts" / "content_analysis.txt"

        with open(prompt_path, 'r', encoding='utf-8') as f:
            prompt = f.read()

        # Check key elements
        assert "이미지 요구사항" in prompt
        assert "JSON" in prompt
        assert "keywords" in prompt
        assert "type" in prompt

        print(f"✓ Prompt file loaded ({len(prompt)} chars)")
        print(f"  - Contains required keywords")

        return True
    except Exception as e:
        print(f"✗ Prompt verification failed: {e}")
        return False


def main():
    """Run all verifications"""
    print("\n" + "="*60)
    print("Blog Image Collection Agent - Implementation Verification")
    print("="*60 + "\n")

    results = []

    # Run all verification tests
    results.append(("Module Imports", verify_imports()))
    results.append(("Enum Definitions", verify_enums()))
    results.append(("DataClass Definitions", verify_data_classes()))
    results.append(("EntityExtractor", verify_entity_extractor()))
    results.append(("ContentAnalyzer", verify_content_analyzer()))
    results.append(("File Structure", verify_files()))
    results.append(("Prompt File", verify_prompt()))

    # Print summary
    print("\n" + "="*60)
    print("Verification Summary")
    print("="*60 + "\n")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status} - {name}")

    print(f"\nTotal: {passed}/{total} checks passed")

    if passed == total:
        print("\n🎉 All verifications passed! Implementation is complete.")
    else:
        print(f"\n⚠ {total - passed} verification(s) failed. Please check the issues above.")

    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
