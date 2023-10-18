![.NET](https://img.shields.io/badge/.NET-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![C#](https://img.shields.io/badge/C%23-239120?style=for-the-badge&logo=c-sharp&logoColor=white)
![Status](https://img.shields.io/badge/status-working-brightgreen?style=for-the-badge)

# Spotify Migrator

Spotify Migrator is an application to help you transfer your data from an account to another account or to split your liked songs into multiples.

I never found an online service who did what I wanted, so I made this.

### If you find it useful, make sure to star Thank you!.

<details>
<summary>Table of Contents</summary>
 
- [Features](#features)  
- [Requirement](#requirement)  
- [Configuration](#configuration)  
  - [Spotify App](#spotifyappconfiguration)  
  - [App](#appconfiguration)  
- [Running](#running)  
- [License](#license)
 
</details>

## Demo

![Demo](https://raw.githubusercontent.com/JustSxm/SpotifyMigrator/master/meta/demo.gif)

<a name="features"/>

## Features

-   Transfer your liked songs in order from one account to another
-   Transfer your playlists followed from one account to another
-   Create a copy of your private playlists from one account to another
-   Split your liked songs into multiple playlists

<a name="requirement"/>

## Requirement

-   A Browser

<a name="configuration"/>

## Configuration

<a name="spotifyappconfiguration"/>

## Spotify App Configuration

To use this app you will need to create an app on the [Spotify Developer Website](https://developer.spotify.com/dashboard/applications)

1. Click on Create app

-   ![Step 1](https://raw.githubusercontent.com/JustSxm/SpotifyMigrator/master/meta/Step1.PNG)

2. Add `http://localhost:5009/api/Spotify` as Redirect URI

-   ![Step 2](https://raw.githubusercontent.com/JustSxm/SpotifyMigrator/master/meta/Step2.PNG)

3. Click on Settings

-   ![Step 3](https://raw.githubusercontent.com/JustSxm/SpotifyMigrator/master/meta/Step3.PNG)

4. Go to User Management and add the email of the other account you are not currently logged in (new or old) to give it access to the application.

-   ![Step 4](https://raw.githubusercontent.com/JustSxm/SpotifyMigrator/master/meta/Step4.PNG)

<a name="appconfiguration"/>

## App Configuration

First we need to add the settings client side.

0. Download the Release from here: https://github.com/JustSxm/SpotifyMigrator/releases/download/v3/publish.zip
1. Open `wwwroot/appsettings.json`
2. Put the Client Id of the application you just created (found in Basic Information)
3. If you are using the application for migrating your liked songs into multiple playlists, put the id of a playlist where all the songs migrated will be put (That was pretty much made for me, If you dont need it just create a temporary playlist and delete it after using the application)
4. Save and exit

Second we need to add the settings server side.

6. Open `appsettings.json`
7. Put the Client Id & Client Secret of the application you just created (found in Basic Information)

<a name="running"/>

## Running


### Windows :

run
`SpotifyMigrator.Server.exe
`

Then visit localhost:3000 on your browser.

### Linux & Mac :

-   You will need dotnet installed to run the application.

execute `dotnet SpotifyMigrator.Server.dll` in the command line

Then visit localhost:3000 on your browser.

<a name="license"/>

## License

GPL

## Todo

-   [ ] Add you to your collaborative playlists
-   [ ] Mark your collaborative playlist as collaborative instead of only public/private
-   [ ] Save Podcasts
