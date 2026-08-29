# IEMS - Excel Import Fix

This build keeps the Vercel Services architecture and changes the Master Excel import so `stage_daily` rows are inserted in PostgreSQL batches of 500 instead of one SQL statement per daily row.

This addresses `canceling statement due to statement timeout` caused by a large number of individual database statements during import.

No database reset is performed by this change.
