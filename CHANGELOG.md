# Change Log

All notable changes to the "ddd" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.


## [0.0.2] - 2025-11-04

### Added
- ✅ Support creating debug configurations from symbols with test suite integration (e.g., pytest for Python)
- ✅ New command to generate debug configurations from test symbols

### Fixed
- ✅ Bugfix: resolved sync errors and JSONC parse errors in launch.json handling
- ✅ Improved error handling for configuration synchronization

### Changed
- ✅ Refactored code to improve modularity and maintainability
- ✅ Removed duplicate run commands since debug commands provide the same functionality for configuration
- ✅ Optimized launch.json loading to process `configuration` section only
- ✅ Enhanced UI strings for better user experience 

## [0.0.1]

First release with core features for run/debug configuration and management.

- ✅ Configuration tree view with icons
- ✅ Launch.json synchronization
- ✅ Add, edit, delete, duplicate operations
- ✅ Run and debug functionality
- ✅ Compound configuration support
- ✅ Visual configuration editor
- ✅ Quick configuration from files

## [Unreleased]
