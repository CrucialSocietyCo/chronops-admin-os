# /CHRONOPS/ADMIN_OS
**CLASSIFICATION:** INTERNAL / AGENCY EYES ONLY  
**SYSTEM:** CHRONOPS OVERWATCH PROTOCOL (C.O.P.)

> [!CAUTION]
> **UNAUTHORIZED ACCESS DETECTED.**
> This terminal is monitored by the Department of Timeline Integrity. If you are not an authorized Agent, disconnect immediately.

---

## 🖥️ System Overview
**ChronOps Admin OS** is the central command interface for monitoring and stabilizing live event timelines (chatrooms). It provides real-time surveillance, anomaly detection (moderation), and crowd control capabilities.

**Version:** 4.2.2 (Nuxt-driven)  
**Status:** ONLINE  
**Aesthetic:** WINDOWS-95 / TERMINAL HYBRID

## 🔑 Access Protocol
To initialize the command center locally:

```bash
# 1. Establish Secure Connection (Install Deps)
npm install

# 2. Configure Credentials
cp .env.example .env

# 3. Launch Interface
npm run dev
```

## 🛠️ Operational Capabilities
The Admin Dashboard (`/admin`) provides the following tools:

- **Timeline Surveillance (`Dashboard`)**: Real-time stats on user joins, message velocity, and system load.
- **Crowd Control (`Moderation`)**: 
    - **Burst Protection**: Auto-mute spam surges.
    - **AI Neural Rewriter**: Intercepts banned phrases and rewrites them into corporate-safe jargon using Gemini AI.
    - **Reaction Analysis**: Monitoring emotional sentiment via emoji density.
- **Visual Synthesis (`Aesthetics`)**: Real-time theme injection (System95, SlateShell, Noir Terminal) to alter the client-side perception.

## 📡 Telemetry Hooks
The system tracks the following signals for timeline stability:
`user_joined`, `message_sent`, `reaction_added`, `typing_started`, `ai_persona_rewrite_triggered`.

## ⚠️ Agency Notices
1.  **Do Not Leak Service Keys**: The `SUPABASE_SERVICE_KEY` grants `BYPASS RLS` privileges. Leaking this compromises the integrity of the timeline.
2.  **Fingerprinting**: All anonymous users are tracked via hashed IP/UA fingerprints to enforce bans across sessions. 
3.  **Retro-Compatibility**: The UI is designed to minimize cognitive load during high-stress event monitoring by utilizing a familiar pre-millennium interface.

---
*For technical support, contact the Department of Internal Affairs or open a secure channel (Issue).*


## 🔐 Identity Model (Profile Cards v1)

This project uses a dual-layer identity system:

### 1. Actor ID (Private)
- Derived from browser fingerprint, IP hash, and session tokens.
- **Permanent Continuity**: Used for moderation (bans/mutes), rate limiting, and backend analytics.
- **Invisible**: Never exposed to the public API or frontend.

### 2. Persona ID (Public)
- Represents a specific "Username Instance".
- **Ephemeral**: Created when a user sets a username.
- **Resets**: If a user renames themselves, they get a **new Persona ID**.
  - Public stats (message count, joined date, activity tier) **RESET** to zero.
  - This preserves the "Social Reset" mechanic while keeping Bad Actors banned.

### Why Reset Stats?
To encourage users to stick to a customized identity while allowing them to "start over" socially if they wish. However, safety mechanisms (bans) always track the underlying **Actor ID**.

**END TRANSMISSION**
