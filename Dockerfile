FROM denoland/deno:2.5.3

WORKDIR /app

# Create data directory with proper permissions
RUN mkdir -p /app/data && chmod 777 /app/data

# Copy the entire app
COPY . .

# Create an entrypoint script and cache application files
RUN echo '#!/bin/sh\n\
if [ "$REGISTER_COMMANDS" = "true" ]; then\n\
  echo "Registering Discord commands..."\n\
  deno run --allow-net --allow-env --allow-read --allow-write --allow-ffi --unstable-ffi src/register-commands.ts\n\
  echo "Command registration complete. Exiting."\n\
  exit 0\n\
fi\n\
\n\
# Start the bot\n\
exec deno run --allow-net --allow-env --allow-read --allow-write --allow-ffi --unstable-ffi src/main.ts\n\
' > /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh && \
    deno cache --no-lock src/main.ts src/register-commands.ts

# Capture git commit hash during build
ARG GIT_COMMIT_HASH=""
ENV DEPLOYMENT_HASH="${GIT_COMMIT_HASH}"

# Environment variables (these will be overridden at runtime)
ENV DISCORD_BOT_TOKEN=""
ENV DISCORD_CLIENT_ID=""
ENV DISCORD_DEV_GUILD_ID=""
ENV EMBED_COLOR="0x86b26b"
ENV ENVIRONMENT="production"
ENV REGISTER_COMMANDS="false"

# Use the entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
