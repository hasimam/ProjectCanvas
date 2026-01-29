/**
 * Project Canvas - Interactive Journal
 * Main Application Script
 */

// ============================================
// DATA - Loaded from data.json
// ============================================

let canvasConfig = { width: 1376, height: 768 };
let settings = { zoomOnClick: 1.5, minZoom: 0.5, maxZoom: 3 };
let hotspots = [];
let sequenceOrder = [];

// ============================================
// APPLICATION STATE
// ============================================

let panzoomInstance = null;
let currentSequenceIndex = -1;
let designMode = false;
let lastTouchTap = 0;

// ============================================
// DOM ELEMENTS
// ============================================

const canvasContainer = document.getElementById('canvas-container');
const canvasContent = document.getElementById('canvas-content');
const hotspotsContainer = document.getElementById('hotspots');
const mainImage = document.getElementById('main-image');

const modal = document.getElementById('modal');
const modalClose = document.querySelector('.modal-close');

// Text type elements
const modalBodyText = document.querySelector('.modal-body-text');
const modalTitle = document.getElementById('modal-title');
const modalDescription = document.getElementById('modal-description');
const modalImageContainer = document.querySelector('.modal-image');
const modalDetailImage = document.getElementById('modal-detail-image');

// Image type elements
const modalBodyImage = document.querySelector('.modal-body-image');
const modalImageTitle = document.getElementById('modal-image-title');
const modalFullImage = document.getElementById('modal-full-image');

// Video type elements
const modalBodyVideo = document.querySelector('.modal-body-video');
const modalVideoTitle = document.getElementById('modal-video-title');
const modalVideo = document.getElementById('modal-video');
const modalVideoSource = document.getElementById('modal-video-source');
const modalYouTube = document.getElementById('modal-youtube');

const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnReset = document.getElementById('btn-reset');

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    // Load data from JSON
    await loadData();

    // Wait for image to load to get dimensions
    if (mainImage.complete) {
        setupPanzoom();
        createHotspots();
    } else {
        mainImage.onload = () => {
            setupPanzoom();
            createHotspots();
        };
    }

    setupEventListeners();
}

async function loadData() {
    try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const apiUrl = (!isLocal && typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
            ? `${CONFIG.API_BASE_URL}/api/canvas`
            : 'js/data.json?v=6';
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        canvasConfig = data.canvas || canvasConfig;
        settings = data.settings || settings;

        // Transform hotspots from JSON structure to internal format
        // Filter out disabled hotspots (enabled defaults to true if not specified)
        hotspots = (data.hotspots || [])
            .filter(h => h.enabled !== false)
            .map(h => ({
                id: h.id,
                name: h.name,
                type: h.type || 'text',
                x: h.region.x,
                y: h.region.y,
                width: h.region.width,
                height: h.region.height,
                title: h.content.title,
                description: h.content.description,
                image: h.content.image,
                video: h.content.video || '',
                sequence: h.sequence
            }));

        // Sort by sequence for navigation order
        sequenceOrder = hotspots
            .sort((a, b) => a.sequence - b.sequence)
            .map(h => h.id);

        console.log(`Loaded ${hotspots.length} hotspots`);
    } catch (error) {
        console.error('Failed to load data:', error);
        document.getElementById('canvas-container').innerHTML =
            '<div style="text-align:center;padding:2rem;color:#666;">Unable to load content. Please try again later.</div>';
    }
}

function setupPanzoom() {
    // anvaka/panzoom has different API
    panzoomInstance = panzoom(canvasContent, {
        maxZoom: settings.maxZoom,
        minZoom: settings.minZoom,
        bounds: false,
        boundsPadding: 0,
        // anvaka/panzoom: return true to PREVENT handling, false to ALLOW
        beforeMouseDown: function(e) {
            return !!e.target.closest('.hotspot');
        },
        beforeTouch: function(e) {
            if (!e.touches || !e.touches[0]) return false;
            const target = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
            return !!(target && target.closest('.hotspot'));
        }
    });

    // Center the image initially after a short delay
    setTimeout(centerCanvas, 100);
}

