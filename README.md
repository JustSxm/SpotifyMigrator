# Spotify Migrator
Spotify Migrator is an application to transfer your spotify data from an account to another



## Features

-  [x] Transfer your liked songs in order
-  [ ] Transfer your playlists
-  [ ] Create a copy of your playlists (make the new account owner)
-  [ ] Follow your playlists
-  [ ] Follow artists/users
-  [ ] Save Podcasts

## Installation

This application requires [Node.js](https://nodejs.org/) v10+ to run.

Install the dependencies
```sh
npm i
```

## How to use
To use this app you will need to create an app on the [Spotify Developer Website](https://developer.spotify.com/dashboard/applications)

Once you created your application, we will need to edit some informations.
#### Setting up the application
1. Click on "Edit Settings"
2. Go to RedirectURI and add the value "http://localhost:8888/callback"
3. Save
4. Go to Users and Access
5. Add the email of account you are not currently logged in (new or old) to give it access to the application.

#### Setting up the config
Grab the Client ID and the Client Secret from your application and put them in the file config.json (replace CHANGEME)

#### Start the app
```sh
node app.js
```
Then visit localhost:8888 on your browser.

## Note: IF YOU DO NOT RECEIVE ANY ERRORS IT MEANS ITS WORKING. 
Loading who seems infinite are only because it is sending request to spotify over and over without having an actual "wait" page. Anyone willing to add a wait page is free to open a pull request.

## Development
Want to contribute? Great!
There is multiple user-friendly things to add that I won't bother add that anyone could do.

- [ ] CSS / Prettier pages
- [ ] Wait page while requests are being sent


## License
GPL
