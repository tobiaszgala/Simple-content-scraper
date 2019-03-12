const fs = require('fs');
const json2csv = require('json2csv').Parser;
const ezscraper = require('ezscraper');
// entry point
const url = 'https://shirts4mike.com/';
/**
 * Error-logging function
 * @param  {string} message - Error message
 */
const logError = (message) => {
    const date = getCurrentDate();
    const data = `${date} <${message}>\n`;
    const fileName = 'scraper-error.log';
    console.error(message);
    fs.appendFile(fileName, data, e => {
        if (e) {
            console.error(`Could not save error log to the file: ${fileName}`);
        } else {
            console.log(`Error log has been saved to: ${fileName}`)
        }
    });
}
/**
 * Saving object to csv file
 * @param  {object} data - Data retrieved from web-scraping
 */
const csvToFile = (data) => {
    const date = getCurrentDate(true);
    const dir = './data/';
    const fileName = `${date}.csv`;
    
    try {
        // check if file exists
        if (!fs.existsSync(dir)) {
            // if not create directory
            fs.mkdirSync(dir);
        }
        // write data to the file
        fs.writeFile(dir + fileName, data, e => {
            if (e) {
                logError(`Could not save data to the file: ${dir}${fileName}`);
            } else {
                console.log(`Data has been saved to: ${dir}${fileName}`)
            }
        });
    } catch(e) {
        logError(`Could not save data to the file: ${dir}${fileName}`);
    }
}
/**
 * Function generates date format 
 * @param  {boolean} shortFormat=false - Set true to receive YYYY-MM-DD format
 */
const getCurrentDate = (shortFormat = false) => {
    const date = new Date();
    if (shortFormat) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const formattedMonth = month < 10 ? '0' + month : month;
        const day = date.getDate();
        const formattedDay = day < 10 ? '0' + day : day;
        return `${year}-${formattedMonth}-${formattedDay}`;
    } else {
        return date.toLocaleString();
    }
}

// get shirt url
ezscraper(url, {
    link: {
        selector: 'li.shirts a',
        property: 'href'
    }
}).then(data => {
        const shirtURL = url + data.link[0].link;
        // get all links to shirt detail page
        ezscraper(shirtURL, {
            link: {
                selector: 'ul.products a',
                property: 'href'
            }
        }).then(data => {
            // get all links
            const allLinks = data.link;
            // making parallel request with ordered results
            const arrOfPromises = allLinks.map(item => ezscraper(url + item.link, {
                        price: 'div.shirt-details h1 span',
                        title: {
                            selector: 'div.shirt-details h1 span',
                            property: 'nextSibling.textContent'
                        },
                        img: {
                            selector: 'div.shirt-picture span img',
                            property: 'src'
                        }
                    }).then(data => { 
                        data.url = url + item.link
                        return data;
                    }));
            
            // run all promises
            Promise.all(arrOfPromises)
                .then(results => {
                    // when all resolved
                    // csv headers
                    const fields = ['Title', 'Price', 'ImageURL', 'URL', 'Time'];
                    const csvData = [];

                    // formatting csv output
                    for (const item of results) {
                        csvData.push({ 
                            Title : item.title[0].title,
                            Price: item.price[0].price,
                            ImageURL : url + item.img[0].img,
                            URL: item.url,
                            Time: getCurrentDate()
                        });
                    }

                    // parsing csv data
                    const json2csvParser = new json2csv({fields});
                    const csv = json2csvParser.parse(csvData);
                    // saving csv data
                    csvToFile(csv);

                })
                .catch(error => logError(error));

        }).catch(error => logError(error));

}).catch(error => logError(error));