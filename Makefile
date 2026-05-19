GENERATED_FILES += src/schema/generated.requester-token-permissions.v1.schema.json src/schema/generated.provider-rule-permissions.v1.schema.json dist/main.js dist/main.js.map
GENERATED_FILES += examples/external-scheduler/cloudflare-worker/dist/index.js examples/external-scheduler/cloudflare-worker/dist/index.js.map examples/external-scheduler/aws-lambda/dist/index.mjs examples/external-scheduler/aws-lambda/dist/index.mjs.map examples/external-scheduler/gcp-cloud-run/dist/index.mjs examples/external-scheduler/gcp-cloud-run/dist/index.mjs.map examples/external-scheduler/azure-function/dist/index.mjs examples/external-scheduler/azure-function/dist/index.mjs.map
JS_TSC_TYPECHECK_SKIP_LIB := true

-include .makefiles/Makefile
-include .makefiles/pkg/js/v1/Makefile
-include .makefiles/pkg/js/v1/with-pnpm.mk
-include .makefiles/pkg/js/v1/with-tsc.mk

.makefiles/%:
	@curl -sfL https://makefiles.dev/v1 | bash /dev/stdin "$@"

################################################################################

.PHONY: vale
vale: artifacts/vale/sync.touch
	vale .

.PHONY: lint
lint:: vale

.PHONY: precommit
precommit:: vale verify-generated

################################################################################

src/schema/generated.requester-token-permissions.v1.schema.json src/schema/generated.provider-rule-permissions.v1.schema.json: script/build-github-schemas.ts artifacts/link-dependencies.touch
	node "$<"

dist/main.js dist/main.js.map: script/build.ts artifacts/link-dependencies.touch $(JS_SOURCE_FILES)
	node "$<" "$@"

examples/external-scheduler/cloudflare-worker/dist/index.js examples/external-scheduler/cloudflare-worker/dist/index.js.map examples/external-scheduler/aws-lambda/dist/index.mjs examples/external-scheduler/aws-lambda/dist/index.mjs.map examples/external-scheduler/gcp-cloud-run/dist/index.mjs examples/external-scheduler/gcp-cloud-run/dist/index.mjs.map examples/external-scheduler/azure-function/dist/index.mjs examples/external-scheduler/azure-function/dist/index.mjs.map: script/build-external-schedulers.ts artifacts/link-dependencies.touch $(JS_SOURCE_FILES)
	node "$<"

artifacts/vale/sync.touch: .vale.ini
	@mkdir -p "$(@D)"
	vale sync
	@touch "$@"
