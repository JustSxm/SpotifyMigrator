using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SpotifyAPI.Web;
using SpotifyMigrator.Client;
using SpotifyMigrator.Shared;
using System.Text.Json.Nodes;

namespace SpotifyMigrator.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SpotifyController : ControllerBase
    {

        public IConfiguration Configuration { get; set; }
        public SpotifyController(IConfiguration configuration)
        {
            Configuration = configuration;
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

            SpotifySingleton.Client = new SpotifyClient(config);
            SpotifySingleton.Me = await SpotifySingleton.Client.UserProfile.Current();

            Response.Redirect("/home");
        }

        [HttpPost("CreatePlaylist")]
        public async Task<IActionResult> CreatePlaylist([FromBody] JsonObject name)
        {
            string playlistName = (string)name["name"];
            var playlist = await SpotifySingleton.Client.Playlists.Create(SpotifySingleton.Me.Id, new PlaylistCreateRequest(playlistName));
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
                var test = await SpotifySingleton.Client.Library.GetTracks(request);
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
            await SpotifySingleton.Client.Player.ResumePlayback(plReq);
            return Ok();
        }

        [HttpPost("AddToPlaylist")]
        public async Task<IActionResult> AddToPlaylist([FromBody] JsonObject obj)
        {
            string playlistId = (string)obj["playlistId"];
            string trackId = (string)obj["trackId"];
            await SpotifySingleton.Client.Playlists.AddItems(playlistId, new PlaylistAddItemsRequest(new List<string> { trackId }));
            return Ok();
        }
    }
}
