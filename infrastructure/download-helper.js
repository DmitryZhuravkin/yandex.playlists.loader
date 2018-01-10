'use strict'

const fs = require('fs');
const http = require('http');
const Promise = require("bluebird");

function downloadFile(fileLocation, copyLocation, url) {
    return new Promise((resolve, reject) => {
        try {
            let file = fs.createWriteStream(fileLocation, {
                flags: 'w',
                autoClose: true
            });

            console.log(`[download] [start] [${fileLocation}]`);

            let request = http.get(url, response => {

                response.on('error', error => {
                    console.log(`[download] [error] [${fileLocation}] [${error}]`);
                    resolve(false);
                });

                response.pipe(file);

                file.on('finish', function () {
                    file.close(() => {
                        console.log(`[download] [success] [${fileLocation}]`);

                        if (copyLocation) {
                            fs.copyFile(fileLocation, copyLocation, () => {

                                resolve(true);
                            });
                        }
                        else {
                            resolve(true);
                        }
                    });
                });
            });

            request.on('error', error => {
                console.log(`[download] [error] [${fileLocation}] [${error}]`);
                resolve(false);
            });

            request.end();
        } catch (error) {
            console.log(`[download] [error] [${fileLocation}] [${error}]`);
            resolve(false);
        }
    });
}

module.exports = downloadFile;