#!/usr/bin/env python3
"""
Bootstrap a discovery query list from a CSV (e.g. from Kaggle or OpenDataBay).
Outputs one query per line to stdout. Use for Phase 1 optional bootstrap from open datasets.

Usage:
  python scripts/bootstrap_query_list_from_csv.py path/to/file.csv column_name > data/my_queries.txt
  python scripts/bootstrap_query_list_from_csv.py path/to/file.csv "product name" --limit 50 > data/my_queries.txt

Example column names for common datasets: product_name, title, name, product_title, keyword.
"""

import csv
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) < 3:
        print("Usage: bootstrap_query_list_from_csv.py <csv_path> <column_name> [--limit N]", file=sys.stderr)
        sys.exit(1)
    path = Path(sys.argv[1])
    column = sys.argv[2]
    limit = 0
    if len(sys.argv) >= 5 and sys.argv[3] == "--limit":
        try:
            limit = int(sys.argv[4])
        except ValueError:
            pass
    if not path.exists():
        print(f"File not found: {path}", file=sys.stderr)
        sys.exit(1)
    seen = set()
    count = 0
    with open(path, newline="", encoding="utf-8", errors="replace") as f:
        try:
            reader = csv.DictReader(f)
            if column not in (reader.fieldnames or []):
                print(f"Column '{column}' not found. Available: {reader.fieldnames}", file=sys.stderr)
                sys.exit(1)
            for row in reader:
                val = (row.get(column) or "").strip()
                if val and val not in seen and len(val) < 200:
                    seen.add(val)
                    print(val)
                    count += 1
                    if limit and count >= limit:
                        break
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)
    print(f"{count} queries written (to stdout)", file=sys.stderr)


if __name__ == "__main__":
    main()
