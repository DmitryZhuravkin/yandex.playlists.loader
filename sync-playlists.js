'use strict';

const os = require('os');
const fs = require('fs');
const Promise = require("bluebird");

const config = require('./config.json');
const downloadFile = require('./infrastructure/download-helper');
const YandexMusicAPIManager = require('./yandex.api/yandex.music.api');

const yandexMusicAPIManager = new YandexMusicAPIManager();

console.log('[starting]');
console.log(`[loading playlists] [user: ${config.username}]`);

yandexMusicAPIManager.getUserPlaylists(config.username)
    .then(processPlayLists)
    .then(processPlayListWithTracks)
    .then(donwloadTracks)
    .then(onSuccess)
    .catch(onError);

// functions

function processPlayLists(playlists) {
    return Promise.map(playlists
        .filter(playlist => playlist.trackCount > 0), playlist => {
            console.log(`[loading playlist tracks] [playlist: ${playlist.title}]`);
            return yandexMusicAPIManager.getUserPlaylistTracks(config.username, playlist.kind);
        }, { concurrency: config.concurrency });
}

function processPlayListWithTracks(playlistsWithTracks) {
    let trackInfoItems = [];

    playlistsWithTracks.forEach(element => {
        var directory = `${config.destinationFolder}/${element.title}`;

        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory);
        }

        element.tracks
            .forEach(track => {
                var fileName = `${track.artists[0].name} - ${track.title}.mp3`.replace(/[?~^:*<>=_|\\/]/gi, '');
                var fileLocation = `${directory}/${fileName}`;

                if (!fs.existsSync(fileLocation)) {
                    trackInfoItems.push({
                        playlist: element.title,
                        fileLocation: fileLocation,
                        storageDir: track.storageDir
                    });
                }
            })
    });

    return Promise.map(trackInfoItems, trackInfo => {
        return yandexMusicAPIManager.modifyTrackWithDonwloadUrl(trackInfo);
    }, { concurrency: config.concurrency });
}

function donwloadTracks(downloadRequest) {
    console.log(`[loading tracks] [count: ${downloadRequest.length}]`);
    return Promise.map(downloadRequest, request => {
        return downloadFile(request.fileLocation, request.downloadUrl)
    }, { concurrency: config.concurrency });
}

function onSuccess(response) {
    let successCount = response.filter(c => { return c }).length;
    let errorCount = response.filter(c => { return !c }).length;

    console.log(`----------------------------------------------------------------\r\n[finished] [success: ${successCount}] [error: ${errorCount}]`);
    process.exit();
}

function onError(error) {
    console.log(`----------------------------------------------------------------\r\n[finished] [error] [${error}]`);
    process.exit();
}