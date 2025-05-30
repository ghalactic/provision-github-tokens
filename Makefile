GENERATED_FILES += src/schema/generated.requester-token-permissions.v1.schema.json src/schema/generated.provider-rule-permissions.v1.schema.json dist/main.cjs
JS_TSC_TYPECHECK_SKIP_LIB := true

-include .makefiles/Makefile
-include .makefiles/pkg/js/v1/Makefile
-include .makefiles/pkg/js/v1/with-npm.mk
-include .makefiles/pkg/js/v1/with-tsc.mk

.makefiles/%:
	@curl -sfL https://makefiles.dev/v1 | bash /dev/stdin "$@"

################################################################################

.PHONY: precommit
precommit:: verify-generated

################################################################################

src/schema/generated.requester-token-permissions.v1.schema.json src/schema/generated.provider-rule-permissions.v1.schema.json: script/build-github-schemas.js artifacts/link-dependencies.touch
	node "$<"

dist/main.cjs: script/build.js artifacts/link-dependencies.touch $(JS_SOURCE_FILES)
	node "$<" "$@"
