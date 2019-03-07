const request = require('request');
const { JSDOM } = require('jsdom');
/**
 * Spliting "properties" and converting to Array
 * @param  {String} props - Value from prop key
 */
const splitProperties = (property) => {
    return property.charAt(0) === '.' ? property.slice(1, property.length).split('.') : property.split('.');
}

/**
 * Main
 * @param  {String} url - Address of the website
 * @param  {Object} tags - Scraping options
 */
const ezscraper = (url, tags) => {
    return new Promise((resolve, reject) => {
        request(url, (error, response) => {
            if (error) {
                reject('There was an error while getting response from the server.');
            } else {
                // destructing body property
                const { body } = response;
                // JSDOM object for DOM manipulation
                const dom = new JSDOM(body).window.document;
                // returning data object
                const data = {};

                // check if tags parameter is an object
                if (tags && typeof tags === 'object' && !(tags instanceof Array)) {
                    let el = [];
                    // loop over all keys
                    for (let key in tags) {
                        // if value of the key is an object 
                        if (tags[key] && typeof tags[key] === 'object' && !(tags[key] instanceof Array)) {
                            // save orginial key
                            const originalKey = key;
                            // loop over all keys in that object
                            for (let key in tags[originalKey]) {
                                // if key is called selector
                                if (key === 'selector') {
                                    try {
                                        // grab element and copy nodelist
                                        el = [...dom.querySelectorAll(tags[originalKey][key])];
                                    } catch(e) {
                                        reject(`You provided invalid selector for ${originalKey}. Please check your settings.`);
                                    }
                                // if element was selected and key is called property
                                } else if (el.length > 0 && key === 'property') {
                                    if (tags[originalKey][key] && typeof tags[originalKey][key] === 'string'){
                                        // split properties
                                        const attr = splitProperties(tags[originalKey][key]);
                                        const arrayOfObjs = [];
                                        // if there are more attributes run the loop
                                        for (let i = 0; i < el.length; i++) {
                                            const dataObj = {};
                                            // loop and retrieve data for each property
                                            for (let y = 0; y < attr.length; y++) {
                                                el[i] = el[i][attr[y]];
                                            }
                                            // check if data was retrieved
                                            dataObj[originalKey] = el[i] ? el[i] : reject(`Could not retrieve property for "${originalKey}". Please check your settings.`);
                                            arrayOfObjs.push(dataObj);
                                        }
                                        data[originalKey] = arrayOfObjs;
                                    } else {
                                        reject(`Please provide property for ${originalKey}.`);
                                    }
                                }
                            }
                        } else {
                            try {
                                el = dom.querySelectorAll(tags[key]);
                            } catch (e) {
                                reject('You provided invalid selector. Please check your settings.');
                            }

                            if (el.length > 0) {
                                const arrayOfObjs = [];
                                for (let i = 0; i < el.length; i++) {
                                    const dataObj = {};
                                    // if no property is defined textContent is set as default
                                    dataObj[key] = el[i].textContent ? el[i].textContent : reject(`Could not retrieve property for "${key}". Please check your settings`);
                                    arrayOfObjs.push(dataObj);
                                }
                                data[key] = arrayOfObjs;
                            }
                        }
                    }
                }
                // check if data was found
                if (Object.keys(data).length > 0) {
                    resolve(data);
                } else {
                    reject('No data has been found. Please check your settings.');
                }
            }
        });
    });
}

module.exports = ezscraper;