function centerCanvas() {
    // Use window dimensions for most reliable mobile measurement
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    const imgWidth = mainImage.naturalWidth || 1376;
    const imgHeight = mainImage.naturalHeight || 768;

    // Calculate scale to fit image
    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    const scale = Math.min(scaleX, scaleY) * 0.9;

    // Calculate centered position
    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;
    const panX = (containerWidth - scaledWidth) / 2;
    const panY = (containerHeight - scaledHeight) / 2;

    // anvaka/panzoom: use zoomAbs and moveTo for precise positioning
    panzoomInstance.zoomAbs(0, 0, scale);
    panzoomInstance.moveTo(panX, panY);

    console.log('v7 anvaka:', { scale, panX, panY, containerWidth, containerHeight });
}

// ============================================
// HOTSPOTS
// ============================================

function createHotspots() {
    hotspotsContainer.innerHTML = '';

    hotspots.forEach(hotspot => {
        const el = document.createElement('div');
        el.className = 'hotspot';
        el.dataset.id = hotspot.id;
        el.dataset.type = hotspot.type || 'text';
        el.style.left = `${hotspot.x}px`;
        el.style.top = `${hotspot.y}px`;
        el.style.width = `${hotspot.width}px`;
        el.style.height = `${hotspot.height}px`;

        // Add label for design mode (ID + type indicator)
        const label = document.createElement('div');
        label.className = 'hotspot-label';
        const typeIcon = hotspot.type === 'image' ? 'IMG' : hotspot.type === 'video' ? 'VID' : 'TXT';
        label.textContent = `${hotspot.id} [${typeIcon}]`;
        label.addEventListener('click', (e) => {
            if (!designMode) return;
            e.stopPropagation();
            editHotspotId(hotspot, label);
        });
        el.appendChild(label);

        // Add resize handles for design mode
        ['nw', 'ne', 'sw', 'se'].forEach(corner => {
            const handle = document.createElement('div');
            handle.className = `hotspot-resize ${corner}`;
            handle.dataset.corner = corner;
            el.appendChild(handle);
        });

        el.addEventListener('click', (e) => {
            if (designMode) return; // Don't trigger in design mode
            if (Date.now() - lastTouchTap < 500) return;
            e.stopPropagation();
            handleHotspotClick(hotspot);
        });

        // Pointer support for mobile taps (more reliable than touchend on some browsers)
        el.addEventListener('pointerup', (e) => {
            if (designMode) return;
            if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
            lastTouchTap = Date.now();
            e.preventDefault();
            e.stopPropagation();
            handleHotspotClick(hotspot);
        });

        hotspotsContainer.appendChild(el);
    });
}

function handleHotspotClick(hotspot) {
    // Simply show modal on click
    showModal(hotspot);
}

function zoomToHotspot(hotspot) {
    const containerRect = canvasContainer.getBoundingClientRect();

    // Calculate center of hotspot
    const hotspotCenterX = hotspot.x + hotspot.width / 2;
    const hotspotCenterY = hotspot.y + hotspot.height / 2;

    // Target scale from settings
    const targetScale = settings.zoomOnClick;

    // Calculate pan to center the hotspot
    const panX = containerRect.width / 2 - hotspotCenterX * targetScale;
    const panY = containerRect.height / 2 - hotspotCenterY * targetScale;

    // anvaka/panzoom: use smoothZoomAbs and smoothMoveTo for animation
    panzoomInstance.smoothZoomAbs(containerRect.width / 2, containerRect.height / 2, targetScale);
    setTimeout(() => {
        panzoomInstance.smoothMoveTo(panX, panY);
    }, 100);
}

// ============================================
// YOUTUBE HELPERS
// ============================================

