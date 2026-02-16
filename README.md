# Brespi

This is a work in progress with the following TODO's:

### Execution
* ✅ Add descriptions with label hovering/clicking mechanics to each step
* ✅ Share the `Fields` enum between the `StepForm` and `StepTranslation` (rename the latter)
* ✅ Add pagination to the execution overview
* ✅ Add support for MariaDB backups and restores
* ✅ Provide runtime information when appropriate for specific steps
* ✅ Setup strategy for dealing with different PostgreSQL/MariaDB versions and corresponding dump/restore tools

### Configuration
* ✅ Describe the red circle, and the entire configuration mechanism in general
* ✅ Provide buttons for "Save" and "Copy to Clipboard"
* ✅ Add basic auth support

### Schedules
* ✅ Implement cron-style scheduled pipeline executions

### Managed Storage
* ✅ Update the `ManagedStorageCapability` to track total sizes as well per `Listing`
* ✅ Offer automated cleanup policies for both `S3 Upload` and `Filesystem Write`: last N versions, max X gigabyte (strict/lenient mode)
* ✅ Trigger these policies before/after every execution

### Notifications
* ✅ Create a new nav item for "Notifications", and implement this on the server via EventBus
* ✅ Add support for Slack
* ✅ Add support for Custom Script

### QA
* ✅ Configure headless Playwright to run the app in "production" mode (unless port 3000 is already listening)
* ✅ Set up a pipeline for typechecking, unit testing and e2e testing
* ✅ Create a "regression suite" consisting of a healthy mix of possible data configurations, to try and detect accidental backwards-incompatible data changes
* ✅ Test the "regression suite" by introducing/mandating a new property on the `eventSubscription` object (an array of `pipelineIds`)

### Technical
* ✅ Implement more unit tests for adapters in the style of `FilesystemAdapter.spec.ts` which can be reasonably expected to execute on basic unix hosts (`CompressionAdapter`, `EncryptionAdapter`, `ScriptAdapter`)
* ✅ Use consistent casing in all form labels and E2E fixtures
* ✅ Firefox: test canvas and `foreignObject`
* ✅ Webkit: attempt to migrate away from [`foreignObject`](https://bugs.webkit.org/show_bug.cgi?id=23113)
* ✅ Bug: should be able to also link step arrows when editing a step (no matter if it's new or not); implement some kind of "after_submit" hook which defines the new relations afterwards?
* ✅ Bug: when you have multiple "Filter" steps (use the seed example) and you click them in the editor, their form details dont update in between clicking
* ✅ More e2e tests for the editor for both of the 2 bugs above
* ✅ Add e2e tests for the configuration flow (change something -> update -> save/discard -> changes in schedules automatically reflected -> etc etc)
* ✅ Make sure both Pipelines and Schedules are ordered from new to old in the `Configuration` with uuidv7
* ✅ Update `Decompression` and `Decryption` so they don't require any options maybe?
* ✅ Add a handful of "managed storage" folders to the regression suite, and implement a test to detect it when compatibility accidentally breaks
* ✅ Refactor `null` into `undefined` or optional, so options can be added without requiring migrations
* ✅ Refactor so the backend ALWAYS uses TZ=UTC for it's PlainDateTime objects ... but provide an environment option BRESPI_MANAGED_STORAGE_VERSIONING_TIMEZONE with a default of UTC (if people wanna see their versions in a particular timestamp) --- but the internal default for PlainDateTime should be UTC always
* ✅ Check if the `*Converter` classes can be made part of the Drizzle entity definition
* ✅ Allow env var references on all text fields via the ${...} syntax (on the right side; give an overview of detected env vars in orange; this also requires updating descriptions)
* ✅ Handle TODO comments

### Polish
* ✅ Icons for each different step
* ✅ Add a nice background
* Upgrade all dependencies
* Add a footer link

### Distribution
* ✅ Automatically include the application version
* ✅ Create a shell script for building docker images with the appropriate toolset (only requirements: sh + git + docker)
* Write a README.md, CONTRIBUTING.md and LICENSE.md

### Marketing
* Create an accompanying landing page, with how it works, how to use, and how to configure (no exhaustive documentation)
* Move this repository to a different org
