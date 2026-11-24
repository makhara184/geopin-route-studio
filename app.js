function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parsePoints() {
  return document
    .getElementById("coordInput")
    .value.split(/\r?\n/)
    .map((line) => line.split(",").map((s) => s.trim()))
    .filter((parts) => parts.length >= 3 && !isNaN(Number(parts[1])) && !isNaN(Number(parts[2])))
    .map(([name, lat, lon]) => ({ name, lat: Number(lat), lon: Number(lon) }));
}

function plot() {
  const pts = parsePoints();
  const svg = document.getElementById("mapSvg");
  const stats = document.getElementById("stats");
  const legTable = document.getElementById("legTable");
  svg.innerHTML = "";
  if (pts.length < 2) {
    stats.textContent = "Enter at least 2 valid waypoints (Name, Lat, Lon).";
    legTable.innerHTML = "";
    return;
  }

  const lats = pts.map((p) => p.lat);
  const lons = pts.map((p) => p.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const pad = 45;
  const w = 600 - pad * 2, h = 380 - pad * 2;
  const project = (p) => ({
    x: pad + ((p.lon - minLon) / (maxLon - minLon || 1)) * w,
    y: pad + (1 - (p.lat - minLat) / (maxLat - minLat || 1)) * h,
  });

  const projected = pts.map(project);
  const pathPoints = projected.map((p) => `${p.x},${p.y}`).join(" ");
  svg.innerHTML += `<polyline points="${pathPoints}" fill="none" stroke="#38bdf8" stroke-width="3" stroke-dasharray="6,4" />`;

  projected.forEach((xy, i) => {
    svg.innerHTML += `<circle cx="${xy.x}" cy="${xy.y}" r="6" fill="#22c55e" stroke="#fff" stroke-width="2" />`;
    svg.innerHTML += `<text x="${xy.x + 10}" y="${xy.y + 4}" fill="#f8fafc" font-size="12">${i + 1}. ${pts[i].name}</text>`;
  });

  let totalKm = 0;
  let rows = "";
  for (let i = 0; i < pts.length - 1; i++) {
    const km = haversineKm(pts[i].lat, pts[i].lon, pts[i + 1].lat, pts[i + 1].lon);
    totalKm += km;
    rows += `<tr><td>${pts[i].name} → ${pts[i + 1].name}</td><td>${km.toFixed(2)} km</td><td>${(km * 0.621371).toFixed(2)} mi</td></tr>`;
  }

  stats.innerHTML = `
    <div><strong>Waypoints:</strong> ${pts.length}</div>
    <div><strong>Total Distance:</strong> ${totalKm.toFixed(2)} km (${(totalKm * 0.621371).toFixed(2)} mi)</div>
    <div><strong>Bounding Box:</strong> [${minLat.toFixed(4)}, ${minLon.toFixed(4)}] to [${maxLat.toFixed(4)}, ${maxLon.toFixed(4)}]</div>
  `;
  legTable.innerHTML = `<table><thead><tr><th>Route Leg</th><th>Kilometers</th><th>Miles</th></tr></thead><tbody>${rows}</tbody></table>`;
}

document.getElementById("plotBtn").addEventListener("click", plot);
document.getElementById("exportGeoBtn").addEventListener("click", () => {
  const pts = parsePoints();
  const geojson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "GeoPin Route" },
        geometry: { type: "LineString", coordinates: pts.map((p) => [p.lon, p.lat]) },
      },
      ...pts.map((p) => ({
        type: "Feature",
        properties: { name: p.name },
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      })),
    ],
  };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" }));
  a.download = "geopin-route.geojson";
  a.click();
});

plot();
