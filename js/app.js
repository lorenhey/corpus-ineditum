/**
 * CORPUS INEDITUM - Main Application Controller
 * v2.0.0
 */

(function () {
    let currentCorpus = [];
    let selectedWork = null;
    let activeFilters = {
        search: "",
        language: "ALL",
        century: "ALL",
        status: "ALL",
        pd_status: "ALL"
    };

    // DOM Elements
    const elements = {
        // Metrics
        metricTotalWorks: document.getElementById('metric-total-works'),
        metricStrongNeg: document.getElementById('metric-strong-neg'),
        metricPublicDomain: document.getElementById('metric-pd-ratio'),
        metricAvgCoverage: document.getElementById('metric-avg-coverage'),

        // Filters
        searchInput: document.getElementById('search-input'),
        filterLang: document.getElementById('filter-lang'),
        filterCentury: document.getElementById('filter-century'),
        filterStatus: document.getElementById('filter-status'),
        filterPd: document.getElementById('filter-pd'),
        resetFiltersBtn: document.getElementById('reset-filters-btn'),

        // Table
        corpusTableBody: document.getElementById('corpus-table-body'),
        filteredCountBadge: document.getElementById('filtered-count-badge'),

        // Inspector
        inspectorEmptyState: document.getElementById('inspector-empty-state'),
        inspectorContent: document.getElementById('inspector-content'),
        workDetailTitle: document.getElementById('work-detail-title'),
        workDetailAuthor: document.getElementById('work-detail-author'),
        workDetailLang: document.getElementById('work-detail-lang'),
        workDetailYear: document.getElementById('work-detail-year'),
        workDetailStatusBadge: document.getElementById('work-detail-status-badge'),
        workDetailPdBadge: document.getElementById('work-detail-pd-badge'),
        gaugeFill: document.getElementById('gauge-fill'),
        gaugeScoreVal: document.getElementById('gauge-score-val'),
        epistemicCertaintyNote: document.getElementById('epistemic-certainty-note'),
        evidenceListContainer: document.getElementById('evidence-list-container'),
        pdJurisdictionText: document.getElementById('pd-jurisdiction-text'),
        pdRuleBadge: document.getElementById('pd-rule-badge'),
        obscurityIndexVal: document.getElementById('obscurity-index-val'),
        obscurityLabelBadge: document.getElementById('obscurity-label-badge'),
        obscurityDesc: document.getElementById('obscurity-desc'),
        markdownDossierCode: document.getElementById('markdown-dossier-code'),
        jsonDossierCode: document.getElementById('json-dossier-code'),

        // Action Buttons
        copyDossierBtn: document.getElementById('copy-dossier-btn'),
        downloadDossierBtn: document.getElementById('download-dossier-btn'),
        exportJsonlBtn: document.getElementById('export-jsonl-btn'),
        importJsonlInput: document.getElementById('import-jsonl-input'),

        // Custom Auditor Form
        customAuditForm: document.getElementById('custom-audit-form'),
        customTitleInput: document.getElementById('custom-title-input'),
        customAuthorInput: document.getElementById('custom-author-input'),
        customDeathYearInput: document.getElementById('custom-death-year-input'),
        customPubYearInput: document.getElementById('custom-pub-year-input'),
        customOriginalLangInput: document.getElementById('custom-original-lang-input'),
        customTargetLangInput: document.getElementById('custom-target-lang-input'),
        customJurisdictionSelect: document.getElementById('custom-jurisdiction-select'),
        customRunAuditBtn: document.getElementById('custom-run-audit-btn')
    };

    /**
     * Initializes the workbench.
     */
    function init() {
        // Load initial data
        if (window.INITIAL_CORPUS_DATA && Array.isArray(window.INITIAL_CORPUS_DATA)) {
            currentCorpus = window.INITIAL_CORPUS_DATA;
            setupApp();
        } else {
            // Attempt fetch for local web server environments
            fetch('initial_corpus.jsonl')
                .then(res => res.text())
                .then(text => {
                    currentCorpus = CorpusEngine.parseCorpusJsonl(text);
                    setupApp();
                })
                .catch(err => {
                    console.error("Could not load initial corpus:", err);
                    setupApp();
                });
        }
    }

    function setupApp() {
        updateAggregateMetrics();
        bindEvents();
        renderTable();
        // Automatically select the first item if available
        if (currentCorpus.length > 0) {
            selectWork(currentCorpus[0]);
        }
    }

    /**
     * Updates top summary metric cards.
     */
    function updateAggregateMetrics() {
        const stats = CorpusEngine.computeCorpusStats(currentCorpus);
        if (elements.metricTotalWorks) elements.metricTotalWorks.textContent = stats.total;
        if (elements.metricStrongNeg) elements.metricStrongNeg.textContent = `${stats.strongNegativeEvidenceRatio}%`;
        if (elements.metricPublicDomain) elements.metricPublicDomain.textContent = `${stats.publicDomainRatio}%`;
        if (elements.metricAvgCoverage) elements.metricAvgCoverage.textContent = `${stats.averageCoverage}%`;
    }

    /**
     * Renders table rows based on active filters.
     */
    function renderTable() {
        const filtered = CorpusEngine.filterCorpus(currentCorpus, activeFilters);
        if (elements.filteredCountBadge) {
            elements.filteredCountBadge.textContent = `${filtered.length} / ${currentCorpus.length}`;
        }

        elements.corpusTableBody.innerHTML = '';

        if (filtered.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                No se encontraron obras con los filtros aplicados.
            </td>`;
            elements.corpusTableBody.appendChild(tr);
            return;
        }

        filtered.forEach(item => {
            const tr = document.createElement('tr');
            if (selectedWork && (selectedWork.title === item.title)) {
                tr.classList.add('active-row');
            }

            const author = typeof item.author === 'string' ? item.author : (item.author?.name || "Desconocido");
            const langCode = (item.original_language || "de").toUpperCase();
            const yearStr = item.estimated_year || "S/D";
            const isPd = item.pd_status === CorpusEngine.PublicDomainStatus.LIKELY_PUBLIC_DOMAIN || item.pd_status === CorpusEngine.PublicDomainStatus.PUBLIC_DOMAIN_CONFIRMED;

            tr.innerHTML = `
                <td class="work-title-cell">${escapeHtml(item.title)}</td>
                <td class="work-author-cell">${escapeHtml(author)}</td>
                <td><span class="badge badge-dim">${langCode}</span></td>
                <td style="font-family: var(--font-mono);">${yearStr}</td>
                <td>
                    <span class="badge ${isPd ? 'badge-emerald' : 'badge-amber'}">
                        ${isPd ? 'PD LIBRE' : 'PD INCIERTO'}
                    </span>
                </td>
            `;

            tr.addEventListener('click', () => {
                selectWork(item);
                // Highlight active row
                document.querySelectorAll('#corpus-table-body tr').forEach(r => r.classList.remove('active-row'));
                tr.classList.add('active-row');
            });

            elements.corpusTableBody.appendChild(tr);
        });
    }

    /**
     * Inspects a selected work in the right-hand dossier pane.
     */
    function selectWork(rawItem) {
        if (!rawItem) return;
        selectedWork = CorpusEngine.auditWork(rawItem, "es");

        if (elements.inspectorEmptyState) elements.inspectorEmptyState.style.display = 'none';
        if (elements.inspectorContent) elements.inspectorContent.style.display = 'flex';

        // Title and author
        elements.workDetailTitle.textContent = selectedWork.title;
        elements.workDetailAuthor.textContent = selectedWork.author;
        elements.workDetailLang.textContent = CorpusEngine.LanguageNames[selectedWork.original_language] || selectedWork.original_language;
        elements.workDetailYear.textContent = selectedWork.estimated_year ? `${selectedWork.estimated_year} d.C.` : "Año no determinado";

        // Badges
        const isPd = selectedWork.pd_status === CorpusEngine.PublicDomainStatus.LIKELY_PUBLIC_DOMAIN || selectedWork.pd_status === CorpusEngine.PublicDomainStatus.PUBLIC_DOMAIN_CONFIRMED;
        elements.workDetailPdBadge.className = `badge ${isPd ? 'badge-emerald' : 'badge-amber'}`;
        elements.workDetailPdBadge.textContent = selectedWork.pd_status;

        elements.workDetailStatusBadge.className = `badge ${selectedWork.status === CorpusEngine.TranslationStatus.STRONG_NO_TRANSLATION_EVIDENCE ? 'badge-amber' : 'badge-cyan'}`;
        elements.workDetailStatusBadge.textContent = selectedWork.status;

        // Gauge
        const coverage = selectedWork.coverage_score || 0;
        elements.gaugeFill.style.width = `${coverage}%`;
        elements.gaugeScoreVal.textContent = `${coverage}%`;
        elements.epistemicCertaintyNote.textContent = selectedWork.conclusion;

        // Evidence list
        elements.evidenceListContainer.innerHTML = '';
        if (Array.isArray(selectedWork.evidences) && selectedWork.evidences.length > 0) {
            selectedWork.evidences.forEach(ev => {
                const div = document.createElement('div');
                div.className = 'evidence-item';
                div.innerHTML = `
                    <div class="evidence-item-header">
                        <span>🏛️ ${escapeHtml(ev.source)}</span>
                        <span class="badge badge-dim">${escapeHtml(ev.query || ev.query_type || "Búsqueda")}</span>
                    </div>
                    <div class="evidence-item-body">
                        ${escapeHtml(ev.result || ev.result_summary || "Sin detalles.")}
                    </div>
                `;
                elements.evidenceListContainer.appendChild(div);
            });
        } else {
            elements.evidenceListContainer.innerHTML = `<div class="evidence-item" style="color: var(--text-dim);">No se registran fuentes detalladas para este registro.</div>`;
        }

        // Public domain section
        elements.pdRuleBadge.textContent = selectedWork.pd_details?.ruleApplied || "Life + 70";
        elements.pdJurisdictionText.textContent = selectedWork.pd_details?.explanation || "Evaluación heurística de derechos.";

        // Obscurity index
        const obs = selectedWork.obscurity || CorpusEngine.calculateObscurityScore({});
        elements.obscurityIndexVal.textContent = obs.score;
        elements.obscurityLabelBadge.textContent = obs.label;
        elements.obscurityDesc.textContent = obs.description;

        // Dossiers
        const markdown = CorpusEngine.generateEditorialDossier(selectedWork);
        elements.markdownDossierCode.textContent = markdown;
        elements.jsonDossierCode.textContent = JSON.stringify(selectedWork, null, 2);
    }

    /**
     * Binds UI events.
     */
    function bindEvents() {
        // Search Input
        elements.searchInput.addEventListener('input', (e) => {
            activeFilters.search = e.target.value;
            renderTable();
        });

        // Language Select
        elements.filterLang.addEventListener('change', (e) => {
            activeFilters.language = e.target.value;
            renderTable();
        });

        // Century Select
        elements.filterCentury.addEventListener('change', (e) => {
            activeFilters.century = e.target.value;
            renderTable();
        });

        // Status Select
        elements.filterStatus.addEventListener('change', (e) => {
            activeFilters.status = e.target.value;
            renderTable();
        });

        // Public Domain Select
        elements.filterPd.addEventListener('change', (e) => {
            activeFilters.pd_status = e.target.value;
            renderTable();
        });

        // Reset Filters
        elements.resetFiltersBtn.addEventListener('click', () => {
            activeFilters = { search: "", language: "ALL", century: "ALL", status: "ALL", pd_status: "ALL" };
            elements.searchInput.value = "";
            elements.filterLang.value = "ALL";
            elements.filterCentury.value = "ALL";
            elements.filterStatus.value = "ALL";
            elements.filterPd.value = "ALL";
            renderTable();
        });

        // Tab Navigation in Inspector
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetPane = btn.getAttribute('data-tab');
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active-pane'));

                btn.classList.add('active-tab');
                const pane = document.getElementById(targetPane);
                if (pane) pane.classList.add('active-pane');
            });
        });

        // Copy Dossier
        elements.copyDossierBtn.addEventListener('click', () => {
            if (!selectedWork) return;
            const md = CorpusEngine.generateEditorialDossier(selectedWork);
            navigator.clipboard.writeText(md).then(() => {
                const originalText = elements.copyDossierBtn.innerHTML;
                elements.copyDossierBtn.innerHTML = '✓ ¡Copiado!';
                setTimeout(() => { elements.copyDossierBtn.innerHTML = originalText; }, 2000);
            });
        });

        // Download Markdown Dossier
        elements.downloadDossierBtn.addEventListener('click', () => {
            if (!selectedWork) return;
            const md = CorpusEngine.generateEditorialDossier(selectedWork);
            const safeName = (selectedWork.title || "dossier").replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
            downloadBlob(md, `dossier_${safeName}.md`, 'text/markdown;charset=utf-8;');
        });

        // Export Entire Corpus as JSONL
        elements.exportJsonlBtn.addEventListener('click', () => {
            const filtered = CorpusEngine.filterCorpus(currentCorpus, activeFilters);
            const jsonl = CorpusEngine.serializeCorpusJsonl(filtered);
            downloadBlob(jsonl, 'corpus_ineditum_export.jsonl', 'application/x-ndjson;charset=utf-8;');
        });

        // Import custom JSONL
        elements.importJsonlInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsed = CorpusEngine.parseCorpusJsonl(event.target.result);
                    if (parsed.length > 0) {
                        currentCorpus = parsed;
                        updateAggregateMetrics();
                        renderTable();
                        selectWork(currentCorpus[0]);
                        alert(`¡Importación exitosa! Se cargaron ${parsed.length} obras al corpus.`);
                    } else {
                        alert("El archivo no contenía registros válidos en formato JSONL.");
                    }
                } catch (err) {
                    alert(`Error al procesar JSONL: ${err.message}`);
                }
            };
            reader.readAsText(file);
        });

        // Custom Auditor Simulation
        elements.customAuditForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = elements.customTitleInput.value.trim();
            const author = elements.customAuthorInput.value.trim();
            const deathYear = elements.customDeathYearInput.value ? Number(elements.customDeathYearInput.value) : null;
            const pubYear = elements.customPubYearInput.value ? Number(elements.customPubYearInput.value) : null;
            const origLang = elements.customOriginalLangInput.value;
            const targetLang = elements.customTargetLangInput.value;
            const jurisdiction = elements.customJurisdictionSelect.value;

            if (!title) {
                alert("Por favor ingresá al menos el título de la obra.");
                return;
            }

            // Synthesize evidence simulations across Open Library and Internet Archive
            const simulatedEvidences = [
                {
                    source: "Open Library",
                    query: "Author+Title exact match",
                    result: `Consulta simulada a API: 0 ediciones detectadas en ${targetLang.toUpperCase()}. Cobertura de títulos en ${origLang.toUpperCase()} confirmada.`
                },
                {
                    source: "Internet Archive",
                    query: "Metadata search (mediatype:texts)",
                    result: `0 digitalizaciones o traducciones localizadas en lengua meta (${targetLang.toUpperCase()}).`
                },
                {
                    source: "Wikidata / KVK",
                    query: "SPARQL work translation property (P655)",
                    result: `Propiedad de traducción hacia '${targetLang}' ausente en la entidad bibliográfica.`
                }
            ];

            const customWork = {
                title,
                author: { name: author, death_year: deathYear },
                original_language: origLang,
                target_language: targetLang,
                estimated_year: pubYear,
                authorDeathYear: deathYear,
                evidences: simulatedEvidences,
                target_editions_count: 0,
                original_editions_count: 5
            };

            const audited = CorpusEngine.auditWork(customWork, targetLang, { jurisdiction });

            // Add to corpus
            currentCorpus.unshift(audited);
            updateAggregateMetrics();
            renderTable();
            selectWork(audited);

            // Scroll to inspector
            document.querySelector('.workspace-split').scrollIntoView({ behavior: 'smooth' });
        });
    }

    /**
     * Utility to download text/blob.
     */
    function downloadBlob(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Basic HTML escaping.
     */
    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Auto-init on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
