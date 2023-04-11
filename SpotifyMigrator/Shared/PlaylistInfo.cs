using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SpotifyMigrator.Shared
{
    public class PlaylistInfo
    {
        public string Title { get; set; }
        public string PlaylistId { get; set; }
        public bool Hide { get; set; } = false;

        public PlaylistInfo(string title, string playlistId)
        {
            Title = title;
            PlaylistId = playlistId;
       }
    }
}
