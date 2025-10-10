# Privacy Policy

**Last Updated: 2025/10/10**

## 1. Introduction

This Privacy Policy explains how the PaissaHouse Discord Bot ("the Bot") handles
information. We are committed to protecting your privacy and being transparent
about our data practices.

## 2. Information We Do NOT Collect

The Bot does **not** collect, store, or process any personal information,
including:

- **No user data collection** - We don't collect Discord usernames, user IDs, or
  any user information
- **No message content** - We don't read or store any Discord messages
- **No server data** - We don't collect server information
- **No usage analytics** - We don't track how often commands are used or by
  whom, nor do we track any other data
- **No persistent storage** - We don't even use a database or a file storage
  system

## 3. What the Bot Does

The Bot is a simple data relay service that:

- **Receives commands** from Discord users (e.g., `/paissa` commands)
- **Fetches housing data** from the PaissaDB API (public data)
- **Formats and displays** the data in Discord
- **Provides pagination** for large result sets (temporary, in-memory only)

## 4. Technical Information We May Log

The Bot may log the following technical information for debugging purposes:

### 4.1 Error Logging

- **Error messages and stack traces** - Technical details about what went wrong
- **Command execution errors** - When commands fail to execute properly
- **API connection issues** - Problems connecting to PaissaDB API
- **System errors** - Bot startup issues or crashes

### 4.2 What Error Logs Contain

- **No user information** - Error logs don't include Discord usernames or user
  IDs
- **Only technical details** - Exception types, error codes, and system
  information
- **Anonymous** - Cannot be traced back to specific users

### 4.3 Example of What We Log

```
ERROR: Failed to fetch housing data from PaissaDB API
Stack trace: [technical details only]
```

### 4.4 Example of What We DON'T Log

```
❌ User "@john" used /paissa command and got error
❌ Server "My FFXIV Guild" had connection issues
❌ User data: {username: "John", server: "Guild"}
```

## 5. Data Flow

Here's exactly what happens when you use the Bot:

1. **You type a command** (e.g., `/paissa light phoenix`)
2. **Bot receives the command** (Discord handles this)
3. **Bot fetches data** from PaissaDB API (public housing data)
4. **Bot formats the data** for display
5. **Bot sends formatted data** back to Discord
6. **Data is displayed** in your Discord channel
7. **No data is stored** anywhere

## 6. Third-Party Services

The Bot integrates with these external services:

### 6.1 PaissaDB API

- **Purpose**: Source of housing data
- **Data shared**: None (we only receive data, don't send any)
- **Privacy**: Subject to PaissaDB's privacy policy
- **URL**: https://zhu.codes/paissa

### 6.2 GameTora

- **Purpose**: Housing plot viewer links
- **Data shared**: None (we only provide links)
- **Privacy**: Subject to GameTora's privacy policy
- **URL**: https://gametora.com/ffxiv/housing-plot-viewer

## 7. Your Rights

Since we don't collect personal data, there's no personal data to:

- **Access** - We have no data to provide
- **Correct** - We have no data to correct
- **Delete** - We have no data to delete
- **Port** - We have no data to export

## 8. Data Security

- **No data storage** - Nothing to secure
- **No databases** - No databases to protect
- **No file storage** - No files to secure

## 9. Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be posted in
this document with an updated "Last Updated" date.

## 10. Contact Information

For questions about this Privacy Policy:

- **GitHub Issues**:
  https://github.com/Tancred423/FFXIV_PaissaHouseDiscordBot/issues
- **Developer**: Tancred (GitHub: @Tancred423)

## 11. Summary

**In simple terms**: This bot doesn't collect, store, or remember anything about
you. It's just a simple tool that takes housing data from PaissaDB and shows it
to you in Discord. That's it.

---

**This Privacy Policy is effective as of the date listed above and applies to
all use of the PaissaHouse Discord Bot.**
