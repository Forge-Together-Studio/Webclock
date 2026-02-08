/**
 * Care Home Rating Tool - Main Application
 *
 * Queries the CMS Provider Data Catalog API for nursing home
 * provider information and displays star ratings with AI recommendations.
 */

(() => {
    'use strict';

    // ── Configuration ──

    // When running via server.js, route through the local proxy to avoid CORS.
    // When hosted on a server that can reach CMS directly, use the direct URL.
    const CMS_PATH = '/data-api/v1/dataset/d65b8be0-946e-410b-ab06-01829628d5a1/data';
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const API_BASE = isLocal ? `/api${CMS_PATH}` : `https://data.cms.gov${CMS_PATH}`;
    const PAGE_SIZE = 20;

    // Mapping of possible API field names to our internal names.
    // CMS DKAN API may return fields as Title Case with spaces, lowercase with
    // underscores, or other variants depending on the API version.
    const FIELD_MAP = {
        providerName: ['Provider Name', 'provider_name', 'provider name', 'provname'],
        providerCity: ['Provider City', 'provider_city', 'provider city', 'city'],
        providerState: ['Provider State', 'provider_state', 'provider state', 'state'],
        providerZip: ['Provider Zip Code', 'provider_zip_code', 'provider zip code', 'zip', 'zip_code'],
        providerAddress: ['Provider Address', 'provider_address', 'provider address', 'address'],
        providerPhone: ['Provider Phone Number', 'provider_phone_number', 'provider phone number', 'phone_number', 'phone'],
        providerCounty: ['Provider County Name', 'provider_county_name', 'provider county name', 'county_name', 'county'],
        federalNumber: ['Federal Provider Number', 'federal_provider_number', 'federal provider number', 'ccn', 'provider_number'],
        overallRating: ['Overall Rating', 'overall_rating', 'overall rating'],
        healthRating: ['Health Inspection Rating', 'health_inspection_rating', 'health inspection rating'],
        staffingRating: ['Staffing Rating', 'staffing_rating', 'staffing rating'],
        qmRating: ['QM Rating', 'qm_rating', 'qm rating', 'Quality Measure Five Star Rating', 'quality_measure_five_star_rating'],
        beds: ['Number of Certified Beds', 'number_of_certified_beds', 'number of certified beds', 'certified_beds'],
        residents: ['Number of Residents in Certified Beds', 'number_of_residents_in_certified_beds', 'Average Number of Residents per Day', 'average_number_of_residents_per_day'],
        ownershipType: ['Ownership Type', 'ownership_type', 'ownership type'],
        numDeficiencies: ['Number of Health Deficiencies', 'number_of_health_deficiencies', 'Total Number of Health Deficiencies', 'total_number_of_health_deficiencies'],
        numComplaints: ['Number of Substantiated Complaints', 'number_of_substantiated_complaints', 'number of substantiated complaints'],
        numFines: ['Number of Fines', 'number_of_fines', 'number of fines'],
        totalFines: ['Total Amount of Fines in Dollars', 'total_amount_of_fines_in_dollars', 'total amount of fines in dollars'],
        numPenalties: ['Total Number of Penalties', 'total_number_of_penalties', 'total number of penalties'],
        totalNurseHours: ['Reported Total Nurse Staffing Hours per Resident per Day', 'reported_total_nurse_staffing_hours_per_resident_per_day', 'total nurse staffing hours per resident per day'],
        rnHours: ['Reported RN Staffing Hours per Resident per Day', 'reported_rn_staffing_hours_per_resident_per_day', 'rn staffing hours per resident per day'],
        lnpHours: ['Reported LPN Staffing Hours per Resident per Day', 'reported_lpn_staffing_hours_per_resident_per_day', 'lpn staffing hours per resident per day'],
        cnaHours: ['Reported Nurse Aide Staffing Hours per Resident per Day', 'reported_nurse_aide_staffing_hours_per_resident_per_day', 'nurse aide staffing hours per resident per day'],
        rnTurnover: ['Registered Nurse Turnover', 'registered_nurse_turnover', 'rn turnover'],
        totalTurnover: ['Total Nursing Staff Turnover', 'total_nursing_staff_turnover', 'total nurse staff turnover'],
        specialFocus: ['Special Focus Status', 'special_focus_status', 'special focus status'],
        weekendNurseHours: ['Total number of nurse staff hours per resident per day on the weekend', 'total_number_of_nurse_staff_hours_per_resident_per_day_on_the_weekend', 'weekend_total_nurse_hours'],
        rnStaffingRating: ['RN Staffing Rating', 'rn_staffing_rating', 'rn staffing rating'],
    };

    // ── State ──

    let allResults = [];
    let currentPage = 0;
    let lastQuery = '';
    let fieldNameCache = {};

    // ── DOM Elements ──

    const $ = id => document.getElementById(id);
    const searchInput = $('searchInput');
    const searchBtn = $('searchBtn');
    const clearBtn = $('clearBtn');
    const loadingState = $('loadingState');
    const errorState = $('errorState');
    const errorTitle = $('errorTitle');
    const errorMessage = $('errorMessage');
    const retryBtn = $('retryBtn');
    const resultsSection = $('resultsSection');
    const resultCount = $('resultCount');
    const resultsList = $('resultsList');
    const sortSelect = $('sortSelect');
    const pagination = $('pagination');
    const prevPage = $('prevPage');
    const nextPage = $('nextPage');
    const pageInfo = $('pageInfo');
    const detailPanel = $('detailPanel');
    const backToResults = $('backToResults');

    // ── Utility ──

    function normalize(str) {
        return str.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function resolveField(record, internalName) {
        // Check cache first
        if (fieldNameCache[internalName]) {
            return record[fieldNameCache[internalName]];
        }

        const candidates = FIELD_MAP[internalName] || [];
        for (const candidate of candidates) {
            // Try exact match
            if (record[candidate] !== undefined) {
                fieldNameCache[internalName] = candidate;
                return record[candidate];
            }
            // Try case-insensitive match
            for (const key of Object.keys(record)) {
                if (normalize(key) === normalize(candidate)) {
                    fieldNameCache[internalName] = key;
                    return record[key];
                }
            }
        }
        return null;
    }

    function enrichFacility(record) {
        // Attach resolved ratings directly for easy access
        record._providerName = resolveField(record, 'providerName') || 'Unknown Facility';
        record._city = resolveField(record, 'providerCity') || '';
        record._state = resolveField(record, 'providerState') || '';
        record._zip = resolveField(record, 'providerZip') || '';
        record._address = resolveField(record, 'providerAddress') || '';
        record._phone = resolveField(record, 'providerPhone') || '';
        record._county = resolveField(record, 'providerCounty') || '';
        record._federalNumber = resolveField(record, 'federalNumber') || '';
        record._overallRating = parseInt(resolveField(record, 'overallRating')) || 0;
        record._healthRating = parseInt(resolveField(record, 'healthRating')) || 0;
        record._staffingRating = parseInt(resolveField(record, 'staffingRating')) || 0;
        record._qmRating = parseInt(resolveField(record, 'qmRating')) || 0;
        record._beds = resolveField(record, 'beds') || '';
        record._residents = resolveField(record, 'residents') || '';
        record._ownershipType = resolveField(record, 'ownershipType') || '';
        return record;
    }

    // ── API ──

    // Cache the full dataset in memory so subsequent searches are instant
    let datasetCache = null;
    let cacheTimestamp = 0;
    const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

    function extractResults(data) {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.results)) return data.results;
        if (data && data.data && Array.isArray(data.data)) return data.data;
        return [];
    }

    async function fetchWithRetry(url, retries = 2) {
        for (let i = 0; i <= retries; i++) {
            try {
                console.log(`[CMS] Fetching (attempt ${i + 1}): ${url}`);
                const response = await fetch(url);
                console.log(`[CMS] Response status: ${response.status}`);
                if (response.ok) return response;
                if (i === retries) return response;
            } catch (err) {
                console.error(`[CMS] Fetch error (attempt ${i + 1}):`, err.message);
                if (i === retries) throw err;
            }
        }
    }

    async function loadFullDataset() {
        // Return cached data if fresh
        if (datasetCache && (Date.now() - cacheTimestamp < CACHE_TTL)) {
            return datasetCache;
        }

        setLoadingMessage('Loading CMS nursing home data...', 'First search may take a moment while we download the database.');

        const allRecords = [];

        // The data-api/v1 endpoint uses size/offset for pagination.
        // The dataset has ~15,000 records; fetch in batches of 5000.
        const batchSize = 5000;
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            setLoadingMessage('Loading CMS nursing home data...', `Downloaded ${allRecords.length.toLocaleString()} facilities so far...`);
            const url = `${API_BASE}?size=${batchSize}&offset=${offset}`;
            const response = await fetchWithRetry(url);

            if (!response.ok) {
                if (allRecords.length === 0) {
                    throw new Error(`CMS API returned status ${response.status}`);
                }
                hasMore = false;
                continue;
            }

            const data = await response.json();
            const results = extractResults(data);

            if (results.length === 0) {
                hasMore = false;
            } else {
                // Log first record's keys so we can verify field names
                if (allRecords.length === 0 && results[0]) {
                    console.log('[CMS] First record keys:', Object.keys(results[0]));
                    console.log('[CMS] First record sample:', JSON.stringify(results[0]).substring(0, 500));
                }
                allRecords.push(...results);
                offset += batchSize;
                // Stop if we got less than a full batch (last page)
                if (results.length < batchSize) hasMore = false;
                // Safety limit
                if (offset > 25000) hasMore = false;
            }
        }

        if (allRecords.length > 0) {
            datasetCache = allRecords;
            cacheTimestamp = Date.now();
            setLoadingMessage('Searching...', `Loaded ${allRecords.length.toLocaleString()} facilities. Filtering results...`);
        }

        return allRecords;
    }

    async function searchFacilities(query) {
        fieldNameCache = {}; // Reset cache for new searches

        const records = await loadFullDataset();

        if (records.length === 0) {
            throw new Error('Unable to load data from CMS API');
        }

        // Client-side filtering by name (case-insensitive, partial match)
        const queryLower = query.trim().toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(Boolean);

        const filtered = records.filter(record => {
            const name = resolveField(record, 'providerName');
            if (!name) return false;
            const nameLower = name.toLowerCase();
            // All query words must appear in the name
            return queryWords.every(word => nameLower.includes(word));
        });

        // Score results by relevance (exact matches first, then starts-with, then contains)
        const scored = filtered.map(record => {
            const name = resolveField(record, 'providerName').toLowerCase();
            let score = 0;
            if (name === queryLower) score = 100;
            else if (name.startsWith(queryLower)) score = 80;
            else if (name.includes(queryLower)) score = 60;
            else score = 40; // matched individual words
            return { record, score };
        });

        scored.sort((a, b) => b.score - a.score);

        return scored.map(s => enrichFacility(s.record));
    }

    // ── Rendering ──

    function createStarSvg(filled) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', filled ? 'currentColor' : 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', filled ? '0' : '2');
        svg.classList.add('star');
        if (filled) svg.classList.add('filled');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z');
        svg.appendChild(path);
        return svg;
    }

    function createMiniStarSvg(filled) {
        const svg = createStarSvg(filled);
        svg.classList.remove('star');
        svg.classList.add('mini-star');
        if (filled) svg.classList.add('filled');
        return svg;
    }

    function renderStars(container, rating) {
        container.innerHTML = '';
        for (let i = 1; i <= 5; i++) {
            container.appendChild(createStarSvg(i <= rating));
        }
    }

    function renderMiniStars(container, rating) {
        container.innerHTML = '';
        for (let i = 1; i <= 5; i++) {
            container.appendChild(createMiniStarSvg(i <= rating));
        }
    }

    function renderResultCard(facility) {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        const location = [facility._city, facility._state].filter(Boolean).join(', ');

        card.innerHTML = `
            <div class="result-card-info">
                <div class="result-card-name">${escapeHtml(facility._providerName)}</div>
                <div class="result-card-location">${escapeHtml(location)}</div>
            </div>
            <div class="result-card-rating">
                <div class="mini-stars" data-rating="${facility._overallRating}"></div>
                <svg class="result-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </div>
        `;

        const starsContainer = card.querySelector('.mini-stars');
        renderMiniStars(starsContainer, facility._overallRating);

        const selectFacility = () => showFacilityDetail(facility);
        card.addEventListener('click', selectFacility);
        card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectFacility();
            }
        });

        return card;
    }

    function renderResultsList() {
        resultsList.innerHTML = '';
        const start = currentPage * PAGE_SIZE;
        const end = Math.min(start + PAGE_SIZE, allResults.length);
        const pageResults = allResults.slice(start, end);

        for (const facility of pageResults) {
            resultsList.appendChild(renderResultCard(facility));
        }

        // Pagination
        const totalPages = Math.ceil(allResults.length / PAGE_SIZE);
        if (totalPages > 1) {
            pagination.classList.remove('hidden');
            prevPage.disabled = currentPage === 0;
            nextPage.disabled = currentPage >= totalPages - 1;
            pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages}`;
        } else {
            pagination.classList.add('hidden');
        }
    }

    function showFacilityDetail(facility) {
        resultsSection.classList.add('hidden');
        detailPanel.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Name & badge
        $('facilityName').textContent = facility._providerName;
        const badge = $('overallBadge');
        const r = facility._overallRating;
        badge.className = `overall-badge rating-${r || 'na'}`;
        badge.textContent = r ? `${r} Star${r !== 1 ? 's' : ''}` : 'Not Rated';

        // Meta
        const fullAddress = [facility._address, facility._city, facility._state, facility._zip].filter(Boolean).join(', ');
        $('facilityAddress').querySelector('span').textContent = fullAddress || 'Address not available';
        $('facilityPhone').querySelector('span').textContent = facility._phone || 'Phone not available';
        $('facilityBeds').querySelector('span').textContent = facility._beds ? `${facility._beds} certified beds` : 'Beds not reported';

        // Star ratings
        renderStars($('overallStars'), facility._overallRating);
        $('overallLabel').textContent = RecommendationEngine.getRatingLabel(facility._overallRating);

        renderStars($('healthStars'), facility._healthRating);
        $('healthLabel').textContent = RecommendationEngine.getRatingLabel(facility._healthRating);

        renderStars($('staffingStars'), facility._staffingRating);
        $('staffingLabel').textContent = RecommendationEngine.getRatingLabel(facility._staffingRating);

        renderStars($('qmStars'), facility._qmRating);
        $('qmLabel').textContent = RecommendationEngine.getRatingLabel(facility._qmRating);

        // Additional data
        renderAdditionalData(facility);

        // Recommendations
        renderRecommendations(facility);
    }

    function renderAdditionalData(facility) {
        const container = $('additionalData');
        const items = [];

        const addItem = (label, fieldName) => {
            const val = resolveField(facility, fieldName);
            if (val && val !== '' && val !== 'N/A') {
                items.push({ label, value: val });
            }
        };

        addItem('Federal Provider Number', 'federalNumber');
        addItem('Ownership Type', 'ownershipType');
        addItem('Number of Residents', 'residents');
        addItem('Total Nursing Hours/Resident/Day', 'totalNurseHours');
        addItem('RN Hours/Resident/Day', 'rnHours');
        addItem('LPN Hours/Resident/Day', 'lnpHours');
        addItem('CNA Hours/Resident/Day', 'cnaHours');
        addItem('Weekend Nursing Hours/Resident/Day', 'weekendNurseHours');
        addItem('Total Staff Turnover', 'totalTurnover');
        addItem('RN Turnover', 'rnTurnover');
        addItem('Health Deficiencies', 'numDeficiencies');
        addItem('Substantiated Complaints', 'numComplaints');
        addItem('Number of Fines', 'numFines');
        addItem('Total Fines ($)', 'totalFines');
        addItem('Total Penalties', 'numPenalties');
        addItem('Special Focus Status', 'specialFocus');
        addItem('County', 'providerCounty');

        if (items.length === 0) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        container.innerHTML = `
            <h3>Facility Details</h3>
            <div class="data-grid">
                ${items.map(item => `
                    <div class="data-item">
                        <span class="data-label">${escapeHtml(item.label)}</span>
                        <span class="data-value">${escapeHtml(String(item.value))}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderRecommendations(facility) {
        const container = $('recommendationsContent');
        const result = RecommendationEngine.generateRecommendations(facility);

        if (result.isPerfect) {
            container.innerHTML = `
                <div class="congrats-banner">
                    <h4>Congratulations! This facility has achieved 5 stars across all categories.</h4>
                    <p>To maintain this exceptional rating, continue focusing on consistent quality across all shifts,
                    ongoing staff education, proactive QAPI monitoring, and person-centered care practices.
                    Stay engaged with CMS updates to rating methodology and ensure year-round survey readiness.</p>
                </div>
            `;
            return;
        }

        if (result.categories.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);font-size:0.9rem;">No specific recommendations available. This may occur when rating data is incomplete.</p>';
            return;
        }

        const iconSvgs = {
            health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
            staffing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
            quality: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
            general: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };

        container.innerHTML = result.categories.map(cat => `
            <div class="rec-category">
                <div class="rec-category-header">
                    <div class="rec-category-icon ${cat.icon}">
                        ${iconSvgs[cat.icon] || iconSvgs.general}
                    </div>
                    <div class="rec-category-title">
                        <h4>${escapeHtml(cat.label)}</h4>
                        <span class="current-rating">Current: ${cat.currentRating}/5 stars &mdash; ${RecommendationEngine.getRatingLabel(cat.currentRating)}</span>
                    </div>
                    <span class="rec-priority ${cat.priority}">${cat.priority}</span>
                </div>
                <div class="rec-items">
                    ${cat.recommendations.map((rec, idx) => `
                        <div class="rec-item ${cat.priority}">
                            <span class="rec-item-number">${idx + 1}</span>
                            <div class="rec-item-content">
                                <strong>${escapeHtml(rec.title)}</strong>
                                <p>${escapeHtml(rec.detail)}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ── Sort ──

    function sortResults(sortBy) {
        switch (sortBy) {
            case 'rating-desc':
                allResults.sort((a, b) => (b._overallRating || 0) - (a._overallRating || 0));
                break;
            case 'rating-asc':
                allResults.sort((a, b) => (a._overallRating || 0) - (b._overallRating || 0));
                break;
            case 'name':
                allResults.sort((a, b) => a._providerName.localeCompare(b._providerName));
                break;
            case 'relevance':
            default:
                // Keep original order (API order)
                break;
        }
    }

    // ── UI State Management ──

    function showState(state) {
        loadingState.classList.add('hidden');
        errorState.classList.add('hidden');
        resultsSection.classList.add('hidden');
        detailPanel.classList.add('hidden');

        switch (state) {
            case 'loading': loadingState.classList.remove('hidden'); break;
            case 'error': errorState.classList.remove('hidden'); break;
            case 'results': resultsSection.classList.remove('hidden'); break;
            case 'detail': detailPanel.classList.remove('hidden'); break;
        }
    }

    function showError(title, message) {
        errorTitle.textContent = title;
        errorMessage.textContent = message;
        showState('error');
    }

    function setLoadingMessage(msg, detail) {
        $('loadingMessage').textContent = msg;
        $('loadingDetail').textContent = detail || '';
    }

    // ── Search Execution ──

    async function executeSearch(query) {
        if (!query.trim()) return;

        lastQuery = query.trim();
        currentPage = 0;
        sortSelect.value = 'relevance';
        showState('loading');

        try {
            allResults = await searchFacilities(query);

            if (allResults.length === 0) {
                showError(
                    'No facilities found',
                    `No care homes matching "${query}" were found in the CMS database. Try a different name or a partial name.`
                );
                return;
            }

            resultCount.textContent = allResults.length;
            renderResultsList();
            showState('results');
        } catch (err) {
            console.error('Search failed:', err);
            showError(
                'Unable to search CMS database',
                `Error: ${err.message} | API URL attempted: ${API_BASE} | Make sure you are running via node server.js and accessing http://localhost:3000`
            );
        }
    }

    // ── Event Handlers ──

    searchBtn.addEventListener('click', () => executeSearch(searchInput.value));

    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') executeSearch(searchInput.value);
    });

    searchInput.addEventListener('input', () => {
        clearBtn.classList.toggle('hidden', !searchInput.value);
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.classList.add('hidden');
        searchInput.focus();
    });

    retryBtn.addEventListener('click', () => {
        if (lastQuery) executeSearch(lastQuery);
    });

    sortSelect.addEventListener('change', () => {
        sortResults(sortSelect.value);
        currentPage = 0;
        renderResultsList();
    });

    prevPage.addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            renderResultsList();
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
    });

    nextPage.addEventListener('click', () => {
        const totalPages = Math.ceil(allResults.length / PAGE_SIZE);
        if (currentPage < totalPages - 1) {
            currentPage++;
            renderResultsList();
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
    });

    backToResults.addEventListener('click', () => {
        detailPanel.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Hint buttons
    document.querySelectorAll('.hint-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            searchInput.value = btn.dataset.query;
            clearBtn.classList.remove('hidden');
            executeSearch(btn.dataset.query);
        });
    });

    // Focus search input on load
    searchInput.focus();

})();
