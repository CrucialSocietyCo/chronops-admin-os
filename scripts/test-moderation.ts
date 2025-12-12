
import {
    handleUserJoin,
    handleIncomingMessage,
    handleAdminCommand,
    JoinDecision,
    MessageDecision
} from '../server/utils/southmain-mod'; // Adjust relative path if needed based on execution context

// Mocking 'node:crypto' imports works if run with 'tsx' or similar that supports node modules.
// If this script sits in the root, it should resolve '../server/utils/southmain-mod' if tsconfig maps paths or we use relative.

// Assuming simple relative import for `tsx` execution from root:
// npx tsx scripts/test-moderation.ts

async function runTests() {
    console.log("🧪 STARTING SOUTHMAIN MODERATION TESTS\n");

    // SCENARIO 1: Normal User
    console.log("--- SCENARIO 1: Normal User ---\n");
    const ip1 = "192.168.1.5";
    const ua1 = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";

    const join1 = await handleUserJoin({ ip: ip1, userAgent: ua1, referrer: "google.com" });
    console.log(`User 1 Join: Allowed=${join1.allow}, Session=${join1.sessionId}, Risk=${join1.riskScore}`);

    if (!join1.sessionId) {
        console.error("❌ Failed to get session ID for User 1");
        return;
    }

    const msg1 = await handleIncomingMessage({
        sessionId: join1.sessionId,
        fingerprintKey: join1.fingerprintKey!,
        content: "Hello world!"
    });
    console.log(`User 1 Message: Decision=${msg1.type}`);


    // SCENARIO 2: Spammer (Rate Limit)
    console.log("\n--- SCENARIO 2: Spammer (Rate Limit) ---\n");
    const ip2 = "10.0.0.99";
    const ua2 = "SpamBot/1.0";

    const join2 = await handleUserJoin({ ip: ip2, userAgent: ua2, referrer: null });
    console.log(`Spammer Join: Allowed=${join2.allow}, Session=${join2.sessionId}`);

    if (join2.sessionId) {
        console.log("Sending 10 messages rapidly...");
        for (let i = 0; i < 10; i++) {
            const res = await handleIncomingMessage({
                sessionId: join2.sessionId,
                fingerprintKey: join2.fingerprintKey!,
                content: `Rapid message ${i}`
            });
            console.log(`Msg ${i + 1}: ${res.type}`);
        }
    }

    // SCENARIO 3: Admin Ban
    console.log("\n--- SCENARIO 3: Admin Ban ---\n");
    const ip3 = "203.0.113.42";
    const ua3 = "BadActor/1.0";

    // 3a. User joins normally first
    let join3 = await handleUserJoin({ ip: ip3, userAgent: ua3, referrer: null });
    console.log(`BadActor First Join: Allowed=${join3.allow}, Fingerprint=${join3.fingerprintKey}`);

    // 3b. Admin bans them
    if (join3.fingerprintKey) {
        console.log("Admin executing ban on fingerprint...");
        await handleAdminCommand({
            type: 'banFingerprint',
            fingerprintKey: join3.fingerprintKey,
            durationMinutes: null // Permanent
        });
    }

    // 3c. User tries to join again
    console.log("BadActor trying to join again...");
    join3 = await handleUserJoin({ ip: ip3, userAgent: ua3, referrer: null });
    console.log(`BadActor Second Join: Allowed=${join3.allow}, Reason=${join3.reason}`);

    console.log("\n✅ TESTS COMPLETED");
}

runTests().catch(console.error);
