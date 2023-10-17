using Microsoft.AspNetCore.SignalR;
using SpotifyAPI.Web;
using SpotifyMigrator.Shared;
using System.Diagnostics;
using System.Linq;

namespace SpotifyMigrator.Server
{
    public class SignalRWorker : BackgroundService
    {
        private readonly IHubContext<SignalRHub> _hub;
        private readonly SpotifySingleton Spotify;


        public SignalRWorker(IHubContext<SignalRHub> reportHub, SpotifySingleton spotifySingleton)
        {
            _hub = reportHub;
            Spotify = spotifySingleton;
        }


        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                if(Spotify.Migration != null)
                {
                    await Migrate();
                }
                await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
            }
        }

        private async Task Migrate()
        {
            await _hub.Clients.All.SendAsync("MigrateUpdate", "Retrieving accounts");
            var oldClient = Spotify.Client.First();
            var newClient = Spotify.Client.Last();
            var oldUser = Spotify.Me.First();
            var newUser = Spotify.Me.Last();
            var payload = Spotify.Migration;

            if (payload.LikedSongs)
            {
                await _hub.Clients.All.SendAsync("MigrateUpdate", "Fetching songs");
                var pageOne = await oldClient.Library.GetTracks();
                List<SavedTrack> tracks = (List<SavedTrack>)await oldClient.PaginateAll(pageOne);
                tracks.Reverse(); // Oldest first

                for (var i = 0; i < tracks.Count; i++)
                {
                    var track = tracks[i];
                    await _hub.Clients.All.SendAsync("MigrateUpdate", $"Migrating songs [{track.Track.Name}] ({i + 1} / {tracks.Count})");
                    LibrarySaveTracksRequest request = new(new List<string>() { track.Track.Id });
                    await newClient.Library.SaveTracks(request);
                    await Task.Delay(TimeSpan.FromSeconds(1));
                }
            }

            if (payload.Playlists)
            {
                await _hub.Clients.All.SendAsync("MigrateUpdate", "Fetching playlists");
                var pageOne = await oldClient.Playlists.CurrentUsers();
                List<SimplePlaylist> playlists = (List<SimplePlaylist>)await oldClient.PaginateAll(pageOne);
                playlists.Reverse();

                for (var i = 0; i < playlists.Count;i++)
                {
                    var playlist = playlists[i];
                    if (playlist.Owner.Id == oldUser.Id)
                    {
                        await _hub.Clients.All.SendAsync("MigrateUpdate", $"Migrating playlists [{playlist.Name}] ({i + 1} / {playlists.Count})");
                        PlaylistCreateRequest request = new(playlist.Name);
                        request.Description = playlist.Description;
                        request.Public = playlist.Public;
                        FullPlaylist newPlaylist = await newClient.Playlists.Create(newUser.Id, request);

                        var pageOneTracks = await oldClient.Playlists.GetItems(playlist.Id);
                        List<PlaylistTrack<IPlayableItem>> tracks = (List<PlaylistTrack<IPlayableItem>>)await oldClient.PaginateAll(pageOneTracks);
                        tracks.Reverse();

                        while (tracks.Count != 0)
                        {
                            int count = Math.Min(tracks.Count, 100);
                            var tracksToAdd = tracks.Take(count);
                            var ids = new List<string>();
                            foreach (var item in tracksToAdd)
                            {
                                switch (item.Track.Type)
                                {
                                    case ItemType.Track:
                                        ids.Add(((FullTrack)item.Track).Uri);
                                        break;

                                    case ItemType.Episode:
                                        ids.Add(((FullEpisode)item.Track).Uri);
                                        break;
                                }
                            }


                            tracks.RemoveRange(0, count);
                            PlaylistAddItemsRequest addItemsRequest = new(ids);
                            await newClient.Playlists.AddItems(newPlaylist.Id, addItemsRequest);
                            await Task.Delay(TimeSpan.FromSeconds(1));
                        }
                    }
                    else
                    {
                        try
                        {
                            await newClient.Follow.FollowPlaylist(playlist.Id);
                        }
                        catch (APIException) { }
                    }

                }
            }

            if (payload.Albums)
            {
                await _hub.Clients.All.SendAsync("MigrateUpdate", "Fetching Albums");
                var pageOne = await oldClient.Library.GetAlbums();
                List<SavedAlbum> albums = (List<SavedAlbum>)await oldClient.PaginateAll(pageOne);
                albums.Reverse(); // Oldest first

                for (var i = 0; i < albums.Count; i++)
                {
                    var album = albums[i];
                    await _hub.Clients.All.SendAsync("MigrateUpdate", $"Migrating album [{album.Album.Name}] ({i + 1} / {albums.Count})");
                    LibrarySaveAlbumsRequest request = new(new List<string>() { album.Album.Id });
                    await newClient.Library.SaveAlbums(request);
                    await Task.Delay(TimeSpan.FromSeconds(1));
                }
            }

            if (payload.Artists)
            {
                await _hub.Clients.All.SendAsync("MigrateUpdate", "Fetching Follows");
                var pageOne = await oldClient.Follow.OfCurrentUser(new FollowOfCurrentUserRequest { Limit = 50 });
                // We need to supply next=>next.Artists due do nested paging object.
                var artists = await oldClient.PaginateAll(pageOne.Artists, next => next.Artists);
                if (artists != null)
                {
                    Debug.WriteLine($"Found {artists.Count} artists");
                    artists.Reverse();
                    foreach (var artist in artists)
                    {
                        await _hub.Clients.All.SendAsync("MigrateUpdate", $"Migrating artist [{artist.Name}]");
                        FollowRequest request = new FollowRequest(FollowRequest.Type.Artist, new List<string> { artist.Id });
                        await newClient.Follow.Follow(request);
                        await Task.Delay(TimeSpan.FromSeconds(1));
                    }
                }
            }

            await _hub.Clients.All.SendAsync("MigrateUpdate", "Done");
            Spotify.Migration = null;
        }
    }
}
