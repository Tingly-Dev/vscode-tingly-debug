// Test Go debugging configurations for main functions and test functions

import { languageRegistry } from '../modules/registry';
import { SymbolInfo } from '../config/debugCommandGenerator';

async function testGoMainFunction() {
    console.log('=== Testing Go Main Function Debug Configuration ===');

    // Test main function
    const mainSymbol: SymbolInfo = {
        name: 'main',
        path: ['main'],
        kind: 12 as any, // Function
        language: 'go',
        filePath: '/workspace/main.go',
        workspaceRoot: '/workspace'
    };

    try {
        const debugConfig = await languageRegistry.generateDebugConfig(mainSymbol);
        console.log('Generated main function debug config:', JSON.stringify(debugConfig, null, 2));

        // Verify main function config properties
        if (debugConfig.type === 'go' &&
            debugConfig.mode === 'debug' &&
            debugConfig.name.includes('main')) {
            console.log('✅ Main function debug configuration is correct!');
        } else {
            console.log('❌ Main function debug configuration has issues');
            console.log('Expected: type=go, mode=debug, name includes "main"');
            console.log(`Got: type=${debugConfig.type}, mode=${debugConfig.mode}, name=${debugConfig.name}`);
        }
    } catch (error) {
        console.error('❌ Error generating main function debug config:', error);
    }
}

async function testGoTestFunction() {
    console.log('\n=== Testing Go Test Function Debug Configuration ===');

    // Test test function
    const testSymbol: SymbolInfo = {
        name: 'TestAddition',
        path: ['TestAddition'],
        kind: 12 as any, // Function
        language: 'go',
        filePath: '/workspace/math_test.go',
        workspaceRoot: '/workspace'
    };

    try {
        const debugConfig = await languageRegistry.generateDebugConfig(testSymbol);
        console.log('Generated test function debug config:', JSON.stringify(debugConfig, null, 2));

        // Verify test function config properties
        if (debugConfig.type === 'go' &&
            debugConfig.mode === 'test' &&
            debugConfig.name.includes('TestAddition') &&
            debugConfig.args &&
            debugConfig.args.includes('-test.run') &&
            debugConfig.args.includes('^TestAddition$')) {
            console.log('✅ Test function debug configuration is correct!');
        } else {
            console.log('❌ Test function debug configuration has issues');
            console.log('Expected: type=go, mode=test, name includes "TestAddition", args contain "-test.run" and "^TestAddition$"');
            console.log(`Got: type=${debugConfig.type}, mode=${debugConfig.mode}, name=${debugConfig.name}, args=${JSON.stringify(debugConfig.args)}`);
        }
    } catch (error) {
        console.error('❌ Error generating test function debug config:', error);
    }
}

async function testGoBenchmarkFunction() {
    console.log('\n=== Testing Go Benchmark Function Debug Configuration ===');

    // Test benchmark function
    const benchmarkSymbol: SymbolInfo = {
        name: 'BenchmarkAddition',
        path: ['BenchmarkAddition'],
        kind: 12 as any, // Function
        language: 'go',
        filePath: '/workspace/math_test.go',
        workspaceRoot: '/workspace'
    };

    try {
        const debugConfig = await languageRegistry.generateDebugConfig(benchmarkSymbol);
        console.log('Generated benchmark function debug config:', JSON.stringify(debugConfig, null, 2));

        // Verify benchmark function config properties
        if (debugConfig.type === 'go' &&
            debugConfig.mode === 'test' &&
            debugConfig.name.includes('BenchmarkAddition') &&
            debugConfig.args &&
            debugConfig.args.includes('-test.run') &&
            debugConfig.args.includes('^BenchmarkAddition$')) {
            console.log('✅ Benchmark function debug configuration is correct!');
        } else {
            console.log('❌ Benchmark function debug configuration has issues');
            console.log('Expected: type=go, mode=test, name includes "BenchmarkAddition", args contain "-test.run" and "^BenchmarkAddition$"');
            console.log(`Got: type=${debugConfig.type}, mode=${debugConfig.mode}, name=${debugConfig.name}, args=${JSON.stringify(debugConfig.args)}`);
        }
    } catch (error) {
        console.error('❌ Error generating benchmark function debug config:', error);
    }
}

async function testGoRegularFunction() {
    console.log('\n=== Testing Go Regular Function Debug Configuration ===');

    // Test regular function
    const regularSymbol: SymbolInfo = {
        name: 'calculateSum',
        path: ['calculateSum'],
        kind: 12 as any, // Function
        language: 'go',
        filePath: '/workspace/utils.go',
        workspaceRoot: '/workspace'
    };

    try {
        const debugConfig = await languageRegistry.generateDebugConfig(regularSymbol);
        console.log('Generated regular function debug config:', JSON.stringify(debugConfig, null, 2));

        // Verify regular function config properties
        if (debugConfig.type === 'go' &&
            debugConfig.mode === 'auto' &&
            debugConfig.name.includes('calculateSum')) {
            console.log('✅ Regular function debug configuration is correct!');
        } else {
            console.log('❌ Regular function debug configuration has issues');
            console.log('Expected: type=go, mode=auto, name includes "calculateSum"');
            console.log(`Got: type=${debugConfig.type}, mode=${debugConfig.mode}, name=${debugConfig.name}`);
        }
    } catch (error) {
        console.error('❌ Error generating regular function debug config:', error);
    }
}

async function testGoDefaultConfigs() {
    console.log('\n=== Testing Go Default Configurations ===');

    // Test main.go default config
    try {
        const mainConfig = languageRegistry.getModule('go')?.defaultConfig(
            '/workspace/main.go',
            '/workspace'
        );

        console.log('main.go default config:', JSON.stringify(mainConfig, null, 2));

        if (mainConfig?.name.includes('Launch Main Package') && mainConfig?.mode === 'debug') {
            console.log('✅ main.go default configuration is correct!');
        } else {
            console.log('❌ main.go default configuration has issues');
        }
    } catch (error) {
        console.error('❌ Error generating main.go default config:', error);
    }

    // Test _test.go default config
    try {
        const testConfig = languageRegistry.getModule('go')?.defaultConfig(
            '/workspace/math_test.go',
            '/workspace'
        );

        console.log('_test.go default config:', JSON.stringify(testConfig, null, 2));

        if (testConfig?.name.includes('Launch Tests') && testConfig?.mode === 'test') {
            console.log('✅ _test.go default configuration is correct!');
        } else {
            console.log('❌ _test.go default configuration has issues');
        }
    } catch (error) {
        console.error('❌ Error generating _test.go default config:', error);
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Go debugging configuration tests...\n');

    await testGoMainFunction();
    await testGoTestFunction();
    await testGoBenchmarkFunction();
    await testGoRegularFunction();
    await testGoDefaultConfigs();

    console.log('\n✅ All Go debugging configuration tests completed!');
}

// Run tests
runAllTests().catch(error => {
    console.error('💥 Test execution failed:', error);
});