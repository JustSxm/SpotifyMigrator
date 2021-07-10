/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

const config = require("./config")
const express = require('express'); // Express web server framework
const cors = require('cors');
const cookieParser = require('cookie-parser');
const request = require('request'); // "Request" library
const querystring = require('querystring');
const url = require('url'); // get params in url
const redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri
const SpotifyWebApi = require('spotify-web-api-node');
let spotifyApi = new SpotifyWebApi();
let app = express();
let user = '';
app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());


let stateKey = 'spotify_auth_state';
let oldAccount = true;



let likedSongs = [];
app.get('/login', function(req, res) {
    spotifyApi.resetCredentials();
  let state = "test";
  res.cookie(stateKey, state);

  // your application requests authorization
  let scope = 'user-library-read user-library-modify playlist-read-private';

    spotifyApi.setClientId(config.client_id);
    spotifyApi.setClientSecret(config.client_secret);
    spotifyApi.setRedirectURI('http://localhost:8888/callback');

  res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: config.client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state
      }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter
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

    let authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: "http://localhost:8888/callback",
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(config.client_id + ':' + config.client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
          console.log("No Error");
          spotifyApi = new SpotifyWebApi()
        spotifyApi.setRefreshToken(body.refresh_token);
        spotifyApi.setAccessToken(body.access_token);
          spotifyApi.getMe()
              .then(function(data) {
                  user = data.body;

                  if(oldAccount){
                      res.redirect(url.format({
                          pathname: "/GetLikedSongs",
                          query: {
                              "offset": 0,
                              "limit": 50
                          }}
                      ))
                  }
                  else {
                      console.log("New Account!");
                      res.redirect('/AddLikedSongs');
                  }
              }, function(err) {
                  console.log(err);
              });
      }
    });
  }
});

app.get('/AddLikedSongs', function (req, res){
    let i = 500;
    likedSongs.forEach(song => {
        setTimeout(function (){
            spotifyApi.addToMySavedTracks([song]).then(function(data) {
                console.log('Added track!');
            }, function(err) {
                console.log(Promise.resolve(err));
            });
        }, i)
        i += 500;
    });
    console.log(`Liked songs will all be transfered in ${Math.floor(i / 1000)} seconds`)
    setTimeout(function (){
        console.log("Transfering Liked Songs done!")
        res.redirect('/Done.html')
    }, i);
});

app.get('/GetLikedSongs', function (req, res){
    let offset = req.query.offset;
    let limit = req.query.limit;

    spotifyApi.getMySavedTracks({
        limit : limit,
        offset: offset
    }).then(function (data){
        let response = data.body;

        //for each liked song..
        response.items.forEach(song => {
            likedSongs.push(song.track.id);
        })

        if(response["next"] != null){
            let url_parts = url.parse(response["next"], true);
            let query = url_parts.query;
            res.redirect(url.format({
                pathname: "/GetLikedSongs",
                query: {
                    "offset": query.offset,
                    "limit": query.limit
                }}));
        }
        else {
            // oldest one first
            likedSongs = likedSongs.reverse();
            oldAccount = false;
            return res.redirect('/NewAccount.html');
        }
    }, function(err) {
        console.log('Something went wrong!', err);
    });
});



console.log("Listening on localhost:8888");
app.listen(8888);
