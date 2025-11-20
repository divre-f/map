const mapContainer = document.getElementById('map-container');
const map3dWrapper = document.getElementById('map-3d-wrapper');
const mapImage = document.getElementById('map-image');
const markers = document.querySelectorAll('.marker');
const resetButton = document.getElementById('reset-map-btn');

// =========================================
// --- KONFIGURATION (HIER EINSTELLEN) ---
// =========================================

// Geschwindigkeiten (Lerp Faktor)
const LERP_FAST = 0.25; // Für Dragging/Mausrad (Klebt am Finger)
const LERP_SLOW = 0.12; // Für Klick-Animation (Cinematic)

// Visuelle Einstellungen
const MAX_TILT = 70;     // Wie stark kippt die Karte? (in Grad)
const PERSPECTIVE = 500; // Wie stark ist der 3D-Effekt? (in Pixel)
const ZOOM_LEVEL = 5.0;  // Wie stark wird reingezoomt?

// =========================================
// --- STATE & LOGIK ---
// =========================================

let state = {
    // Aktuelle Werte (die der Animation folgen)
    currentX: 0, currentY: 0, currentScale: 1, currentTilt: 0,

    // Ziel Werte (wo wir hin wollen)
    targetX: 0, targetY: 0, targetScale: 1, targetTilt: 0,

    // Dragging Status
    isDragging: false,
    startX: 0, startY: 0,
    dragStartTargetX: 0, dragStartTargetY: 0,

    // Click Detection
    clickStartX: 0, clickStartY: 0,

    // Aktuelle Geschwindigkeit
    currentLerp: LERP_FAST
};

// ViewBox Daten
const viewBox = mapImage.viewBox.baseVal;
const mapAspectRatio = viewBox.width / viewBox.height;

// --- HELFER: Linear Interpolation ---
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

// --- HELFER: Exakte Kartengröße berechnen ---
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

// =========================================
// --- RENDER LOOP (Das Herzstück) ---
// =========================================
function renderLoop() {
    // 1. Physik berechnen (X, Y, Scale UND Tilt)
    state.currentX = lerp(state.currentX, state.targetX, state.currentLerp);
    state.currentY = lerp(state.currentY, state.targetY, state.currentLerp);
    state.currentScale = lerp(state.currentScale, state.targetScale, state.currentLerp);
    state.currentTilt = lerp(state.currentTilt, state.targetTilt, state.currentLerp);

    // 2. DOM Update: Karte bewegen
    mapImage.style.transform = `translate(${state.currentX}px, ${state.currentY}px) scale(${state.currentScale})`;

    // 3. DOM Update: Wrapper kippen (Tilt)
    // Hier nutzen wir die Variable PERSPECTIVE von oben
    map3dWrapper.style.transform = `perspective(${PERSPECTIVE}px) rotateX(${state.currentTilt}deg)`;

    // 4. DOM Update: Marker Gegenskalierung
    const inverseScale = 1 / state.currentScale;
    markers.forEach(marker => {
        marker.style.transform = `scale(${inverseScale})`;
    });

    // --- SNAP & PERFORMANCE MANAGEMENT ---
    // Wir prüfen, ob wir "nah genug" am Ziel sind
    const diffX = Math.abs(state.targetX - state.currentX);
    const diffY = Math.abs(state.targetY - state.currentY);
    const diffScale = Math.abs(state.targetScale - state.currentScale);
    const diffTilt = Math.abs(state.targetTilt - state.currentTilt);

    // Toleranz-Werte: Sind wir fast da?
    const isAlmostThere = (diffX < 0.8 && diffY < 0.8 && diffScale < 0.005 && diffTilt < 0.5);

    if (!isAlmostThere) {
        // BEWEGUNG LÄUFT -> Performance Mode AN (Glow aus)
        if (!mapImage.classList.contains('is-moving')) {
            mapImage.classList.add('is-moving');
            markers.forEach(m => m.classList.add('is-moving'));
        }
    } else {
        // ZIEL ERREICHT -> Snap & Glow AN
        if (mapImage.classList.contains('is-moving')) {

            // Hard Snap: Werte exakt setzen um Micro-Jitter zu stoppen
            state.currentX = state.targetX;
            state.currentY = state.targetY;
            state.currentScale = state.targetScale;
            state.currentTilt = state.targetTilt;

            // Ein letztes, perfektes Update rendern
            mapImage.style.transform = `translate(${state.currentX}px, ${state.currentY}px) scale(${state.currentScale})`;
            map3dWrapper.style.transform = `perspective(${PERSPECTIVE}px) rotateX(${state.currentTilt}deg)`;

            const exactInverse = 1 / state.currentScale;
            markers.forEach(m => m.style.transform = `scale(${exactInverse})`);

            // Performance Mode AUS -> Glow kommt zurück
            mapImage.classList.remove('is-moving');
            markers.forEach(m => m.classList.remove('is-moving'));
        }
    }

    requestAnimationFrame(renderLoop);
}

