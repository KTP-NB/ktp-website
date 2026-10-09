# Job Board Source Next Steps

Jobright repositories appear to use the intern-list ecosystem as an upstream source. For the MVP, keep Jobright as the low-maintenance structured GitHub source and measure its latency, category coverage, and duplicate rate before adding another ingestion path.

Direct intern-list ingestion can be considered later if Jobright misses or delays meaningful listings for KTP members. Any future direct source must feed the same canonical ingestion pipeline:

```text
source registry
-> provider fetch
-> parser
-> normalized job record
-> canonical URL/fingerprint dedupe
-> job_board_jobs
-> job_board_source_links
-> job_board_ingestion_runs
```

Do not build separate database insertion logic for intern-list or any other provider.
