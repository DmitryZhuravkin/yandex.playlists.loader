'use strict';

const cluster = require('cluster');
const os = require('os');
const fs = require('fs');

const config = require('./config.json');
const logger = require('./infrastructure/logger');
const downloadFile = require('./infrastructure/download-helper');
const YandexMusicAPIManager = require('./yandex.api/yandex.music.api');

const yandexMusicAPIManager = new YandexMusicAPIManager();

if (cluster.isMaster) {
    yandexMusicAPIManager.getUserPlaylists(config.username)
        .then(processPlayLists)
        .then(processPlayListWithTracks)
        .then(donwloadTracks);
} else {
    processWorker();
}

function processPlayLists(playlists) {
    let promisses = playlists
        .filter(playlist => playlist.trackCount > 0)
        .map(playlist => {

            

            return yandexMusicAPIManager.getUserPlaylistTracks(config.username, playlist.kind)
        });

    return Promise.all(promisses);
}

function processPlayListWithTracks(playlistsWithTracks) {
    let trackInfoItems = [];

    playlistsWithTracks.forEach(element => {
        element.tracks
            .forEach(track => {
                trackInfoItems.push({
                    playlist: element.title,
                    fileName: `${track.artists[0].name} - ${track.title}.mp3`.replace(/[?~^:*<>=_]/gi, ''),
                    storageDir: track.storageDir
                })
            })
    });

    let promisses = trackInfoItems
        //.filter(trackInfoItem => ) check for existing file
        .map(trackInfo => {
            return yandexMusicAPIManager.modifyTrackWithDonwloadUrl(trackInfo)
        });

    return Promise.all(promisses);
}

function donwloadTracks(downloadRequest) {
    var promisses = downloadRequest.map(context => {
        var directory = `${config.destinationFolder}/${context.playlist}`;
        var fileLocation = `${directory}/${context.fileName}`;

        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory);
        }

        return downloadFile(fileLocation, context.downloadUrl);
    });

    return Promise.all(promisses);

    //let cpusCount = os.cpus().length;
    //let environmentVariablesForWorkers = new Array(cpusCount);

    // for (let i = 0; i < environmentVariablesForWorkers.length; i++) {
    //     environmentVariablesForWorkers[i] = [];
    // }

    // downloadRequest.forEach((itemToDownload, index) => {
    //     let i = index % cpusCount;

    //     environmentVariablesForWorkers[i].push(itemToDownload);
    // });

    // downloadRequest.forEach((itemToDownload, index) => {
    //     let i = index % cpusCount;

    //     environmentVariablesForWorkers[i].push(itemToDownload);
    // });

    // TODO: use something else to communicate with worker
    // environmentVariablesForWorkers.forEach(context => {
    //     let worker = cluster.fork({
    //         "tracks": JSON.stringify(context)
    //     });        
    // });
}

function processWorker() {

    var tracks = JSON.parse(process.env["tracks"]);

    tracks.forEach(item => {
        logger.log(`${item.playlist}:${item.downloadUrl}`);
    });
}

