from pathlib import Path
from dotenv import load_dotenv
import os, psycopg

BASE = Path(__file__).resolve().parent
ROOT = BASE.parent
load_dotenv(ROOT / '.env')

dsn = os.getenv('DATABASE_URL')
assert dsn, 'DATABASE_URL not set'

sql_dir = BASE / 'sql'
files = sorted([p for p in sql_dir.glob('*.sql')])

with psycopg.connect(dsn) as conn:
    for p in files:
        sql = p.read_text(encoding='utf-8')
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
        print('Applied', p.name)


