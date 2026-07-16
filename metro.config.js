const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Adiciona suporte para carregar arquivos WebAssembly (.wasm) como Assets (estáticos)
// Isso impede que o Metro tente compilar o binário WASM como se fosse JavaScript.
config.resolver.assetExts.push('wasm');

module.exports = config;
