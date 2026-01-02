# Brespi

This is a work in progress with the following TODO's:

Execution
* Add descriptions and useful helper functions to each step
* ✅ ~Share the `Fields` enum between the `StepForm` and `StepTranslation` (rename the latter)~
* Add pagination to the execution overview
* Make sure pipelines are ordered from new to old in the `Configuration`
* Add support for MySQL backups and restores
* ✅ ~Provide runtime information when appropriate for specific steps~

Configuration
* Describe the red circle, and the entire configuration mechanism in general
* Provide buttons for "Save" and "Copy to Clipboard"

Schedules
* Implement cron-style scheduled pipeline executions

Policies
* Update the `ManagedStorageCapability` to track total sizes as well per `ArtifactIndex`
* Offer automated cleanup policies for both `S3 Upload` and `Filesystem Write`: last N versions, max X gigabyte (strict/lenient mode)
* Trigger these policies before/after every execution

QA
* Configure Playwright to use a `Dockerfile.e2e` which runs the app in "production" mode (unless port 3000 is already listening)
* Set up a pipeline for typechecking, unit testing and e2e testing
* Create a "regression suite" consisting of a healthy mix of possible data configurations, to try and detect accidental backwards-incompatible changes

Technical
* Use consistent casing in all form labels and E2E fixtures
* Create a reusable method for spreading a resource (step) object over form labels
* Refactor `null` into `undefined` or optional, so options can be added without requiring migrations
* Firefox: test canvas and `foreignObject`
* Webkit: attempt to migrate away from [`foreignObject`](https://bugs.webkit.org/show_bug.cgi?id=23113)

Polish
* Icons for each different step
* Automatically include the application version
* Background and footer link to org

Distribution
* Create a shell script for building docker images with the appropriate toolset (only requirements: git + bash + docker)
* ✅ ~Setup strategy for dealing with different Postgres/MySQL versions and corresponding dump/restore tools~
* Write a README.md, CONTRIBUTING.md and LICENSE.md
* Accept an (optional) environment variable with comma separated basic auth users

Marketing
* Create an accompanying landing page, with pretty and exhaustive documentation
* Move this repository to a different org
