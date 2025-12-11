export const MODERATION_CONFIG = {
    // 5 messages in 10 seconds = Spam
    RATE_LIMIT_WINDOW_MS: 10_000,
    MAX_MESSAGES_PER_WINDOW: 5,

    // Auto-mute details
    AUTO_MUTE_DURATION_MS: 5 * 60 * 1000, // 5 minutes
    REPEAT_MESSAGE_THRESHOLD: 3, // 3 identical messages

    // Content limits
    MAX_MESSAGE_LENGTH: 500,

    // Simple blocklist (extend as needed)
    BAD_WORDS: [
        'badword1',
        'spam',
        'crypto',
        'nft',
        'buy now'
    ]
}
