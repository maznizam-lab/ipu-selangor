#!/usr/bin/env python3
"""Tarik bacaan IPU semasa stesen Selangor daripada APIMS (Jabatan Alam Sekitar)
dan tambah ke data/ipu_selangor.json.

Guna:  python3 scripts/fetch_ipu.py            (tarik dari DOE)
       python3 scripts/fetch_ipu.py sampel.json (uji dengan fail respons tersimpan)
"""
import datetime
import json
import pathlib
import sys
import time
import urllib.parse
import urllib.request

URL = ("https://eqms.doe.gov.my/api3/publicmapproxy/PUBLIC_DISPLAY/"
       "CAQM_MCAQM_Current_Reading/MapServer/0/query")
# Hanya medan bacaan dan lokasi stesen. Medan nama, telefon dan e-mel operator tidak diminta.
FIELDS = "STATION_ID,DATETIME,API,PARAM_SELECTED,STATION_LOCATION,PLACE,STATE_NAME"
PARAMS = {"where": "STATE_NAME='Selangor'", "outFields": FIELDS,
          "returnGeometry": "false", "f": "json"}
DATA = pathlib.Path(__file__).resolve().parent.parent / "data" / "ipu_selangor.json"
KL = datetime.timezone(datetime.timedelta(hours=8))
SLOT_KEKAL = {"09:00", "12:00", "17:00"}   # disimpan selama-lamanya
HARI_SETIAP_JAM = 45                        # bacaan jam lain disimpan selama ini

STESEN = {
    "CA18B": ("Kuala Selangor", "Sekolah Menengah Sains Kuala Selangor"),
    "CA19B": ("Petaling Jaya", "Sek. Keb. Bandar Utama"),
    "CA20B": ("Shah Alam", "Sek. Keb. TTDI Jaya"),
    "CA21B": ("Klang", "Klinik Kesihatan Pandamaran"),
    "CA22B": ("Banting", "Kolej Mara Banting"),
    "MCAQM001": ("Johan Setia", "Sekolah Kebangsaan Kampung Johan Setia"),
}


def status_of(ipu):
    if ipu <= 50:
        return "Baik"
    if ipu <= 100:
        return "Sederhana"
    if ipu <= 200:
        return "Tidak Sihat"
    if ipu <= 300:
        return "Sangat Tidak Sihat"
    return "Berbahaya"


def fetch():
    url = URL + "?" + urllib.parse.urlencode(PARAMS)
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; ipu-selangor-dashboard)",
        "Accept": "application/json",
    })
    last = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=40) as res:
                return json.loads(res.read().decode("utf-8"))
        except Exception as err:  # rangkaian, masa tamat, JSON rosak
            last = err
            print(f"Cubaan {attempt + 1} gagal: {err}", file=sys.stderr)
            time.sleep(20 * (attempt + 1))
    raise SystemExit(f"Tak dapat capai suapan DOE: {last}")


def to_rows(payload):
    if "error" in payload:
        raise SystemExit(f"DOE pulangkan ralat: {payload['error']}")
    rows = []
    for feature in payload.get("features", []):
        a = feature.get("attributes", {})
        if a.get("STATE_NAME") != "Selangor":
            continue
        if a.get("API") is None or a.get("DATETIME") is None:
            continue  # stesen tiada bacaan pada jam ini
        # DATETIME: epoch ms yang, dibaca sebagai UTC, sudah pun waktu tempatan Malaysia.
        when = datetime.datetime.fromtimestamp(a["DATETIME"] / 1000, datetime.timezone.utc)
        sid = a["STATION_ID"]
        lokasi = (a.get("STATION_LOCATION") or sid).split(",")[0].strip().title()
        nama, tempat = STESEN.get(sid, (lokasi, (a.get("PLACE") or "").strip()))
        ipu = int(round(float(a["API"])))
        rows.append({
            "tarikh": when.strftime("%Y-%m-%d"),
            "jam": when.strftime("%H:00"),
            "stesen_id": sid,
            "stesen": nama,
            "tempat": tempat,
            "ipu": ipu,
            "status": status_of(ipu),
            "pencemar": (a.get("PARAM_SELECTED") or "").strip(),
        })
    return rows


def merge(old, new, today):
    key = lambda r: (r["tarikh"], r["jam"], r["stesen_id"])
    merged = {key(r): r for r in old}
    merged.update({key(r): r for r in new})
    cutoff = (today - datetime.timedelta(days=HARI_SETIAP_JAM)).strftime("%Y-%m-%d")
    kept = [r for r in merged.values() if r["tarikh"] >= cutoff or r["jam"] in SLOT_KEKAL]
    return sorted(kept, key=key)


def main():
    if len(sys.argv) > 1:
        payload = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
    else:
        payload = fetch()
    new = to_rows(payload)
    if not new:
        raise SystemExit("Tiada bacaan Selangor dalam respons DOE.")
    now = datetime.datetime.now(KL)
    existing = json.loads(DATA.read_text(encoding="utf-8")) if DATA.exists() else {"rows": []}
    old = existing.get("rows", [])
    rows = merge(old, new, now.date())
    if rows == old:
        print("Tiada bacaan baharu.")
        return
    out = {"dikemas_kini": now.replace(microsecond=0).isoformat(), "rows": rows}
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    latest = max(new, key=lambda r: (r["tarikh"], r["jam"]))
    print(f"Direkod {len(new)} bacaan bagi {latest['tarikh']} {latest['jam']}; jumlah {len(rows)} baris.")


if __name__ == "__main__":
    main()
