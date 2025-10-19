# FF14 Housing Discord Bot

An unofficial Discord bot to display data from
[PaissaDB](https://zhu.codes/paissa).

## Add the bot to your server

[Click here](https://discord.com/oauth2/authorize?client_id=1425410120568803400&permissions=281600&integration_type=0&scope=bot+applications.commands)
to add the bot to your server.

## Commands

- `/help` - Get information about this bot and how to use it.
- `/paissa` - Get detailed housing information.

## Transparency

All code is open source, and the Docker images are built directly from the
GitHub repository. Every image is tagged with its commit SHA, allowing for
complete transparency between the published code and deployed bot.

## For developers

### Initial Setup

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

### Development Setup

For development, use the `docker-compose.dev.yml` file which builds from your local source code and enables hot reloading:

1. **Build and start the development bot**:
   ```bash
   # Build with local source code and start in development mode
   docker-compose -f docker-compose.dev.yml up -d --build
   ```

2. **Register development commands** (guild-specific):
   ```bash
   # Register commands for development
   docker-compose -f docker-compose.dev.yml run register-commands
   ```

3. **Hot reloading**:
   - Changes to files in the `src` directory are automatically available in the container
   - After significant changes, you may need to restart the service:
   ```bash
   docker-compose -f docker-compose.dev.yml restart bot
   ```

### Production Setup

For production, use the default `docker-compose.yml` file which uses the pre-built image from GitHub Container Registry:

1. **Update the GitHub registry link** (important for forked repositories):
   - Open `docker-compose.yml` and modify the image path to point to your own registry:
   ```yaml
   image: ghcr.io/your-username/paissa-house-discord-bot:latest
   ```
   - The default image path (`ghcr.io/tancred423/paissa-house-discord-bot:latest`) is bound to the original repository owner's account.
   - If you're using the original repository without publishing your own images, you can skip this step.

2. **Set up GitHub repository variables and secrets** (for CI/CD workflow):
   - If you've forked this repository and want to use the GitHub Actions workflow, you need to set up:
     
     **Repository Variables:**
     - Go to your repository on GitHub → Settings → Secrets and variables → Actions → Variables
     - Create a new variable named `USERNAME_LOWERCASE` with your GitHub username in lowercase

     **Repository Secrets:**
     - Go to your repository on GitHub → Settings → Secrets and variables → Actions → Secrets
     - Set up the following secrets for deployment:
       - `SERVER_HOST`: The hostname or IP of your deployment server
       - `SERVER_USERNAME`: The SSH username for your deployment server
       - `DEPLOY_SSH_KEY`: The private SSH key for authentication with your server
       
   - These variables and secrets are used in the `.github/workflows/deploy.yml` file for building, pushing, and deploying the bot

3. **Start the production bot**:
   ```bash
   # Start with deployment hash for transparency
   DEPLOYMENT_HASH=$(git rev-parse HEAD) docker-compose up -d
   ```

4. **Register global application commands**:
   ```bash
   # Register commands globally
   DEPLOYMENT_HASH=$(git rev-parse HEAD) docker-compose run register-commands
   ```
