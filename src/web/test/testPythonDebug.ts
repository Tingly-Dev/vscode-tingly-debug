// Simple test to verify Python debugging configuration generation

import { languageRegistry } from '../modules/registry';
import { SymbolInfo } from '../config/debugCommandGenerator';

async function testPythonDebug() {
    console.log('Testing Python debug configuration generation...');

    // Test Python symbol
    const pythonSymbol: SymbolInfo = {
        name: 'test_example',
        path: ['TestClass', 'test_example'],
        kind: 12 as any, // Method
        language: 'python',
        filePath: '/workspace/test_example.py',
        workspaceRoot: '/workspace'
    };

    try {
        const debugConfig = await languageRegistry.generateDebugConfig(pythonSymbol);
        console.log('Generated Python debug config:', JSON.stringify(debugConfig, null, 2));

        // Check basic properties
        if (debugConfig.type === 'python' && debugConfig.name.includes('test_example')) {
            console.log('✅ Python debug configuration generated successfully!');
        } else {
            console.log('❌ Python debug configuration has issues');
        }
    } catch (error) {
        console.error('❌ Error generating Python debug config:', error);
    }
}

async function testGoDebug() {
    console.log('Testing Go debug configuration generation...');

    // Test Go symbol
    const goSymbol: SymbolInfo = {
        name: 'TestExample',
        path: ['TestExample'],
        kind: 12 as any, // Method
        language: 'go',
        filePath: '/workspace/example_test.go',
        workspaceRoot: '/workspace'
    };

    try {
        const debugConfig = await languageRegistry.generateDebugConfig(goSymbol);
        console.log('Generated Go debug config:', JSON.stringify(debugConfig, null, 2));

        // Check basic properties
        if (debugConfig.type === 'go' && debugConfig.name.includes('TestExample')) {
            console.log('✅ Go debug configuration generated successfully!');
        } else {
            console.log('❌ Go debug configuration has issues');
        }
    } catch (error) {
        console.error('❌ Error generating Go debug config:', error);
    }
}

// Run tests
testPythonDebug().then(() => {
    testGoDebug().then(() => {
        console.log('All tests completed!');
    });
});