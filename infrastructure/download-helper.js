'use strict'

const fs = require('fs');
const http = require('http');
const logger = require('./logger');

function downloadFile(fileLocation, url) {
    return new Promise((resolve, reject) => {
        try {
            let file = fs.createWriteStream(fileLocation, {
                flags:'w',
                autoClose: true
            });

            logger.log(`Downloading ${fileLocation}.`);

            // 1
            let request = http.get(url, function (response) {
                response.pipe(file);
                file.on('finish', function () {
                    file.close(() => {
                        logger.log(`Downloading ${fileLocation}. SUCCESS.`);
                        resolve(`Download ${fileLocation}: SUCCESS.`);
                    });
                });
            });

            request.on('error', error => {
                resolve(`Download ${fileLocation}: FAILED. ${error.message}`);
            }).end();

            // 2
            // http.get(url, res => {

            //     const { statusCode } = res;
            //     const contentType = res.headers['content-type'];

            //     let error;
            //     if (statusCode !== 200) {
            //         error = new Error(`Request Failed. Status Code: ${statusCode}.`);
            //     }

            //     if (error) {
            //         resolve(`Download ${fileLocation}: FAILED. ${error.message}`);
            //         return;
            //     }

            //     res.on('data', data => {
            //         file.write(data);
            //     }).on('end', function () {
            //         file.end();
            //         resolve(`Download ${fileLocation}: SUCCESS.`);
            //     }).on('error', (e) => {
            //         resolve(`Download ${fileLocation}: FAILED. ${error.message}`);
            //     });
            // });
        } catch (error) {
            resolve(`Download ${fileLocation}: FAILED. ${error.message}`);
        }
    });
}

module.exports = downloadFile;