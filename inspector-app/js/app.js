// ===========================
// ViewNam Inspector App — Main JS
// ===========================

(function() {
    'use strict';

    // --- State ---
    let state = {
        currentScreen: 'screenStart',
        currentSection: 0,
        booking: {},
        ratings: {},      // { itemId: 'good'|'fair'|'poor'|'na' }
        notes: {},        // { itemId: 'note text' }
        photos: {},       // { itemId: ['dataurl', ...] }
        sectionNotes: {}, // { sectionId: 'note text' }
        sectionPhotos: {},// { sectionId: ['dataurl', ...] }
        summary: {},
        startedAt: null,
        savedId: null,
    };

    // --- DOM refs ---
    const $ = id => document.getElementById(id);
    const app = $('app');
    const toast = $('toast');
    const progressCount = $('progressCount');
    const progressTotal = $('progressTotal');
    const progressPill = $('progressPill');
    const backBtn = $('backBtn');
    const saveBtn = $('saveBtn');

    // --- Screens ---
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        $(screenId).classList.add('active');
        state.currentScreen = screenId;

        backBtn.style.display = (screenId === 'screenStart') ? 'none' : '';
        progressPill.style.display = (screenId === 'screenChecklist' || screenId === 'screenSummary') ? '' : 'none';

        // Scroll to top
        $(screenId).scrollTop = 0;
    }

    // --- Navigation ---
    backBtn.addEventListener('click', () => {
        if (state.currentScreen === 'screenBooking') showScreen('screenStart');
        else if (state.currentScreen === 'screenChecklist') showScreen('screenBooking');
        else if (state.currentScreen === 'screenSummary') {
            showScreen('screenChecklist');
            renderChecklist();
        }
    });

    // --- Start Screen ---
    $('newInspectionBtn').addEventListener('click', () => {
        state = {
            currentScreen: 'screenBooking',
            currentSection: 0,
            booking: {},
            ratings: {},
            notes: {},
            photos: {},
            sectionNotes: {},
            sectionPhotos: {},
            summary: {},
            startedAt: new Date().toISOString(),
            savedId: null,
        };
        showScreen('screenBooking');
    });

    // Load saved inspections on start
    function loadSavedList() {
        const saved = getSavedInspections();
        const list = $('savedList');
        const items = $('savedItems');
        items.innerHTML = '';

        if (saved.length === 0) {
            list.style.display = 'none';
            return;
        }

        list.style.display = 'block';
        saved.forEach(s => {
            const el = document.createElement('div');
            el.className = 'saved-item';
            const vehicle = s.booking ? `${s.booking.vYear || ''} ${s.booking.vMake || ''} ${s.booking.vModel || ''}`.trim() : 'Unknown';
            const rated = Object.keys(s.ratings || {}).length;
            const total = getTotalItems();
            const date = s.startedAt ? new Date(s.startedAt).toLocaleDateString() : '';
            el.innerHTML = `
                <div class="saved-item-info">
                    <strong>${vehicle || 'New Inspection'}</strong>
                    <span>${s.booking?.refNumber || 'No ref'} — ${rated}/${total} checked — ${date}</span>
                </div>
                <div class="saved-item-actions">
                    <button class="saved-item-delete" data-id="${s.savedId}" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            `;
            el.addEventListener('click', (e) => {
                if (e.target.closest('.saved-item-delete')) {
                    e.stopPropagation();
                    deleteSaved(s.savedId);
                    loadSavedList();
                    showToast('Inspection deleted');
                    return;
                }
                loadInspection(s);
                showScreen('screenBooking');
            });
            items.appendChild(el);
        });
    }

    // --- Booking Screen ---
    $('startChecklistBtn').addEventListener('click', () => {
        // Preserve any pre-filled URL params (location, client notes, etc) on state.booking
        const existingBooking = state.booking || {};
        // Collect booking data
        state.booking = {
            ...existingBooking,
            refNumber: $('refNumber').value,
            inspectorName: $('inspectorName').value,
            inspectorRegion: $('inspectorRegion').value,
            services: Array.from(document.querySelectorAll('[name="svc"]:checked')).map(c => c.value),
            vMake: $('vMake').value,
            vModel: $('vModel').value,
            vYear: $('vYear').value,
            vColour: $('vColour').value,
            vReg: $('vReg').value,
            vOdo: $('vOdo').value,
            vVin: $('vVin').value,
            vFuel: $('vFuel').value,
            vTrans: $('vTrans').value,
            sellerName: $('sellerName').value,
            sellerPhone: $('sellerPhone').value,
        };

        state.currentSection = 0;
        updateProgress();
        showScreen('screenChecklist');
        renderChecklist();
        autoSave();
    });

    // Safely set value on an element if it exists
    function setVal(id, value) {
        const el = $(id);
        if (el) el.value = value || '';
    }

    // Populate booking fields from state
    function populateBookingFields() {
        const b = state.booking;
        if (!b) return;
        setVal('refNumber', b.refNumber);
        setVal('inspectorName', b.inspectorName);
        setVal('inspectorRegion', b.inspectorRegion);
        setVal('vMake', b.vMake);
        setVal('vModel', b.vModel);
        setVal('vYear', b.vYear);
        setVal('vColour', b.vColour);
        setVal('vReg', b.vReg);
        setVal('vOdo', b.vOdo);
        setVal('vVin', b.vVin);
        setVal('vFuel', b.vFuel);
        setVal('vTrans', b.vTrans);
        setVal('sellerName', b.sellerName);
        setVal('sellerPhone', b.sellerPhone);

        // Services checkboxes
        document.querySelectorAll('[name="svc"]').forEach(cb => {
            cb.checked = (b.services || []).includes(cb.value);
        });
    }

    // --- Checklist Rendering ---
    // Maps booking service values (from landing page/admin) to checklist section service keys
    const SERVICE_MAP = {
        'full-package': 'full',
        'visual-inspection': 'visual',
        'mechanical-diagnostics': 'mechanical',
        'test-drive': 'testdrive',
        // legacy short codes (back-compat)
        'full': 'full',
        'visual': 'visual',
        'mechanical': 'mechanical',
        'testdrive': 'testdrive',
    };

    function getActiveSections() {
        const raw = state.booking.services || ['full'];
        const svcs = raw.map(s => SERVICE_MAP[s] || s);
        if (svcs.includes('full')) return CHECKLIST_SECTIONS;
        return CHECKLIST_SECTIONS.filter(s => s.service.some(svc => svcs.includes(svc)));
    }

    function getTotalItems() {
        let count = 0;
        CHECKLIST_SECTIONS.forEach(s => s.groups.forEach(g => count += g.items.length));
        return count;
    }

    function renderSectionTabs() {
        const tabs = $('sectionTabs');
        const sections = getActiveSections();
        tabs.innerHTML = '';

        sections.forEach((section, i) => {
            const tab = document.createElement('button');
            tab.className = 'section-tab' + (i === state.currentSection ? ' active' : '');

            // Check if section is completed
            const allItems = section.groups.flatMap(g => g.items);
            const rated = allItems.filter(item => state.ratings[item.id]).length;
            if (rated === allItems.length && allItems.length > 0) {
                tab.classList.add('completed');
            }

            tab.textContent = section.shortTitle;
            tab.addEventListener('click', () => {
                saveSectionNotes();
                state.currentSection = i;
                renderChecklist();
            });
            tabs.appendChild(tab);
        });

        // Scroll active tab into view
        const activeTab = tabs.querySelector('.active');
        if (activeTab) {
            activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }

    function renderChecklist() {
        const sections = getActiveSections();
        const section = sections[state.currentSection];
        if (!section) return;

        renderSectionTabs();
        const container = $('checklistContainer');
        container.innerHTML = '';

        section.groups.forEach(group => {
            // Sub-header
            const subHeader = document.createElement('div');
            subHeader.className = 'check-subheader';
            subHeader.textContent = group.title;
            container.appendChild(subHeader);

            // Items
            group.items.forEach(item => {
                container.appendChild(createCheckItem(item));
            });
        });

        // Section notes
        $('sectionNotes').value = state.sectionNotes[section.id] || '';

        // Section photos
        renderSectionPhotos(section.id);

        // Nav buttons
        $('prevSectionBtn').style.visibility = state.currentSection > 0 ? 'visible' : 'hidden';
        const isLast = state.currentSection === sections.length - 1;
        $('nextSectionBtn').textContent = isLast ? 'Finish' : 'Next';
        $('nextSectionBtn').innerHTML = isLast
            ? 'Finish <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
            : 'Next <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>';

        updateProgress();
    }

    function createCheckItem(item) {
        const el = document.createElement('div');
        el.className = 'check-item';
        const currentRating = state.ratings[item.id] || '';
        if (currentRating) el.classList.add('rated-' + currentRating);

        const hasNote = !!state.notes[item.id];
        const hasPhotos = (state.photos[item.id] || []).length > 0;

        el.innerHTML = `
            <div class="check-item-header">
                <div>
                    <div class="check-item-title">${item.name}</div>
                    <div class="check-item-desc">${item.desc}</div>
                </div>
                <div class="rating-btns">
                    <button class="rating-btn ${currentRating === 'good' ? 'selected-good' : ''}" data-rating="good">G</button>
                    <button class="rating-btn ${currentRating === 'fair' ? 'selected-fair' : ''}" data-rating="fair">F</button>
                    <button class="rating-btn ${currentRating === 'poor' ? 'selected-poor' : ''}" data-rating="poor">P</button>
                    <button class="rating-btn ${currentRating === 'na' ? 'selected-na' : ''}" data-rating="na">N/A</button>
                </div>
            </div>
            <div class="check-item-extras">
                <div class="item-actions">
                    <button class="item-action-btn note-toggle ${hasNote ? 'has-content' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        Note
                    </button>
                    <label class="item-action-btn photo-btn ${hasPhotos ? 'has-content' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="3"/></svg>
                        Photo
                        <input type="file" accept="image/*" capture="environment" style="display:none;" class="item-photo-input">
                    </label>
                </div>
                <textarea class="item-note-input ${hasNote ? 'visible' : ''}" placeholder="Type your note..." rows="2">${state.notes[item.id] || ''}</textarea>
                <div class="item-photos">${renderItemPhotos(item.id)}</div>
            </div>
        `;

        // Rating buttons
        el.querySelectorAll('.rating-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const rating = btn.dataset.rating;
                // Toggle off if same rating clicked
                if (state.ratings[item.id] === rating) {
                    delete state.ratings[item.id];
                } else {
                    state.ratings[item.id] = rating;
                }

                // Update UI
                el.className = 'check-item';
                if (state.ratings[item.id]) el.classList.add('rated-' + state.ratings[item.id]);
                el.querySelectorAll('.rating-btn').forEach(b => {
                    b.className = 'rating-btn';
                    if (b.dataset.rating === state.ratings[item.id]) {
                        b.classList.add('selected-' + state.ratings[item.id]);
                    }
                });

                updateProgress();
                renderSectionTabs();
                autoSave();
            });
        });

        // Note toggle
        const noteToggle = el.querySelector('.note-toggle');
        const noteInput = el.querySelector('.item-note-input');
        noteToggle.addEventListener('click', () => {
            noteInput.classList.toggle('visible');
            if (noteInput.classList.contains('visible')) {
                noteInput.focus();
            }
        });
        noteInput.addEventListener('input', () => {
            state.notes[item.id] = noteInput.value;
            noteToggle.classList.toggle('has-content', !!noteInput.value);
        });
        noteInput.addEventListener('blur', () => autoSave());

        // Photo capture
        const photoInput = el.querySelector('.item-photo-input');
        photoInput.addEventListener('change', (e) => {
            handlePhotoCapture(e, item.id, el);
        });

        return el;
    }

    function renderItemPhotos(itemId) {
        const photos = state.photos[itemId] || [];
        if (!photos.length) return '';
        return photos.map((src, i) => `
            <div class="item-photo-wrap">
                <img src="${src}" class="item-photo-thumb" alt="Photo ${i+1}">
                <button class="item-photo-remove" data-item="${itemId}" data-index="${i}">&times;</button>
            </div>
        `).join('');
    }

    function handlePhotoCapture(e, itemId, el) {
        const file = e.target.files[0];
        if (!file) return;

        // Resize image for storage
        resizeImage(file, 800, (dataUrl) => {
            if (!state.photos[itemId]) state.photos[itemId] = [];
            state.photos[itemId].push(dataUrl);

            const photosDiv = el.querySelector('.item-photos');
            photosDiv.innerHTML = renderItemPhotos(itemId);

            // Add remove handlers
            photosDiv.querySelectorAll('.item-photo-remove').forEach(btn => {
                btn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    const idx = parseInt(btn.dataset.index);
                    state.photos[itemId].splice(idx, 1);
                    photosDiv.innerHTML = renderItemPhotos(itemId);
                    bindPhotoRemove(photosDiv, itemId);

                    el.querySelector('.photo-btn').classList.toggle('has-content', state.photos[itemId].length > 0);
                    autoSave();
                });
            });

            el.querySelector('.photo-btn').classList.add('has-content');
            autoSave();
            showToast('Photo added');
        });

        // Reset input so same file can be re-selected
        e.target.value = '';
    }

    function bindPhotoRemove(container, itemId) {
        container.querySelectorAll('.item-photo-remove').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                const idx = parseInt(btn.dataset.index);
                state.photos[itemId].splice(idx, 1);
                container.innerHTML = renderItemPhotos(itemId);
                bindPhotoRemove(container, itemId);
                autoSave();
            });
        });
    }

    // Resize image to max width for localStorage
    function resizeImage(file, maxWidth, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > maxWidth) {
                    h = (maxWidth / w) * h;
                    w = maxWidth;
                }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                callback(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // --- Section Notes & Photos ---
    function saveSectionNotes() {
        const sections = getActiveSections();
        const section = sections[state.currentSection];
        if (section) {
            state.sectionNotes[section.id] = $('sectionNotes').value;
        }
    }

    // Section photo capture
    document.querySelector('.section-photo-input').addEventListener('change', (e) => {
        const sections = getActiveSections();
        const section = sections[state.currentSection];
        if (!section) return;
        const file = e.target.files[0];
        if (!file) return;

        resizeImage(file, 800, (dataUrl) => {
            if (!state.sectionPhotos[section.id]) state.sectionPhotos[section.id] = [];
            state.sectionPhotos[section.id].push(dataUrl);
            renderSectionPhotos(section.id);
            autoSave();
            showToast('Photo added');
        });
        e.target.value = '';
    });

    function renderSectionPhotos(sectionId) {
        const container = $('sectionPhotos');
        const photos = state.sectionPhotos[sectionId] || [];
        container.innerHTML = photos.map((src, i) => `
            <div class="item-photo-wrap">
                <img src="${src}" class="item-photo-thumb" alt="Section photo ${i+1}">
                <button class="item-photo-remove" data-section="${sectionId}" data-index="${i}">&times;</button>
            </div>
        `).join('');

        container.querySelectorAll('.item-photo-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                state.sectionPhotos[sectionId].splice(idx, 1);
                renderSectionPhotos(sectionId);
                autoSave();
            });
        });
    }

    // --- Navigation between sections ---
    $('prevSectionBtn').addEventListener('click', () => {
        saveSectionNotes();
        if (state.currentSection > 0) {
            state.currentSection--;
            renderChecklist();
            $('screenChecklist').scrollTop = 0;
        }
    });

    $('nextSectionBtn').addEventListener('click', () => {
        saveSectionNotes();
        const sections = getActiveSections();
        if (state.currentSection < sections.length - 1) {
            state.currentSection++;
            renderChecklist();
            $('screenChecklist').scrollTop = 0;
        } else {
            // Last section — go to summary
            autoSave();
            showSummary();
        }
    });

    // --- Progress ---
    function updateProgress() {
        const sections = getActiveSections();
        let total = 0, rated = 0;
        sections.forEach(s => s.groups.forEach(g => {
            g.items.forEach(item => {
                total++;
                if (state.ratings[item.id]) rated++;
            });
        }));
        progressCount.textContent = rated;
        progressTotal.textContent = total;
    }

    // --- Summary ---
    function showSummary() {
        showScreen('screenSummary');

        // Calculate stats
        const sections = getActiveSections();
        let good = 0, fair = 0, poor = 0, na = 0;
        sections.forEach(s => s.groups.forEach(g => {
            g.items.forEach(item => {
                const r = state.ratings[item.id];
                if (r === 'good') good++;
                else if (r === 'fair') fair++;
                else if (r === 'poor') poor++;
                else na++;
            });
        }));

        $('summaryStats').innerHTML = `
            <div class="summary-stat"><div class="summary-stat-num good">${good}</div><div class="summary-stat-label">Good</div></div>
            <div class="summary-stat"><div class="summary-stat-num fair">${fair}</div><div class="summary-stat-label">Fair</div></div>
            <div class="summary-stat"><div class="summary-stat-num poor">${poor}</div><div class="summary-stat-label">Poor</div></div>
            <div class="summary-stat"><div class="summary-stat-num na">${na}</div><div class="summary-stat-label">N/A</div></div>
        `;

        // Restore summary fields
        if (state.summary.score) $('overallScore').value = state.summary.score;
        $('scoreDisplay').textContent = $('overallScore').value;
        if (state.summary.recommendation) {
            const radio = document.querySelector(`[name="recommendation"][value="${state.summary.recommendation}"]`);
            if (radio) radio.checked = true;
        }
        $('keyIssues').value = state.summary.keyIssues || '';
        $('repairCosts').value = state.summary.repairCosts || '';
        $('buyerAdvice').value = state.summary.buyerAdvice || '';

        // Auto-populate key issues from poor ratings
        if (!state.summary.keyIssues) {
            const poorItems = [];
            sections.forEach(s => s.groups.forEach(g => {
                g.items.forEach(item => {
                    if (state.ratings[item.id] === 'poor') {
                        poorItems.push(`- ${item.name}: ${state.notes[item.id] || item.desc}`);
                    }
                });
            }));
            if (poorItems.length) {
                $('keyIssues').value = poorItems.join('\n');
            }
        }
    }

    // Score slider
    $('overallScore').addEventListener('input', () => {
        $('scoreDisplay').textContent = $('overallScore').value;
    });

    // --- Save Summary ---
    function saveSummary() {
        state.summary = {
            score: $('overallScore').value,
            recommendation: document.querySelector('[name="recommendation"]:checked')?.value || '',
            keyIssues: $('keyIssues').value,
            repairCosts: $('repairCosts').value,
            buyerAdvice: $('buyerAdvice').value,
        };
    }

    // --- Generate Report ---
    $('generateReportBtn').addEventListener('click', () => {
        saveSummary();
        autoSave();
        generateHTMLReport();
    });

    function generateHTMLReport() {
        const b = state.booking;
        const sections = getActiveSections();
        const recLabels = { 'recommended': 'RECOMMENDED — Good buy', 'caution': 'PROCEED WITH CAUTION', 'not-recommended': 'NOT RECOMMENDED — Walk away' };

        let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>ViewNam Report — ${b.refNumber || ''}</title>
        <style>
            *{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;color:#1a1a2e;line-height:1.5;padding:16px;max-width:800px;margin:0 auto}
            h1{font-size:1.3rem;color:#0B3D2E}h2{font-size:1rem;color:#0B3D2E;margin:20px 0 10px;padding-bottom:6px;border-bottom:2px solid #0B3D2E}
            h3{font-size:0.85rem;color:#5a5a6e;margin:12px 0 6px;text-transform:uppercase;letter-spacing:0.5px}
            .logo{font-size:1.5rem;font-weight:800;text-align:center;margin-bottom:4px}.lv{color:#0B3D2E}.ln{color:#D4A843}
            .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-bottom:12px;font-size:0.85rem}
            .info-grid dt{color:#5a5a6e;font-weight:600}.info-grid dd{margin-bottom:4px}
            table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:0.85rem}
            th{background:#f5f6fa;padding:6px 8px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#5a5a6e}
            td{padding:6px 8px;border-bottom:1px solid #e2e8f0}
            .g{color:#27AE60;font-weight:700}.f{color:#F39C12;font-weight:700}.p{color:#E74C3C;font-weight:700}.n{color:#95A5A6}
            .rec{padding:12px;border-radius:8px;text-align:center;font-weight:700;font-size:1.1rem;margin:12px 0}
            .rec-good{background:#E8F8EF;color:#27AE60;border:2px solid #27AE60}
            .rec-caution{background:#FEF5E7;color:#F39C12;border:2px solid #F39C12}
            .rec-avoid{background:#FDEDEC;color:#E74C3C;border:2px solid #E74C3C}
            .score{font-size:2.5rem;font-weight:800;color:#0B3D2E;text-align:center}
            .notes{background:#f5f6fa;padding:10px 12px;border-radius:6px;margin:6px 0;font-size:0.85rem;white-space:pre-wrap}
            .photo-grid{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
            .photo-grid img{width:120px;height:90px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0}
            .disclaimer{margin-top:20px;padding:12px;background:#f5f6fa;border-radius:6px;font-size:0.75rem;color:#5a5a6e}
            @media print{body{padding:0;font-size:10px}img{max-height:80px}}
        </style></head><body>
        <div class="logo"><span class="lv">View</span><span class="ln">Nam</span></div>
        <p style="text-align:center;color:#5a5a6e;font-size:0.85rem;margin-bottom:16px">Vehicle Inspection Report</p>
        <h1>${b.vYear || ''} ${b.vMake || ''} ${b.vModel || ''}</h1>
        <p style="font-size:0.85rem;color:#5a5a6e">Ref: ${b.refNumber || 'N/A'} | Date: ${new Date().toLocaleDateString()}</p>

        <h2>Vehicle Details</h2>
        <dl class="info-grid">
            <dt>Make / Model</dt><dd>${b.vMake || ''} ${b.vModel || ''}</dd>
            <dt>Year</dt><dd>${b.vYear || ''}</dd>
            <dt>Colour</dt><dd>${b.vColour || ''}</dd>
            <dt>Registration</dt><dd>${b.vReg || ''}</dd>
            <dt>VIN</dt><dd>${b.vVin || ''}</dd>
            <dt>Odometer</dt><dd>${b.vOdo || ''} km</dd>
            <dt>Fuel</dt><dd>${b.vFuel || ''}</dd>
            <dt>Transmission</dt><dd>${b.vTrans || ''}</dd>
        </dl>

        <h2>Inspection Details</h2>
        <dl class="info-grid">
            <dt>Inspector</dt><dd>${b.inspectorName || ''}</dd>
            <dt>Region</dt><dd>${b.inspectorRegion || ''}</dd>
            <dt>Vehicle Location</dt><dd>${b.sellerLocation || ''}</dd>
        </dl>`;

        // Score + Recommendation
        const score = state.summary.score || '—';
        const rec = state.summary.recommendation || '';
        const recClass = rec === 'recommended' ? 'rec-good' : rec === 'caution' ? 'rec-caution' : 'rec-avoid';
        html += `<h2>Overall Result</h2>
        <div class="score">${score} / 10</div>
        <div class="rec ${recClass}">${recLabels[rec] || 'No recommendation given'}</div>`;

        if (state.summary.keyIssues) {
            html += `<h3>Key Issues</h3><div class="notes">${escapeHtml(state.summary.keyIssues)}</div>`;
        }
        if (state.summary.repairCosts) {
            html += `<h3>Estimated Repair Costs</h3><div class="notes">${escapeHtml(state.summary.repairCosts)}</div>`;
        }
        if (state.summary.buyerAdvice) {
            html += `<h3>Inspector's Advice</h3><div class="notes">${escapeHtml(state.summary.buyerAdvice)}</div>`;
        }

        // Detailed results by section
        sections.forEach(section => {
            html += `<h2>${section.title}</h2>`;
            section.groups.forEach(group => {
                html += `<h3>${group.title}</h3><table><tr><th>Item</th><th>Rating</th><th>Notes</th></tr>`;
                group.items.forEach(item => {
                    const r = state.ratings[item.id] || '';
                    const rClass = r === 'good' ? 'g' : r === 'fair' ? 'f' : r === 'poor' ? 'p' : 'n';
                    const rLabel = r === 'good' ? 'Good' : r === 'fair' ? 'Fair' : r === 'poor' ? 'Poor' : r === 'na' ? 'N/A' : '—';
                    const note = state.notes[item.id] || '';
                    html += `<tr><td>${item.name}</td><td class="${rClass}">${rLabel}</td><td>${escapeHtml(note)}</td></tr>`;
                });
                html += `</table>`;
            });

            // Section notes
            if (state.sectionNotes[section.id]) {
                html += `<div class="notes">${escapeHtml(state.sectionNotes[section.id])}</div>`;
            }

            // Section photos
            const sPhotos = state.sectionPhotos[section.id] || [];
            if (sPhotos.length) {
                html += `<div class="photo-grid">${sPhotos.map(s => `<img src="${s}">`).join('')}</div>`;
            }

            // Item photos
            section.groups.forEach(group => {
                group.items.forEach(item => {
                    const photos = state.photos[item.id] || [];
                    if (photos.length) {
                        html += `<p style="font-size:0.8rem;color:#5a5a6e;margin-top:8px">${item.name} photos:</p>`;
                        html += `<div class="photo-grid">${photos.map(s => `<img src="${s}">`).join('')}</div>`;
                    }
                });
            });
        });

        html += `<div class="disclaimer"><strong>Disclaimer:</strong> This report is an advisory assessment based on examination at the time of inspection. It does not constitute a warranty or guarantee. Some defects may not be detectable during a single inspection. The purchase decision remains with the buyer. ViewNam accepts no liability for unidentified issues.</div>`;
        html += `<p style="text-align:center;color:#95A5A6;font-size:0.75rem;margin-top:16px">&copy; ${new Date().getFullYear()} ViewNam. Confidential.</p>`;
        html += `</body></html>`;

        // Open in new tab
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        showToast('Report generated');
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Submit report to ViewNam admin dashboard (Supabase) ---
    $('shareWhatsAppBtn').addEventListener('click', async () => {
        saveSummary();
        autoSave();

        const btn = $('shareWhatsAppBtn');
        const originalHTML = btn.innerHTML;

        if (typeof supabase === 'undefined' || !supabase) {
            showToast('Cannot send — no internet connection. Try again later.');
            return;
        }

        const b = state.booking;
        if (!b.refNumber) {
            showToast('Missing booking reference — cannot submit.');
            return;
        }

        // Count ratings
        const sections = getActiveSections();
        let good = 0, fair = 0, poor = 0, na = 0;
        const poorItems = [];
        sections.forEach(s => s.groups.forEach(g => {
            g.items.forEach(item => {
                const r = state.ratings[item.id];
                if (r === 'good') good++;
                else if (r === 'fair') fair++;
                else if (r === 'poor') { poor++; poorItems.push(item.name); }
                else if (r === 'na') na++;
            });
        }));

        btn.disabled = true;
        btn.innerHTML = 'Sending...';
        btn.style.opacity = '0.7';

        try {
            // Find booking by reference to get its ID
            const { data: bookingRow, error: lookupErr } = await supabase
                .from('bookings')
                .select('id')
                .eq('reference', b.refNumber)
                .maybeSingle();

            if (lookupErr || !bookingRow) {
                console.error('Booking lookup failed:', lookupErr);
                showToast('Booking not found on server. Report not sent.');
                btn.disabled = false;
                btn.innerHTML = originalHTML;
                btn.style.opacity = '';
                return;
            }

            const reportPayload = {
                booking_id: bookingRow.id,
                score: state.summary.score ? Number(state.summary.score) : null,
                recommendation: state.summary.recommendation || null,
                key_issues: state.summary.keyIssues || null,
                repair_costs: state.summary.repairCosts || null,
                buyer_advice: state.summary.buyerAdvice || null,
                stats: { good, fair, poor, na, poor_items: poorItems },
                full_data: {
                    booking: b,
                    ratings: state.ratings,
                    notes: state.notes,
                    sectionNotes: state.sectionNotes,
                    summary: state.summary,
                    // photos excluded from full_data to avoid oversized JSON; they stay in localStorage
                },
            };

            // Upsert on booking_id so re-submits overwrite
            const { error: reportErr } = await supabase
                .from('reports')
                .upsert(reportPayload, { onConflict: 'booking_id' });

            if (reportErr) {
                console.error('Report submit failed:', reportErr);
                showToast('Could not send report. Saved locally — try again.');
                btn.disabled = false;
                btn.innerHTML = originalHTML;
                btn.style.opacity = '';
                return;
            }

            // Mark booking completed
            await supabase
                .from('bookings')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', bookingRow.id);

            btn.innerHTML = 'Sent to ViewNam';
            btn.style.background = '#27AE60';
            showToast('Report sent to ViewNam admin');
        } catch (e) {
            console.error('Report send error:', e);
            showToast('Could not send report. Try again.');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            btn.style.opacity = '';
        }
    });

    // --- Save / Load (localStorage) ---
    const STORAGE_KEY = 'viewnam_inspections';

    function getSavedInspections() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch { return []; }
    }

    function autoSave() {
        if (!state.startedAt) return;
        if (!state.savedId) state.savedId = 'insp_' + Date.now();

        const saved = getSavedInspections();
        const idx = saved.findIndex(s => s.savedId === state.savedId);
        const data = {
            savedId: state.savedId,
            startedAt: state.startedAt,
            booking: state.booking,
            ratings: state.ratings,
            notes: state.notes,
            photos: state.photos,
            sectionNotes: state.sectionNotes,
            sectionPhotos: state.sectionPhotos,
            summary: state.summary,
        };

        if (idx >= 0) saved[idx] = data;
        else saved.unshift(data);

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        } catch (e) {
            // Storage full — try saving without photos
            data.photos = {};
            data.sectionPhotos = {};
            if (idx >= 0) saved[idx] = data;
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
                showToast('Saved (photos excluded — storage full)');
            } catch {
                showToast('Could not save — storage full');
            }
        }
    }

    saveBtn.addEventListener('click', () => {
        saveSectionNotes();
        saveSummary();
        autoSave();
        showToast('Progress saved');
    });

    // Periodic auto-save every 30 seconds as a safety net
    setInterval(() => {
        if (state.startedAt) {
            saveSectionNotes();
            saveSummary();
            autoSave();
        }
    }, 30000);

    // Save before user leaves the page
    window.addEventListener('beforeunload', () => {
        if (state.startedAt) {
            saveSectionNotes();
            saveSummary();
            autoSave();
        }
    });

    function loadInspection(data) {
        state = {
            currentScreen: 'screenBooking',
            currentSection: 0,
            booking: data.booking || {},
            ratings: data.ratings || {},
            notes: data.notes || {},
            photos: data.photos || {},
            sectionNotes: data.sectionNotes || {},
            sectionPhotos: data.sectionPhotos || {},
            summary: data.summary || {},
            startedAt: data.startedAt,
            savedId: data.savedId,
        };
        populateBookingFields();
    }

    function deleteSaved(id) {
        const saved = getSavedInspections().filter(s => s.savedId !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    }

    // --- Toast ---
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    // --- Init ---
    loadSavedList();
    progressPill.style.display = 'none';

    // --- Auto-fill from URL params (when opened from inspector dashboard) ---
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ref')) {
        const servicesParam = urlParams.get('services') || '';
        const servicesList = servicesParam ? servicesParam.split(',').filter(Boolean) : [];

        // Pre-fill and go straight to booking screen
        state.booking = {
            refNumber: urlParams.get('ref') || '',
            vMake: urlParams.get('make') || '',
            vModel: urlParams.get('model') || '',
            vYear: urlParams.get('year') || '',
            sellerLocation: urlParams.get('location') || '',
            sellerPhone: urlParams.get('seller') || '',
            askingPrice: urlParams.get('asking') || '',
            clientNotes: urlParams.get('notes') || '',
            services: servicesList,
        };
        state.startedAt = new Date().toISOString();

        $('refNumber').value = state.booking.refNumber;
        $('vMake').value = state.booking.vMake;
        $('vModel').value = state.booking.vModel;
        $('vYear').value = state.booking.vYear;

        // Seller (inspector needs this to contact seller)
        if ($('sellerName') && state.booking.sellerLocation) {
            // Location in seller name field as descriptor
        }
        if ($('sellerPhone')) $('sellerPhone').value = state.booking.sellerPhone;

        // Pre-select services based on what client booked — and lock them (inspector cannot change)
        document.querySelectorAll('input[name="svc"]').forEach(cb => {
            cb.checked = servicesList.includes(cb.value);
            cb.disabled = true;
            const chip = cb.closest('.chip');
            if (chip) {
                chip.style.pointerEvents = 'none';
                chip.style.opacity = cb.checked ? '1' : '0.45';
            }
        });

        // Show client notes if any (as a read-only notice)
        if (state.booking.clientNotes) {
            const notesEl = document.createElement('div');
            notesEl.className = 'info-card';
            notesEl.style.cssText = 'background:var(--secondary-light);border-left:3px solid var(--secondary);color:var(--text)';
            notesEl.innerHTML = `
                <h3 style="color:var(--secondary-dark)">Client Notes</h3>
                <p>${state.booking.clientNotes}</p>
            `;
            const bookingScreen = $('screenBooking').querySelector('.screen-content');
            bookingScreen.insertBefore(notesEl, bookingScreen.children[2]);
        }

        // Show location as info note (inspector needs to know where to go)
        if (state.booking.sellerLocation || state.booking.askingPrice) {
            const locEl = document.createElement('div');
            locEl.className = 'info-card';
            locEl.style.cssText = 'background:var(--primary-light);border-left:3px solid var(--primary);color:var(--text)';
            locEl.innerHTML = `
                <h3 style="color:var(--primary)">Job Info</h3>
                ${state.booking.sellerLocation ? `<p><strong>Location:</strong> ${state.booking.sellerLocation}</p>` : ''}
                ${state.booking.sellerPhone ? `<p><strong>Seller contact:</strong> ${state.booking.sellerPhone}</p>` : ''}
                ${state.booking.askingPrice ? `<p><strong>Asking price:</strong> N$${state.booking.askingPrice}</p>` : ''}
            `;
            const bookingScreen = $('screenBooking').querySelector('.screen-content');
            bookingScreen.insertBefore(locEl, bookingScreen.children[2]);
        }

        showScreen('screenBooking');
    }

})();
