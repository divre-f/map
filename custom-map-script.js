const mapContainer = document.getElementById('map-container');
const map3dWrapper = document.getElementById('map-3d-wrapper');
const mapImage = document.getElementById('map-image');
const markers = document.querySelectorAll('.marker');
const resetButton = document.getElementById('reset-map-btn');

// --- KONFIGURATION ---
const LERP_FAST = 0.25;
const LERP_SLOW = 0.12;

const MAX_TILT = 70;
const PERSPECTIVE = 800;
const ZOOM_LEVEL = 5.0;

// --- STATE ---
let state = {
    currentX: 0, currentY: 0, currentScale: 1, currentTilt: 0,
    targetX: 0, targetY: 0, targetScale: 1, targetTilt: 0,
    isDragging: false,
    startX: 0, startY: 0,
    dragStartTargetX: 0, dragStartTargetY: 0,
    currentLerp: LERP_FAST,
    clickStartX: 0, clickStartY: 0
};

const viewBox = mapImage.viewBox.baseVal;
const mapAspectRatio = viewBox.width / viewBox.height;

// --- HELFER ---
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

// --- RENDER LOOP ---
function renderLoop() {
    state.currentX = lerp(state.currentX, state.targetX, state.currentLerp);
    state.currentY = lerp(state.currentY, state.targetY, state.currentLerp);
    state.currentScale = lerp(state.currentScale, state.targetScale, state.currentLerp);
    state.currentTilt = lerp(state.currentTilt, state.targetTilt, state.currentLerp);

    // Update Transform
    mapImage.style.transform = `translate(${state.currentX}px, ${state.currentY}px) scale(${state.currentScale})`;
    map3dWrapper.style.transform = `perspective(${PERSPECTIVE}px) rotateX(${state.currentTilt}deg)`;

    const inverseScale = 1 / state.currentScale;
    markers.forEach(marker => {
        marker.style.transform = `scale(${inverseScale})`;
    });

    // Performance Check
    const diffX = Math.abs(state.targetX - state.currentX);
    const diffY = Math.abs(state.targetY - state.currentY);
    const diffScale = Math.abs(state.targetScale - state.currentScale);
    const diffTilt = Math.abs(state.targetTilt - state.currentTilt);

    const isAlmostThere = (diffX < 0.8 && diffY < 0.8 && diffScale < 0.005 && diffTilt < 0.5);

    if (!isAlmostThere) {
        // BEWEGUNG -> Alles abschalten (Schatten Map + Marker)
        if (!mapImage.classList.contains('is-moving')) {
            mapImage.classList.add('is-moving');
            markers.forEach(m => m.classList.add('is-moving'));
        }
    } else {
        // ZIEL ERREICHT -> Snap & High Quality
        if (mapImage.classList.contains('is-moving')) {
            state.currentX = state.targetX;
            state.currentY = state.targetY;
            state.currentScale = state.targetScale;
            state.currentTilt = state.targetTilt;

            mapImage.style.transform = `translate(${state.currentX}px, ${state.currentY}px) scale(${state.currentScale})`;
            map3dWrapper.style.transform = `perspective(${PERSPECTIVE}px) rotateX(${state.currentTilt}deg)`;

            const exactInverse = 1 / state.currentScale;
            markers.forEach(m => m.style.transform = `scale(${exactInverse})`);

            mapImage.classList.remove('is-moving');
            markers.forEach(m => m.classList.remove('is-moving'));
        }
    }

    requestAnimationFrame(renderLoop);
}

// --- INIT & EVENTS ---
function init() {
    state.currentX = 0; state.targetX = 0;
    state.currentY = 0; state.targetY = 0;
    state.currentScale = 1; state.targetScale = 1;
    state.currentTilt = 0; state.targetTilt = 0;
    requestAnimationFrame(renderLoop);
}

function resetView() {
    if (state.targetScale === 1 && state.targetTilt === 0) return;
    state.targetTilt = 0;
    state.targetScale = 1;
    state.targetX = 0;
    state.targetY = 0;
    state.currentLerp = LERP_SLOW;
}

mapContainer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    state.currentLerp = LERP_FAST;
    state.isDragging = true;
    mapContainer.style.cursor = 'grabbing';
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.dragStartTargetX = state.targetX;
    state.dragStartTargetY = state.targetY;
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

mapContainer.addEventListener('click', (e) => {
    const dist = Math.hypot(e.clientX - state.clickStartX, e.clientY - state.clickStartY);
    if (dist < 5 && state.targetScale > 1.1) {
        resetView();
    }
});

mapContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.currentLerp = LERP_FAST;

    const oldScale = state.targetScale;

    // --- HIER IST DER FIX ---
    // Standard-Intensität für die Maus (wie vorher)
    let zoomIntensity = 0.0015;

    // Check: Ist das ein Trackpad?
    // Trackpads senden sehr kleine Werte (meist unter 40).
    // Mäuse senden meist Werte um 100.
    const isTrackpad = Math.abs(e.deltaY) < 40;

    if (isTrackpad) {
        // Wenn Trackpad: Intensität massiv erhöhen!
        // Probier hier Werte zwischen 0.01 und 0.03
        zoomIntensity = 0.02;
    }

    // Berechnung wie gehabt
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

function zoomToMarker(marker) {
    state.targetTilt = MAX_TILT;
    state.targetScale = ZOOM_LEVEL;
    state.currentLerp = LERP_SLOW;

    const stats = getRenderedMapStats();
    const cx = parseFloat(marker.getAttribute('cx'));
    const cy = parseFloat(marker.getAttribute('cy'));

    const markerPixelX = stats.left + (cx / 100) * stats.width;
    const markerPixelY = stats.top + (cy / 100) * stats.height;

    const centerX = mapContainer.clientWidth / 2;
    const centerY = mapContainer.clientHeight / 2;

    state.targetX = centerX - (markerPixelX * state.targetScale);
    state.targetY = centerY - (markerPixelY * state.targetScale);
}

markers.forEach(marker => {
    marker.addEventListener('click', (e) => {
        e.stopPropagation();
        zoomToMarker(marker);
    });
});

resetButton.addEventListener('click', (e) => {
    e.stopPropagation();
    resetView();
});

window.addEventListener('load', init);
window.addEventListener('resize', init);