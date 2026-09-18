# Collab

Collab is a real-time chat system built using a microservice architecture within a monorepo. It focuses on scalable, low-latency messaging by separating concerns across services and using a stream-based backend for reliability.

## Overview

Collab is designed around a simple principle:
decouple real-time delivery from persistence and business logic.

Each service handles a single responsibility, making the system:

- independently scalable
- easier to maintain
- resilient under load

### Features

- Messaging (current) — Real-time chat with ordered and durable delivery
- Video Call (coming soon) — Live communication layer on top of existing infra
