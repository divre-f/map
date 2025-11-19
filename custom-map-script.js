// Hole die benötigten DOM-Elemente
const mapContainer = document.getElementById('map-container');
const mapImage = document.getElementById('map-image');
const markers = document.querySelectorAll('.marker');
const resetButton = document.getElementById('reset-map-btn');
const mapOverlay = document.getElementById('map-overlay');

let initialMapHeight = 1549.125;  // Ursprüngliche Höhe der Karte
let initialMapWidth = 2754;

let scale = 1, originX = 0, originY = 0;  // Startwerte für Skalierung und Position
let isAnimating = false; // Flag für Animationen


// Funktion zum Anpassen der Marker-Position bei einer Änderung der Viewport-Breite
function updateMarkerPositions() {
    const viewportWidth = window.innerWidth; // Aktuelle Breite des Viewports
    const viewportHeight = window.innerHeight; // Aktuelle Höhe des Viewports

    // Berechne den Skalierungsfaktor basierend auf der Breite des Viewports
    const scaleWidth = viewportWidth / initialMapWidth;  // Skalierungsfaktor basierend auf der Breite
    const scaleHeight = viewportHeight / initialMapHeight;  // Skalierungsfaktor basierend auf der Höhe

    // Gehe alle Marker durch und passe ihre Position an
    markers.forEach(marker => {
        // Marker-Positionen in Prozent (wie in deinem Beispiel), wird für Breite und Höhe berechnet
        const markerLeftPercentage = parseFloat(marker.style.left) / 100;  // Umrechnung der left-Werte in Prozent
        const markerTopPercentage = parseFloat(marker.style.top) / 100;    // Umrechnung der top-Werte in Prozent

        // Berechne die neuen Positionen basierend auf den Skalierungsfaktoren
        const newLeft = markerLeftPercentage * viewportWidth;   // Umrechnung in Pixel für Breite
        const newTop = markerTopPercentage * viewportHeight;   // Umrechnung in Pixel für Höhe

        // Wende die berechneten Positionen an
        marker.style.left = `${newLeft}px`;
        marker.style.top = `${newTop}px`;
    });
}




// Funktion zum Zoomen auf einen Marker
function zoomToMarker(marker, targetScale = 2.5) {
    const mapW = mapImage.viewBox.baseVal.width;  // Gesamte Kartenbreite
    const mapH = mapImage.viewBox.baseVal.height;  // Gesamte Kartenhöhe

    // Berechne die absoluten Positionen des Markers relativ zur Karte
    const markerLeft = marker.offsetLeft;  // Pixel-Wert für left
    const markerTop = marker.offsetTop;    // Pixel-Wert für top

    const rect = mapContainer.getBoundingClientRect();  // Berechne die Größe des Containers
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Ziel-Skalierung clamping (Verhindert extreme Skalierung)
    const clampedTarget = Math.min(Math.max(0.15, targetScale), 20);
    scale = clampedTarget;

    // Berechnung der neuen Ursprungspunkte, sodass der Marker in der Mitte des Viewports landet
    originX = centerX - (markerLeft * scale);
    originY = centerY - (markerTop * scale);

    // Dynamische Perspektive (je mehr du zoomst, desto flacher die Perspektive)
    const perspectiveValue = Math.max(600, 800 - (scale * 100));  // Dynamische Perspektive je nach Zoom

    // Kombiniere Zoom und Tilt in einer einzigen transform-Eigenschaft
    mapImage.style.transition = 'transform 1s ease-out';  // Einfache Transition für beide Effekte
    mapImage.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;

    // Perspektive animieren (Ziehen der Perspektive nach dem Zoom)
    document.getElementById("map-3d-wrapper").style.transition = 'transform 1s ease-out';  // Transition für Perspektive
    document.getElementById("map-3d-wrapper").style.transform = `perspective(${perspectiveValue}px) rotateX(70deg)`;

    // Optional: Stil für den Tilt-Effekt hinzufügen (falls gewünscht)
    document.getElementById("map-3d-wrapper").classList.add("map-tilted");

    // Alle Marker unsichtbar machen während des Zooms
    markers.forEach(marker => {
        marker.classList.add('zoom-hidden');  // Füge zoom-hidden-Klasse hinzu, um Marker auszublenden
    });
}



