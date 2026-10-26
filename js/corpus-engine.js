/**
 * CORPUS INEDITUM - Bibliographic Archaeology & Translation Audit Engine
 * v2.0.0
 * 
 * Epistemic engine for discovering, auditing, and ranking historical works 
 * that have never crossed into a target language (especially Spanish 'es').
 * 
 * Implements:
 *  - Epistemic evidence ladder (absence of catalog records != proof of non-existence)
 *  - Public Domain assessment across international jurisdictions (Life+70, Life+80, US 1928)
 *  - Obscurity heuristics and catalog coverage scoring
 *  - Canonical FRBR (Work -> Expression -> Manifestation) bibliographic lineage
 *  - Editorial dossier generation for independent presses (Domicilio indeterminado)
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CorpusEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    // Enums matching core/enums.py
    const TranslationStatus = {
        TRANSLATION_CONFIRMED: "TRANSLATION_CONFIRMED",
        TRANSLATION_PROBABLE: "TRANSLATION_PROBABLE",
        TRANSLATION_POSSIBLE: "TRANSLATION_POSSIBLE",
        NO_TRANSLATION_FOUND: "NO_TRANSLATION_FOUND",
        STRONG_NO_TRANSLATION_EVIDENCE: "STRONG_NO_TRANSLATION_EVIDENCE",
        INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
        UNRESOLVED: "UNRESOLVED"
    };

    const PublicDomainStatus = {
        PUBLIC_DOMAIN_CONFIRMED: "PUBLIC_DOMAIN_CONFIRMED",
        LIKELY_PUBLIC_DOMAIN: "LIKELY_PUBLIC_DOMAIN",
        UNCERTAIN: "UNCERTAIN",
        NOT_PUBLIC_DOMAIN: "NOT_PUBLIC_DOMAIN"
    };

    const ObscurityLabel = {
        EXTREMELY_OBSCURE: "EXTREMELY_OBSCURE",
        OBSCURE: "OBSCURE",
        MODERATE: "MODERATE",
        WELL_KNOWN: "WELL_KNOWN",
        CANONICAL: "CANONICAL"
    };

    const LanguageNames = {
        de: "Alemán (Deutsch)",
        la: "Latín (Latina)",
        fr: "Francés (Français)",
        it: "Italiano (Italiano)",
        en: "Inglés (English)",
        grc: "Griego Antiguo (Ἑλληνική)",
        es: "Español (Castellano)",
        pt: "Portugués (Português)",
        nl: "Neerlandés (Nederlands)",
        ru: "Ruso (Русский)"
    };

    /**
     * Assesses Public Domain status based on author death year and publication year.
     * 
     * @param {Object} options
     * @param {number|null} options.authorDeathYear
     * @param {number|null} options.publicationYear
     * @param {number} [options.currentYear=new Date().getFullYear()]
     * @param {string} [options.jurisdiction="LIFE_70"] - LIFE_70 (EU/Arg), LIFE_80 (ES/CO), US (pre-1929)
     * @returns {Object} { status, pmaYears, yearsSincePublication, ruleApplied, explanation }
     */
    function assessPublicDomain({ authorDeathYear, publicationYear, currentYear, jurisdiction = "LIFE_70" }) {
        const yearNow = currentYear || new Date().getFullYear();
        let pma = null;
        let yearsSincePub = null;

        if (authorDeathYear && Number.isFinite(Number(authorDeathYear))) {
            pma = yearNow - Number(authorDeathYear);
        }
        if (publicationYear && Number.isFinite(Number(publicationYear))) {
            yearsSincePub = yearNow - Number(publicationYear);
        }

        // US Rule: published before Jan 1, 1929 is public domain
        if (jurisdiction === "US") {
            if (publicationYear && Number(publicationYear) < 1929) {
                return {
                    status: PublicDomainStatus.LIKELY_PUBLIC_DOMAIN,
                    pmaYears: pma,
                    yearsSincePublication: yearsSincePub,
                    ruleApplied: "US Copyright (Published < 1929)",
                    explanation: `Publicado en ${publicationYear} (< 1929), ingresó al dominio público federal en EE.UU.`
                };
            }
            if (pma !== null && pma > 70) {
                return {
                    status: PublicDomainStatus.LIKELY_PUBLIC_DOMAIN,
                    pmaYears: pma,
                    yearsSincePublication: yearsSincePub,
                    ruleApplied: "US Life + 70",
                    explanation: `Autor fallecido hace ${pma} años (> 70 años pma).`
                };
            }
        }

        // Spain / Colombia / Extended Life + 80
        if (jurisdiction === "LIFE_80") {
            if (pma !== null) {
                if (pma > 80) {
                    return {
                        status: PublicDomainStatus.LIKELY_PUBLIC_DOMAIN,
                        pmaYears: pma,
                        yearsSincePublication: yearsSincePub,
                        ruleApplied: "Life + 80 (España / Colombia)",
                        explanation: `Autor fallecido hace ${pma} años (> 80 años post mortem auctoris).`
                    };
                } else if (pma >= 0) {
                    return {
                        status: PublicDomainStatus.NOT_PUBLIC_DOMAIN,
                        pmaYears: pma,
                        yearsSincePublication: yearsSincePub,
                        ruleApplied: "Life + 80",
                        explanation: `Autor fallecido hace ${pma} años; aún protegido por la regla de 80 años.`
                    };
                }
            }
        }

        // Standard Life + 70 (Argentina Ley 11.723, Unión Europea, Convención de Berna)
        if (pma !== null) {
            if (pma > 70) {
                return {
                    status: PublicDomainStatus.LIKELY_PUBLIC_DOMAIN,
                    pmaYears: pma,
                    yearsSincePublication: yearsSincePub,
                    ruleApplied: "Life + 70 (Berna / Argentina / UE)",
                    explanation: `Autor fallecido hace ${pma} años (> 70 años post mortem). En dominio público estándar.`
                };
            } else if (pma >= 0) {
                return {
                    status: PublicDomainStatus.NOT_PUBLIC_DOMAIN,
                    pmaYears: pma,
                    yearsSincePublication: yearsSincePub,
                    ruleApplied: "Life + 70",
                    explanation: `Autor fallecido hace ${pma} años. Los derechos patrimoniales expiran a los 70 años p.m.a.`
                };
            }
        }

        // Fallback: publication year heuristics when author death is unknown
        if (yearsSincePub !== null) {
            if (yearsSincePub > 120) {
                return {
                    status: PublicDomainStatus.LIKELY_PUBLIC_DOMAIN,
                    pmaYears: null,
                    yearsSincePublication: yearsSincePub,
                    ruleApplied: "Publicación > 120 años (Heurística)",
                    explanation: `Publicado hace ${yearsSincePub} años. Con alta certidumbre en dominio público por presunción de vida biológica.`
                };
            }
            if (yearsSincePub < 70) {
                return {
                    status: PublicDomainStatus.NOT_PUBLIC_DOMAIN,
                    pmaYears: null,
                    yearsSincePublication: yearsSincePub,
                    ruleApplied: "Publicación < 70 años",
                    explanation: `Publicado hace solo ${yearsSincePub} años. Probablemente protegido bajo derechos vigentes.`
                };
            }
        }

        return {
            status: PublicDomainStatus.UNCERTAIN,
            pmaYears: pma,
            yearsSincePublication: yearsSincePub,
            ruleApplied: "Datos insuficientes",
            explanation: "No se dispone de año de muerte ni de fecha fehaciente de primera publicación."
        };
    }

    /**
     * Calculates coverage score based on consulted catalog sources and queries.
     * 
     * @param {Array<Object>} evidences - Array of Evidence records
     * @param {number} [totalPotentialSources=2]
     * @returns {Object} { score, successCount, failedCount, qualityLabel }
     */
    function calculateCoverageScore(evidences = [], totalPotentialSources = 2) {
        if (!Array.isArray(evidences) || evidences.length === 0) {
            return {
                score: 0,
                successCount: 0,
                failedCount: 0,
                qualityLabel: "INSUFFICIENT"
            };
        }

        let successCount = 0;
        let failedCount = 0;

        evidences.forEach(ev => {
            const summary = (ev.result_summary || ev.result || "").toLowerCase();
            if (summary.includes("failed") || summary.includes("error") || summary.includes("timeout")) {
                failedCount++;
            } else {
                successCount++;
            }
        });

        const denom = Math.max(totalPotentialSources, evidences.length);
        const score = Math.min(100, Math.round((successCount / denom) * 100));

        let qualityLabel = "LOW";
        if (score >= 80) qualityLabel = "EXHAUSTIVE";
        else if (score >= 50) qualityLabel = "MODERATE";

        return {
            score,
            successCount,
            failedCount,
            qualityLabel
        };
    }

    /**
     * Calculates an obscurity index (0-100) based on surviving editions, digital scans, and visibility.
     * 
     * @param {Object} metrics
     * @param {number} [metrics.editionsCount=0]
     * @param {number} [metrics.digitalizationsCount=0]
     * @param {number} [metrics.sitelinksCount=0]
     * @param {number} [metrics.holdingsCount=0]
     * @returns {Object} { score, label, description }
     */
    function calculateObscurityScore({ editionsCount = 0, digitalizationsCount = 0, sitelinksCount = 0, holdingsCount = 0 }) {
        // High editions/scans/sitelinks => LOW obscurity (well known).
        // Low editions/scans/sitelinks => HIGH obscurity (hidden gem).
        let visibility = 0;

        // Editions weight (up to 35 pts)
        visibility += Math.min(35, (editionsCount || 0) * 3);

        // Digitalizations weight (up to 30 pts)
        visibility += Math.min(30, (digitalizationsCount || 0) * 4);

        // Wikipedia sitelinks / authority links (up to 25 pts)
        visibility += Math.min(25, (sitelinksCount || 0) * 5);

        // Holdings in major libraries (up to 10 pts)
        visibility += Math.min(10, (holdingsCount || 0) * 2);

        // Obscurity is inverse of visibility
        const score = Math.max(0, Math.min(100, Math.round(100 - visibility)));

        let label = ObscurityLabel.MODERATE;
        let description = "Obra con visibilidad académica o bibliográfica media.";

        if (score >= 85) {
            label = ObscurityLabel.EXTREMELY_OBSCURE;
            description = "Prácticamente inhallable en fondos contemporáneos; testigo bibliográfico singular.";
        } else if (score >= 65) {
            label = ObscurityLabel.OBSCURE;
            description = "Pocos ejemplares o ediciones sobrevivientes; escasa presencia digital.";
        } else if (score <= 25) {
            label = ObscurityLabel.CANONICAL;
            description = "Texto clásico de amplia circulación en su idioma de origen; profusamente editado.";
        } else if (score <= 45) {
            label = ObscurityLabel.WELL_KNOWN;
            description = "Obra conocida con múltiples ediciones de referencia.";
        }

        return {
            score,
            label,
            description
        };
    }

    /**
     * Evaluates accumulated evidence to determine translation status.
     * 
     * @param {Object} options
     * @param {string} options.targetLang - e.g. "es"
     * @param {Array<Object>} options.evidences - Catalog query records
     * @param {number} [options.targetEditionsFound=0]
     * @param {number} [options.originalEditionsFound=0]
     * @returns {Object} { status, coverageScore, conclusionNotes, confidence }
     */
    function evaluateAuditEvidence({ targetLang = "es", evidences = [], targetEditionsFound = 0, originalEditionsFound = 0 }) {
        const coverage = calculateCoverageScore(evidences);

        if (targetEditionsFound > 0) {
            return {
                status: TranslationStatus.TRANSLATION_POSSIBLE,
                coverageScore: coverage.score,
                conclusionNotes: `Se detectaron ${targetEditionsFound} posibles registros en ${targetLang.toUpperCase()}. Requiere cotejo filológico manual para descartar falsos positivos o adaptaciones parciales.`,
                confidence: "MODERATE"
            };
        }

        if (coverage.successCount >= 1 && coverage.score >= 50) {
            return {
                status: TranslationStatus.STRONG_NO_TRANSLATION_EVIDENCE,
                coverageScore: coverage.score,
                conclusionNotes: `No se identificó ninguna traducción al ${targetLang.toUpperCase()} en los catálogos consultados (${coverage.successCount} fuentes exitosas). Constituye evidencia negativa robusta, aunque no prueba absoluta ontológica de inexistencia.`,
                confidence: coverage.score >= 80 ? "HIGH" : "MODERATE"
            };
        }

        if (coverage.successCount > 0) {
            return {
                status: TranslationStatus.NO_TRANSLATION_FOUND,
                coverageScore: coverage.score,
                conclusionNotes: `No se hallaron coincidencias, pero la cobertura de búsqueda (${coverage.score}%) es acotada.`,
                confidence: "LOW"
            };
        }

        return {
            status: TranslationStatus.INSUFFICIENT_EVIDENCE,
            coverageScore: coverage.score,
            conclusionNotes: "Las consultas a las fuentes principales fallaron o resultaron inconcluyentes por cortes de red o límites de API.",
            confidence: "UNKNOWN"
        };
    }

    /**
     * Full audit of a work object.
     */
    function auditWork(work, targetLang = "es", options = {}) {
        const authorDeathYear = work.authorDeathYear || (work.author && work.author.death_year) || null;
        const publicationYear = work.estimated_year || work.estimated_first_publication_year || null;

        const pd = assessPublicDomain({
            authorDeathYear,
            publicationYear,
            currentYear: options.currentYear,
            jurisdiction: options.jurisdiction || "LIFE_70"
        });

        const evidences = work.evidences || [];
        const targetEditions = work.target_editions_count || 0;
        const originalEditions = work.original_editions_count || 0;

        const auditResult = evaluateAuditEvidence({
            targetLang,
            evidences,
            targetEditionsFound: targetEditions,
            originalEditionsFound: originalEditions
        });

        const obscurity = calculateObscurityScore({
            editionsCount: originalEditions || (work.evidences ? work.evidences.length * 2 : 0),
            digitalizationsCount: work.digitalizations_count || 1,
            sitelinksCount: work.sitelinks_count || 0,
            holdingsCount: work.holdings_count || 0
        });

        return {
            title: work.title || work.canonical_title,
            author: typeof work.author === 'string' ? work.author : (work.author ? work.author.name : "Desconocido"),
            original_language: work.original_language || "de",
            target_language: targetLang,
            estimated_year: publicationYear,
            author_death_year: authorDeathYear,
            status: work.status || auditResult.status,
            coverage_score: work.coverage_score !== undefined ? work.coverage_score : auditResult.coverageScore,
            pd_status: work.pd_status || pd.status,
            pd_details: pd,
            obscurity: obscurity,
            conclusion: work.conclusion || auditResult.conclusionNotes,
            evidences: evidences
        };
    }

    /**
     * Parses a JSON Lines string into an array of work records.
     */
    function parseCorpusJsonl(jsonlString) {
        if (!jsonlString || typeof jsonlString !== 'string') return [];
        const lines = jsonlString.trim().split(/\r?\n/);
        const records = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            try {
                const parsed = JSON.parse(line);
                records.push(parsed);
            } catch (err) {
                console.warn(`Error parsing line ${i + 1}: ${err.message}`);
            }
        }
        return records;
    }

    /**
     * Serializes an array of work records to JSON Lines.
     */
    function serializeCorpusJsonl(records) {
        if (!Array.isArray(records)) return "";
        return records.map(r => JSON.stringify(r)).join("\n");
    }

    /**
     * Filters an array of work items.
     */
    function filterCorpus(corpus = [], filters = {}) {
        if (!Array.isArray(corpus)) return [];

        return corpus.filter(item => {
            // Text search
            if (filters.search) {
                const q = filters.search.toLowerCase().trim();
                const title = (item.title || "").toLowerCase();
                const author = (typeof item.author === 'string' ? item.author : (item.author?.name || "")).toLowerCase();
                if (!title.includes(q) && !author.includes(q)) return false;
            }

            // Language
            if (filters.language && filters.language !== "ALL") {
                if (item.original_language !== filters.language) return false;
            }

            // Century
            if (filters.century && filters.century !== "ALL") {
                const year = Number(item.estimated_year);
                if (Number.isFinite(year)) {
                    const cent = Math.ceil(year / 100);
                    if (Number(filters.century) !== cent) return false;
                } else {
                    return false;
                }
            }

            // Status
            if (filters.status && filters.status !== "ALL") {
                if (item.status !== filters.status) return false;
            }

            // Public Domain
            if (filters.pd_status && filters.pd_status !== "ALL") {
                if (item.pd_status !== filters.pd_status) return false;
            }

            return true;
        });
    }

    /**
     * Computes aggregate statistical metrics over a corpus.
     */
    function computeCorpusStats(corpus = []) {
        const stats = {
            total: corpus.length,
            languages: {},
            centuries: {},
            statusCounts: {},
            pdCounts: {},
            averageCoverage: 0,
            strongNegativeEvidenceRatio: 0,
            publicDomainRatio: 0
        };

        if (corpus.length === 0) return stats;

        let totalCoverage = 0;
        let strongNegCount = 0;
        let pdCount = 0;

        corpus.forEach(item => {
            // Language
            const lang = item.original_language || "unknown";
            stats.languages[lang] = (stats.languages[lang] || 0) + 1;

            // Century
            const yr = Number(item.estimated_year);
            if (Number.isFinite(yr)) {
                const cent = Math.ceil(yr / 100);
                stats.centuries[`Siglo ${cent}`] = (stats.centuries[`Siglo ${cent}`] || 0) + 1;
            }

            // Status
            const st = item.status || "UNRESOLVED";
            stats.statusCounts[st] = (stats.statusCounts[st] || 0) + 1;
            if (st === TranslationStatus.STRONG_NO_TRANSLATION_EVIDENCE) {
                strongNegCount++;
            }

            // Public domain
            const pd = item.pd_status || PublicDomainStatus.UNCERTAIN;
            stats.pdCounts[pd] = (stats.pdCounts[pd] || 0) + 1;
            if (pd === PublicDomainStatus.LIKELY_PUBLIC_DOMAIN || pd === PublicDomainStatus.PUBLIC_DOMAIN_CONFIRMED) {
                pdCount++;
            }

            totalCoverage += (Number(item.coverage_score) || 0);
        });

        stats.averageCoverage = Math.round(totalCoverage / corpus.length);
        stats.strongNegativeEvidenceRatio = Math.round((strongNegCount / corpus.length) * 100);
        stats.publicDomainRatio = Math.round((pdCount / corpus.length) * 100);

        return stats;
    }

    /**
     * Generates a complete Markdown editorial dossier for publishing houses (Domicilio indeterminado).
     */
    function generateEditorialDossier(auditData) {
        const w = auditData;
        const author = typeof w.author === 'string' ? w.author : (w.author ? w.author.name : "Anónimo");
        const langName = LanguageNames[w.original_language] || w.original_language;
        const targetName = LanguageNames[w.target_language || "es"] || (w.target_language || "es");

        let evidenceRows = "";
        if (Array.isArray(w.evidences) && w.evidences.length > 0) {
            evidenceRows = w.evidences.map(ev => {
                return `| **${ev.source}** | \`${ev.query || ev.query_type}\` | ${ev.result || ev.result_summary} |`;
            }).join("\n");
        } else {
            evidenceRows = "| (Sin fuentes detalladas) | - | - |";
        }

        return `# DOSSIER EDITORIAL ARQUEOLÓGICO: ${w.title}
**Instrumento:** CORPUS INEDITUM (v2.0.0)  
**Fecha de Emisión:** ${new Date().toISOString().split('T')[0]}  
**Destino Editorial:** Domicilio indeterminado / Scouting de Traducción Histórica

---

## 1. Identificación Bibliográfica (FRBR Work)
- **Título Canónico:** *${w.title}*
- **Autor / Responsabilidad:** ${author}
- **Idioma Original:** ${langName} (\`${w.original_language}\`)
- **Idioma Destino Auditado:** ${targetName} (\`${w.target_language || "es"}\`)
- **Año de Publicación Estimado:** ${w.estimated_year || "S/D"}
- **Fallecimiento del Autor:** ${w.author_death_year ? `${w.author_death_year} d.C.` : "Desconocido / No registrado"}

## 2. Dictamen Epistémico de Traducción
- **Estado de Auditoría:** \`${w.status}\`
- **Índice de Cobertura de Búsqueda:** **${w.coverage_score}%**
- **Conclusión del Auditor:**
  > ${w.conclusion || "Sin dictamen."}

### Principio Epistémico Aplicado
> *La ausencia de registro en catálogos abiertos constituye una evidencia negativa robusta respecto de la existencia de ediciones comerciales o académicas en la lengua meta, pero no equivale a una prueba ontológica absoluta de que jamás haya existido una versión manuscrita o efímera.*

## 3. Registro de Evidencias en Fuentes de Autoridad
| Fuente Consultada | Estrategia de Búsqueda | Resultado Obtenido |
| :--- | :--- | :--- |
${evidenceRows}

## 4. Estado de Propiedad Intelectual & Dominio Público
- **Dictamen:** \`${w.pd_status}\`
- **Regla:** ${w.pd_details?.ruleApplied || "Life + 70"}
- **Fundamentación Jurídica:** ${w.pd_details?.explanation || "Obra histórica con más de 70 años post mortem auctoris."}

## 5. Directiva Editorial (Doctrina Domicilio Indeterminado)
> **Principio de Traducción Directa:** *No se traducen traducciones*. Si esta obra es seleccionada para su publicación en lengua castellana, el texto fuente debe ser cotejado directamente sobre el original impreso o manuscrito en \`${w.original_language}\` (edición príncipe o digitalización de alta resolución), excluyendo cualquier intermediación mediante versiones terciarias.

---
*Generado automáticamente por el motor de auditoría de Corpus Ineditum.*
`;
    }

    return {
        TranslationStatus,
        PublicDomainStatus,
        ObscurityLabel,
        LanguageNames,
        assessPublicDomain,
        calculateCoverageScore,
        calculateObscurityScore,
        evaluateAuditEvidence,
        auditWork,
        parseCorpusJsonl,
        serializeCorpusJsonl,
        filterCorpus,
        computeCorpusStats,
        generateEditorialDossier
    };
}));
