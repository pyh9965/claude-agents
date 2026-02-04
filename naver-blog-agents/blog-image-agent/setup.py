from setuptools import setup, find_packages

setup(
    name="blog-image-agent",
    version="1.0.0",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    install_requires=[
        "click>=8.1.0",
        "httpx>=0.27.0",
        "pillow>=10.0.0",
        "beautifulsoup4>=4.12.0",
        "google-genai>=0.4.0",
        "python-dotenv>=1.0.0",
        "numpy>=1.24.0",
    ],
    entry_points={
        "console_scripts": [
            "blog-image=cli.main:cli",
        ],
    },
    python_requires=">=3.11",
)
