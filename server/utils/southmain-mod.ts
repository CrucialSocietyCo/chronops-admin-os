import { createHash, randomUUID } from 'node:crypto';

// ----------------------------------------------------------------------
// 🛠 DATA MODEL TYPES
// ----------------------------------------------------------------------

export type JoinEvent = {
    sessionId: string;               // uuid v4, per-tab/per-join
    ipHash: string;                  // sha256(truncatedIp)
    truncatedIp: string | null;      // e.g. "123.45.67.xxx"
    userAgentRaw: string;
    userAgentHash: string;           // sha256(userAgentRaw)
    fingerprintKey: string;          // sha256(ipHash + ":" + userAgentHash)
    joinedAt: string;                // ISO timestamp
    referrer: string | null;
    riskScore: number;               // 0–100 (computed)
    joinMode: "normal" | "limited" | "shadow";
};

export type BanRecord = {
    id: string;
    fingerprintKey: string | null;
    ipHash: string | null;
    userAgentHash: string | null;
    reason: string;
    createdAt: string;
    expiresAt: string | null;        // null = permanent
    createdBy: "system" | "admin";
};

export type MuteRecord = {
    id: string;
    sessionId: string | null;
    fingerprintKey: string | null;
    reason: string;
    createdAt: string;
    expiresAt: string | null;
    createdBy: "system" | "admin";
};

export type MessageEvent = {
    id: string;
    sessionId: string;
    fingerprintKey: string;
    content: string;
    createdAt: string;
};

// ----------------------------------------------------------------------
// 🔐 DEVICE FINGERPRINTING & UTILS
// ----------------------------------------------------------------------

export function truncateIp(ip: string): string {
    if (ip.includes('.')) {
        // IPv4: 1.2.3.4 -> 1.2.3.xxx
        const parts = ip.split('.');
        if (parts.length === 4) {
            return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
        }
    } else if (ip.includes(':')) {
        // IPv6: Simplified truncation, keep first 3 segments
        // 2001:db8:85a3:8d3:1319:8a2e:370:7348 -> 2001:db8:85a3::xxxx
        const parts = ip.split(':');
        if (parts.length > 3) {
            return `${parts.slice(0, 3).join(':')}::xxxx`;
        }
    }
    return 'unknown.xxx';
}

export function hashSha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
}

export function buildFingerprint(ip: string, userAgentRaw: string) {
    const truncatedIp = truncateIp(ip);
    const ipHash = hashSha256(truncatedIp);
    const userAgentHash = hashSha256(userAgentRaw);
    // Combine for a fairly robust device ID (handles dynamic IP within same subnet + same browser)
    const fingerprintKey = hashSha256(`${ipHash}:${userAgentHash}`);

    return {
        truncatedIp,
        ipHash,
        userAgentHash,
        fingerprintKey
    };
}

// ----------------------------------------------------------------------
// 🧠 RISK SCORING
// ----------------------------------------------------------------------

export type RiskContext = {
    recentMessagesFromFingerprintLastMinute: number;
    recentJoinsFromFingerprintLast5Minutes: number;
    priorBansOnFingerprint: number;
    priorMutesOnFingerprint: number;
    messagesFlaggedByContentFilterLastHour: number;
};

export function computeRiskScore(ctx: RiskContext): number {
    let score = 0;

    // Weightings
    score += ctx.recentJoinsFromFingerprintLast5Minutes * 10; // Rapid re-joins are suspicious
    score += ctx.priorBansOnFingerprint * 30;                 // Previous bans are bad
    score += ctx.priorMutesOnFingerprint * 10;                // Previous mutes are warning signs
    score += ctx.messagesFlaggedByContentFilterLastHour * 20; // Bad content history

    // Cap at 100
    return Math.min(100, Math.max(0, score));
}

// ----------------------------------------------------------------------
// 🧠 REPOSITORY INTERFACES & IN-MEMORY IMPLEMENTATION
// ----------------------------------------------------------------------