// Event-Listener für Marker (Zoom auf Marker)
markers.forEach(marker => {
    marker.addEventListener('click', (event) => {
        event.stopPropagation(); // Verhindere, dass der Klick auf den Marker den Reset-Listener auslöst
        zoomToMarker(marker, 4);  // Zoom auf den Marker im aktuellen Zoom-Modus
    });
});

// Funktion zum Zurücksetzen der Karte
function resetMap() {
    // Entferne den Tilt-Effekt, falls er gesetzt ist
    document.getElementById("map-3d-wrapper").classList.remove("map-tilted");

    // Zurücksetzen auf die Standard-Skalierung
    scale = 1;
    originX = 0;
    originY = 0;

    // Zuerst den Zoom rauszoomen (ohne Tilt)
    mapImage.style.transition = 'transform 1s ease-out';  // Weiche Übergänge für den Zoom
    mapImage.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;  // Zoom zurücksetzen

    // Tilt-Effekt kurz nach Beginn des Zooms einleiten (mit Verzögerung)
    setTimeout(() => {
        // Setze die Perspektive und Rotation zurück (Tilt-Effekt)
        document.getElementById("map-3d-wrapper").style.transition = 'transform 1s ease-out'; // Weiche Übergänge für den Tilt
        document.getElementById("map-3d-wrapper").style.transform = 'perspective(800px) rotateX(0deg)';  // Perspektive zurücksetzen

        // Optional: Füge den Tilt-Effekt hinzu, um den Winkel zu setzen (wenn gewünscht)
        document.getElementById("map-3d-wrapper").classList.remove("map-tilted");
    }, 400); // Warte 0.4 Sekunden nach dem Start des Zooms, bevor der Tilt-Effekt beginnt

    // Marker wieder sichtbar machen nach dem Zoom
    markers.forEach(marker => {
        marker.classList.remove('zoom-hidden');  // Entferne die zoom-hidden-Klasse, um Marker wieder einzublenden
    });
}

// Event-Listener für den Reset-Button (der Close-Button)
// Wenn der Reset-Button gedrückt wird, die Karte zurücksetzen
resetButton.addEventListener('click', (event) => {
    event.stopPropagation();  // Verhindere, dass der Klick auf den Reset-Button als Klick auf die Fläche zählt
    resetMap(); // Die Karte zurücksetzen
});

// Event-Listener für Klick außerhalb des Map Overlays (z.B. außerhalb der Karte, auf den Restbereich klicken)
// Wenn der Bereich außerhalb des Overlays geklickt wird, die Karte ebenfalls zurücksetzen
document.addEventListener('click', (event) => {
    if (!mapOverlay.contains(event.target) && event.target !== resetButton) {
        resetMap();
    }
});

// Event-Listener für Klick außerhalb des Map Overlays (z.B. außerhalb der Karte, auf den Restbereich klicken)
// Wenn der Bereich außerhalb des Overlays geklickt wird, die Karte ebenfalls zurücksetzen
window.addEventListener('DOMContentLoaded', (event) => {
    const mapOverlay = document.getElementById('map-overlay');

    // Überprüfe, ob das Map-Overlay existiert, bevor die Event-Listener hinzugefügt werden
    if (mapOverlay) {
        // Dieser Event-Listener prüft, ob der Klick außerhalb des Map Overlays erfolgt
        document.addEventListener('click', (event) => {
            // Stelle sicher, dass der Klick nicht im Overlay oder auf dem Reset-Button war
            if (!mapOverlay.contains(event.target) && event.target !== resetButton) {
                resetMap(); // Karte zurücksetzen
            }
        });
    }
});





// Event-Listener für den Resize-Event (wird ausgelöst, wenn der Viewport sich ändert)
window.addEventListener('resize', updateMarkerPositions);

// Aufrufen, um Marker beim initialen Laden zu positionieren
window.addEventListener('load', updateMarkerPositions);