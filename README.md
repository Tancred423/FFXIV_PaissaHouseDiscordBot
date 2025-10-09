# FF14 Housing Discord Bot

An unofficial Discord bot to display data from
[PaissaDB](https://zhu.codes/paissa).

## Add the bot to your server

[Click here](https://discord.com/oauth2/authorize?client_id=1425410120568803400&permissions=0&integration_type=0&scope=applications.commands+bot)
to add the bot to your server.

## Commands

- `/help` - Get information about this bot and how to use it.
- `/paissa` - Get detailed housing information.

## Transparency

All code is open source, and the Docker images are built directly from the
GitHub repository. Every image is tagged with its commit SHA, allowing for
complete transparency between the published code and deployed bot.

## For developers

### Setup with Docker

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Tancred423/FFXIV_PaissaHouseDiscordBot.git
   cd FFXIV_PaissaHouseDiscordBot
   ```

2. **Create a Discord application**:
   - Go to https://discord.com/developers/applications
   - Create a new application
   - Go to the "Bot" section and create a bot
   - Reset & copy the bot token
   - Copy the application ID (Client ID)

3. **Set up application emojis**:
   - Still on https://discord.com/developers/applications with your app selected
   - Go to the "Emojis" section
   - Upload the emojis from the `/emotes` directory, or create your own ones
   - Copy the markdown of the emojis

4. **Set up environment variables**:
   - Copy the skeleton file and fill in your values:
   ```bash
   cp .env.skel .env
   ```
   - This also includes the bot token, application ID, and emoji markdowns
     you've copied above.

5. **Build the Docker images**:
   - Build with git commit hash for transparency
   ```bash
   docker-compose build --build-arg GIT_COMMIT_HASH=$(git rev-parse HEAD)
   ```

6. **Register application commands**:
   - For development (guild-specific commands)
   ```bash
   DEPLOYMENT_HASH=$(git rev-parse HEAD) docker-compose run register-commands
   ```
   - Or in production (global commands)
   ```bash
   DEPLOYMENT_HASH=$(git rev-parse HEAD) docker-compose run -e ENVIRONMENT=production register-commands
   ```

7. **Start the bot**:
   ```bash
   # Start with deployment hash for transparency
   DEPLOYMENT_HASH=$(git rev-parse HEAD) docker-compose up -d
   ```
