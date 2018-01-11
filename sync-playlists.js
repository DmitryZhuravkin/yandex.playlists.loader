'use strict';

const os = require('os');
const fs = require('fs');
const Promise = require("bluebird");
const rimraf = require('rimraf');

const config = require('./config.json');
const downloadFile = require('./infrastructure/download-helper');
const YandexMusicAPIManager = require('./yandex.api/yandex.music.api');

const yandexMusicAPIManager = new YandexMusicAPIManager();

console.log('[starting]');
console.log(`[loading playlists] [user: ${config.username}]`);

clearPlaylistForNewTracks()
    .then(loadUserPlaylists)
    .then(processPlayLists)
    .then(processPlayListWithTracks)
    .then(donwloadTracks)
    .then(onSuccess)
    .catch(onError);

// functions

function clearPlaylistForNewTracks() {
    return new Promise((resolve, reject) => {
        try {
            var playlistForNewTracks = getPlaylistNameForNewFiles();

            if (playlistForNewTracks) {
                fs.exists(playlistForNewTracks, exists => {
                    if (exists) {
                        // remove non-empty directory
                        rimraf(playlistForNewTracks, () => {
                            resolve(true);
                        });
                    }
                    else {
                        resolve(true);
                    }
                });
            }
            else {
                resolve(true);
            }
        } catch (error) {
            console.log(`[clearplaylistfornewtracks] [warn] [${error}]`);
            resolve(false);// resolve in any case
        }
    });
}

function loadUserPlaylists(response) {
    return yandexMusicAPIManager.getUserPlaylists(config.username);
}

function processPlayLists(playlists) {
    return Promise.map(playlists
        .filter(playlist => playlist.trackCount > 0), playlist => {
            console.log(`[loading playlist tracks] [playlist: ${playlist.title}]`);
            return yandexMusicAPIManager.getUserPlaylistTracks(config.username, playlist.kind);
        }, { concurrency: config.concurrency });
}

function processPlayListWithTracks(playlistsWithTracks) {
    let trackInfoItems = [];
    let playlistForNewTracks = getPlaylistNameForNewFiles();
    let isDownloadRequired = false;

    playlistsWithTracks.forEach(element => {
        let directory = `${config.destinationFolder}/${element.title}`;

        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory);
        }

        element.tracks
            .forEach(track => {
                var fileName = `${track.artists[0].name} - ${track.title}.mp3`.replace(/[?~^:*<>=_|\\/]/gi, '');
                var fileLocation = `${directory}/${fileName}`;
                var copyLocation = playlistForNewTracks ? `${playlistForNewTracks}/${fileName}` : undefined;

                if (!fs.existsSync(fileLocation)) {
                    trackInfoItems.push({
                        playlist: element.title,
                        fileLocation: fileLocation,
                        copyLocation: copyLocation,
                        storageDir: track.storageDir
                    });

                    isDownloadRequired = true;
                }
            });
    });

    if (isDownloadRequired && playlistForNewTracks) {
        if (!fs.existsSync(playlistForNewTracks)) {
            fs.mkdirSync(playlistForNewTracks);
        }
    }

    return Promise.map(trackInfoItems, trackInfo => {
        return yandexMusicAPIManager.modifyTrackWithDonwloadUrl(trackInfo);
    }, { concurrency: config.concurrency });
}

// function loadingDownloadURLs(trackInfoItems) {
//     return Promise.map(trackInfoItems, trackInfo => {
//         return yandexMusicAPIManager.modifyTrackWithDonwloadUrl(trackInfo);
//     }, { concurrency: config.concurrency });
// }

function donwloadTracks(downloadRequest) {
    console.log(`[loading tracks] [count: ${downloadRequest.length}]`);
    return Promise.map(downloadRequest, request => {
        return downloadFile(request.fileLocation, request.copyLocation, request.downloadUrl)
    }, { concurrency: config.concurrency });
}

function getPlaylistNameForNewFiles() {
    if (config.newPlaylistName) {
        return `${config.destinationFolder}/${config.newPlaylistName}`;
    }
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