function isYouTubeUrl(url) {
    return /(?:youtube\.com\/(?:watch|embed)|youtu\.be\/)/.test(url);
}

function getYouTubeEmbedUrl(url) {
    let videoId = '';
    const watchMatch = url.match(/youtube\.com\/watch\?.*v=([^&]+)/);
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    const embedMatch = url.match(/youtube\.com\/embed\/([^?&]+)/);
    if (watchMatch) videoId = watchMatch[1];
    else if (shortMatch) videoId = shortMatch[1];
    else if (embedMatch) videoId = embedMatch[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : '';
}

// ============================================
// MODAL
// ============================================

function showLoading(container) {
    // Remove existing loader if any
    const existing = container.querySelector('.loading-container');
    if (existing) existing.remove();

    const loader = document.createElement('div');
    loader.className = 'loading-container';
    loader.innerHTML = '<div class="loading-spinner"></div><p>جاري التحميل...</p>';
    container.appendChild(loader);
    container.classList.add('is-loading');
}

function hideLoading(container) {
    const loader = container.querySelector('.loading-container');
    if (loader) loader.remove();
    container.classList.remove('is-loading');
}

function showModal(hotspot) {
    // Hide all modal body types first
    modalBodyText.classList.add('hidden');
    modalBodyImage.classList.add('hidden');
    modalBodyVideo.classList.add('hidden');

    // Stop any playing video
    modalVideo.pause();
    modalYouTube.src = '';

    const type = hotspot.type || 'text';

    // Set modal type for styling
    const modalContent = document.querySelector('.modal-content');
    modalContent.dataset.type = type;

    if (type === 'image' && hotspot.image) {
        // Image type: show full image with loading
        modalImageTitle.textContent = hotspot.title || '';
        modalBodyImage.classList.remove('hidden');

        // Show loading state
        modalFullImage.classList.add('loading');
        showLoading(modalBodyImage);

        modalFullImage.onload = () => {
            modalFullImage.classList.remove('loading');
            hideLoading(modalBodyImage);
        };
        modalFullImage.onerror = () => {
            hideLoading(modalBodyImage);
            modalFullImage.classList.remove('loading');
        };
        modalFullImage.src = hotspot.image;

    } else if (type === 'video' && hotspot.video) {
        // Video type: show video player with loading
        modalVideoTitle.textContent = hotspot.title || '';
        modalBodyVideo.classList.remove('hidden');

        if (isYouTubeUrl(hotspot.video)) {
            // YouTube: use iframe embed
            modalVideo.style.display = 'none';
            modalYouTube.classList.remove('hidden');
            modalYouTube.src = getYouTubeEmbedUrl(hotspot.video);
        } else {
            // Direct video file: use <video> element
            modalYouTube.classList.add('hidden');
            modalYouTube.src = '';
            modalVideo.style.display = '';

            // Show loading state
            modalVideo.classList.add('loading');
            showLoading(modalBodyVideo);

            modalVideo.onloadeddata = () => {
                modalVideo.classList.remove('loading');
                hideLoading(modalBodyVideo);
                modalVideo.play();
            };
            modalVideo.onerror = () => {
                hideLoading(modalBodyVideo);
                modalVideo.classList.remove('loading');
            };
            modalVideoSource.src = hotspot.video;
            modalVideo.load();
        }

    } else {
        // Text type (default): show title, description (with Markdown), optional image
        modalTitle.textContent = hotspot.title || '';
        const description = hotspot.description || '';
        modalDescription.innerHTML = typeof marked !== 'undefined' ? marked.parse(description) : description;

        if (hotspot.image) {
            // Show loading for detail image
            modalDetailImage.classList.add('loading');
            showLoading(modalImageContainer);

            modalDetailImage.onload = () => {
                modalDetailImage.classList.remove('loading');
                hideLoading(modalImageContainer);
            };
            modalDetailImage.onerror = () => {
                hideLoading(modalImageContainer);
                modalDetailImage.classList.remove('loading');
            };
            modalDetailImage.src = hotspot.image;
            modalImageContainer.classList.remove('hidden');
        } else {
            modalImageContainer.classList.add('hidden');
        }
        modalBodyText.classList.remove('hidden');
    }

    modal.classList.remove('hidden');
}

function hideModal() {
    modal.classList.add('hidden');
    // Stop video playback when closing modal
    modalVideo.pause();
    // Stop YouTube playback by clearing iframe src
    modalYouTube.src = '';
}

// ============================================
// NAVIGATION
// ============================================

function goToNext() {
    if (sequenceOrder.length === 0) return;

    currentSequenceIndex++;
    if (currentSequenceIndex >= sequenceOrder.length) {
        currentSequenceIndex = 0;
    }

    const hotspotId = sequenceOrder[currentSequenceIndex];
    const hotspot = hotspots.find(h => h.id === hotspotId);

    if (hotspot) {
        showModal(hotspot);
    }
}

function goToPrev() {
    if (sequenceOrder.length === 0) return;

    currentSequenceIndex--;
    if (currentSequenceIndex < 0) {
        currentSequenceIndex = sequenceOrder.length - 1;
    }

    const hotspotId = sequenceOrder[currentSequenceIndex];
    const hotspot = hotspots.find(h => h.id === hotspotId);

    if (hotspot) {
        showModal(hotspot);
    }
}


function resetView() {
    currentSequenceIndex = -1;
    centerCanvas();
    hideModal();
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Modal close
    modalClose.addEventListener('click', hideModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal();
        }
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideModal();
        } else if (e.key === 'ArrowLeft') {
            goToNext(); // RTL: left arrow = next
        } else if (e.key === 'ArrowRight') {
            goToPrev(); // RTL: right arrow = prev
        }
    });

    // Control panel buttons
    btnNext.addEventListener('click', goToNext);
    btnPrev.addEventListener('click', goToPrev);
    btnReset.addEventListener('click', resetView);
}

