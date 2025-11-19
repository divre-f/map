const mapContainer = document.getElementById('map-container');
const map3dWrapper = document.getElementById('map-3d-wrapper');
const mapImage = document.getElementById('map-image');
const markers = document.querySelectorAll('.marker');
const resetButton = document.getElementById('reset-map-btn');

// --- PHYSIK KONFIGURATION ---
const LERP_FAST = 0.2;  // Für Dragging/Mausrad (Direkt)
const LERP_SLOW = 0.08; // Für Marker-Klick (Cinematic)

// --- STATE ---
let state = {
    // Wo die Karte IST (wird langsam angepasst)
    currentX: 0,
    currentY: 0,
    currentScale: 1,

    // Wo die Karte HIN SOLL (Maus/Ziel)
    targetX: 0,
    targetY: 0,
    targetScale: 1,

    isDragging: false,
    startX: 0,
    startY: 0,

    // Startposition der Targets beim Drag-Beginn
    dragStartTargetX: 0,
    dragStartTargetY: 0,
    currentLerp: LERP_FAST
};

// ViewBox Daten
const viewBox = mapImage.viewBox.baseVal;
const mapAspectRatio = viewBox.width / viewBox.height;

// --- MATHE HELFER ---
// Linear Interpolation: Bewegt "start" langsam Richtung "end"
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

// Exakte Kartengröße berechnen (für Marker-Treffer)
function getRenderedMapStats() {
    const containerW = mapContainer.clientWidth;
    const containerH = mapContainer.clientHeight;
    const containerRatio = containerW / containerH;

    let renderedW, renderedH, offsetX, offsetY;

    if (containerRatio > mapAspectRatio) {
        renderedH = containerH;
        renderedW = containerH * mapAspectRatio;
        offsetX = (containerW - renderedW) / 2;
        offsetY = 0;
    } else {
        renderedW = containerW;
        renderedH = containerW / mapAspectRatio;
        offsetX = 0;
        offsetY = (containerH - renderedH) / 2;
    }
    return { width: renderedW, height: renderedH, left: offsetX, top: offsetY };
}

// --- GAME LOOP (Läuft dauerhaft für Physik) ---
// --- GAME LOOP (Mit Schärfe-Automatik) ---
function renderLoop() {
    // 1. Physik berechnen
    state.currentX = lerp(state.currentX, state.targetX, state.currentLerp);
    state.currentY = lerp(state.currentY, state.targetY, state.currentLerp);
    state.currentScale = lerp(state.currentScale, state.targetScale, state.currentLerp);

    // 2. DOM Update
    mapImage.style.transform = `translate(${state.currentX}px, ${state.currentY}px) scale(${state.currentScale})`;

    // 3. Marker skalieren
    const inverseScale = 1 / state.currentScale;
    markers.forEach(marker => {
        marker.style.transform = `scale(${inverseScale})`;
    });

    // --- NEU: SCHÄRFE MANAGEMENT ---
    // Wir prüfen, ob sich die Karte noch signifikant bewegt.
    // Da Lerp nie ganz 0 erreicht, definieren wir eine winzige Toleranzgrenze (Epsilon).
    const diffX = Math.abs(state.targetX - state.currentX);
    const diffY = Math.abs(state.targetY - state.currentY);
    const diffScale = Math.abs(state.targetScale - state.currentScale);

    // Bewegt sich die Karte noch mehr als 0.5 Pixel oder skaliert sie noch?
    const isMoving = (diffX > 0.5 || diffY > 0.5 || diffScale > 0.002);

    if (isMoving) {
        // Wir bewegen uns -> Performance Modus an (leicht unscharf, aber flüssig)
        if (!mapImage.classList.contains('is-moving')) {
            mapImage.classList.add('is-moving');
            // Optional: Auch Marker optimieren
            markers.forEach(m => m.classList.add('is-moving'));
        }
    } else {
        // Wir stehen fast still -> Scharfschalten (High Quality Repaint)
        if (mapImage.classList.contains('is-moving')) {
            mapImage.classList.remove('is-moving');
            markers.forEach(m => m.classList.remove('is-moving'));

            // Optional: Um ganz sicher zu gehen, setzen wir current exakt auf target,
            // damit der Loop nicht ewig minimal weiterrechnet.
            state.currentX = state.targetX;
            state.currentY = state.targetY;
            state.currentScale = state.targetScale;
        }
    }

    // Loop am Leben halten
    requestAnimationFrame(renderLoop);
}


