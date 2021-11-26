// noinspection ES6MissingAwait

const express = require('express');
const config = require("./config.json");
const app = express();
const port = 3000;
const path = require('path');
const SpotifyWebApi = require('spotify-web-api-node');
const querystring = require("querystring");
const url = require("url");
const request = require('request'); // "Request" library
const cors = require('cors');
const cookieParser = require('cookie-parser');
let spotifyApi = new SpotifyWebApi();
let stateKey = 'spotify_auth_state';
let redirect = 'http://localhost:3000/LikedSongsCallback'
let scope = 'user-library-read user-library-modify playlist-read-private';

let oldAccount = true;
let oldUser;
let newUser;

// liked songs track id
let likedSongs = [];


app.use(cors()).use(cookieParser());

// Main Menu
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname,'html/Menu.html'))
})

// Liked Songs Login and Logout
app.get('/LikedSongs', (req, res) => {
    if(oldAccount){
        res.sendFile(path.join(__dirname,'html/LikedSongs.html'))
    }
    else {
        res.sendFile(path.join(__dirname,'html/LikedSongsNew.html'))
    }
})

app.get('/LikedSongsLogin', (req, res) => {
    spotifyApi.resetCredentials();
    let state = "test";
    res.cookie(stateKey, state);

    scope = 'user-library-read user-library-modify playlist-read-private';
    redirect = 'http://localhost:3000/LikedSongsCallback';

    spotifyApi.setClientSecret(config.client_secret);

    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: config.client_id,
            scope: scope,
            redirect_uri: redirect,
            state: state
        }));
})

app.get('/LikedSongsCallback', (req, res) => {
    let code = req.query.code || null;
    let state = req.query.state || null;
    let storedState = req.cookies ? req.cookies[stateKey] : null;
    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        redirect = 'http://localhost:3000/LikedSongsCallback';
        let authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(config.client_id + ':' + config.client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                spotifyApi = new SpotifyWebApi()
                spotifyApi.setRefreshToken(body.refresh_token);
                spotifyApi.setAccessToken(body.access_token);
                spotifyApi.getMe()
                    .then(function(data) {
                        if(oldAccount){
                            oldUser = data.body;
                            // cant get it to work because else I cannot redirect the user once the request is done, might need alternative. such as using JS instead of using it here
                            //res.sendFile(path.join(__dirname,'html/CurrentlyWorking.html'));
                            request('http://localhost:3000/getLikedSongs',{} ,function (error, response, body) {
                                if(body === "ok"){
                                    res.redirect('/LikedSongsNew')
                                }
                            })
                        }
                        else {
                            newUser = data.body;
                            // cant get it to work because else I cannot redirect the user once the request is done, might need alternative.
                            //res.sendFile(path.join(__dirname,'html/CurrentlyWorking.html'));
                            request('http://localhost:3000/addLikedSongs',{} ,function (error, response, body) {
                                if(body === "ok"){
                                    res.redirect('/Done')
                                }
                            })
                            oldAccount = true;
                        }
                    }, function(err) {
                        console.log(err);
                    });
            }
        });
    }
})

app.get('/getLikedSongs', async (req, res) => {
    async function getLikedSongs(offset, limit) {
        let data = await spotifyApi.getMySavedTracks({
            limit : limit,
            offset: offset
        });
        let response = data.body;

        //for each liked song..
        response.items.forEach(song => {
            likedSongs.push(song.track.id);
        })

        if(response["next"] != null){
            let url_parts = url.parse(response["next"], true);
            let query = url_parts.query;
            offset = query.offset;
            limit = query.limit;
            await getLikedSongs(offset, limit);
        }
    }
    await getLikedSongs(0, 50);
    likedSongs = likedSongs.reverse();
    oldAccount = false;
    res.send('ok');
});

app.get('/addLikedSongs', async (req, res) => {
    async function addLikedSongs() {
        let i = 500;
        likedSongs.forEach(song => {
            setTimeout(function (){
                spotifyApi.addToMySavedTracks([song]).then(function(data) {
                    console.log('Added track!');
                }, function(err) {
                    console.log(Promise.resolve(err));
                });
            }, i)
            i += 1000;
        });
        console.log(`Liked songs will all be transfered in ${Math.floor(i / 1000)} seconds`)
        await new Promise(resolve => setTimeout(resolve, i));
    }
    await addLikedSongs();
    oldAccount = false;
    console.log("Transfering Liked Songs done!")
    //res.redirect('/Done.html')
    res.send('ok');
});

app.get('/Done', (req, res) => {
    res.sendFile(path.join(__dirname,'html/Done.html'))
})

/**
 *
 * TRANSFER PLAYLISTS
 *
 */
app.get('/TransferPlaylists', (req, res) => {
    if(oldAccount){
        res.sendFile(path.join(__dirname,'html/TransferPlaylists.html'))
    }
    else {
        res.sendFile(path.join(__dirname,'html/TransferPlaylistsNew.html'))
    }

})

app.get('/PlaylistLogin', (req, res) => {
    spotifyApi.resetCredentials();
    let state = "test";
    res.cookie(stateKey, state);

    scope = 'playlist-read-private playlist-modify-private playlist-modify-public playlist-read-collaborative';
    redirect = 'http://localhost:3000/PlaylistsCallback';

    spotifyApi.setClientSecret(config.client_secret);

    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: config.client_id,
            scope: scope,
            redirect_uri: redirect,
            state: state
        }));
})