// ============================================
// DESIGN MODE
// ============================================

const designPanel = document.getElementById('design-panel');
const btnDesign = document.getElementById('btn-design');
const btnExitDesign = document.getElementById('btn-exit-design');
const btnSaveDesign = document.getElementById('btn-save-design');
const btnAddText = document.getElementById('btn-add-text');
const btnAddImage = document.getElementById('btn-add-image');
const btnAddVideo = document.getElementById('btn-add-video');

let dragTarget = null;
let resizeTarget = null;
let resizeCorner = null;
let startX, startY, startLeft, startTop, startWidth, startHeight;

function enterDesignMode() {
    designMode = true;
    document.body.classList.add('design-mode');
    designPanel.classList.remove('hidden');

    // Disable panzoom completely (anvaka API)
    panzoomInstance.pause();

    // Reset to scale 1 for easier editing
    panzoomInstance.smoothZoomAbs(0, 0, 1);
    panzoomInstance.smoothMoveTo(0, 0);

    // Disable pointer events on the panzoom element to let hotspots receive events
    canvasContent.style.pointerEvents = 'none';
    mainImage.style.pointerEvents = 'none';
    hotspotsContainer.style.pointerEvents = 'auto';

    hideModal();
    console.log('Design mode entered');
}

function exitDesignMode() {
    designMode = false;
    document.body.classList.remove('design-mode');
    designPanel.classList.add('hidden');

    // Restore pointer events
    canvasContent.style.pointerEvents = '';
    mainImage.style.pointerEvents = '';
    hotspotsContainer.style.pointerEvents = '';

    // Re-enable panzoom (anvaka API)
    panzoomInstance.resume();
    centerCanvas();
    console.log('Design mode exited');
}

