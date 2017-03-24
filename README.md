# twitch-dj
Integration between Twitch and Spotify that lets your audience queue songs.

Authentication
---
You will need to sign in with the same user as the one provided in config.json

config.json
---
```
{
  "channel_name": "",
  "twitch_bot_username": "",
  "twitch_client_id": ""
}
```
```channel_name``` - username of the broadcasting channel you want the bot to listen in prepended with ```#```

```twitch_bot_username``` - username of the Twitch account the bot will run as

```twitch_client_id``` - client ID from Twitch for your app
