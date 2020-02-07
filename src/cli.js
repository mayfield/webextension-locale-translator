#!/usr/bin/env node

const process = require('process');
const translate = require('./translate');

(async function() {
    const [text, targetLocale] = process.argv.slice(2);
    const resp = await translate(text, targetLocale);
    console.log(resp.translatedText);
})().catch(e => {
    console.error(e);
    process.exit(1);
});
