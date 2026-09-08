# docs: replace the cloud-dependent quick start with an executable local example

The current README example references a private S3 location and constructs a
supplier frame with unequal column lengths. Replace it with synthetic local
Parquet data, a function-backed supplier table, and a join on the actual supplier
relationship. Collect the query before the temporary file is removed.

The displayed JSON is captured from executing the example. Two tests verify its
schema, filtered IDs, supplier join results, embedded README source and output.
Both pass on Ubuntu 24.04.4/Python 3.12.3. The Linux command explicitly disables
EC2 metadata discovery because upstream currently requests boto3 storage options
for local files too; no real credentials or cloud service are needed.

This branch starts independently at
`1749911db5112858f06ebc1f4b6e614c63ecddeb` and contains no D1 filter changes.
The branch is based on the current upstream `main` and can be reviewed independently.
Developed with AI assistance; the example uses only authored synthetic data.
Maintainer edits are enabled.

Independent hosted verification of this exact submitted commit [passed](https://github.com/zack-dev-cm/neuralink-contributions/actions/runs/34191476771) on Ubuntu 24.04. The documented local example runs and both schema/join/documentation tests pass. This is evidence from the contributor repository; upstream required CI remains subject to maintainer approval.