function generateJSON() {
    const output = {
        canvas: canvasConfig,
        settings: settings,
        hotspots: hotspots.map(h => ({
            id: h.id,
            name: h.name,
            type: h.type || 'text',
            region: {
                x: Math.round(h.x),
                y: Math.round(h.y),
                width: Math.round(h.width),
                height: Math.round(h.height)
            },
            content: {
                title: h.title,
                description: h.description,
                image: h.image || "",
                video: h.video || ""
            },
            sequence: h.sequence
        }))
    };
    return JSON.stringify(output, null, 2);
}

function saveDesign() {
    const json = generateJSON();

    // Copy to clipboard
    navigator.clipboard.writeText(json).then(() => {
        alert('JSON copied to clipboard!\n\nPaste it to me and I will update data.json for you.');
    }).catch(() => {
        console.log(json);
        alert('Check browser console (F12) for JSON output');
    });
}

function editHotspotId(hotspot, labelEl) {
    const currentId = hotspot.id;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentId;
    input.className = 'hotspot-id-input';
    input.style.cssText = `
        width: 50px;
        padding: 2px 4px;
        font-size: 12px;
        font-weight: 700;
        text-align: center;
        border: 2px solid #27ae60;
        border-radius: 4px;
        background: #fff;
        color: #333;
        outline: none;
    `;

    labelEl.textContent = '';
    labelEl.appendChild(input);
    input.focus();
    input.select();

    const saveId = () => {
        const newId = input.value.trim();
        if (newId && newId !== currentId) {
            // Update hotspot data
            hotspot.id = newId;

            // Update the DOM element's data-id
            const hotspotEl = labelEl.closest('.hotspot');
            if (hotspotEl) {
                hotspotEl.dataset.id = newId;
            }
        }
        const typeIcon = hotspot.type === 'image' ? 'IMG' : hotspot.type === 'video' ? 'VID' : 'TXT';
        labelEl.textContent = `${hotspot.id} [${typeIcon}]`;
    };

    input.addEventListener('blur', saveId);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            input.value = currentId;
            input.blur();
        }
    });
}

function addHotspot(type = 'text') {
    const newId = (Math.max(...hotspots.map(h => parseInt(h.id) || 0), 0) + 1).toString();

    // Place new hotspot in visible area (avoiding design panel at top-left)
    const newHotspot = {
        id: newId,
        name: `New ${newId}`,
        type: type,
        x: 250,
        y: 250,
        width: 120,
        height: 60,
        title: '',
        description: '',
        image: '',
        video: '',
        sequence: hotspots.length + 1
    };
    hotspots.push(newHotspot);
    createHotspots();

    // Flash the new hotspot to make it visible
    setTimeout(() => {
        const newEl = document.querySelector(`.hotspot[data-id="${newId}"]`);
        if (newEl) {
            newEl.classList.add('new-hotspot');
            setTimeout(() => newEl.classList.remove('new-hotspot'), 1500);
        }
    }, 50);
}

function setupDesignDragHandlers() {
    console.log('Setting up design drag handlers...');

    // Add listeners to the hotspotsContainer directly
    hotspotsContainer.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);

    console.log('Design drag handlers set up');
}

