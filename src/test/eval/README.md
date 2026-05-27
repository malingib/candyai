# Evaluation Harness

Run with:
```bash
npm run test
```

## Test files
- `rag-scoring.test.ts` — keyword recall and conciseness scoring against reference Q&A pairs
- Add new Q&A pairs to `REFERENCE_QA` array to expand coverage

## Scoring metrics
- **Keyword recall**: fraction of expected keywords present in the response (target >= 0.5)
- **Conciseness**: word-count based score (target >= 0.5)

## Adding new evaluations
1. Add entries to the `REFERENCE_QA` array with `q`, `a`, and `keywords`
2. Or add new test files in this directory matching `*.test.ts`
