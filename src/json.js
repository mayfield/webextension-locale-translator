#!/usr/bin/env node

const os = require('os');
const fs = require('fs');
const process = require('process');
const translate = require('./translate');

const cacheFilePrefix = `${os.homedir()}/.webext_translate_cache`;

function _prep(obj, whitelist, filter, cache, _pending) {
    if (typeof obj !== 'object') {
        throw new TypeError("object required");
    }
    _pending = _pending || [];
    const isArray = obj instanceof Array;
    const target = isArray ? [] : {};
    for (const [strKey, value] of Object.entries(obj)) {
        const key = isArray ? parseInt(strKey) : strKey;
        if (Object.isExtensible(value)) {
            target[key] = _prep(value, whitelist, filter, cache, _pending)[0];
        } else {
            if ((filter && !filter(key, value, obj)) || (whitelist && !whitelist.has(key))) {
                target[key] = value;
            } else if (typeof value === 'string') {
                if (cache && cache.has(value)) {
                    target[key] = cache.get(value);
                } else {
                    _pending.push({
                        targetObject: target,
                        targetKey: key,
                        sourceValue: value,
                    });
                }
            } else {
                target[key] = value;
            }
        }
    }
    return [target, _pending];
}

async function translateValues(obj, targetLocale, options) {
    const [target, pending] = _prep(obj, options.whitelist, options.filter, options.cache);
    if (pending.length) {
        console.warn(`Translating ${pending.length} entries...`);
        const result = await translate(pending.map(x => x.sourceValue), targetLocale);
        const translations = result.length > 1 ? result : [result];
        for (let i = 0; i < pending.length; i++) {
            const targetValue = translations[i].translatedText;
            const p = pending[i];
            p.targetObject[p.targetKey] = targetValue;
            if (options.cache) {
                options.cache.set(p.sourceValue, targetValue);
            }
        }
    }
    return target;
}


exports.translate = async function(orig, targetLocale, options) {
    options = options || {};
    let cacheFile;
    if (options.cache === undefined) {
        cacheFile = `${cacheFilePrefix}_${targetLocale}.json`;
        try {
            options.cache = new Map(JSON.parse(fs.readFileSync(cacheFile)));
        } catch(e) {
            options.cache = new Map();
        }
    }
    const target = await translateValues(orig, targetLocale, options);
    if (cacheFile) {
        fs.writeFileSync(cacheFile, JSON.stringify(Array.from(options.cache)));
    }
    return target;
};


if (require.main === module) {
    (async function() {
        const [file, targetLocale, whitelistRaw] = process.argv.slice(2);
        const whitelist = whitelistRaw && new Set(whitelistRaw.split(','));
        const orig = JSON.parse(fs.readFileSync(file));
        const target = await exports.translate(orig, targetLocale, {whitelist});
        console.log(JSON.stringify(target, null, 4));
    })().catch(e => {
        console.error(e);
        process.exit(1);
    });
}
