FROM denoland/deno:2.5.3

WORKDIR /app

# Copy the entire app
COPY . .

# Create an entrypoint script and cache application files
RUN echo '#!/bin/sh\n\
if [ "$REGISTER_COMMANDS" = "true" ]; then\n\
  echo "Registering Discord commands..."\n\
  deno run --allow-net --allow-env --allow-read src/register-commands.ts\n\
  echo "Command registration complete. Exiting."\n\
  exit 0\n\
fi\n\
\n\
# Start the bot\n\
exec deno run --allow-net --allow-env --allow-read src/main.ts\n\
' > /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh && \
    deno cache --no-lock src/main.ts src/register-commands.ts

# Environment variables (these will be overridden at runtime)
ENV DISCORD_BOT_TOKEN=""
ENV DISCORD_CLIENT_ID=""
ENV DISCORD_DEV_GUILD_ID=""
ENV EMBED_COLOR="0x86b26b"
ENV ENVIRONMENT="production"
ENV REGISTER_COMMANDS="false"

# Use the entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
