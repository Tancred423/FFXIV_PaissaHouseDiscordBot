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

3. **Set up environment variables**: Copy the skeleton file and fill in your
   values:
   ```bash
   cp .env.skel .env
   ```

4. **Build the Docker images**:
   ```bash
   docker-compose build
   ```

5. **Register application commands**:
   ```bash
   # For development (guild-specific commands)
   docker-compose run register-commands

   # Or in production (global commands)
   docker-compose run -e ENVIRONMENT=production register-commands
   ```

6. **Start the bot**:
   ```bash
   docker-compose up -d
   ```