function onPointerDown(e) {
    console.log('Pointer down event fired!', e.target);

    if (!designMode) {
        console.log('Not in design mode, ignoring');
        return;
    }

    const handle = e.target.closest('.hotspot-resize');
    const hotspotEl = e.target.closest('.hotspot');

    if (!hotspotEl) {
        console.log('Not on a hotspot');
        return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Capture pointer for reliable tracking
    hotspotEl.setPointerCapture(e.pointerId);

    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(hotspotEl.style.left) || 0;
    startTop = parseInt(hotspotEl.style.top) || 0;
    startWidth = parseInt(hotspotEl.style.width) || 100;
    startHeight = parseInt(hotspotEl.style.height) || 50;

    if (handle) {
        resizeTarget = hotspotEl;
        resizeCorner = handle.dataset.corner;
        console.log('Resize started:', resizeCorner, 'Size:', startWidth, 'x', startHeight);
    } else {
        dragTarget = hotspotEl;
        console.log('Drag started at:', startLeft, startTop);
    }
}

function onPointerMove(e) {
    if (!dragTarget && !resizeTarget) return;

    e.preventDefault();

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (dragTarget) {
        const newLeft = Math.max(0, startLeft + dx);
        const newTop = Math.max(0, startTop + dy);

        dragTarget.style.left = `${newLeft}px`;
        dragTarget.style.top = `${newTop}px`;

        const id = dragTarget.dataset.id;
        const hotspot = hotspots.find(h => h.id === id);
        if (hotspot) {
            hotspot.x = newLeft;
            hotspot.y = newTop;
        }
    }

    if (resizeTarget) {
        let newLeft = startLeft;
        let newTop = startTop;
        let newWidth = startWidth;
        let newHeight = startHeight;

        if (resizeCorner.includes('e')) newWidth = Math.max(30, startWidth + dx);
        if (resizeCorner.includes('w')) {
            newWidth = Math.max(30, startWidth - dx);
            newLeft = startLeft + dx;
        }
        if (resizeCorner.includes('s')) newHeight = Math.max(20, startHeight + dy);
        if (resizeCorner.includes('n')) {
            newHeight = Math.max(20, startHeight - dy);
            newTop = startTop + dy;
        }

        resizeTarget.style.left = `${newLeft}px`;
        resizeTarget.style.top = `${newTop}px`;
        resizeTarget.style.width = `${newWidth}px`;
        resizeTarget.style.height = `${newHeight}px`;

        const id = resizeTarget.dataset.id;
        const hotspot = hotspots.find(h => h.id === id);
        if (hotspot) {
            hotspot.x = newLeft;
            hotspot.y = newTop;
            hotspot.width = newWidth;
            hotspot.height = newHeight;
        }
    }
}

function onPointerUp(e) {
    if (dragTarget) {
        dragTarget.releasePointerCapture?.(e.pointerId);
        console.log('Drag ended:', dragTarget.style.left, dragTarget.style.top);
    }
    if (resizeTarget) {
        resizeTarget.releasePointerCapture?.(e.pointerId);
        console.log('Resize ended:', resizeTarget.style.width, resizeTarget.style.height);
    }
    dragTarget = null;
    resizeTarget = null;
    resizeCorner = null;
}

// Design mode event listeners
btnDesign?.addEventListener('click', enterDesignMode);
btnExitDesign?.addEventListener('click', exitDesignMode);
btnSaveDesign?.addEventListener('click', saveDesign);
btnAddText?.addEventListener('click', () => addHotspot('text'));
btnAddImage?.addEventListener('click', () => addHotspot('image'));
btnAddVideo?.addEventListener('click', () => addHotspot('video'));

// Make design panel draggable by its header
(function() {
    const header = document.querySelector('.design-header');
    if (!header || !designPanel) return;
    let dragging = false, dx = 0, dy = 0;
    header.style.cursor = 'grab';
    header.addEventListener('pointerdown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        dragging = true;
        header.style.cursor = 'grabbing';
        const rect = designPanel.getBoundingClientRect();
        dx = e.clientX - rect.left;
        dy = e.clientY - rect.top;
        header.setPointerCapture(e.pointerId);
        e.preventDefault();
    });
    header.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        designPanel.style.left = `${e.clientX - dx}px`;
        designPanel.style.top = `${e.clientY - dy}px`;
        designPanel.style.right = 'auto';
    });
    header.addEventListener('pointerup', () => {
        dragging = false;
        header.style.cursor = 'grab';
    });
})();

// ============================================
// START APPLICATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    init().then(() => {
        setupDesignDragHandlers();

        // Show design button only on localhost
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            const designBtn = document.getElementById('btn-design');
            if (designBtn) designBtn.style.display = '';
        }
    });
});
