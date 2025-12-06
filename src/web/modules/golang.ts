// Go language debugging module

import { LanguageModule, LanguageDebugConfig, LanguageTestConfig } from './types';
import { SymbolInfo } from '../config/debugCommandGenerator';

/**
 * Check if a symbol is a Go test function or main function
 */
function isGoTestFunction(symbol: SymbolInfo): boolean {
    // Check if file name indicates test file
    const isTestFile = symbol.filePath.endsWith('_test.go');
    const isTestSymbol = symbol.name.startsWith('Test') ||
                         symbol.name.startsWith('Benchmark') ||
                         symbol.name.startsWith('Example');

    return isTestFile && isTestSymbol;
}

function isGoMainFunction(symbol: SymbolInfo): boolean {
    return symbol.name === 'main' && symbol.path.includes('main');
}

/**
 * Get the directory path containing the Go file relative to workspace
 */
function getFileDirectoryPath(filePath: string, workspaceRoot: string): string {
    // Get directory containing the file
    const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));

    // Handle case where there's no directory separator
    if (dirPath === filePath) {
        return '${workspaceFolder}';
    }

    // Convert to workspace-relative path if possible
    if (workspaceRoot && filePath.startsWith(workspaceRoot)) {
        const relativePath = filePath.substring(workspaceRoot.length).replace(/^\//, '');
        const relativeDirPath = relativePath.substring(0, relativePath.lastIndexOf('/'));
        return relativeDirPath ? '${workspaceFolder}/' + relativeDirPath : '${workspaceFolder}';
    }

    // Fallback to absolute path if workspace root not available
    return dirPath;
}

/**
 * Generate intelligent debug config for Go symbols
 */
function generateGoDebugConfig(symbol: SymbolInfo): LanguageDebugConfig {
    const fileDirPath = getFileDirectoryPath(symbol.filePath, symbol.workspaceRoot);

    if (isGoTestFunction(symbol)) {
        // Test function debug config using file directory
        return {
            name: `Go Test: ${symbol.name}`,
            type: 'go',
            request: 'launch',
            mode: 'test',
            program: fileDirPath,
            args: [
                '-test.run', `^${symbol.name}$`,
                '-test.v'
            ],
            env: {
                'GOPATH': '${workspaceFolder}',
                'GO111MODULE': 'on'
            }
        };
    } else if (isGoMainFunction(symbol)) {
        // Main function debug config using file directory
        return {
            name: `Go Debug: ${symbol.name} (${fileDirPath})`,
            type: 'go',
            request: 'launch',
            mode: 'debug',
            program: fileDirPath,
            env: {
                'GOPATH': '${workspaceFolder}',
                'GO111MODULE': 'on'
            }
        };
    } else {
        // Regular function debug config using file directory
        return {
            name: `Go Debug: ${symbol.name} (${fileDirPath})`,
            type: 'go',
            request: 'launch',
            mode: 'auto',
            program: fileDirPath,
            env: {
                'GOPATH': '${workspaceFolder}',
                'GO111MODULE': 'on'
            }
        };
    }
}

