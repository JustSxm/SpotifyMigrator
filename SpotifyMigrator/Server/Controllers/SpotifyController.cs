using Microsoft.AspNetCore.Mvc;
using SpotifyAPI.Web;
using SpotifyMigrator.Shared;
using System.Text.Json.Nodes;

namespace SpotifyMigrator.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SpotifyController : ControllerBase
    {

        public IConfiguration Configuration { get; set; }
        public SpotifySingleton Spotify { get; set; }
        public SpotifyController(IConfiguration configuration, SpotifySingleton spotifySingleton)
        {
            Configuration = configuration;
            Spotify = spotifySingleton;
        }

        [HttpGet]
        public async Task GetAuthentificationResponse(string code)
        {
            var response = await new OAuthClient().RequestToken(
                new AuthorizationCodeTokenRequest(Configuration["ClientId"], Configuration["ClientSecret"], code, new Uri("http://localhost:5009/api/Spotify"))
              );
            var config = SpotifyClientConfig
            .CreateDefault()
               .WithAuthenticator(new AuthorizationCodeAuthenticator(Configuration["ClientId"], Configuration["ClientSecret"], response));

            var spotifyClient = new SpotifyClient(config);
            Spotify.Client.Add(spotifyClient);
            Spotify.Me.Add(await spotifyClient.UserProfile.Current());

            if (Spotify.Client.Count == 1)
            {
                Response.Redirect("/home");
            } else
            {
                Response.Redirect("/homemigrate");
            }
        }

        /*
         *  Single Account Endpoints
         */
        [HttpPost("CreatePlaylist")]
        public async Task<IActionResult> CreatePlaylist([FromBody] JsonObject name)
        {
            string playlistName = (string)name["name"];
            var playlist = await Spotify.Client.First().Playlists.Create(Spotify.Me.First().Id, new PlaylistCreateRequest(playlistName));
            return Ok(new PlaylistInfo(playlistName, playlist.Id));
        }

        [HttpGet("Songs")]
        public async Task<IActionResult> Songs()
        {
            Queue<SavedTrack> tracks = new Queue<SavedTrack>();
            var request = new LibraryTracksRequest();
            request.Limit = 50;
            request.Offset = 0;
            while (true)
            {
                var test = await Spotify.Client.First().Library.GetTracks(request);
                foreach (var item in test.Items)
                {
                    tracks.Enqueue(item);
                }
                if (test.Next == null)
                {
                    break;
                }
                request.Offset += 50;
            }

            return Ok(tracks);
        }

        [HttpPost("Playback")]
        public async Task<IActionResult> Playback([FromBody] JsonObject playback)
        {
            string uri = (string)playback["uri"];
            var plReq = new PlayerResumePlaybackRequest();
            plReq.Uris = new List<string> { uri };
            plReq.PositionMs = 30000;
            await Spotify.Client.First().Player.ResumePlayback(plReq);
            return Ok();
        }

        [HttpPost("AddToPlaylist")]
        public async Task<IActionResult> AddToPlaylist([FromBody] JsonObject obj)
        {
            string playlistId = (string)obj["playlistId"];
            string trackId = (string)obj["trackId"];
            await Spotify.Client.First().Playlists.AddItems(playlistId, new PlaylistAddItemsRequest(new List<string> { trackId }));
            return Ok();
        }

        [HttpPost("MigrateAccount")]
        public async Task<IActionResult> MigrateAccount([FromBody] MigrateStartDTO body)
        {
            Spotify.Migration = body;
            return Ok();
        }
    }
}
