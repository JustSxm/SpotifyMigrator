using SpotifyAPI.Web;

namespace SpotifyMigrator.Shared
{
    public class SpotifySingleton
    {
        public List<SpotifyClient> Client = new();
        public List<PrivateUser> Me = new();
        public MigrateStartDTO? Migration = null;
    }
}
