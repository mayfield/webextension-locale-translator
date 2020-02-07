#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const process = require('process');
const jsonTranslate = require('./src/json');


async function translate(orig, locale, curTarget) {
    const immutables = new Map();
    const target = await jsonTranslate.translate(orig, locale, {
        whitelist: new Set(['message']),
        filter: (k, v, obj) => {
            if (!curTarget || k !== 'message') {
                return true;
            }
            for (const [key, entry] of Object.entries(orig)) {
                if (Object.is(obj, entry)) {
                    const curEntry = curTarget[key];
                    if (curEntry && curEntry.description && curEntry.description.includes('IMMUTABLE')) {
                        console.warn("Skipping immutable entry:", locale, key);
                        immutables.set(key, curEntry);
                        return false;
                    }
                } 
            }
            return true;
        }
    });
    for (const [key, obj] of immutables.entries()) {
        Object.assign(target[key], obj);
    }
    return target;
}
exports.translate = translate;


function usageExit() {
    const prog = path.basename(process.argv[1]);
    console.error(`Usage: ${prog} SOURCE_LOCALE_FILE TARGET_LOCALE [TARGET_LOCALE_FILE]`);
    process.exit(1);
}


if (require.main === module) {
    (async function() {
        const [origFile, locale, targetFile] = process.argv.slice(2);
        let curTarget;
        if (targetFile && targetFile !== '-') {
            try {
                curTarget = JSON.parse(fs.readFileSync(targetFile));
            } catch(e) {/*no-pragma*/}
        }
        let orig;
        try {
            orig = JSON.parse(fs.readFileSync(origFile));
        } catch(e) {
            throw new Error('Invalid SOURCE_LOCALE_FILE');
        }
        const target = await translate(orig, locale, curTarget);
        const targetJson = JSON.stringify(target, null, 4);
        if (targetFile && targetFile !== '-') {
            fs.writeFileSync(targetFile, targetJson + '\n');
        } else {
            console.log(targetJson);
        }
    })().catch(e => {
        console.error(e.message || e);
        usageExit();
    });
}
