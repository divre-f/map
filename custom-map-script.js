const mapContainer = document.getElementById('map-container');
const mapImage = document.getElementById('map-image');
const markers = document.querySelectorAll('.marker');

let scale, originX = 0, originY = 0;
let isDragging = false, startX, startY;

let isAnimating = false; // Flag, um zu prüfen, ob Animation läuft

function update() {
    if (isAnimating) return;  // Verhindert doppelte Animationen
    isAnimating = true;

    // Hier kommt dein Code zum Animieren und Aktualisieren der Marker

    isAnimating = false;
}

document.addEventListener('mousemove', () => {
    window.requestAnimationFrame(update);  // Auf die nächste Frame warten
});

// Marker-Update-Funktion
function updateMarkers() {
    markers.forEach(marker => {
        const x = parseFloat(marker.dataset.x) * mapImage.viewBox.baseVal.width;
        const y = parseFloat(marker.dataset.y) * mapImage.viewBox.baseVal.height;

        // Marker Positionen relativ zur transformierten Karte
        const markerTransform = `translate(${originX + x * scale}px, ${originY + y * scale}px)`;
        marker.style.transform = markerTransform;  // Marker mit der gleichen Transformation verschieben
    });
}
// Alles erst ausführen, wenn Seite geladen ist
window.addEventListener("load", () => {
    const containerWidth = mapContainer.clientWidth;
    const containerHeight = mapContainer.clientHeight;

    const mapWidth = mapContainer.clientWidth;  // Containergröße
    const mapHeight = mapContainer.clientHeight;

    scale = 1; // 1 = volle Größe des Containers
    originX = 0;
    originY = 0;

    mapImage.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
    updateMarkers();
    // Karte zentrieren
    originX = (containerWidth - mapWidth * scale) / 2;
    originY = (containerHeight - mapHeight * scale) / 2;

    // Transform anwenden
    mapImage.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
    updateMarkers();
});

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
    scale = Math.min(Math.max(0.3, scale), 10); // Min/Max Zoom anpassen

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
