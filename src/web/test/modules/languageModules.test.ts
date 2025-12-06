// Tests for language modules

import { languageRegistry } from '../../modules/registry';
import { SymbolInfo } from '../../config/debugCommandGenerator';

suite('Language Modules Test Suite', () => {

    test('Registry should initialize correctly', () => {
        const supportedLanguages = languageRegistry.getSupportedLanguages();
        console.log('Supported languages:', supportedLanguages);

        // Basic sanity check - registry should have some languages
        if (supportedLanguages.length === 0) {
            throw new Error('No languages registered');
        }
    });

    test('Should get modules correctly', () => {
        const python = languageRegistry.getModule('python');
        if (!python) {
            console.log('Python module not found');
        } else {
            console.log('Python module found:', python.displayName);
        }

        const go = languageRegistry.getModule('go');
        if (!go) {
            console.log('Go module not found');
        } else {
            console.log('Go module found:', go.displayName);
        }
    });

    test('Should detect module by file extension', () => {
        const pythonModule = languageRegistry.getModuleByExtension('py');
        console.log('Python by extension:', pythonModule?.displayName || 'Not found');

        const goModule = languageRegistry.getModuleByExtension('go');
        console.log('Go by extension:', goModule?.displayName || 'Not found');
    });

    test('Should handle unknown language gracefully', () => {
        const unknownModule = languageRegistry.getModule('unknown');
        if (unknownModule) {
            throw new Error('Unknown module should be undefined');
        }

        const unknownByExtension = languageRegistry.getModuleByExtension('unknown');
        if (unknownByExtension) {
            throw new Error('Unknown extension should return undefined');
        }
    });
});