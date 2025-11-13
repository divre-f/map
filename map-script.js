// Karte initialisieren
const map = L.map('map').setView([20, 0], 2); // [Breite, Länge], Zoomstufe

// Karten-Layer laden (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 50,
}).addTo(map);

// Beispielpunkte (Marker)
const points = [
    { name: "Berlin", coords: [52.52, 13.405] },
    { name: "New York", coords: [40.7128, -74.006] },
    { name: "Tokio", coords: [35.6762, 139.6503] }
];

// Marker hinzufügen
points.forEach(p => {
    L.marker(p.coords)
        .addTo(map)
        .bindPopup(`<b>${p.name}</b>`)
        .on('click', () => {
            console.log(`${p.name} wurde angeklickt`);
        });

});

