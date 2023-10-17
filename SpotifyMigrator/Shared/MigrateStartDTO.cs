using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SpotifyMigrator.Shared
{
    public class MigrateStartDTO
    {
        public bool Albums { get; set; }
        public bool Artists { get; set; }
        public bool LikedSongs { get; set; }
        public bool Playlists { get; set; }
    }
}
