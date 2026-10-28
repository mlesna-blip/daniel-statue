# Map data sources

- **Elevation:** AWS Terrain Tiles (terrarium encoding, zoom 6), derived from SRTM, GMTED2010 and ETOPO1. → height.png, normal.png
- **Coastlines, lakes, rivers:** Natural Earth (public domain). → lines.png, normal.png land mask
- **Ancient borders:** aourednik/historical-basemaps (GPL-3.0), snapshots bc500, bc323, bc300, bc200, bc100, bc1, 100, 400, 500. → terr_*.png
- **Neo-Babylonian empire (c. 605–539 BC):** hand-traced (no dataset snapshot covers it). → terr_babylon.png
- **Cities, battles, routes:** real coordinates in pois.json / events.json.
- **Build script:** /workspace/mapdata/build.py
