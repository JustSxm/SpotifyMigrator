const express = require("express");
const ejs = require("ejs");
const path = require("path");
const SpotifyWebApi = require("spotify-web-api-node");
const config = require("./config.json");
var najax = ($ = require("najax"));
app = express();
app.set("views", "./public");
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));

let spotifyApi = new SpotifyWebApi();
let oldAccount = true;
let oldUser;
let newUser;
let likedsongs = [];
let playlists = [];
let playlistsId = [];
let OwnedPlaylists = new Map();

app.listen(3000, () => {
  console.log(`App listening at http://localhost:3000`);
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/Menu.html"));
});

/** Migrate Liked Songs */
app.get("/loginLikedSongs", (req, res) => {
  let type;
  let color;
  let where = "/login";
  if (oldAccount) {
    type = "old";
    color = "text-green-300";
  } else {
    type = "new";
    color = "text-red-300";
  }
  res.render(path.join(__dirname, "public/Login.ejs"), {
    type,
    color,
    where,
  });
});

app.get("/Done", (req, res) => {
  let title = "Done";
  let message = "Done transfering.";
  res.render(path.join(__dirname, "public/GenericPage.ejs"), {
    title,
    message,
  });
});

app.get("/login", (req, res) => {
  spotifyApi.resetCredentials();
  let state = "likedsongs";
  let scope = "user-library-read user-library-modify playlist-read-private";
  let redirect = "http://localhost:3000/callback";
  spotifyApi.setClientSecret(config.client_secret);
  let url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.append("response_type", "code");
  url.searchParams.append("client_id", config.client_id);
  url.searchParams.append("scope", scope);
  url.searchParams.append("redirect_uri", redirect);
  url.searchParams.append("state", state);
  res.redirect(url.href);
});

app.get("/callback", (req, res) => {
  let code = req.query.code;
  let state = req.query.state;
  let redirect = "http://localhost:3000/callback";
  let authOptions = {
    type: "POST",
    data: {
      code: code,
      redirect_uri: redirect,
      grant_type: "authorization_code",
    },
    headers: {
      Authorization:
        "Basic " +
        new Buffer.from(config.client_id + ":" + config.client_secret).toString(
          "base64"
        ),
    },
    json: true,
  };
  if (state === "likedsongs") {
    najax(
      "https://accounts.spotify.com/api/token",
      authOptions,
      function (data, status) {
        data = JSON.parse(data);
        if (status === "success") {
          spotifyApi.setAccessToken(data.access_token);
          spotifyApi.setRefreshToken(data.refresh_token);
          spotifyApi.getMe().then(async (data) => {
            if (oldAccount) {
              oldUser = data;
              await fetchSongs(spotifyApi, 0, 50);
              likedsongs = likedsongs.reverse();
              oldAccount = false;
              res.redirect("/loginLikedSongs");
            } else {
              newUser = data;
              /** Wait page needed here */
              await addLikedSongs(spotifyApi, res);
              newUser = null;
              oldUser = null;
              likedsongs = [];
              oldAccount = true;
              spotifyApi = new SpotifyWebApi();
            }
          });
        }
      }
    );
  } else if (state == "transferplaylist") {
    najax(
      "https://accounts.spotify.com/api/token",
      authOptions,
      function (data, status) {
        data = JSON.parse(data);
        if (status === "success") {
          spotifyApi.setAccessToken(data.access_token);
          spotifyApi.setRefreshToken(data.refresh_token);
          spotifyApi.getMe().then(async (data) => {
            if (oldAccount) {
              oldUser = data;
              await fetchPlaylists(spotifyApi, 0, 50);
              await getSongs();
              playlists = playlists.reverse();
              playlistsId = playlistsId.reverse();
              oldAccount = false;
              res.redirect("/loginTransferPlaylist");
            } else {
              newUser = data;
              /** Wait page needed here */
              await addPlaylists(spotifyApi, res);
              newUser = null;
              oldUser = null;
              playlists = [];
              playlistsId = [];
              OwnedPlaylists = new Map();
              oldAccount = true;
              spotifyApi = new SpotifyWebApi();
            }
          });
        }
      }
    );
  }
});

async function addLikedSongs(api, res) {
  let i = 500;
  likedsongs.forEach((song) => {
    setTimeout(function () {
      let number = i;
      api.addToMySavedTracks([song]).then(
        function (data) {
          console.log(`Added track #${number}!`);
        },
        function (err) {
          console.log(Promise.resolve(err));
        }
      );
    }, i);
    i += 1000;
  });
  let title = "Wait";
  let message = `Please wait while we transfer your liked songs (check your console). Liked songs will all be transfered in ${Math.floor(
    i / 1000
  )} seconds`;
  res.render(path.join(__dirname, "public/GenericPage.ejs"), {
    title,
    message,
    i,
  });
  console.log(
    `Liked songs will all be transfered in ${Math.floor(i / 1000)} seconds`
  );
  await new Promise((resolve) => setTimeout(resolve, i));
}

