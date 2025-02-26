# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2025-02-26

### Fixed

- The check to avoid making a verifiable credentials version of a resource that already is a verifiable credentials version now also works
if data source is not json(ld) ([internal issue #6](https://gitlab.ilabt.imec.be/KNoWS/projects/onto-deside/helper/-/issues/6)).

## [0.2.0] - 2025-02-26

### Added

- An option to specify how deep to search for data sources in the index ([internal issue #4](https://gitlab.ilabt.imec.be/KNoWS/projects/onto-deside/helper/-/issues/4)).
- A check to avoid making a verifiable credentials version of a resource that already is a verifiable credentials version  ([internal issue #5](https://gitlab.ilabt.imec.be/KNoWS/projects/onto-deside/helper/-/issues/5)).

### Changed

- The Solid Community server in the test infrastructure is configured with local copies of context files that might otherwise
result in HTTP status 429 "Too Many Requests" when searching for index files with a depth > 0
([internal issue #3](https://gitlab.ilabt.imec.be/KNoWS/projects/onto-deside/helper/-/issues/3)).
- Tests are now automated.

## [0.1.0] - 2025-02-17

First release.

[Unreleased]: https://github.com/KNowledgeOnWebScale/solid-ocp-helper/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/KNowledgeOnWebScale/solid-ocp-helper/releases/tag/v0.2.1
[0.2.0]: https://github.com/KNowledgeOnWebScale/solid-ocp-helper/releases/tag/v0.2.0
[0.1.0]: https://github.com/KNowledgeOnWebScale/solid-ocp-helper/releases/tag/v0.1.0
