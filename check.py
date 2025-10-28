# save as test_api.py, then: python test_api.py
import os, json, requests

BASE = os.getenv("BASE_URL", "http://127.0.0.1:8000")

def p(title, data):
    print(f"\n== {title} ==")
    if isinstance(data, (dict, list)):
        print(json.dumps(data, indent=2)[:1000])
    else:
        print(str(data)[:1000])

# 1) Login (use your existing admin user)
LOGIN = {"email": "admin@example.com", "password": "pass123"}
r = requests.post(f"{BASE}/auth/login", json=LOGIN)
r.raise_for_status()
tokens = r.json()
p("login", tokens.keys())
access = tokens["access_token"]
refresh = tokens["refresh_token"]
headers = {"Authorization": f"Bearer {access}"}

# 2) Me
r = requests.get(f"{BASE}/auth/me", headers=headers)
r.raise_for_status()
p("me", r.json())

# 3) Admin refresh with a tiny FeatureCollection (1 feature)
fc = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "SUBZONE_N":"API_TEST",
        "PLN_AREA_N":"API_AREA",
        "population": 1234,
        "H_score": 0.42,
        "H_rank": 10
      },
      "geometry": {"type":"Polygon","coordinates":[[]]}
    }
  ]
}
r = requests.post(f"{BASE}/admin/refresh", headers=headers, json={"geojson": fc, "note": "api test"})
r.raise_for_status()
res = r.json()
p("admin.refresh", res)
snapshot_id = res["snapshot_id"]

# 4) Fetch exported file endpoint (should include API_TEST)
r = requests.get(f"{BASE}/data/opportunity.geojson")
r.raise_for_status()
p("data.opportunity.geojson (file)", r.json()["features"][:1])

# 5) Fetch from DB endpoint (same data, assembled from DB)
r = requests.get(f"{BASE}/data/opportunity-db.geojson")
r.raise_for_status()
p("data.opportunity-db.geojson (db)", r.json()["features"][:1])

# 6) List snapshots
r = requests.get(f"{BASE}/admin/snapshots", headers=headers)
r.raise_for_status()
snaps = r.json()
p("admin.snapshots", snaps)

# 7) Restore the snapshot we just created (no-op but tests endpoint)
r = requests.post(f"{BASE}/admin/snapshots/{snapshot_id}/restore", headers=headers)
r.raise_for_status()
p("admin.restore", r.json())

# 8) Refresh access token
r = requests.post(f"{BASE}/auth/refresh", json={"refresh_token": refresh})
r.raise_for_status()
p("auth.refresh", r.json().keys())

print("\nAll tests done.")