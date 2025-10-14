# Privacy Policy

**Last Updated: 2025/10/14**

## 1. Introduction

This Privacy Policy explains how the PaissaHouse Discord Bot ("the Bot") handles
information. We are committed to protecting your privacy and being transparent
about our data practices.

## 2. Information We Collect

The Bot collects and stores **minimal server configuration data only**:

### 2.1 Server Settings Data

- **Guild ID** - Your Discord server's unique identifier
- **Channel ID** - The text channel ID where you want to receive housing lottery
  announcements

This data is stored **only** when you explicitly configure announcement settings
using the `/announcement set` command.

### 2.2 What We Do NOT Collect

The Bot does **not** collect, store, or process any personal information,
including:

- **No user data collection** - We don't collect Discord usernames, user IDs, or
  any user information
- **No message content** - We don't read or store any Discord messages
- **No usage analytics** - We don't track how often commands are used or by whom
- **No personal information** - Only server/channel IDs, no personal data

## 3. What the Bot Does

The Bot provides housing information and notifications:

- **Receives commands** from Discord users (e.g., `/paissa` commands)
- **Fetches housing data** from the PaissaDB API (public data)
- **Formats and displays** the data in Discord
- **Provides pagination** for large result sets (temporary, in-memory only)
- **Sends notifications** to configured channels when new housing lottery
  periods begin

## 4. Why We Collect This Data

### 4.1 Purpose

Server configuration data is collected solely to:

- **Remember your preferences** - Store which channel you want announcements in
- **Send notifications** - Deliver housing lottery announcements to the correct
  channel
- **Provide the service** - Enable the announcement feature you explicitly
  requested

### 4.2 Legal Basis

Data collection is based on:

- **Consent** - You explicitly configure the settings using the
  `/announcement
  set` command
- **Legitimate Interest** - Providing the notification service you requested

## 5. Data Retention and Deletion

### 5.1 How Long We Keep Data

Your server settings are kept indefinitely while you use the announcement
feature.

### 5.2 Automatic Deletion

Your data is **automatically deleted** when:

- **You remove the bot** from your server
- **The announcement channel is deleted** from your server
- **You use** the `/announcement remove` command

### 5.3 Periodic Cleanup

The Bot performs automatic cleanup every 24 hours, in case the automatic clean
up didn't work, to remove:

- Settings for servers the bot is no longer in
- Settings for channels that no longer exist or are inaccessible

### 5.4 Manual Deletion

To manually delete your server's data:

1. Use the `/announcement remove` command, or
2. Remove the bot from your server

## 6. Technical Information We May Log

The Bot may log the following technical information for debugging purposes:

### 6.1 Error Logging

- **Error messages and stack traces** - Technical details about what went wrong
- **Command execution errors** - When commands fail to execute properly
- **API connection issues** - Problems connecting to PaissaDB API
- **System errors** - Bot startup issues or crashes

### 6.2 What Error Logs Contain

- **No user information** - Error logs don't include Discord usernames or user
  IDs
- **Only technical details** - Exception types, error codes, and system
  information
- **Anonymous** - Cannot be traced back to specific users

### 6.3 Example of What We Log

```
ERROR: Failed to fetch housing data from PaissaDB API
Stack trace: [technical details only]
```

### 6.4 Example of What We DON'T Log

```
❌ User "@john" used /paissa command and got error
❌ Server "My FFXIV Guild" had connection issues
❌ User data: {username: "John", server: "Guild"}
```

## 7. Data Flow

### 7.1 Using Commands

Here's what happens when you use the `/paissa` command:

1. **You type a command** (e.g., `/paissa light phoenix`)
2. **Bot receives the command** (Discord handles this)
3. **Bot fetches data** from PaissaDB API (public housing data)
4. **Bot formats the data** for display
5. **Bot sends formatted data** back to Discord
6. **Data is displayed** in your Discord channel
7. **No data is stored** from this interaction

### 7.2 Configuring Announcements

Here's what happens when you use `/announcement set`:

1. **You select a channel** for announcements
2. **Bot stores** your Guild ID and Channel ID in a local SQLite database
3. **Bot confirms** the setting was saved
4. **Bot sends notifications** to your chosen channel when lottery periods begin

## 8. Third-Party Services

The Bot integrates with these external services:

### 8.1 PaissaDB API

- **Purpose**: Source of housing data
- **Data shared**: None (we only receive data, don't send any)
- **Privacy**: Subject to PaissaDB's privacy policy
- **URL**: https://zhu.codes/paissa

### 8.2 GameTora

- **Purpose**: Housing plot viewer links
- **Data shared**: None (we only provide links)
- **Privacy**: Subject to GameTora's privacy policy
- **URL**: https://gametora.com/ffxiv/housing-plot-viewer

## 9. Your Rights

### 9.1 Access Your Data

Server administrators can view their configured settings by checking which
channel announcements are sent to.

### 9.2 Delete Your Data

You can delete your server's data at any time by:

- Using the `/announcement remove` command
- Removing the bot from your server
- Deleting the configured announcement channel

### 9.3 Data Portability

The data we store is minimal (Guild ID and Channel ID) and can be easily
re-configured if needed.

## 10. Data Security

### 10.1 Security Measures

- **Local storage** - Data is stored in a local SQLite database
- **No external access** - Database is not accessible from the internet
- **Minimal data** - Only essential configuration data is stored
- **Automatic cleanup** - Dead/invalid data is regularly removed

### 10.2 Data Protection

While we implement reasonable security measures, please note:

- Guild IDs and Channel IDs are not considered sensitive personal information
- This data is already visible to Discord and other bots in your server
- The Bot operates within Discord's security framework

## 11. Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be posted in
this document with an updated "Last Updated" date.

## 12. Contact Information

For questions about this Privacy Policy:

- **GitHub Issues**:
  https://github.com/Tancred423/FFXIV_PaissaHouseDiscordBot/issues
- **Developer**: Tancred (GitHub: @Tancred423)

## 13. Summary

**In simple terms**: This bot collects minimal server configuration data (Guild
ID and Channel ID) **only** when you set up announcement notifications. No
personal user data is collected. You can delete this data at any time using the
`/announcement remove` command or by removing the bot from your server.

---

**This Privacy Policy is effective as of the date listed above and applies to
all use of the PaissaHouse Discord Bot.**
