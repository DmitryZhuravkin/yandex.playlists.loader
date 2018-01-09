'use strict';

const BASE_URL = 'https://music.yandex.ru';

const xml2js = require('xml2js');
const rest = require('restler');
const md5 = require('md5');
const Promise = require("bluebird");

class YandexMusicAPIManager {

    getUserPlaylists(userName) {
        return new Promise((resolve, reject) => {
            rest.get(`${BASE_URL}/handlers/library.jsx?owner=${userName}&filter=playlists`)
                .on('complete', result => {
                    if (result instanceof Error) {
                        reject(result);
                    }
                    else {
                        resolve(result.playlists);
                    }
                });
        });
    }

    getUserPlaylistTracks(userName, playlistKind) {
        return new Promise((resolve, reject) => {
            rest.get(`${BASE_URL}/handlers/playlist.jsx?owner=${userName}&kinds=${playlistKind}`)
                .on('complete', result => {
                    if (result instanceof Error) {
                        reject(result);
                    }
                    else {
                        const toReturn = {
                            title: result.playlist.title,
                            tracks: result.playlist.tracks
                        };

                        resolve(toReturn);
                    }
                });
        });
    }

    modifyTrackWithDonwloadUrl(track) {
        return new Promise((resolve, reject) => {
            rest.get(`http://storage.music.yandex.ru/download-info/${track.storageDir}/2.mp3`)
                .on('complete', result => {
                    if (result instanceof Error) {
                        reject(result);
                    }
                    else {
                        xml2js.parseString(result, (err, trackInfoResult) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                var downloadInfo = trackInfoResult['download-info'];
                                var hash = md5(`XGRlBW9FXlekgbPrRHuSiA${downloadInfo.path[0].substring(1)}${downloadInfo.s[0]}`);
                                var urlToDownload = `http://${downloadInfo.host[0]}/get-mp3/${hash}/${downloadInfo.ts[0]}${downloadInfo.path[0]}`;

                                track['downloadUrl'] = urlToDownload;
                                resolve(track);
                            }
                        });
                    }
                });
        });
    }
}

module.exports = YandexMusicAPIManager;