export interface JoinRepository {
    save(join: JoinEvent): Promise<void>;
    countJoinsByFingerprintSince(fingerprintKey: string, sinceIso: string): Promise<number>;
}

export interface MessageRepository {
    save(message: MessageEvent): Promise<void>;
    countMessagesBySessionSince(sessionId: string, sinceIso: string): Promise<number>;
    countMessagesByFingerprintSince(fingerprintKey: string, sinceIso: string): Promise<number>;
    countFlaggedMessagesByFingerprintSince(fingerprintKey: string, sinceIso: string): Promise<number>;
}

export interface BanRepository {
    findActiveByFingerprintOrIp(fingerprintKey: string, ipHash: string): Promise<BanRecord[]>;
    save(ban: BanRecord): Promise<void>;
}

export interface MuteRepository {
    findActiveBySessionOrFingerprint(sessionId: string, fingerprintKey: string): Promise<MuteRecord[]>;
    save(mute: MuteRecord): Promise<void>;
}

// --- In-Memory Stores ---
const joinStore: JoinEvent[] = [];
const messageStore: MessageEvent[] = [];
const banStore: BanRecord[] = [];
const muteStore: MuteRecord[] = [];
const flaggedMessageCountStore: Record<string, number> = {}; // Helper for flagged counts (fingerprint -> count)

export const InMemoryJoinRepo: JoinRepository = {
    async save(join) {
        joinStore.push(join);
    },
    async countJoinsByFingerprintSince(fingerprintKey, sinceIso) {
        return joinStore.filter(j =>
            j.fingerprintKey === fingerprintKey && j.joinedAt >= sinceIso
        ).length;
    }
};

export const InMemoryMessageRepo: MessageRepository = {
    async save(message) {
        messageStore.push(message);
    },
    async countMessagesBySessionSince(sessionId, sinceIso) {
        return messageStore.filter(m =>
            m.sessionId === sessionId && m.createdAt >= sinceIso
        ).length;
    },
    async countMessagesByFingerprintSince(fingerprintKey, sinceIso) {
        return messageStore.filter(m =>
            m.fingerprintKey === fingerprintKey && m.createdAt >= sinceIso
        ).length;
    },
    async countFlaggedMessagesByFingerprintSince(fingerprintKey, sinceIso) {
        // Mock implementation: In real DB this would query a 'flagged' column.
        // For in-memory, we can check our simple side-store or filter message content here if we tracked flags.
        // Let's assume we don't retroactively scan, but return 0 for now unless we implement the side store logic in handleMessage.
        return 0;
    }
};

export const InMemoryBanRepo: BanRepository = {
    async findActiveByFingerprintOrIp(fingerprintKey, ipHash) {
        const now = new Date().toISOString();
        return banStore.filter(b => {
            const matchesTarget = (b.fingerprintKey === fingerprintKey) || (b.ipHash === ipHash);
            const isActive = b.expiresAt === null || b.expiresAt > now;
            return matchesTarget && isActive;
        });
    },
    async save(ban) {
        banStore.push(ban);
    }
};

export const InMemoryMuteRepo: MuteRepository = {
    async findActiveBySessionOrFingerprint(sessionId, fingerprintKey) {
        const now = new Date().toISOString();
        return muteStore.filter(m => {
            const matchesSession = sessionId && m.sessionId === sessionId;
            const matchesFingerprint = fingerprintKey && m.fingerprintKey === fingerprintKey;
            const isActive = m.expiresAt === null || m.expiresAt > now;
            return (matchesSession || matchesFingerprint) && isActive;
        });
    },
    async save(mute) {
        muteStore.push(mute);
    }
};

// ----------------------------------------------------------------------
// 🚪 JOIN HANDLER
// ----------------------------------------------------------------------

export type JoinDecision = {
    allow: boolean;
    reason?: "banned";
    joinMode?: "normal" | "limited" | "shadow";
    riskScore?: number;
    fingerprintKey?: string;
    sessionId?: string;
};