export const golangModule: LanguageModule = {
    language: 'go',
    displayName: 'Go',
    fileExtensions: ['go'],
    defaultDebugType: 'go',

    frameworks: [
        {
            name: 'go-test',
            filePatterns: ['**/*_test.go', 'go.mod', 'go.sum'],
            priority: 10,
            debugConfig: generateGoDebugConfig,
            testConfig: (symbol: SymbolInfo): LanguageTestConfig => {
                const fileDirPath = getFileDirectoryPath(symbol.filePath, symbol.workspaceRoot);

                return {
                    framework: 'go-test',
                    testCommand: 'go test',
                    args: isGoTestFunction(symbol)
                        ? ['-run', `^${symbol.name}$`, '-v', fileDirPath]
                        : ['-v', fileDirPath],
                    cwd: fileDirPath,
                    env: {
                        'GOPATH': '${workspaceFolder}',
                        'GO111MODULE': 'on'
                    }
                };
            },
            setupInstructions: 'Install Go and Delve debugger for test debugging',
            requirements: ['Go 1.18+', 'Delve debugger', 'Go extension for VS Code']
        },
        {
            name: 'go-main',
            filePatterns: ['**/main.go', 'go.mod'],
            priority: 8,
            debugConfig: generateGoDebugConfig,
            setupInstructions: 'Ensure main function is properly structured for debugging',
            requirements: ['Go 1.18+', 'Delve debugger', 'Go extension for VS Code']
        }
    ],

    defaultConfig: (filePath: string, workspaceRoot: string): LanguageDebugConfig => {
        const fileName = filePath.split(/[\/\\]/).pop() || '';
        const fileDirPath = getFileDirectoryPath(filePath, workspaceRoot);

        // Smart default based on file name - matching VSCode auto-generated config
        if (fileName === 'main.go') {
            return {
                name: 'Launch file',
                type: 'go',
                request: 'launch',
                mode: 'debug',
                program: '${file}',
                env: {
                    'GOPATH': '${workspaceFolder}',
                    'GO111MODULE': 'on'
                }
            };
        } else if (fileName.endsWith('_test.go')) {
            return {
                name: 'Go: Launch Tests',
                type: 'go',
                request: 'launch',
                mode: 'test',
                program: fileDirPath,
                args: ['-test.v'],
                env: {
                    'GOPATH': '${workspaceFolder}',
                    'GO111MODULE': 'on'
                }
            };
        } else {
            return {
                name: `Go: Launch Package (${fileDirPath})`,
                type: 'go',
                request: 'launch',
                mode: 'auto',
                program: fileDirPath,
                env: {
                    'GOPATH': '${workspaceFolder}',
                    'GO111MODULE': 'on'
                }
            };
        }
    },

    setupInstructions: `
# Go Debugging Setup

## Required Extensions
1. **Go** (golang.go) - Official Go extension from Google

## Installation
\`\`\`bash
# Install Go (if not already installed)
# macOS: brew install go
# Ubuntu: sudo apt install golang-go
# Windows: Download from golang.org

# Install Delve debugger
go install github.com/go-delve/delve/cmd/dlv@latest

# Add Delve to PATH (add to ~/.zshrc, ~/.bashrc, etc.)
export PATH="$PATH:$(go env GOPATH)/bin"
\`\`\`

## VSCode Configuration
1. Install the Go extension
2. Open a Go file - VSCode will prompt to install additional tools
3. Accept the installation of gopls, dlv, and other tools

## Debugging Support

### 🏃‍♂️ Main Function Debugging
The extension automatically detects main functions and provides optimal debugging:

**When selecting a main function:**
- Uses \`debug\` mode for step-by-step debugging
- Launches the entire package with main as entry point
- Supports command line arguments
- Full breakpoint and variable inspection

**Example main function:**
\`\`\`go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!") // Set breakpoints here
    // Your main logic
}
\`\`\`

**Generated Debug Configuration:**
\`\`\`json
{
    "name": "Go: main (main.go)",
    "type": "go",
    "request": "launch",
    "mode": "debug",
    "program": "\${file}",
    "console": "integratedTerminal"
}
\`\`\`

### 🧪 Test Function Debugging
Smart detection for test functions with enhanced debugging:

**Supported test types:**
- \`TestXxx\` - Unit tests
- \`BenchmarkXxx\` - Performance benchmarks
- \`ExampleXxx\` - Example functions

**Example test function:**
\`\`\`go
package main

import "testing"

func TestAddition(t *testing.T) {
    result := 2 + 2
    expected := 4
    if result != expected {
        t.Errorf("Expected %d, got %d", expected, result)
    }
}
\`\`\`

**Generated Debug Configuration:**
\`\`\`json
{
    "name": "Go Test: TestAddition",
    "type": "go",
    "request": "launch",
    "mode": "test",
    "program": "\${workspaceFolder}/path/to/package",
    "args": ["-test.run", "^TestAddition$", "-test.v"]
}
\`\`\`

### 🔧 Smart Default Configurations

The extension provides intelligent defaults based on file context:

1. **main.go files** → Debug mode (step debugging)
2. ***_test.go files** → Test mode (run specific test)
3. **Other .go files** → Auto mode (smart detection)

## Usage Tips

1. **Main Function Debugging:**
   - Click on or select any main function
   - Use "Debug Function" command
   - Set breakpoints in your main function

2. **Test Debugging:**
   - Click on or select any Test\*, Benchmark\*, or Example\* function
   - Use "Debug Function" command
   - Test will run with debugger attached

3. **Package Debugging:**
   - Right-click on a Go file
   - Select "Debug File" for package-level debugging
   - Extension will choose appropriate mode automatically

## Common Issues
- Ensure Delve is installed and in your PATH
- Make sure GOPATH and GOROOT are properly set
- For workspace: use Go 1.18+ for better debugging support
- Verify the Go extension tools are installed correctly
- If debugging main function fails, ensure the file contains a proper main package
- Test functions must be in files ending with \`\_test.go\`
    `,

    requirements: ['Go 1.18+', 'Delve debugger', 'Go extension for VS Code'],
    documentation: 'https://code.visualstudio.com/docs/go/go-tutorial'
};