const mapContainer = document.getElementById('map-container');
const mapImage = document.getElementById('map-image');
const markers = document.querySelectorAll('.marker');

let scale = 1, originX = 0, originY = 0;
let isDragging = false, startX, startY;
let isAnimating = false; // Flag, um zu prüfen, ob Animation läuft

// Funktion zur Animation und Marker-Aktualisierung
function update() {
    if (isAnimating) return;  // Verhindert doppelte Animationen
    isAnimating = true;
    // Hier kommt dein Code zum Animieren und Aktualisieren der Marker
    isAnimating = false;
}

document.addEventListener('mousemove', () => {
    window.requestAnimationFrame(update);  // Auf die nächste Frame warten
});

// Alles erst ausführen, wenn Seite geladen ist
window.addEventListener("load", () => {
    const containerWidth = mapContainer.clientWidth;
    const containerHeight = mapContainer.clientHeight;
    const mapWidth = mapContainer.clientWidth; // Containergröße
    const mapHeight = mapContainer.clientHeight;

    scale = 1; // Standard-Skalierung
    originX = (containerWidth - mapWidth * scale) / 2;  // Karte zentrieren
    originY = (containerHeight - mapHeight * scale) / 2;  // Karte zentrieren
    mapImage.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;

    updateMarkers();  // Initiale Marker-Positionierung
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

    // Berechne die neue Position des Ursprungs (originX und originY) für den Zoom
    originX -= (scale / oldScale - 1) * mx;
    originY -= (scale / oldScale - 1) * my;

    // Anwenden des neuen Zooms
    mapImage.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
    updateMarkers();
});

// Marker-Click - Zentrieren und Zoomen auf den Marker
function zoomToMarker(marker, targetScale = 2.5) {
    const mapW = mapImage.viewBox.baseVal.width;  // Gesamte Kartengröße
    const mapH = mapImage.viewBox.baseVal.height;

    // Marker-Koordinaten in der Map (relativ zur gesamten Kartenbreite und -höhe)
    const x = parseFloat(marker.dataset.x) * mapW;
    const y = parseFloat(marker.dataset.y) * mapH;

    const rect = mapContainer.getBoundingClientRect();
    const centerX = rect.width / 2;  // Berechne das Zentrum des Containers
    const centerY = rect.height / 2;

    // Ziel-Skalierung clamping (nicht zu extrem)
    const clampedTarget = Math.min(Math.max(0.15, targetScale), 20);
    const oldScale = scale;
    scale = clampedTarget;

    // Berechnung der neuen Ursprungspunkte (Translate), sodass der Marker in der Mitte landet
    originX = centerX - (x * scale);  // Marker X korrekt zentrieren
    originY = centerY - (y * scale);  // Marker Y korrekt zentrieren

    // Wenden der neuen Transformation für den Zoom an
    mapImage.style.transition = 'transform 0.3s ease-out';  // Sanfte Übergänge aktivieren
    mapImage.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;

    // Marker aktualisieren
    updateMarkers();

    // 3D-Effekt hinzufügen
    document.getElementById("map-3d-wrapper").classList.add("map-tilted");
}

// Marker Klick - Zoom und Positionierung
markers.forEach(marker => {
    marker.addEventListener('click', () => {
        zoomToMarker(marker, 2.5);  // Ziel-Skalierung 2.5
    });
});

document.getElementById('reset-map-btn').addEventListener('click', () => {
    // Entferne den Tilt-Effekt
    document.getElementById("map-3d-wrapper").classList.remove("map-tilted");

    // Rauszoomen (zur Standardgröße zurückkehren)
    scale = 1;
    originX = 0;
    originY = 0;

    // Karte sofort auf die Standardgröße zurücksetzen
    mapImage.style.transition = 'none';  // Keine Übergänge für sofortiges Zurücksetzen
    mapImage.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;

    // Marker sofort neu positionieren
    updateMarkers();

    // Optional: Übergang nach dem Zurücksetzen wieder aktivieren
    setTimeout(() => {
        mapImage.style.transition = 'transform 0.3s ease-out';  // Sanfte Übergänge aktivieren
    }, 50);
});


const buttons = document.querySelectorAll('.transform-btn');

buttons.forEach(button => {
    button.addEventListener('click', (e) => {
        // Holen der Koordinaten und Skalierung aus den Button-Attributen
        const x = parseFloat(button.getAttribute('data-x'));
        const y = parseFloat(button.getAttribute('data-y'));
        const scale = parseFloat(button.getAttribute('data-scale'));

        // Berechnung der neuen Transformation (translate und scale)
        // Dies wird auf das Bild angewendet
        const transformValue = `translate(${x}px, ${y}px) scale(${scale})`;

        // Wenden der neuen Transformation auf das Kartenbild an
        mapImage.style.transition = 'transform 0.3s ease-out';  // Optionale Übergänge
        mapImage.style.transform = transformValue;

        // Optional: Hier kannst du auch Marker aktualisieren, wenn notwendig
        updateMarkers();
    });
});

// Marker-Update-Funktion
function updateMarkers() {
    const containerWidth = mapContainer.clientWidth;
    const containerHeight = mapContainer.clientHeight;

    markers.forEach(marker => {
        const x = parseFloat(marker.dataset.x);
        const y = parseFloat(marker.dataset.y);

        const markerX = x * containerWidth;
        const markerY = y * containerHeight;

        const screenX = originX + markerX * scale;
        const screenY = originY + markerY * scale;

        marker.style.transform = `translate(${screenX}px, ${screenY}px) translate(-50%, -50%)`;
    });
}

// Bei Größenänderung oder Initialisierung der Seite
window.addEventListener("load", updateMarkers);
window.addEventListener("resize", updateMarkers);
