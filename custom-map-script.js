const mapContainer = document.getElementById('map-container');
const map3dWrapper = document.getElementById('map-3d-wrapper');
const mapImage = document.getElementById('map-image');
const markers = document.querySelectorAll('.marker');
const resetButton = document.getElementById('reset-map-btn');

// --- PHYSIK KONFIGURATION ---
const LERP_FAST = 0.2;  // Direktes Feedback
const LERP_SLOW = 0.08; // Cinematic Kamerafahrt

// --- STATE ---
let state = {
    currentX: 0, currentY: 0, currentScale: 1,
    targetX: 0, targetY: 0, targetScale: 1,
    isDragging: false,
    startX: 0, startY: 0,
    dragStartTargetX: 0, dragStartTargetY: 0,
    currentLerp: LERP_FAST,

    // Neu: Um zwischen Klick und Drag zu unterscheiden
    clickStartX: 0,
    clickStartY: 0
};

// ViewBox Daten
const viewBox = mapImage.viewBox.baseVal;
const mapAspectRatio = viewBox.width / viewBox.height;

// --- MATHE HELFER ---
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

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

// --- GAME LOOP ---
function renderLoop() {
    state.currentX = lerp(state.currentX, state.targetX, state.currentLerp);
    state.currentY = lerp(state.currentY, state.targetY, state.currentLerp);
    state.currentScale = lerp(state.currentScale, state.targetScale, state.currentLerp);

    mapImage.style.transform = `translate(${state.currentX}px, ${state.currentY}px) scale(${state.currentScale})`;

    const inverseScale = 1 / state.currentScale;
    markers.forEach(marker => {
        marker.style.transform = `scale(${inverseScale})`;
    });

    // Schärfe Management
    const diffX = Math.abs(state.targetX - state.currentX);
    const diffY = Math.abs(state.targetY - state.currentY);
    const diffScale = Math.abs(state.targetScale - state.currentScale);
    const isMoving = (diffX > 0.5 || diffY > 0.5 || diffScale > 0.002);

    if (isMoving) {
        if (!mapImage.classList.contains('is-moving')) {
            mapImage.classList.add('is-moving');
            markers.forEach(m => m.classList.add('is-moving'));
        }
    } else {
        if (mapImage.classList.contains('is-moving')) {
            mapImage.classList.remove('is-moving');
            markers.forEach(m => m.classList.remove('is-moving'));
            state.currentX = state.targetX;
            state.currentY = state.targetY;
            state.currentScale = state.targetScale;
        }
    }
    requestAnimationFrame(renderLoop);
}

// --- INIT ---
function init() {
    state.currentX = 0; state.targetX = 0;
    state.currentY = 0; state.targetY = 0;
    state.currentScale = 1; state.targetScale = 1;
    requestAnimationFrame(renderLoop);
}

// --- ZENTRALE RESET FUNKTION ---
function resetView() {
    // Nur resetten, wenn wir nicht schon bei Scale 1 sind (optional)
    if (state.targetScale === 1) return;

    map3dWrapper.classList.remove("map-tilted");

    // WICHTIG: Wir nutzen hier LERP_SLOW, damit das Rauszoomen 
    // genauso "cinematic" aussieht wie das Reinzoomen.
    state.currentLerp = LERP_SLOW;

    state.targetScale = 1;
    state.targetX = 0;
    state.targetY = 0;
}


// --- DRAGGING LOGIK ---
mapContainer.addEventListener('mousedown', (e) => {
    e.preventDefault(); // Verhindert Text-Selektion

    state.currentLerp = LERP_FAST; // Beim Anfassen sofortige Reaktion
    state.isDragging = true;
    mapContainer.style.cursor = 'grabbing';

    state.startX = e.clientX;
    state.startY = e.clientY;
    state.dragStartTargetX = state.targetX;
    state.dragStartTargetY = state.targetY;

    // Für Click-Detection merken wir uns, wo wir gedrückt haben
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

// --- CLICK BACKGROUND TO RESET ---
mapContainer.addEventListener('click', (e) => {
    // Wir berechnen die Distanz zwischen Mousedown und Mouseup (Click)
    const dist = Math.hypot(e.clientX - state.clickStartX, e.clientY - state.clickStartY);

    // Wenn die Maus weniger als 5 Pixel bewegt wurde, war es ein Klick (kein Drag)
    // UND wir müssen prüfen, ob wir überhaupt reingezoomt sind (> 1.1 als Puffer)
    if (dist < 5 && state.targetScale > 1.1) {
        resetView();
    }
});


// --- ZOOM LOGIK (Wheel) ---
mapContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.currentLerp = LERP_FAST;

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


// --- MARKER KLICK ---
function zoomToMarker(marker) {
    map3dWrapper.classList.add("map-tilted");
    state.currentLerp = LERP_SLOW; // Cinematic Mode an

    const stats = getRenderedMapStats();
    const cx = parseFloat(marker.getAttribute('cx'));
    const cy = parseFloat(marker.getAttribute('cy'));

    const markerPixelX = stats.left + (cx / 100) * stats.width;
    const markerPixelY = stats.top + (cy / 100) * stats.height;

    const targetZoom = 5.0;
    const centerX = mapContainer.clientWidth / 2;
    const centerY = mapContainer.clientHeight / 2;

    state.targetScale = targetZoom;
    state.targetX = centerX - (markerPixelX * targetZoom);
    state.targetY = centerY - (markerPixelY * targetZoom);
}

markers.forEach(marker => {
    marker.addEventListener('click', (e) => {
        // WICHTIG: stopPropagation verhindert, dass der Klick 
        // bis zum mapContainer durchdringt und den Reset auslöst!
        e.stopPropagation();
        zoomToMarker(marker);
    });
});


// --- RESET BUTTON ---
resetButton.addEventListener('click', (e) => {
    // Auch hier stopPropagation, sicherheitshalber
    e.stopPropagation();
    resetView();
});

// Start
window.addEventListener('load', init);
window.addEventListener('resize', init);