export async function handleUserJoin(args: {
    ip: string;
    userAgent: string;
    referrer: string | null;
    nowIso?: string; // Dependency injection for testing time
}): Promise<JoinDecision> {
    const now = args.nowIso || new Date().toISOString();

    // 1. Build Fingerprint
    const fp = buildFingerprint(args.ip, args.userAgent);

    // 2. Check Bans
    const activeBans = await InMemoryBanRepo.findActiveByFingerprintOrIp(fp.fingerprintKey, fp.ipHash);
    if (activeBans.length > 0) {
        return {
            allow: false,
            reason: "banned",
            fingerprintKey: fp.fingerprintKey
        };
    }

    // 3. Build Risk Context
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    // Simplified risk context construction for MVP
    const riskCtx: RiskContext = {
        recentMessagesFromFingerprintLastMinute: 0, // Could query repo if needed
        recentJoinsFromFingerprintLast5Minutes: await InMemoryJoinRepo.countJoinsByFingerprintSince(fp.fingerprintKey, fiveMinutesAgo),
        priorBansOnFingerprint: 0, // Would need a 'findPastBans' method
        priorMutesOnFingerprint: 0, // Would need a 'findPastMutes' method
        messagesFlaggedByContentFilterLastHour: 0
    };

    // 4. Compute Risk
    const riskScore = computeRiskScore(riskCtx);

    // 5. Determine Join Mode
    let joinMode: "normal" | "limited" | "shadow" = "normal";
    if (riskScore > 30) joinMode = "limited";
    if (riskScore > 60) joinMode = "shadow";

    // 6. Persist Join
    const sessionId = randomUUID();
    const joinEvent: JoinEvent = {
        sessionId,
        ipHash: fp.ipHash,
        truncatedIp: fp.truncatedIp,
        userAgentRaw: args.userAgent,
        userAgentHash: fp.userAgentHash,
        fingerprintKey: fp.fingerprintKey,
        joinedAt: now,
        referrer: args.referrer,
        riskScore,
        joinMode
    };

    await InMemoryJoinRepo.save(joinEvent);

    return {
        allow: true,
        joinMode,
        riskScore,
        fingerprintKey: fp.fingerprintKey,
        sessionId
    };
}

// ----------------------------------------------------------------------
// 📝 MESSAGE HANDLER & FILTERS
// ----------------------------------------------------------------------

export type MessageDecision =
    | { type: "allow" }
    | { type: "drop"; reason: string }
    | { type: "mute"; expiresAt: string; reason: string };

// Placeholder content filter
function checkMessageForAbuse(content: string): boolean {
    const badWords = ['spam', 'abuse', 'badword']; // Simple list
    return badWords.some(w => content.toLowerCase().includes(w));
}

const LIMITS = {
    perSessionPer10s: 8,
    perFingerprintPer10s: 20
};

