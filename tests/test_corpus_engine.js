/**
 * Node.js Test Suite for Corpus Ineditum Audit Engine (js/corpus-engine.js)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const CorpusEngine = require('../js/corpus-engine.js');

let passedTests = 0;
let totalTests = 0;

function test(description, fn) {
    totalTests++;
    try {
        fn();
        console.log(`  ✓ ${description}`);
        passedTests++;
    } catch (err) {
        console.error(`  ✗ ${description}`);
        console.error(`    ${err.message}`);
        throw err;
    }
}

console.log('=== Running Corpus Ineditum Engine Tests ===\n');

// 1. Public Domain Assessment
test('assessPublicDomain: author deceased > 70 years should be LIKELY_PUBLIC_DOMAIN under Life+70', () => {
    const res = CorpusEngine.assessPublicDomain({
        authorDeathYear: 1783, // Leonhard Euler
        publicationYear: 1765,
        currentYear: 2026,
        jurisdiction: 'LIFE_70'
    });
    assert.strictEqual(res.status, CorpusEngine.PublicDomainStatus.LIKELY_PUBLIC_DOMAIN);
    assert.strictEqual(res.pmaYears, 243);
    assert(res.ruleApplied.includes('Life + 70'));
});

test('assessPublicDomain: recent death (< 70 years) should be NOT_PUBLIC_DOMAIN', () => {
    const res = CorpusEngine.assessPublicDomain({
        authorDeathYear: 1980,
        publicationYear: 1950,
        currentYear: 2026,
        jurisdiction: 'LIFE_70'
    });
    assert.strictEqual(res.status, CorpusEngine.PublicDomainStatus.NOT_PUBLIC_DOMAIN);
    assert.strictEqual(res.pmaYears, 46);
});

test('assessPublicDomain: publication > 120 years fallback when death year unknown', () => {
    const res = CorpusEngine.assessPublicDomain({
        authorDeathYear: null,
        publicationYear: 1850,
        currentYear: 2026
    });
    assert.strictEqual(res.status, CorpusEngine.PublicDomainStatus.LIKELY_PUBLIC_DOMAIN);
    assert(res.ruleApplied.includes('120 años'));
});

test('assessPublicDomain: US jurisdiction pre-1929 rule', () => {
    const res = CorpusEngine.assessPublicDomain({
        authorDeathYear: 1960, // would fail life+70 in US
        publicationYear: 1920,
        currentYear: 2026,
        jurisdiction: 'US'
    });
    assert.strictEqual(res.status, CorpusEngine.PublicDomainStatus.LIKELY_PUBLIC_DOMAIN);
    assert(res.ruleApplied.includes('Published < 1929'));
});

// 2. Coverage Scoring
test('calculateCoverageScore: multiple successful sources gives 100% and EXHAUSTIVE', () => {
    const evidences = [
        { source: 'Open Library', result_summary: 'Found 0 target matches. Total 16 editions.' },
        { source: 'Internet Archive', result_summary: 'Found 0 target matches. Total 7 editions.' }
    ];
    const cov = CorpusEngine.calculateCoverageScore(evidences, 2);
    assert.strictEqual(cov.score, 100);
    assert.strictEqual(cov.successCount, 2);
    assert.strictEqual(cov.failedCount, 0);
    assert.strictEqual(cov.qualityLabel, 'EXHAUSTIVE');
});

test('calculateCoverageScore: handles failed queries gracefully', () => {
    const evidences = [
        { source: 'Open Library', result_summary: 'Query failed with timeout' },
        { source: 'Internet Archive', result_summary: 'Found 0 matches.' }
    ];
    const cov = CorpusEngine.calculateCoverageScore(evidences, 2);
    assert.strictEqual(cov.score, 50);
    assert.strictEqual(cov.successCount, 1);
    assert.strictEqual(cov.failedCount, 1);
    assert.strictEqual(cov.qualityLabel, 'MODERATE');
});

// 3. Obscurity Heuristics
test('calculateObscurityScore: high circulation works rank as CANONICAL or WELL_KNOWN', () => {
    const canonical = CorpusEngine.calculateObscurityScore({
        editionsCount: 20,
        digitalizationsCount: 15,
        sitelinksCount: 10,
        holdingsCount: 5
    });
    assert(canonical.score <= 35, `Expected <= 35, got ${canonical.score}`);
    assert(canonical.label === CorpusEngine.ObscurityLabel.CANONICAL || canonical.label === CorpusEngine.ObscurityLabel.WELL_KNOWN);

    const obscure = CorpusEngine.calculateObscurityScore({
        editionsCount: 1,
        digitalizationsCount: 0,
        sitelinksCount: 0,
        holdingsCount: 0
    });
    assert(obscure.score >= 85, `Expected >= 85, got ${obscure.score}`);
    assert.strictEqual(obscure.label, CorpusEngine.ObscurityLabel.EXTREMELY_OBSCURE);
});

// 4. Epistemic Evidence Evaluation
test('evaluateAuditEvidence: zero target matches + high coverage yields STRONG_NO_TRANSLATION_EVIDENCE', () => {
    const evidences = [
        { source: 'Open Library', result_summary: 'Found 0 matches. Total 10 original editions.' },
        { source: 'Internet Archive', result_summary: 'Found 0 matches. Total 5 digital items.' }
    ];
    const res = CorpusEngine.evaluateAuditEvidence({
        targetLang: 'es',
        evidences,
        targetEditionsFound: 0,
        originalEditionsFound: 15
    });
    assert.strictEqual(res.status, CorpusEngine.TranslationStatus.STRONG_NO_TRANSLATION_EVIDENCE);
    assert.strictEqual(res.coverageScore, 100);
    assert(res.conclusionNotes.includes('evidencia negativa robusta'));
});

test('evaluateAuditEvidence: target matches found triggers TRANSLATION_POSSIBLE', () => {
    const evidences = [
        { source: 'Open Library', result_summary: 'Found 2 potential target language matches.' }
    ];
    const res = CorpusEngine.evaluateAuditEvidence({
        targetLang: 'es',
        evidences,
        targetEditionsFound: 2
    });
    assert.strictEqual(res.status, CorpusEngine.TranslationStatus.TRANSLATION_POSSIBLE);
    assert(res.conclusionNotes.includes('cotejo filológico manual'));
});

// 5. JSONL Parsing and Corpus Statistics on real initial_corpus.jsonl
test('parseCorpusJsonl: correctly parses initial_corpus.jsonl', () => {
    const jsonlPath = path.join(__dirname, '..', 'initial_corpus.jsonl');
    const content = fs.readFileSync(jsonlPath, 'utf8');
    const records = CorpusEngine.parseCorpusJsonl(content);

    assert.strictEqual(records.length, 50, `Expected 50 records, got ${records.length}`);
    const euler = records.find(r => r.title.includes('Euler') || (r.author && r.author.includes('Euler')));
    assert(euler, 'Should find Leonhard Euler work in initial corpus');
    assert.strictEqual(euler.status, CorpusEngine.TranslationStatus.STRONG_NO_TRANSLATION_EVIDENCE);
    assert.strictEqual(euler.pd_status, CorpusEngine.PublicDomainStatus.LIKELY_PUBLIC_DOMAIN);
});

test('computeCorpusStats: computes aggregate indicators for 50 records', () => {
    const jsonlPath = path.join(__dirname, '..', 'initial_corpus.jsonl');
    const records = CorpusEngine.parseCorpusJsonl(fs.readFileSync(jsonlPath, 'utf8'));
    const stats = CorpusEngine.computeCorpusStats(records);

    assert.strictEqual(stats.total, 50);
    assert.strictEqual(stats.strongNegativeEvidenceRatio, 100);
    assert.strictEqual(stats.publicDomainRatio, 96, '48 out of 50 are likely public domain (96%), 2 uncertain');
    assert.strictEqual(stats.pdCounts['UNCERTAIN'], 2);
    assert.strictEqual(stats.pdCounts['LIKELY_PUBLIC_DOMAIN'], 48);
    assert.strictEqual(stats.averageCoverage, 100);
    assert(stats.languages['de'] >= 45, 'German (de) should be the predominant original language');
});

// 6. Filtering
test('filterCorpus: filters by century, language and search query', () => {
    const jsonlPath = path.join(__dirname, '..', 'initial_corpus.jsonl');
    const records = CorpusEngine.parseCorpusJsonl(fs.readFileSync(jsonlPath, 'utf8'));

    const searchEuler = CorpusEngine.filterCorpus(records, { search: 'Euler' });
    assert.strictEqual(searchEuler.length, 1);
    assert.strictEqual(searchEuler[0].author, 'Leonhard Euler');

    const century18 = CorpusEngine.filterCorpus(records, { century: '18' });
    assert(century18.length >= 2, 'Should find 18th century works');
    century18.forEach(w => {
        const c = Math.ceil(w.estimated_year / 100);
        assert.strictEqual(c, 18);
    });
});

// 7. Editorial Dossier Generation
test('generateEditorialDossier: generates complete Markdown document with Domicilio indeterminado principles', () => {
    const sampleWork = {
        title: 'Versuch über die wahre Art das Clavier zu spielen',
        author: 'Carl Philipp Emanuel Bach',
        original_language: 'de',
        target_language: 'es',
        estimated_year: 1753,
        author_death_year: 1788,
        status: CorpusEngine.TranslationStatus.STRONG_NO_TRANSLATION_EVIDENCE,
        coverage_score: 100,
        pd_status: CorpusEngine.PublicDomainStatus.LIKELY_PUBLIC_DOMAIN,
        conclusion: 'No se identificó traducción al español en los catálogos consultados.',
        evidences: [
            { source: 'Open Library', query: 'Author+Title', result: 'Found 0 target matches. Total 14 editions.' },
            { source: 'Internet Archive', query: 'Author+Title', result: 'Found 0 target matches. Total 7 digital items.' }
        ]
    };

    const dossier = CorpusEngine.generateEditorialDossier(sampleWork);
    assert(dossier.includes('DOSSIER EDITORIAL ARQUEOLÓGICO'));
    assert(dossier.includes('Carl Philipp Emanuel Bach'));
    assert(dossier.includes('STRONG_NO_TRANSLATION_EVIDENCE'));
    assert(dossier.includes('No se traducen traducciones'));
    assert(dossier.includes('Domicilio indeterminado'));
    assert(dossier.includes('Open Library'));
});

console.log(`\nAll ${passedTests}/${totalTests} engine tests passed successfully!`);
