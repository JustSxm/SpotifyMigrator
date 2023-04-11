using SpotifyAPI.Web;

namespace SpotifyMigrator.Shared
{
    public class SpotifySingleton
    {
        public static SpotifyClient Client { get; set; }
        public static PrivateUser Me { get; set; }
    }
}
