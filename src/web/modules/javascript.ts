// JavaScript/TypeScript language debugging module

import * as vscode from 'vscode';
import { LanguageModule, LanguageFramework, LanguageDebugConfig, LanguageTestConfig } from './types';
import { SymbolInfo } from '../config/debugCommandGenerator';

export const javascriptModule: LanguageModule = {
    language: 'javascript',
    displayName: 'JavaScript/TypeScript',
    fileExtensions: ['js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx'],
    defaultDebugType: 'node',

    frameworks: [
        {
            name: 'jest',
            filePatterns: ['**/*.test.js', '**/*.test.ts', '**/*.spec.js', '**/*.spec.ts', '**/test/**', '**/tests/**', 'jest.config.*', 'package.json'],
            priority: 10,
            debugConfig: (symbol: SymbolInfo): LanguageDebugConfig => {
                const isTypeScript = symbol.filePath.endsWith('.ts') || symbol.filePath.endsWith('.tsx');
                return {
                    name: `Jest: ${symbol.name}`,
                    type: 'node',
                    request: 'launch',
                    program: '\${workspaceFolder}/node_modules/.bin/jest',
                    args: ['--runInBand', '--testNamePattern', symbol.name],
                    cwd: '${workspaceFolder}',
                    console: 'integratedTerminal',
                    env: isTypeScript ? {
                        'TS_NODE_PROJECT': '\${workspaceFolder}/tsconfig.json'
                    } : undefined,
                    runtimeArgs: isTypeScript ? ['-r', 'ts-node/register'] : undefined,
                    windows: {
                        program: '\${workspaceFolder}/node_modules/jest/bin/jest'
                    }
                };
            },
            testConfig: (symbol: SymbolInfo): LanguageTestConfig => ({
                framework: 'jest',
                testCommand: 'jest',
                args: ['--runInBand', '--testNamePattern', symbol.name],
                cwd: '${workspaceFolder}'
            }),
            setupInstructions: 'Install Jest: npm install --save-dev jest',
            requirements: ['Node.js', 'Jest', 'TypeScript (for TS projects)']
        },
        {
            name: 'mocha',
            filePatterns: ['**/test/**', '**/tests/**', '*test.js', '*test.ts', '*spec.js', '*spec.ts', 'mocha.opts'],
            priority: 5,
            debugConfig: (symbol: SymbolInfo): LanguageDebugConfig => ({
                name: `Mocha: ${symbol.name}`,
                type: 'node',
                request: 'launch',
                program: '\${workspaceFolder}/node_modules/.bin/mocha',
                args: ['--grep', symbol.name],
                cwd: '${workspaceFolder}',
                console: 'integratedTerminal',
                runtimeArgs: symbol.filePath.endsWith('.ts') ? ['-r', 'ts-node/register'] : undefined,
                env: symbol.filePath.endsWith('.ts') ? {
                    'TS_NODE_PROJECT': '\${workspaceFolder}/tsconfig.json'
                } : undefined
            }),
            testConfig: (symbol: SymbolInfo): LanguageTestConfig => ({
                framework: 'mocha',
                testCommand: 'mocha',
                args: ['--grep', symbol.name],
                cwd: '${workspaceFolder}'
            }),
            setupInstructions: 'Install Mocha: npm install --save-dev mocha',
            requirements: ['Node.js', 'Mocha', 'TypeScript (for TS projects)']
        }
    ],

    defaultConfig: (filePath: string, workspaceRoot: string): LanguageDebugConfig => {
        const relativePath = filePath.replace(workspaceRoot, '').replace(/^[\/\\]/, '');
        const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');

        return {
            name: isTypeScript ? 'Node.js: TypeScript File' : 'Node.js: JavaScript File',
            type: 'node',
            request: 'launch',
            program: `\${workspaceFolder}/${relativePath}`,
            cwd: '${workspaceFolder}',
            console: 'integratedTerminal',
            runtimeArgs: isTypeScript ? ['-r', 'ts-node/register'] : undefined,
            env: isTypeScript ? {
                'TS_NODE_PROJECT': '\${workspaceFolder}/tsconfig.json'
            } : undefined
        };
    },

    setupInstructions: `
# JavaScript/TypeScript Debugging Setup

## Required Extensions
1. **JavaScript Debugger** (ms-vscode.js-debug) - Usually built into VS Code
2. **TypeScript and JavaScript Language Features** (ms-vscode.vscode-typescript-next) - Built-in

## Installation
\`\`\`bash
# Install Node.js (if not already installed)
# macOS: brew install node
# Ubuntu: sudo apt install nodejs npm
# Windows: Download from nodejs.org

# Install TypeScript (for TypeScript projects)
npm install -g typescript ts-node

# Install testing frameworks (as needed)
npm install --save-dev jest
npm install --save-dev mocha
\`\`\`

## VSCode Configuration
For TypeScript projects, ensure your tsconfig.json is properly configured.

## Common Launch Configurations
\`\`\`json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Node.js: Launch File",
            "type": "node",
            "request": "launch",
            "program": "\${workspaceFolder}/index.js"
        },
        {
            "name": "Node.js: TypeScript File",
            "type": "node",
            "request": "launch",
            "program": "\${workspaceFolder}/index.ts",
            "runtimeArgs": ["-r", "ts-node/register"],
            "env": {
                "TS_NODE_PROJECT": "\${workspaceFolder}/tsconfig.json"
            }
        }
    ]
}
\`\`\`

## Common Issues
- Ensure ts-node is installed for TypeScript debugging
- Check that your tsconfig.json is valid
- For Jest/Mocha, make sure test files are properly named
- Verify node_modules directory exists and contains required packages
    `,

    requirements: ['Node.js 14+', 'TypeScript (for TS projects)', 'Testing framework of choice'],
    documentation: 'https://code.visualstudio.com/docs/nodejs/nodejs-tutorial'
};