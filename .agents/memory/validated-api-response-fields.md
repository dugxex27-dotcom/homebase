---
name: Validated API responses strip omitted fields
description: Why every frontend-consumed response field must be declared in the source OpenAPI schema.
---

When frontend code validates an API response with a generated Zod object schema, fields omitted from the source OpenAPI response contract are stripped even if the server returned them.

**Why:** A valid server response can appear to lose data after parsing, causing UI prefill or other downstream behavior to fail while network mocks and server handlers look correct.

**How to apply:** When a parsed response lacks a server-returned field, inspect the source OpenAPI schema first. Add the field there and regenerate clients and validators rather than editing generated files or bypassing validation.