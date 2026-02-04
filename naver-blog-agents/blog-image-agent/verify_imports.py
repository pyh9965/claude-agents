#!/usr/bin/env python3
"""Verify all imports work correctly"""

import sys

def verify_imports():
    """Verify all package imports"""
    errors = []

    # 1. Main package import
    try:
        import src as blog_image_agent
        print("✓ Main package import successful")
    except Exception as e:
        errors.append(f"✗ Main package import failed: {e}")

    # 2. Models import
    try:
        from src.models import (
            ImageRequirement,
            CollectedImage,
            ImagePlacement,
            ImageMap,
            CollectionStatistics,
            ImageType,
            ImageSource,
            PreferredSource
        )
        print("✓ Models import successful")
    except Exception as e:
        errors.append(f"✗ Models import failed: {e}")

    # 3. Pipeline import
    try:
        from src.pipeline import PipelineOrchestrator, PipelineConfig, PipelineResult
        print("✓ Pipeline import successful")
    except Exception as e:
        errors.append(f"✗ Pipeline import failed: {e}")

    # 4. Analyzers import
    try:
        from src.analyzers import ContentAnalyzer, EntityExtractor
        print("✓ Analyzers import successful")
    except Exception as e:
        errors.append(f"✗ Analyzers import failed: {e}")

    # 5. Collectors import
    try:
        from src.collectors import (
            BaseCollector,
            CollectorResult,
            GooglePlacesCollector,
            StockImageCollector,
            NanobananGenerator
        )
        print("✓ Collectors import successful")
    except Exception as e:
        errors.append(f"✗ Collectors import failed: {e}")

    # 6. Processors import
    try:
        from src.processors import (
            QualityValidator,
            QualityReport,
            ImageOptimizer,
            OptimizationResult
        )
        print("✓ Processors import successful")
    except Exception as e:
        errors.append(f"✗ Processors import failed: {e}")

    # 7. Placers import
    try:
        from src.placers import (
            AutoPlacer,
            PlacementPosition,
            ImagePlacement,
            HtmlInserter
        )
        print("✓ Placers import successful")
    except Exception as e:
        errors.append(f"✗ Placers import failed: {e}")

    # 8. Utils import
    try:
        from src.utils import (
            Config,
            load_config,
            ImageCache,
            CacheStats,
            KeywordTranslator
        )
        print("✓ Utils import successful")
    except Exception as e:
        errors.append(f"✗ Utils import failed: {e}")

    # 9. CLI import
    try:
        from src.cli import cli
        print("✓ CLI import successful")
    except Exception as e:
        errors.append(f"✗ CLI import failed: {e}")

    # Print results
    print("\n" + "=" * 50)
    if errors:
        print(f"\n{len(errors)} import error(s) found:\n")
        for error in errors:
            print(error)
        return False
    else:
        print("\n✓ All imports successful!")
        print("\nPackage is ready to use.")
        return True

if __name__ == "__main__":
    success = verify_imports()
    sys.exit(0 if success else 1)
