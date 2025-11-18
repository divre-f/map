// Hole die benötigten DOM-Elemente
const mapContainer = document.getElementById('map-container');
const mapImage = document.getElementById('map-image');
const markers = document.querySelectorAll('.marker');

let scale = 1, originX = 0, originY = 0;  // Startwerte für Skalierung und Position
let isDragging = false, startX, startY;  // Variablen für Dragging
let isAnimating = false; // Flag, um Animationen zu steuern

// Funktion für Animation und Marker-Aktualisierung
function update() {
    if (isAnimating) return;  // Verhindert doppelte Animationen
    isAnimating = true;

    // Hier kommt der Code zum Animieren und Aktualisieren der Marker (kann später angepasst werden)

    isAnimating = false;
}

// Event-Listener für Mausbewegungen, um Animationen zu steuern
document.addEventListener('mousemove', () => {
    window.requestAnimationFrame(update);  // Wartet auf die nächste Frame
});

// Alles erst ausführen, wenn die Seite vollständig geladen ist
window.addEventListener("load", () => {
    const containerWidth = mapContainer.clientWidth;
    const containerHeight = mapContainer.clientHeight;
    const mapWidth = mapContainer.clientWidth;  // Containergröße
    const mapHeight = mapContainer.clientHeight; // Containergröße

    scale = 1; // Standard-Skalierung (1 = Originalgröße)
    originX = 0;
    originY = 0;

    // Transformation anwenden, um die Karte an der richtigen Position zu setzen
    mapImage.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;

    updateMarkers();  // Marker nach Initialisierung updaten

    // Karte zentrieren
    originX = (containerWidth - mapWidth * scale) / 2;
    originY = (containerHeight - mapHeight * scale) / 2;

    // Transformation anwenden
    mapImage.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
    updateMarkers();  // Marker erneut updaten
});

// Event-Listener für das Starten des Dragging
mapContainer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    startX = e.clientX - originX;
    startY = e.clientY - originY;
});

// Event-Listener für das Ziehen der Karte (Drag)
document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    originX = e.clientX - startX;
    originY = e.clientY - startY;
    mapImage.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
    updateMarkers();  // Marker nach dem Ziehen updaten
});

// Event-Listener für das Beenden des Dragging
document.addEventListener('mouseup', () => {
    isDragging = false;
});

// Zoom mit dem Mausrad
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
    updateMarkers();  // Marker nach dem Zoom updaten
});

// Funktion für das Zoomen auf einen bestimmten Marker
function zoomToMarker(marker, targetScale = 2.5, offsetX = 0, offsetY = 0) {
    const mapW = mapImage.viewBox.baseVal.width;
    const mapH = mapImage.viewBox.baseVal.height;

    // Marker-Koordinaten in der Map (relativ zur gesamten Kartenbreite und -höhe)
    const x = parseFloat(marker.dataset.x) * mapW;
    const y = parseFloat(marker.dataset.y) * mapH;

    const rect = mapContainer.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Ziel-Skalierung clamping (nicht zu extrem)
    const clampedTarget = Math.min(Math.max(0.15, targetScale), 20);
    const oldScale = scale;
    scale = clampedTarget;

    // Berechnung der neuen Ursprungspunkte, sodass der Marker in der Mitte landet
    originX = centerX - x * scale + offsetX;
    originY = centerY - y * scale + offsetY;

    // Transformation anwenden
    mapImage.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;

    updateMarkers();  // Marker nach dem Zoom updaten

    // 3D-Effekt hinzufügen
    document.getElementById("map-3d-wrapper").classList.add("map-tilted");
}

// Event-Listener für Marker-Klicks (Zoom auf Marker)
markers.forEach(marker => {
    marker.addEventListener('click', () => {
        const offsetX = -300;  // Offset für den gewünschten Effekt anpassen
        const offsetY = 300;   // Offset anpassen

        zoomToMarker(marker, 2.5, offsetX, offsetY);  // Zoom mit Offset auf den Marker
    });
});

// Event-Listener für den Reset-Button
document.getElementById('reset-map-btn').addEventListener('click', () => {
    // Entferne den Tilt-Effekt
    document.getElementById("map-3d-wrapper").classList.remove("map-tilted");

    // Zurücksetzen auf die Standard-Skalierung
    scale = 1;
    originX = 0;
    originY = 0;

    // Karte sofort auf Standardgröße zurücksetzen
    mapImage.style.transition = 'none';  // Keine Übergänge für sofortiges Zurücksetzen
    mapImage.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;

    updateMarkers();  // Marker sofort neu positionieren

    // Übergang nach dem Zurücksetzen wieder aktivieren
    setTimeout(() => {
        mapImage.style.transition = 'transform 0.3s ease-out';  // Sanfte Übergänge aktivieren
    }, 50);
});

// Marker-Update-Funktion
function updateMarkers() {
    markers.forEach(marker => {
        const mapW = mapImage.viewBox.baseVal.width;
        const mapH = mapImage.viewBox.baseVal.height;

        const x = parseFloat(marker.dataset.x) * mapW;
        const y = parseFloat(marker.dataset.y) * mapH;

        // Marker-Positionen relativ zum Container nach Skalierung berechnen
        const screenX = originX + x * scale;
        const screenY = originY + y * scale;

        // Marker relativ zum Container positionieren
        marker.style.transform = `translate(${screenX}px, ${screenY}px) translate(-50%, -50%)`;
    });
}

