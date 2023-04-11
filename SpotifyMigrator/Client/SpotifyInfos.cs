using SpotifyAPI.Web;
using SpotifyMigrator.Shared;

namespace SpotifyMigrator.Client
{
    public class SpotifyInfos
    {
        public List<PlaylistInfo> Playlists {  get; set; } = new List<PlaylistInfo>();
        public Queue<SavedTrack> TracksInfos = new Queue<SavedTrack>();

    }
}