/* Gets all songs from the user's liked songs */
async function fetchSongs(api, offset, limit) {
  let data = await api.getMySavedTracks({
    limit: limit,
    offset: offset,
  });
  let response = data.body;
  //for each liked song..
  response.items.forEach((song) => {
    likedsongs.push(song.track.id);
  });

  if (response["next"] != null) {
    let url_parts = new URL(response["next"]);
    let offset = url_parts.searchParams.get("offset");
    let limit = url_parts.searchParams.get("limit");
    await fetchSongs(api, offset, limit);
  }
}

/** Migrate Playlists */
app.get("/loginTransferPlaylist", (req, res) => {
  let type;
  let color;
  let where = "/login2";
  if (oldAccount) {
    type = "old";
    color = "text-green-300";
  } else {
    type = "new";
    color = "text-red-300";
  }
  res.render(path.join(__dirname, "public/Login.ejs"), {
    type,
    color,
    where,
  });
});

app.get("/login2", (req, res) => {
  spotifyApi.resetCredentials();
  let state = "transferplaylist";
  let scope =
    "playlist-read-private playlist-modify-private playlist-modify-public playlist-read-collaborative";
  let redirect = "http://localhost:3000/callback";
  spotifyApi.setClientSecret(config.client_secret);
  let url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.append("response_type", "code");
  url.searchParams.append("client_id", config.client_id);
  url.searchParams.append("scope", scope);
  url.searchParams.append("redirect_uri", redirect);
  url.searchParams.append("state", state);
  res.redirect(url.href);
});

async function fetchPlaylists(api, offset, limit) {
  let data = await api.getUserPlaylists(oldUser.id, {
    limit: limit,
    offset: offset,
  });
  let response = data.body;

  //for each playlist..
  await response.items.forEach((playlist) => {
    playlists.push(playlist);
    playlistsId.push(playlist.id);
  });

  if (response["next"] != null) {
    let url_parts = new URL(response["next"]);
    let offset = url_parts.searchParams.get("offset");
    let limit = url_parts.searchParams.get("limit");
    await fetchPlaylists(api, offset, limit);
  }
}
async function getSongs() {
  for (let i = 0; i < playlists.length; i++) {
    if (playlists[i].owner.id === oldUser.id) {
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
async function getSongsFromSpecific(id, offset, limit) {
  if (offset === 0) {
    temp = [];
  }
  let data = await spotifyApi.getPlaylistTracks(id, {
    offset: offset,
    limit: limit,
  });
  let response = data.body;
  let allsongs = response.items;
  await allsongs.forEach((s) => {
    temp.push(s.track.id);
  });
  if (response["next"] != null) {
    let url_parts = new URL(response["next"]);
    let offset = url_parts.searchParams.get("offset");
    let limit = url_parts.searchParams.get("limit");
    await getSongsFromSpecific(id, offset, limit);
  }
  temp.reverse();
  return temp;
}

async function addPlaylists(spotifyApi, res) {
  let i = 500;
  for (let j = 0; j < playlistsId.length; j++) {
    setTimeout(async function () {
      if (OwnedPlaylists.get(playlistsId[j]) !== undefined) {
        let playlist = OwnedPlaylists.get(playlistsId[j]);
        let data = await spotifyApi.createPlaylist(playlist.name, {
          description: playlist.description,
          public: playlist.public,
        });
        let id = data.body.id;
        let temptracks = playlist.tracks;
        let tracks = [];
        await temptracks.forEach((t) => {
          if (t !== null) {
            tracks.push(`spotify:track:${t}`);
          }
        });
        tracks.reverse();
        if (tracks.length > 0) {
          if (tracks.length > 100) {
            while (tracks.length) {
              await spotifyApi.addTracksToPlaylist(id, tracks.splice(0, 100));
            }
          } else {
            await spotifyApi.addTracksToPlaylist(id, tracks);
          }
        }
      } else {
        await spotifyApi.followPlaylist(playlistsId[j]);
      }
    }, i);
    i += 500;
  }
  let title = "Wait";
  let message = `Please wait while we transfer your playlists (check your console). Playlists will all be transfered in ${Math.floor(
    i / 1000
  )} seconds`;
  res.render(path.join(__dirname, "public/GenericPage.ejs"), {
    title,
    message,
    i,
  });
  console.log(
    `Playlists will all be transfered in ${Math.floor(i / 1000)} seconds`
  );
  await new Promise((resolve) => setTimeout(resolve, i));
}
