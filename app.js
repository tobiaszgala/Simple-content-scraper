const fs = require('fs');
const json2csv = require('json2csv').Parser;
const ezscraper = require('./util/scraper');

const url = 'https://shirts4mike.com/';

const logError = (message) => {
    const date = getCurrentDate();
    const data = `${date} <${message}>`;
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

const csvToFile = (data) => {
    const date = getCurrentDate(true);
    const dir = './data/';
    const fileName = `${date}.csv`;

    try {

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

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
        properties: 'href'
    }
}).then(data => {
        const shirtURL = url + data.link[0].link;
        // get all links to shirt detail page
        ezscraper(shirtURL, {
            link: {
                selector: 'ul.products a',
                properties: 'href'
            }
        }).then(data => {

            // // Example: making sychronous requests with ordered results
            // ( async () => {
            //     for (const item of data.link) {
            //         const itemURL = url + item.link;
            //         await ezscraper(itemURL, {
            //             price: 'div.shirt-details h1 span',
            //             name: {
            //                 selector: 'div.shirt-details h1 span',
            //                 properties: 'nextSibling.textContent'
            //             },
            //             img: {
            //                 selector: 'div.shirt-picture span img',
            //                 properties: 'src'
            //             }
            //         }).then(data => {
            //             console.log(data);
            //         }).catch(error => console.error(error));
            //     }
            // })();

            const allLinks = data.link;
            // making parallel request with ordered results
            const arrOfPromises = allLinks.map(item => ezscraper(url + item.link, {
                        price: 'div.shirt-details h1 span',
                        title: {
                            selector: 'div.shirt-details h1 span',
                            properties: 'nextSibling.textContent'
                        },
                        img: {
                            selector: 'div.shirt-picture span img',
                            properties: 'src'
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