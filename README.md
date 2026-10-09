# IPU Selangor

Papan pemuka bacaan Indeks Pencemaran Udara (IPU) bagi stesen di Selangor, untuk makluman dalaman CIAST.

- `index.html`, `poster.js`: laman dan grafik untuk dikongsi.
- `data/ipu_selangor.json`: bacaan yang direkod, satu baris bagi setiap stesen dan jam.
- `scripts/fetch_ipu.py`: tarik bacaan semasa daripada APIMS, Jabatan Alam Sekitar Malaysia.
- `.github/workflows/kemas-kini.yml`: jalankan skrip itu dua kali sejam.

Sumber data: APIMS, Jabatan Alam Sekitar Malaysia (https://eqms.doe.gov.my/APIMS/main). Ini bukan laman rasmi Jabatan Alam Sekitar.
