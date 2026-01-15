
// Damit wir sicher sind, dass alles existiert, warten wir kurz auf den DOM
document.addEventListener("DOMContentLoaded", () => {
    initMap();
});

function initMap() {
    // --- 1. ELEMENTE HOLEN ---
    const mapContainer = document.getElementById('map-container');
    const map3dWrapper = document.getElementById('map-3d-wrapper');
    const mapVisuals = document.getElementById('map-visuals');
    const mapImg = document.getElementById('map-backing-img'); // Das Hintergrundbild
    const markers = document.querySelectorAll('.marker');

    // UI Buttons
    const resetButton = document.getElementById('reset-map-btn');
    const infoBtn = document.getElementById('info-btn');
    const enterBtn = document.getElementById('enter-world-btn');
    const closeBtn = document.getElementById('close-overlay-btn');

    // Overlays
    const infoOverlay = document.getElementById('info-overlay');
    const charOverlay = document.getElementById('char-overlay');
    const elCardImg = document.getElementById('char-bg-img');

    // Check ob alles da ist (Debugging)
    if (!mapContainer || !mapVisuals || !mapImg) {
        console.error("KRITISCHER FEHLER: Map-Elemente fehlen im HTML!");
        return;
    }

    // --- 2. KONFIGURATION ---
    const LERP_FAST = 0.15;
    const LERP_SLOW = 0.08;
    const MAX_TILT = 70;
    const PERSPECTIVE = 1000;
    const ZOOM_LEVEL = 4.0;

    const WIGGLE_INTENSITY = 40;
    const BASE_SCALE = 1;

    // STATE
    let state = {
        currentX: 0, currentY: 0, currentScale: 1, currentTilt: 0,
        targetX: 0, targetY: 0, targetScale: 1, targetTilt: 0,
        homeX: 0, homeY: 0, // Die Startposition
        isDragging: false, startX: 0, startY: 0,
        dragStartTargetX: 0, dragStartTargetY: 0,
        currentLerp: LERP_FAST
    };

    // --- 3. HELFER: ZENTRIERUNG ---
    function centerMap() {
        console.log("3. Berechne Kartenmitte...");

        const screenW = mapContainer.clientWidth;
        const screenH = mapContainer.clientHeight;

        // Fallback: Wenn Bild noch nicht geladen, nimm angenommene Werte (z.B. 2560x1440)
        // Das verhindert, dass die Map auf 0px, 0px springt
        const mapW = mapVisuals.offsetWidth || 2560;
        const mapH = mapVisuals.offsetHeight || 1440;

        // Mitte berechnen
        // (Fenster - Karte) / 2
        let centerX = (screenW - mapW) / 2;
        let centerY = (screenH - mapH) / 2;

        // DEINE MANUELLE KORREKTUR
        // Werte anpassen, bis es perfekt sitzt
        const manualOffsetX = 0;
        const manualOffsetY = 0;

        // Werte setzen
        state.targetX = centerX + manualOffsetX;
        state.targetY = centerY + manualOffsetY;

        // Home Position speichern
        state.homeX = state.targetX;
        state.homeY = state.targetY;

        // Sofort setzen (keine Animation beim Start)
        state.currentX = state.targetX;
        state.currentY = state.targetY;

        console.log(`   -> Mitte gesetzt auf X:${state.homeX.toFixed(0)} / Y:${state.homeY.toFixed(0)}`);
    }

    // --- 4. START-LOGIK (Warten aufs Bild) ---
    if (mapImg.complete && mapImg.naturalHeight !== 0) {
        centerMap();
    } else {
        // Falls Bild noch lädt, rechne erst grob, dann fein wenn es da ist
        centerMap();
        mapImg.onload = () => {
            console.log("4. Bild fertig geladen -> Korrigiere Mitte");
            centerMap();
        };
    }

    // --- 5. RENDER LOOP ---
    function renderLoop() {
        // Glättung (Lerp)
        state.currentX += (state.targetX - state.currentX) * state.currentLerp;
        state.currentY += (state.targetY - state.currentY) * state.currentLerp;
        state.currentScale += (state.targetScale - state.currentScale) * state.currentLerp;
        state.currentTilt += (state.targetTilt - state.currentTilt) * state.currentLerp;

        // Map bewegen
        if (mapVisuals && map3dWrapper) {
            mapVisuals.style.transform = `translate(${state.currentX}px, ${state.currentY}px) scale(${state.currentScale})`;
            map3dWrapper.style.transform = `perspective(${PERSPECTIVE}px) rotateX(${state.currentTilt}deg)`;
        }

        // Marker skalieren (damit sie nicht riesig werden beim Reinzoomen)
        const inverseScale = 1 / state.currentScale;
        markers.forEach(marker => {
            marker.style.transform = `scale(${inverseScale})`;
        });

        requestAnimationFrame(renderLoop);
    }
    // Loop starten
    requestAnimationFrame(renderLoop);


    // --- 6. OVERLAY LOGIK ---

    function openOverlay(markerId) {
        if (typeof characterData === 'undefined') return;
        const data = characterData[markerId];

        if (data && data.image) {
            elCardImg.src = data.image;
            charOverlay.classList.add('is-visible');

            // Animation Fix für Wiggle
            const card = document.querySelector('.char-card');
            if (card) {
                card.style.animation = '';
                card.addEventListener('animationend', () => {
                    card.style.animation = 'none';
                    card.style.opacity = '1';
                    card.style.transform = `scale(${BASE_SCALE})`;
                }, { once: true });
            }
        }
    }

    function closeOverlay() {
        charOverlay.classList.remove('is-visible');
        const card = document.querySelector('.char-card');
        if (card) {
            card.style.transform = '';
            card.style.animation = '';
        }
    }

    // --- 7. EVENT LISTENER ---

    if (enterBtn) enterBtn.addEventListener('click', () => infoOverlay.classList.remove('is-visible'));
    if (infoBtn) infoBtn.addEventListener('click', () => infoOverlay.classList.add('is-visible'));

    // Buttons für Reset / Close
    const resetView = (e) => {
        if (e) e.stopPropagation();
        closeOverlay();
        state.targetScale = 1;
        state.targetTilt = 0;
        // Zurück zur gespeicherten Home-Position
        state.targetX = state.homeX;
        state.targetY = state.homeY;
    };

    if (closeBtn) closeBtn.addEventListener('click', resetView);
    if (resetButton) resetButton.addEventListener('click', resetView);

    // Map Dragging
    mapContainer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        state.isDragging = true;
        state.startX = e.clientX;
        state.startY = e.clientY;
        state.dragStartTargetX = state.targetX;
        state.dragStartTargetY = state.targetY;
        mapContainer.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!state.isDragging) return;
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

    // Zoom
    mapContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const oldScale = state.targetScale;
        let zoomIntensity = 0.0015;
        if (Math.abs(e.deltaY) < 40) zoomIntensity = 0.02;

        let newScale = oldScale + (e.deltaY * -zoomIntensity);
        newScale = Math.min(Math.max(0.5, newScale), 10);

        // Zoom Richtung Maus
        const rect = mapContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const scaleChange = newScale / oldScale;

        state.targetX = mouseX - (mouseX - state.targetX) * scaleChange;
        state.targetY = mouseY - (mouseY - state.targetY) * scaleChange;
        state.targetScale = newScale;
    }, { passive: false });

    // Marker Klick
    markers.forEach(marker => {
        marker.addEventListener('click', (e) => {
            e.stopPropagation();

            const cx = parseFloat(marker.getAttribute('cx')) || 50;
            const cy = parseFloat(marker.getAttribute('cy')) || 50;
            const mapW = mapVisuals.clientWidth;
            const mapH = mapVisuals.clientHeight;

            // Pixelposition auf der Map
            const targetPixelX = (cx / 100) * mapW;
            const targetPixelY = (cy / 100) * mapH;

            const screenW = mapContainer.clientWidth;
            const screenH = mapContainer.clientHeight;

            state.targetScale = ZOOM_LEVEL;
            state.targetTilt = MAX_TILT;

            // Zentrierung berechnen
            state.targetX = (screenW / 2) - (targetPixelX * state.targetScale);
            state.targetY = (screenH / 2) - (targetPixelY * state.targetScale);

            openOverlay(marker.id);
        });
    });

    // 3D Wiggle
    document.addEventListener('mousemove', (e) => {
        if (!charOverlay || !charOverlay.classList.contains('is-visible')) return;
        const card = document.querySelector('.char-card');
        if (!card) return;
        let xAxis = (window.innerWidth / 2 - e.pageX) / WIGGLE_INTENSITY;
        let yAxis = (window.innerHeight / 2 - e.pageY) / WIGGLE_INTENSITY;
        card.style.transform = `scale(${BASE_SCALE}) rotateY(${xAxis}deg) rotateX(${-yAxis}deg)`;
    });
}