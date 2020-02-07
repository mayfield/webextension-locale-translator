const apiKeyEnv = 'WEBEXT_GOOGLE_TRANSLATE_KEY';
const apiKey = process.env[apiKeyEnv];


module.exports = function(text, targetLocale) {
    const sourceLocale = (process.env.LANG || 'en').split('.')[0].split('_')[0];
    if (!apiKey) {
        throw new Error(`${apiKeyEnv} is unset: API key required`);
    }
    const gt = require('google-translate')(apiKey);
    return new Promise((resolve, reject) => {
        gt.translate(text, sourceLocale, targetLocale, (e, data) => {
            if (e) {
                reject(new Error(e.body));
            } else {
                resolve(data);
            }
        });
    });
};
