'use strict';

const VaultService = require('../lib/vault-service');
const { TOOL_DEFINITIONS } = require('../lib/tool-definitions');

const APP_NAME = 'Emma Memory Companion';
const APP_DESCRIPTION = 'A gentle memory companion that can recall, capture, and enrich family stories with full vault access.';
const APP_DEFAULT_MODEL = 'gpt-4.1-mini';
const APP_INSTRUCTIONS = [
  "You are Emma, a gentle memory companion designed to support families navigating dementia.",
  "Introduce yourself as Emma and explain that you protect the family's private memory vault.",
  "Use validation therapy techniques: acknowledge feelings, reflect emotions, and avoid correcting memories.",
  "When helpful, call the available vault tools to look up people, recall memories, or save new stories with photos.",
  "Be transparent about any tool calls and summarize the outcome for the user.",
  "Keep every interaction private and never fabricate vault data."
].join(' ');

let appsSdk = null;
try {
  // Lazy load the Apps SDK if it is installed in the host environment.
  appsSdk = require('@openai/applications');
} catch (error) {
  appsSdk = null;
}

function cloneParameters(parameters) {
  return parameters ? JSON.parse(JSON.stringify(parameters)) : undefined;
}

function buildToolExecutor(vaultService, schema) {
  return async (args = {}) => {
    return vaultService.execute(schema.name, args);
  };
}

function buildConfig(vaultService, options = {}) {
  const model = options.model || APP_DEFAULT_MODEL;

  return {
    name: APP_NAME,
    description: APP_DESCRIPTION,
    instructions: options.instructions || APP_INSTRUCTIONS,
    model,
    tools: TOOL_DEFINITIONS.map((schema) => ({
      name: schema.name,
      description: schema.description,
      parameters: cloneParameters(schema.parameters),
      execute: buildToolExecutor(vaultService, schema)
    }))
  };
}

function createEmmaApp(options = {}) {
  const vaultService = options.vaultService || new VaultService(options.vaultOptions || {});
  const config = buildConfig(vaultService, options);

  if (!appsSdk) {
    return config;
  }

  if (typeof appsSdk.createApp === 'function') {
    return appsSdk.createApp(config);
  }

  if (appsSdk.App && typeof appsSdk.tool === 'function') {
    const { App, tool } = appsSdk;
    return new App({
      name: config.name,
      description: config.description,
      model: config.model,
      instructions: config.instructions,
      tools: config.tools.map((toolSchema) =>
        tool({
          name: toolSchema.name,
          description: toolSchema.description,
          parameters: toolSchema.parameters,
          execute: toolSchema.execute
        })
      )
    });
  }

  return config;
}

function getEmmaAppManifest(options = {}) {
  const vaultService = options.vaultService || new VaultService(options.vaultOptions || {});
  const config = buildConfig(vaultService, options);
  return {
    name: config.name,
    description: config.description,
    model: config.model,
    instructions: config.instructions,
    tools: config.tools.map(({ name, description, parameters }) => ({
      type: 'function',
      name,
      description,
      parameters
    }))
  };
}

module.exports = {
  createEmmaApp,
  getEmmaAppManifest,
  APP_INSTRUCTIONS,
  APP_NAME,
  APP_DEFAULT_MODEL,
  APP_DESCRIPTION
};
