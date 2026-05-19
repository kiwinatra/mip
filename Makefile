.PHONY: help install build test clean release

help:
	@echo "Commands:"
	@echo "  make install   - Install dependencies"
	@echo "  make build     - Build binaries"
	@echo "  make test      - Run tests"
	@echo "  make clean     - Clean build artifacts"
	@echo "  make release   - Build release archives"

install:
	npm install

build:
	node scripts/build-release.js

test:
	node bin/mip.js --version
	node bin/mip.js init tmp/test
	cd tmp/test && node ../../bin/mip.js install lodash

clean:
	rm -rf node_modules .mip dist release tmp

release: clean install build
	@echo "✅ Release ready in release/"