// --- INIT ---
function init() {
    state.currentX = 0; state.targetX = 0;
    state.currentY = 0; state.targetY = 0;
    state.currentScale = 1; state.targetScale = 1;

    // Loop starten
    requestAnimationFrame(renderLoop);
}


// --- DRAGGING LOGIK ---
mapContainer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    state.currentLerp = LERP_FAST;
    state.isDragging = true;
    mapContainer.style.cursor = 'grabbing';

    // Wir merken uns, wo die Maus RELATIV zum aktuellen Ziel war
    state.startX = e.clientX;
    state.startY = e.clientY;

    // Wir merken uns, wo das Target zu Beginn war
    state.dragStartTargetX = state.targetX;
    state.dragStartTargetY = state.targetY;
});

window.addEventListener('mousemove', (e) => {
    if (!state.isDragging) return;
    state.currentLerp = LERP_FAST;
    e.preventDefault();

    // Wie weit hat sich die Maus bewegt?
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    // Wir setzen das ZIEL (Target).
    // Der renderLoop() kümmert sich darum, dass die Karte "hinterherfährt".
    state.targetX = state.dragStartTargetX + dx;
    state.targetY = state.dragStartTargetY + dy;
});

window.addEventListener('mouseup', () => {
    state.isDragging = false;
    mapContainer.style.cursor = 'grab';
});


// --- ZOOM LOGIK (Wheel) ---
mapContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.currentLerp = LERP_FAST;

    // Ziel-Scale berechnen
    const oldScale = state.targetScale; // Wir rechnen mit dem Ziel-Scale für Stabilität
    const zoomIntensity = 0.0015;
    let newScale = oldScale + (e.deltaY * -zoomIntensity);
    newScale = Math.min(Math.max(0.5, newScale), 10);

    // Zoom auf Mausposition
    const rect = mapContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scaleChange = newScale / oldScale;

    // Wir updaten nur die Targets! Die Physik macht den Rest weich.
    state.targetX = mouseX - (mouseX - state.targetX) * scaleChange;
    state.targetY = mouseY - (mouseY - state.targetY) * scaleChange;
    state.targetScale = newScale;

}, { passive: false });


// --- MARKER KLICK (Zielanfahrt) ---
function zoomToMarker(marker) {
    map3dWrapper.classList.add("map-tilted");
    state.currentLerp = LERP_SLOW;

    const stats = getRenderedMapStats();
    const cx = parseFloat(marker.getAttribute('cx'));
    const cy = parseFloat(marker.getAttribute('cy'));

    const markerPixelX = stats.left + (cx / 100) * stats.width;
    const markerPixelY = stats.top + (cy / 100) * stats.height;

    const targetZoom = 5.0;
    const centerX = mapContainer.clientWidth / 2;
    const centerY = mapContainer.clientHeight / 2;

    // Wir setzen einfach harte neue TARGETS.
    // Der renderLoop fährt diese dann automatisch weich an (wegen Lerp).
    state.targetScale = targetZoom;
    state.targetX = centerX - (markerPixelX * targetZoom);
    state.targetY = centerY - (markerPixelY * targetZoom);

    // Optional: Wir können für den Klick den Lerp kurz ändern, 
    // wenn wir wollen, dass er schneller/langsamer hinfährt, 
    // aber der Standard-Lerp sieht meistens sehr organisch aus.
}

markers.forEach(marker => {
    marker.addEventListener('click', (e) => {
        e.stopPropagation();
        zoomToMarker(marker);
    });
});


// --- RESET ---
resetButton.addEventListener('click', () => {
    map3dWrapper.classList.remove("map-tilted");
    // Einfach Targets zurücksetzen -> Karte "fliegt" zurück
    state.targetScale = 1;
    state.targetX = 0;
    state.targetY = 0;
});

// Start
window.addEventListener('load', init);
window.addEventListener('resize', init);