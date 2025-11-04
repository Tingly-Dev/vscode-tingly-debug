import * as vscode from 'vscode';
import { DebugConfigurationProvider } from './debugTreeView';
import { ConfigurationData, LaunchCompound, LaunchConfiguration } from './types';

export class ConfigurationEditor {
    static openConfigurationEditor(
        config: LaunchConfiguration | LaunchCompound,
        provider: DebugConfigurationProvider
    ): void {
        // Only allow configuration settings for LaunchConfiguration, not compounds
        if ('configurations' in config) {
            vscode.window.showWarningMessage('Configuration settings are not available for compound configurations');
            return;
        }

        const launchConfig = config as LaunchConfiguration;

        // Create and show webview panel
        const panel = vscode.window.createWebviewPanel(
            'debugConfigSettings',
            `Configuration Settings: ${launchConfig.name}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Prepare configuration data for the webview
        const configData: ConfigurationData = {
            name: launchConfig.name,
            type: launchConfig.type,
            request: launchConfig.request,
            properties: { ...launchConfig }
        };

        // Remove basic properties from the properties object to show only custom properties
        delete (configData.properties as any).name;
        delete (configData.properties as any).type;
        delete (configData.properties as any).request;

        // Generate HTML for the webview
        panel.webview.html = this.getConfigurationSettingsWebviewContent(panel.webview, configData);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'browseEnvFile':
                        try {
                            await this.handleEnvFileBrowse(message.currentPath, panel, provider);
                        } catch (error) {
                            panel.webview.postMessage({
                                command: 'showEnvFileError',
                                message: `Failed to browse environment file: ${error}`
                            });
                        }
                        break;
                    case 'runConfiguration':
                        try {
                            // Save the configuration first
                            await provider.updateConfiguration(configData.name, message.config);

                            // Then start debugging without the 'launch' request type
                            const configToRun = { ...message.config };
                            if (configToRun.request === 'launch') {
                                configToRun.request = 'launch';
                            }

                            await vscode.debug.startDebugging(undefined, configToRun);
                            vscode.window.showInformationMessage(`Configuration "${configToRun.name}" is now running!`);
                            panel.dispose();
                        } catch (error) {
                            panel.webview.postMessage({
                                command: 'showError',
                                message: `Failed to run configuration: ${error}`
                            });
                        }
                        break;
                    case 'debugConfiguration':
                        try {
                            // Save the configuration first
                            await provider.updateConfiguration(configData.name, message.config);

                            // Then start debugging without the 'launch' request type
                            const configToDebug = { ...message.config };
                            if (configToDebug.request === 'launch') {
                                configToDebug.request = 'launch';
                            }

                            await vscode.debug.startDebugging(undefined, configToDebug);
                            vscode.window.showInformationMessage(`Configuration "${configToDebug.name}" is now debugging!`);
                            panel.dispose();
                        } catch (error) {
                            panel.webview.postMessage({
                                command: 'showError',
                                message: `Failed to debug configuration: ${error}`
                            });
                        }
                        break;
                    case 'saveConfiguration':
                        try {
                            const newName = message.config.name;
                            const oldName = configData.name;

                            // Check if name has changed and if there's a conflict
                            if (newName !== oldName) {
                                const launchJson = await provider.readLaunchJson();
                                const existingConfig = launchJson.configurations.find(config => config.name === newName);

                                if (existingConfig) {
                                    // Send error message back to webview
                                    panel.webview.postMessage({
                                        command: 'showError',
                                        message: `Configuration name "${newName}" already exists. Please choose a different name.`
                                    });
                                    return;
                                }
                            }

                            const updatedConfig: LaunchConfiguration = {
                                ...message.config
                            };

                            await provider.updateConfiguration(launchConfig.name, updatedConfig);
                            vscode.window.showInformationMessage(`Configuration "${newName}" updated successfully!`);
                            panel.dispose();
                        } catch (error) {
                            vscode.window.showErrorMessage(`Failed to update configuration: ${error}`);
                        }
                        break;
                    case 'cancel':
                        panel.dispose();
                        break;
                }
            },
            undefined,
            // Note: We don't have direct access to context.subscriptions here, but this is fine
            // as the webview panel will be properly disposed when the panel is closed
            []
        );
    }

    private static getCommonConfigurationTypes(): string[] {
        return [
            'node',
            'node-terminal',
            'python',
            'java',
            'cppdbg',
            'cppvsdbg',
            'chrome',
            'firefox',
            'msedge',
            'coreclr',
            'dart',
            'go',
            'php',
            'ruby',
            'lua',
            'rust',
            'elm',
            'mock',
            'pwa-node',
            'pwa-chrome',
            'pwa-msedge',
            'node2'
        ];
    }

    private static async handleEnvFileBrowse(currentPath: string, panel: vscode.WebviewPanel, provider: DebugConfigurationProvider): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder found');
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;

        // Replace ${workspaceFolder} with actual path
        const resolvedPath = currentPath.replace('${workspaceFolder}', workspaceRoot);

        try {
            // Check if file exists
            const fileUri = vscode.Uri.file(resolvedPath);
            const stat = await vscode.workspace.fs.stat(fileUri);

            // File exists, open it
            const document = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(document);

            // Set the path in the webview
            panel.webview.postMessage({
                command: 'setEnvFile',
                path: currentPath
            });

        } catch (error) {
            // File doesn't exist, offer to create it
            const createOption = 'Create File';
            const result = await vscode.window.showErrorMessage(
                `Environment file not found: ${resolvedPath}`,
                createOption,
                'Cancel'
            );

            if (result === createOption) {
                // Create the file with template content
                const templateContent = `# Environment variables
# Copy this template and modify as needed
NODE_ENV=development
API_URL=http://localhost:3000
`;

                const fileUri = vscode.Uri.file(resolvedPath);
                const encoder = new TextEncoder();
                await vscode.workspace.fs.writeFile(fileUri, encoder.encode(templateContent));

                // Open the newly created file
                const document = await vscode.workspace.openTextDocument(fileUri);
                await vscode.window.showTextDocument(document);

                // Set the path in the webview
                panel.webview.postMessage({
                    command: 'setEnvFile',
                    path: currentPath
                });

                vscode.window.showInformationMessage(`Environment file created: ${resolvedPath}`);
            }
        }
    }

    private static getConfigurationSettingsWebviewContent(webview: vscode.Webview, configData: ConfigurationData): string {
        // Generate type dropdown options
        const typeOptions = this.getCommonConfigurationTypes()
            .map(type => `<option value="${type}" ${type === configData.type ? 'selected' : ''}>${type}</option>`)
            .join('');

        // Extract env and envFile from properties, keep other properties separate
        const env = configData.properties.env || {};
        const envFile = configData.properties.envFile || '';
        const otherProperties = { ...configData.properties };
        delete otherProperties.env;
        delete otherProperties.envFile;

        // Generate env table rows
        const envRows = Object.entries(env)
            .map(([key, value], index) => {
                const displayValue = typeof value === 'string' ? value : JSON.stringify(value);
                return `
                    <tr data-index="${index}">
                        <td>
                            <input type="text" id="env-key-${index}" name="env-key-${index}" value="${key.replace(/"/g, '&quot;')}" placeholder="Environment variable name">
                        </td>
                        <td>
                            <input type="text" id="env-value-${index}" name="env-value-${index}" value="${displayValue.replace(/"/g, '&quot;')}" placeholder="Environment variable value">
                        </td>
                        <td class="env-actions">
                            <button type="button" class="env-btn remove" onclick="removeEnvRow(${index})" title="Remove variable">🗑️</button>
                        </td>
                    </tr>
                `;
            })
            .join('');

        const propertiesHtml = Object.entries(otherProperties)
            .map(([key, value]) => {
                const displayValue = typeof value === 'string' ? value : JSON.stringify(value);
                return `
                    <div class="field-group">
                        <label for="prop-${key}">${key}</label>
                        <input type="text" id="prop-${key}" name="${key}" value="${displayValue.replace(/"/g, '&quot;')}" placeholder="Enter ${key}">
                        <button type="button" class="remove-btn" onclick="removeField('${key}')">🗑️</button>
                    </div>
                `;
            })
            .join('');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configuration Settings</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header-actions {
            display: flex;
            gap: 8px;
        }
        .run-btn, .debug-btn {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 6px 12px;
            border: 1px solid var(--vscode-button-border);
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            cursor: pointer;
            border-radius: 3px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            transition: background-color 0.2s;
        }
        .run-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .debug-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
                .config-info {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            padding: 10px 15px;
            margin-bottom: 20px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 15px;
            color: var(--vscode-foreground);
        }
        .field-group {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            gap: 10px;
        }
        label {
            flex: 0 0 120px;
            font-size: 13px;
            color: var(--vscode-foreground);
        }
        input[type="text"], select {
            flex: 1;
            padding: 6px 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }
        input[type="text"]:focus, select:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }
        .hybrid-input {
            display: flex;
            gap: 5px;
            align-items: stretch;
            flex: 1;
        }
        .hybrid-input input[type="text"] {
            flex: 1;
        }
        .hybrid-input select {
            flex: 0 0 auto;
            min-width: 130px;
            max-width: 200px;
        }
        .or-divider {
            color: var(--vscode-foreground);
            font-size: 12px;
            padding: 0 5px;
            display: flex;
            align-items: center;
            opacity: 0.7;
            white-space: nowrap;
        }
        .env-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .env-table th,
        .env-table td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .env-table th {
            font-weight: bold;
            color: var(--vscode-foreground);
            font-size: 13px;
        }
        .env-table input[type="text"] {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            padding: 4px 6px;
        }
        .env-table input[type="text"]:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }
        .env-actions {
            display: flex;
            gap: 5px;
            justify-content: center;
        }
        .env-btn {
            background: none;
            border: 1px solid var(--vscode-button-border);
            color: var(--vscode-button-foreground);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 12px;
            font-family: var(--vscode-font-family);
        }
        .env-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .env-btn.remove {
            color: var(--vscode-errorForeground);
            border-color: var(--vscode-errorBorder);
        }
        .env-btn.remove:hover {
            background-color: var(--vscode-errorBackground);
        }
        .file-input-group {
            display: flex;
            gap: 8px;
            align-items: center;
            margin-top: 10px;
        }
        .file-input-group input[type="text"] {
            flex: 1;
        }
        .file-input-group button {
            flex: 0 0 auto;
            padding: 6px 12px;
            border: 1px solid var(--vscode-button-border);
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: pointer;
            border-radius: 3px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }
        .file-input-group button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .remove-btn {
            background: none;
            border: none;
            color: var(--vscode-icon-foreground);
            cursor: pointer;
            padding: 4px;
            border-radius: 3px;
            font-size: 16px;
        }
        .remove-btn:hover {
            background-color: var(--vscode-button-secondaryBackground);
        }
        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 30px;
            justify-content: flex-end;
        }
        button {
            padding: 8px 16px;
            border: 1px solid var(--vscode-button-border);
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            cursor: pointer;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            border-radius: 3px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        button.primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .add-field-section {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        .add-field-group {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .add-field-group input {
            flex: 1;
        }
        .json-view {
            margin-top: 20px;
            background-color: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            white-space: pre-wrap;
            max-height: 200px;
            overflow-y: auto;
        }
        .error-message {
            margin-top: 10px;
            padding: 10px;
            background-color: var(--vscode-errorBackground);
            border: 1px solid var(--vscode-errorBorder);
            border-radius: 4px;
            color: var(--vscode-errorForeground);
            font-size: var(--vscode-font-size);
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Configuration Settings</h2>
            <div class="header-actions">
                <button type="button" class="run-btn" onclick="runConfiguration()" title="Run configuration">
                    <span class="codicon codicon-play"></span> Run
                </button>
                <button type="button" class="debug-btn" onclick="debugConfiguration()" title="Debug configuration">
                    <span class="codicon codicon-debug-alt"></span> Debug
                </button>
            </div>
        </div>

        <form id="configForm">
        <div class="section">
            <div class="section-title">Basic Information</div>
            <div class="field-group">
                <label for="configName">Name</label>
                <input type="text" id="configName" name="name" value="${configData.name}" placeholder="Configuration name">
            </div>
            <div class="field-group">
                <label for="configType">Type</label>
                <div class="hybrid-input">
                    <input type="text" id="configType" name="type" value="${configData.type}" placeholder="Enter configuration type..." oninput="clearTypeSelect()">
                    <div class="or-divider">or</div>
                    <select id="configTypeSelect" onchange="updateTypeFromSelect()">
                        <option value="">Select preset...</option>
                        ${typeOptions}
                    </select>
                </div>
            </div>
            <div class="field-group">
                <label for="configRequest">Request</label>
                <div class="hybrid-input">
                    <input type="text" id="configRequest" name="request" value="${configData.request}" placeholder="Enter request type..." oninput="clearRequestSelect()">
                    <div class="or-divider">or</div>
                    <select id="configRequestSelect" onchange="updateRequestFromSelect()">
                        <option value="">Select preset...</option>
                        <option value="launch" ${configData.request === 'launch' ? 'selected' : ''}>launch</option>
                        <option value="attach" ${configData.request === 'attach' ? 'selected' : ''}>attach</option>
                    </select>
                </div>
            </div>
            <div id="errorMessage" class="error-message"></div>
        </div>

            <div class="section">
                <div class="section-title">Environment Variables</div>
                
                <div style="margin-bottom: 15px;">
                    <table class="env-table" id="envTable">
                        <thead>
                            <tr>
                                <th style="width: 35%;">Variable Name</th>
                                <th style="width: 45%;">Value</th>
                                <th style="width: 20%;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="envTableBody">
                            ${envRows}
                            ${envRows === '' ? '<tr id="emptyEnvRow"><td colspan="3" style="text-align: center; opacity: 0.6; padding: 20px;">No environment variables configured. Click "Add Variable" to get started.</td></tr>' : ''}
                        </tbody>
                    </table>
                    <div class="env-actions">
                        <button type="button" class="env-btn" onclick="addEnvRow()">➕ Add Variable</button>
                    </div>
                </div>

                <div class="file-input-group">
                    <label for="envFile" style="flex: 0 0 auto; min-width: 80px;">Env File:</label>
                    <input type="text" id="envFile" name="envFile" value="${envFile}" placeholder="\${workspaceFolder}/.env">
                    <button type="button" onclick="browseEnvFile()">Browse</button>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Configuration Properties</div>
                <div id="propertiesContainer">
                    ${propertiesHtml}
                </div>
            </div>

            <div class="add-field-section">
                <div class="section-title">Add New Property</div>
                <div class="add-field-group">
                    <input type="text" id="newPropName" placeholder="Property name">
                    <input type="text" id="newPropValue" placeholder="Property value">
                    <button type="button" onclick="addField()">Add Property</button>
                </div>
            </div>

            <div class="section">
                <div class="section-title">JSON Preview</div>
                <div id="jsonPreview" class="json-view"></div>
            </div>

            <div class="button-group">
                <button type="button" class="secondary" onclick="cancel()">Cancel</button>
                <button type="button" class="primary" onclick="saveConfiguration()">Save</button>
            </div>
        </form>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function updateTypeFromSelect() {
            const select = document.getElementById('configTypeSelect');
            const input = document.getElementById('configType');

            if (select.value) {
                input.value = select.value;
            }
            updateJsonPreview();
        }

        function updateRequestFromSelect() {
            const select = document.getElementById('configRequestSelect');
            const input = document.getElementById('configRequest');

            if (select.value) {
                input.value = select.value;
            }
            updateJsonPreview();
        }

        function clearTypeSelect() {
            document.getElementById('configTypeSelect').value = '';
        }

        function clearRequestSelect() {
            document.getElementById('configRequestSelect').value = '';
        }

        let envRowIndex = ${Object.keys(env).length};

        function addEnvRow() {
            const tbody = document.getElementById('envTableBody');

            // Remove empty state row if it exists
            const emptyRow = document.getElementById('emptyEnvRow');
            if (emptyRow) {
                emptyRow.remove();
            }

            const index = envRowIndex++;
            const row = document.createElement('tr');
            row.setAttribute('data-index', index);
            row.innerHTML = \`
                <td>
                    <input type="text" id="env-key-\${index}" name="env-key-\${index}" placeholder="Environment variable name">
                </td>
                <td>
                    <input type="text" id="env-value-\${index}" name="env-value-\${index}" placeholder="Environment variable value">
                </td>
                <td class="env-actions">
                    <button type="button" class="env-btn remove" onclick="removeEnvRow(\${index})" title="Remove variable">🗑️</button>
                </td>
            \`;
            tbody.appendChild(row);

            // Add event listeners to new inputs
            row.querySelectorAll('input[type="text"]').forEach(input => {
                input.addEventListener('input', updateJsonPreview);
            });

            // Focus on the key input field
            document.getElementById(\`env-key-\${index}\`).focus();

            updateJsonPreview();
        }

        function removeEnvRow(index) {
            const row = document.querySelector(\`#env-key-\${index}\`)?.closest('tr');
            if (row) {
                row.remove();

                // If no more rows, show empty state
                const tbody = document.getElementById('envTableBody');
                if (tbody.children.length === 0) {
                    tbody.innerHTML = \'<tr id="emptyEnvRow"><td colspan="3" style="text-align: center; opacity: 0.6; padding: 20px;">No environment variables configured. Click "Add Variable" to get started.</td></tr>\';
                }

                updateJsonPreview();
            }
        }

        function browseEnvFile() {
            const currentValue = document.getElementById('envFile').value;

            // Send message to extension to handle file browsing
            vscode.postMessage({
                command: 'browseEnvFile',
                currentPath: currentValue || '\${workspaceFolder}/.env'
            });
        }

        function getEnvObject() {
            const env = {};
            const envInputs = document.querySelectorAll('[id^="env-key-"]');

            envInputs.forEach(input => {
                const key = input.value.trim();
                const index = input.id.split('-')[2];
                const valueInput = document.getElementById(\`env-value-\${index}\`);
                const value = valueInput ? valueInput.value.trim() : '';

                if (key) {
                    env[key] = value;
                }
            });

            return env;
        }

        function updateJsonPreview() {
            const formData = new FormData(document.getElementById('configForm'));
            const config = {};

            // Add basic properties from form (name, type, request)
            for (let [key, value] of formData.entries()) {
                if (key && !key.startsWith('env-')) {
                    // Try to parse as JSON, otherwise keep as string
                    try {
                        config[key] = JSON.parse(value);
                    } catch {
                        config[key] = value;
                    }
                }
            }

            // Add environment variables
            const env = getEnvObject();
            if (Object.keys(env).length > 0) {
                config.env = env;
            }

            // Add env file if specified
            const envFile = document.getElementById('envFile').value.trim();
            if (envFile) {
                config.envFile = envFile;
            }

            document.getElementById('jsonPreview').textContent = JSON.stringify(config, null, 2);
        }

        function showError(message) {
            const errorElement = document.getElementById('errorMessage');
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }

        function hideError() {
            const errorElement = document.getElementById('errorMessage');
            errorElement.style.display = 'none';
        }

        function addField() {
            const name = document.getElementById('newPropName').value.trim();
            const value = document.getElementById('newPropValue').value.trim();

            if (!name) {
                alert('Please enter a property name');
                return;
            }

            const container = document.getElementById('propertiesContainer');
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'field-group';
            fieldDiv.innerHTML = \`
                <label for="prop-\${name}">\${name}</label>
                <input type="text" id="prop-\${name}" name="\${name}" value="\${value.replace(/"/g, '&quot;')}" placeholder="Enter \${name}">
                <button type="button" class="remove-btn" onclick="removeField('\${name}')">🗑️</button>
            \`;
            container.appendChild(fieldDiv);

            // Clear add field inputs
            document.getElementById('newPropName').value = '';
            document.getElementById('newPropValue').value = '';

            // Add event listener to new field
            fieldDiv.querySelector('input').addEventListener('input', updateJsonPreview);

            updateJsonPreview();
        }

        function removeField(fieldName) {
            const field = document.querySelector(\`input[name="\${fieldName}"]\`);
            if (field && field.parentElement) {
                field.parentElement.remove();
                updateJsonPreview();
            }
        }

        function saveConfiguration() {
            hideError(); // Hide any previous errors

            const formData = new FormData(document.getElementById('configForm'));
            const config = {};

            // Add basic properties from form (name, type, request)
            for (let [key, value] of formData.entries()) {
                if (key && !key.startsWith('env-')) {
                    // Try to parse as JSON, otherwise keep as string
                    try {
                        config[key] = JSON.parse(value);
                    } catch {
                        config[key] = value;
                    }
                }
            }

            // Add environment variables
            const env = getEnvObject();
            if (Object.keys(env).length > 0) {
                config.env = env;
            }

            // Add env file if specified
            const envFile = document.getElementById('envFile').value.trim();
            if (envFile) {
                config.envFile = envFile;
            }

            vscode.postMessage({
                command: 'saveConfiguration',
                config: config
            });
        }

        function cancel() {
            vscode.postMessage({
                command: 'cancel'
            });
        }

        function runConfiguration() {
            hideError(); // Hide any previous errors

            // Get current configuration
            const formData = new FormData(document.getElementById('configForm'));
            const config = {};

            // Add basic properties from form (name, type, request)
            for (let [key, value] of formData.entries()) {
                if (key && !key.startsWith('env-')) {
                    // Try to parse as JSON, otherwise keep as string
                    try {
                        config[key] = JSON.parse(value);
                    } catch {
                        config[key] = value;
                    }
                }
            }

            // Add environment variables
            const env = getEnvObject();
            if (Object.keys(env).length > 0) {
                config.env = env;
            }

            // Add env file if specified
            const envFile = document.getElementById('envFile').value.trim();
            if (envFile) {
                config.envFile = envFile;
            }

            // Send run command
            vscode.postMessage({
                command: 'runConfiguration',
                config: config
            });
        }

        function debugConfiguration() {
            hideError(); // Hide any previous errors

            // Get current configuration
            const formData = new FormData(document.getElementById('configForm'));
            const config = {};

            // Add basic properties from form (name, type, request)
            for (let [key, value] of formData.entries()) {
                if (key && !key.startsWith('env-')) {
                    // Try to parse as JSON, otherwise keep as string
                    try {
                        config[key] = JSON.parse(value);
                    } catch {
                        config[key] = value;
                    }
                }
            }

            // Add environment variables
            const env = getEnvObject();
            if (Object.keys(env).length > 0) {
                config.env = env;
            }

            // Add env file if specified
            const envFile = document.getElementById('envFile').value.trim();
            if (envFile) {
                config.envFile = envFile;
            }

            // Send debug command
            vscode.postMessage({
                command: 'debugConfiguration',
                config: config
            });
        }

        // Add event listeners to all existing fields
        document.querySelectorAll('input[type="text"]').forEach(input => {
            input.addEventListener('input', updateJsonPreview);
        });

        // Add event listeners to select dropdowns
        document.querySelectorAll('select').forEach(select => {
            select.addEventListener('change', updateJsonPreview);
        });

        // Add event listeners to env table inputs
        document.querySelectorAll('#envTableBody input[type="text"]').forEach(input => {
            input.addEventListener('input', updateJsonPreview);
        });

        // Add event listener to envFile input
        const envFileInput = document.getElementById('envFile');
        if (envFileInput) {
            envFileInput.addEventListener('input', updateJsonPreview);
        }

        // Initialize select dropdowns based on current input values
        const commonTypes = ${JSON.stringify(this.getCommonConfigurationTypes())};
        const typeInput = document.getElementById('configType');
        const typeSelect = document.getElementById('configTypeSelect');
        if (typeInput.value && commonTypes.includes(typeInput.value)) {
            typeSelect.value = typeInput.value;
        }

        const requestInput = document.getElementById('configRequest');
        const requestSelect = document.getElementById('configRequestSelect');
        if (['launch', 'attach'].includes(requestInput.value)) {
            requestSelect.value = requestInput.value;
        }

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'showError':
                    showError(message.message);
                    break;
                case 'setEnvFile':
                    document.getElementById('envFile').value = message.path;
                    updateJsonPreview();
                    break;
                case 'showEnvFileError':
                    showError(message.message);
                    break;
            }
        });

        // Initial JSON preview
        updateJsonPreview();
    </script>
</body>
</html>`;
    }
}