export async function handleIncomingMessage(args: {
    sessionId: string;
    fingerprintKey: string;
    content: string;
    nowIso?: string;
}): Promise<MessageDecision> {
    const now = args.nowIso || new Date().toISOString();
    const nowTime = new Date(now).getTime();

    // 1. Check Active Mutes
    const activeMutes = await InMemoryMuteRepo.findActiveBySessionOrFingerprint(args.sessionId, args.fingerprintKey);
    if (activeMutes.length > 0) {
        // Find longest expiry
        const latestMute = activeMutes.sort((a, b) => (a.expiresAt || '').localeCompare(b.expiresAt || ''))[activeMutes.length - 1];
        return {
            type: "mute",
            expiresAt: latestMute.expiresAt || new Date(nowTime + 60000).toISOString(),
            reason: latestMute.reason
        };
    }

    // 2. Check Content (Optional hook)
    if (checkMessageForAbuse(args.content)) {
        // Drop logic
        return { type: "drop", reason: "Content filter triggered" };
    }

    // 3. Check Rate Limits
    const tenSecondsAgo = new Date(nowTime - 10000).toISOString();

    const sessionCount = await InMemoryMessageRepo.countMessagesBySessionSince(args.sessionId, tenSecondsAgo);
    if (sessionCount >= LIMITS.perSessionPer10s) {
        const expiresAt = new Date(nowTime + 60000).toISOString();
        // Auto-mute session
        await InMemoryMuteRepo.save({
            id: randomUUID(),
            sessionId: args.sessionId,
            fingerprintKey: args.fingerprintKey,
            reason: "Rate limit exceeded (session)",
            createdAt: now,
            expiresAt: expiresAt, // 60s mute
            createdBy: "system"
        });
        return { type: "mute", expiresAt, reason: "Rate limit exceeded" };
    }

    const fingerprintCount = await InMemoryMessageRepo.countMessagesByFingerprintSince(args.fingerprintKey, tenSecondsAgo);
    if (fingerprintCount >= LIMITS.perFingerprintPer10s) {
        const expiresAt = new Date(nowTime + 60000).toISOString();
        // Auto-mute fingerprint
        await InMemoryMuteRepo.save({
            id: randomUUID(),
            sessionId: null, // Mute the whole device
            fingerprintKey: args.fingerprintKey,
            reason: "Rate limit exceeded (device)",
            createdAt: now,
            expiresAt: expiresAt,
            createdBy: "system"
        });
        return { type: "mute", expiresAt, reason: "Rate limit exceeded" };
    }

    // 4. Update Stats & Save
    await InMemoryMessageRepo.save({
        id: randomUUID(),
        sessionId: args.sessionId,
        fingerprintKey: args.fingerprintKey,
        content: args.content,
        createdAt: now
    });

    return { type: "allow" };
}

// ----------------------------------------------------------------------
// 🛠 ADMIN COMMANDS
// ----------------------------------------------------------------------

export type AdminCommand =
    | { type: "muteSession"; sessionId: string; durationMinutes: number; reason?: string }
    | { type: "muteFingerprint"; fingerprintKey: string; durationMinutes: number; reason?: string }
    | { type: "banFingerprint"; fingerprintKey: string; durationMinutes: number | null; reason?: string }
    | { type: "banIp"; ipHash: string; durationMinutes: number | null; reason?: string };

export async function handleAdminCommand(cmd: AdminCommand): Promise<void> {
    const now = new Date();
    const createdAt = now.toISOString();

    switch (cmd.type) {
        case "muteSession": {
            const expiresAt = new Date(now.getTime() + cmd.durationMinutes * 60000).toISOString();
            await InMemoryMuteRepo.save({
                id: randomUUID(),
                sessionId: cmd.sessionId,
                fingerprintKey: null,
                reason: cmd.reason || "Admin mute",
                createdAt,
                expiresAt,
                createdBy: "admin"
            });
            break;
        }
        case "muteFingerprint": {
            const expiresAt = new Date(now.getTime() + cmd.durationMinutes * 60000).toISOString();
            await InMemoryMuteRepo.save({
                id: randomUUID(),
                sessionId: null,
                fingerprintKey: cmd.fingerprintKey,
                reason: cmd.reason || "Admin mute",
                createdAt,
                expiresAt,
                createdBy: "admin"
            });
            break;
        }
        case "banFingerprint": {
            const expiresAt = cmd.durationMinutes ? new Date(now.getTime() + cmd.durationMinutes * 60000).toISOString() : null;
            await InMemoryBanRepo.save({
                id: randomUUID(),
                fingerprintKey: cmd.fingerprintKey,
                ipHash: null,
                userAgentHash: null,
                reason: cmd.reason || "Admin ban",
                createdAt,
                expiresAt,
                createdBy: "admin"
            });
            break;
        }
        case "banIp": {
            const expiresAt = cmd.durationMinutes ? new Date(now.getTime() + cmd.durationMinutes * 60000).toISOString() : null;
            await InMemoryBanRepo.save({
                id: randomUUID(),
                fingerprintKey: null,
                ipHash: cmd.ipHash,
                userAgentHash: null,
                reason: cmd.reason || "Admin ban",
                createdAt,
                expiresAt,
                createdBy: "admin"
            });
            break;
        }
    }
}
