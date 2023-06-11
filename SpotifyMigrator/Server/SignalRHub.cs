using Microsoft.AspNetCore.SignalR;

namespace SpotifyMigrator.Server
{
    public class SignalRHub: Hub
    {
        public async Task SendMessage(string channel, string message)
        {
            await Clients.All.SendAsync(channel, message);
        }
    }
}