app.get('/PlaylistsCallback', (req, res) => {
    let code = req.query.code || null;
    let state = req.query.state || null;
    let storedState = req.cookies ? req.cookies[stateKey] : null;
    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        redirect = 'http://localhost:3000/PlaylistsCallback';
        let authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(config.client_id + ':' + config.client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                spotifyApi = new SpotifyWebApi()
                spotifyApi.setRefreshToken(body.refresh_token);
                spotifyApi.setAccessToken(body.access_token);
                spotifyApi.getMe()
                    .then(function(data) {
                        if(oldAccount){
                            oldUser = data.body;
                            // cant get it to work because else I cannot redirect the user once the request is done, might need alternative. such as using JS instead of using it here
                            //res.sendFile(path.join(__dirname,'html/CurrentlyWorking.html'));
                            request('http://localhost:3000/getPlaylists',{} ,function (error, response, body) {
                                if(body === "ok"){
                                    res.redirect('/TransferPlaylists')
                                }
                            })
                        }
                        else {
                            newUser = data.body;
                            // cant get it to work because else I cannot redirect the user once the request is done, might need alternative.
                            //res.sendFile(path.join(__dirname,'html/CurrentlyWorking.html'));
                            request('http://localhost:3000/addPlaylists',{} ,function (error, response, body) {
                                if(body === "ok"){
                                    res.redirect('/DonePlaylist')
                                }
                            })
                            oldAccount = true;
                        }
                    }, function(err) {
                        console.log(err);
                    });
            }
        });
    }
})

let playlists = [];
let playlistsId = [];
let OwnedPlaylists = new Map();
app.get('/getPlaylists', async (req, res) => {
    async function getPlaylists(offset, limit) {

        let data = await spotifyApi.getUserPlaylists(oldUser.id,{
            limit : limit,
            offset: offset
        });
        let response = data.body;

        //for each playlist..
        await response.items.forEach(playlist => {
            playlists.push(playlist);
            playlistsId.push(playlist.id);
        })

        if(response["next"] != null){
            let url_parts = url.parse(response["next"], true);
            let query = url_parts.query;
            offset = query.offset;
            limit = query.limit;
            await getPlaylists(offset, limit);
        }
    }
    async function getSongs() {
        for (let i = 0; i < playlists.length; i++) {
            if(playlists[i].owner.id === oldUser.id) {
                let tempobject = {};
                tempobject.name = playlists[i].name;
                tempobject.description = playlists[i].description;
                tempobject.public = playlists[i].public;
                tempobject.tracks = await getSongsFromSpecific(playlists[i].id, 0, 50);
                await OwnedPlaylists.set(playlists[i].id, tempobject);
            }
        }
    }
    let temp = [];
    async function getSongsFromSpecific(id, offset , limit) {
        if(offset === 0){
            temp = [];
        }
        let data = await spotifyApi.getPlaylistTracks(id, {
            offset: offset,
            limit: limit
        });
        let response = data.body
        let allsongs = response.items;
        await allsongs.forEach(s => {
            temp.push(s.track.id)
        });
        if(response["next"] != null){
            let url_parts = url.parse(response["next"], true);
            let query = url_parts.query;
            offset = query.offset;
            limit = query.limit;
            await getSongsFromSpecific(id, offset, limit);
        }
        temp.reverse();
        return temp;
    }
    await getPlaylists(0, 50);
    await getSongs();
    //oldest to first
    playlists = playlists.reverse();
    playlistsId = playlistsId.reverse();
    oldAccount = false;
    res.send('ok');
});


app.get('/addPlaylists', async (req, res) => {
    let i = 500;
    async function addPlaylists() {
        for (let j = 0; j < playlistsId.length; j++) {
             setTimeout(async function () {
                if (OwnedPlaylists.get(playlistsId[j]) !== undefined) {
                    let playlist = OwnedPlaylists.get(playlistsId[j]);
                    let data = await spotifyApi.createPlaylist(playlist.name, {
                        'description': playlist.description,
                        'public': playlist.public
                    });
                    let id = data.body.id
                    let temptracks = playlist.tracks;
                    let tracks = [];
                    await temptracks.forEach(t => {
                       if(t !== null){
                           tracks.push(`spotify:track:${t}`)
                       }
                    });
                    tracks.reverse();
                    if(tracks.length > 0){
                        if(tracks.length > 100){
                            while(tracks.length) {
                                await spotifyApi.addTracksToPlaylist(id, tracks.splice(0, 100));
                            }
                        }
                        else {
                            await spotifyApi.addTracksToPlaylist(id, tracks);
                        }
                    }
                } else {
                    await spotifyApi.followPlaylist(playlistsId[j]);
                }
            }, i);
            i += 500;
        }
        console.log(`Playlists will all be transfered in ${Math.floor(i / 1000)} seconds`)
        await new Promise(resolve => setTimeout(resolve, i));
    }
    await addPlaylists();
    oldAccount = false;
    console.log("Transfering Playlists done!")
    //res.redirect('/Done.html')
    res.send('ok');
});

app.get('/DonePlaylist', (req, res) => {
    res.sendFile(path.join(__dirname,'html/DonePlaylist.html'))
})

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`)
})
