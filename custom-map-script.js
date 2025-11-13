const mapContainer = document.getElementById('map-container');
const mapImage = document.getElementById('map-image');
const markers = document.querySelectorAll('.marker');

let scale, originX = 0, originY = 0;
let isDragging = false, startX, startY;

// Marker-Update-Funktion
function updateMarkers() {
    markers.forEach(marker => {
        const x = parseFloat(marker.dataset.x) * mapImage.naturalWidth;
        const y = parseFloat(marker.dataset.y) * mapImage.naturalHeight;
        marker.style.left = originX + x * scale + 'px';
        marker.style.top = originY + y * scale + 'px';
    });
}

// Alles erst ausführen, wenn Bild geladen ist
mapImage.onload = () => {
    // Fenstergröße
    const containerWidth = mapContainer.clientWidth;
    const containerHeight = mapContainer.clientHeight;

    // Karte
    const mapWidth = mapImage.naturalWidth;
    const mapHeight = mapImage.naturalHeight;

    // Berechne Start-Zoom
    const scaleX = containerWidth / mapWidth;
    const scaleY = containerHeight / mapHeight;
    scale = Math.min(scaleX, scaleY) * 0.95; // leicht rauszoomen

    // Karte zentrieren
    originX = (containerWidth - mapWidth * scale) / 2;
    originY = (containerHeight - mapHeight * scale) / 2;

    // Karte initial transformieren
    mapImage.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
    updateMarkers();
};

// Drag starten
mapContainer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    startX = e.clientX - originX;
    startY = e.clientY - originY;
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    originX = e.clientX - startX;
    originY = e.clientY - startY;
    mapImage.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
    updateMarkers();
});

document.addEventListener('mouseup', () => isDragging = false);

// Zoom
mapContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const oldScale = scale;
    scale += e.deltaY * -0.0015;
    scale = Math.min(Math.max(0.3, scale), 3);

    const rect = mapContainer.getBoundingClientRect();
    const mx = e.clientX - rect.left - originX;
    const my = e.clientY - rect.top - originY;

    originX -= (scale / oldScale - 1) * mx;
    originY -= (scale / oldScale - 1) * my;

    mapImage.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
    updateMarkers();
});

// Marker Click
markers.forEach(marker => {
    marker.addEventListener('click', () => alert('Marker: ' + marker.dataset.name));
});