// --- INIT ---
function init() {
    state.currentX = 0; state.targetX = 0;
    state.currentY = 0; state.targetY = 0;
    state.currentScale = 1; state.targetScale = 1;
    state.currentTilt = 0; state.targetTilt = 0;
    requestAnimationFrame(renderLoop);
}

// --- RESET VIEW ---
function resetView() {
    // Nur resetten, wenn wir nicht schon in der Ausgangsposition sind
    if (state.targetScale === 1 && state.targetTilt === 0) return;

    // Ziele zurücksetzen
    state.targetTilt = 0;
    state.targetScale = 1;
    state.targetX = 0;
    state.targetY = 0;

    // Langsame, schöne Fahrt zurück
    state.currentLerp = LERP_SLOW;
}

// =========================================
// --- EVENT LISTENER ---
// =========================================

// 1. DRAGGING (Maus halten und ziehen)
mapContainer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    state.currentLerp = LERP_FAST; // Sofort reagieren
    state.isDragging = true;
    mapContainer.style.cursor = 'grabbing';

    state.startX = e.clientX;
    state.startY = e.clientY;
    state.dragStartTargetX = state.targetX;
    state.dragStartTargetY = state.targetY;

    // Für Klick-Erkennung
    state.clickStartX = e.clientX;
    state.clickStartY = e.clientY;
});

window.addEventListener('mousemove', (e) => {
    if (!state.isDragging) return;
    state.currentLerp = LERP_FAST;
    e.preventDefault();

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    state.targetX = state.dragStartTargetX + dx;
    state.targetY = state.dragStartTargetY + dy;
});

window.addEventListener('mouseup', () => {
    state.isDragging = false;
    mapContainer.style.cursor = 'grab';
});

// 2. HINTERGRUND KLICK (Rauszoomen)
mapContainer.addEventListener('click', (e) => {
    // Distanz berechnen (War es ein Drag oder ein Klick?)
    const dist = Math.hypot(e.clientX - state.clickStartX, e.clientY - state.clickStartY);

    // Wenn Maus < 5px bewegt wurde UND wir eingezoomt sind -> Reset
    if (dist < 5 && state.targetScale > 1.1) {
        resetView();
    }
});

// 3. MAUSRAD ZOOM
mapContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.currentLerp = LERP_FAST; // Direktes Feedback

    const oldScale = state.targetScale;
    const zoomIntensity = 0.0015;
    let newScale = oldScale + (e.deltaY * -zoomIntensity);
    newScale = Math.min(Math.max(0.5, newScale), 10);

    const rect = mapContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const scaleChange = newScale / oldScale;

    state.targetX = mouseX - (mouseX - state.targetX) * scaleChange;
    state.targetY = mouseY - (mouseY - state.targetY) * scaleChange;
    state.targetScale = newScale;
}, { passive: false });

// 4. MARKER KLICK (Reinzoomen & Tilten)
function zoomToMarker(marker) {
    // Hier setzen wir die Ziele basierend auf der Konfiguration oben
    state.targetTilt = MAX_TILT;
    state.targetScale = ZOOM_LEVEL;

    // Cinematic Mode an
    state.currentLerp = LERP_SLOW;

    // Exakte Position berechnen
    const stats = getRenderedMapStats();
    const cx = parseFloat(marker.getAttribute('cx'));
    const cy = parseFloat(marker.getAttribute('cy'));

    const markerPixelX = stats.left + (cx / 100) * stats.width;
    const markerPixelY = stats.top + (cy / 100) * stats.height;

    const centerX = mapContainer.clientWidth / 2;
    const centerY = mapContainer.clientHeight / 2;

    // Zielkoordinaten setzen
    state.targetX = centerX - (markerPixelX * state.targetScale);
    state.targetY = centerY - (markerPixelY * state.targetScale);
}

markers.forEach(marker => {
    marker.addEventListener('click', (e) => {
        e.stopPropagation(); // Verhindert Reset durch Hintergrund-Klick
        zoomToMarker(marker);
    });
});

// 5. RESET BUTTON
resetButton.addEventListener('click', (e) => {
    e.stopPropagation();
    resetView();
});

// Start
window.addEventListener('load', init);
window.addEventListener('resize', init);