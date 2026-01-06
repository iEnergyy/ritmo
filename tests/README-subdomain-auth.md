# Subdomain Authentication Tests

This document describes the comprehensive test suite for subdomain multitenancy authentication.

## Overview

The test suite covers:
- Unit tests for tenant resolution functions
- Integration tests for subdomain authentication flow
- Component tests for signin page subdomain handling
- Component tests for TenantSwitcher organization switching

## Test Files

### 1. Unit Tests

#### `tests/unit/lib/tenant-resolver.test.ts`
Tests for the core tenant resolution functions:

- **`resolveTenantFromSubdomain`**
  - Extracts tenant slug from localhost subdomains (e.g., `nrgschool.localhost:3000` → `nrgschool`)
  - Handles subdomains with ports
  - Handles production domains (e.g., `acme.example.com` → `acme`)
  - Returns null for localhost without subdomain
  - Handles edge cases (multiple subdomains, single character subdomains)

- **`getOrganizationBySlug`**
  - Returns organization when found
  - Returns null when organization not found

- **`resolveTenantWithMembership`**
  - Returns tenant info when user is a member
  - Returns null when no subdomain
  - Returns null when organization not found
  - Returns null when user is not a member
  - Handles errors gracefully

**Coverage**: 15 test cases covering all edge cases and error scenarios.

### 2. Integration Tests

#### `tests/integration/subdomain-auth.test.ts`
Tests for the complete subdomain authentication flow:

- **Subdomain tenant resolution**
  - Verifies correct extraction of tenant slug from various subdomain formats

- **Proxy middleware with subdomain**
  - Allows authenticated user with matching subdomain to access dashboard
  - Redirects unauthenticated user with subdomain appropriately
  - Redirects authenticated user without membership to signin with error
  - Handles subdomain with session token but expired cache
  - Sets active organization header when subdomain matches

- **resolveTenantWithMembership integration**
  - Resolves tenant and verifies membership correctly
  - Returns null when organization does not exist
  - Returns null when user is not a member

**Coverage**: Tests the full request/response cycle through the proxy middleware.

### 3. Component Tests

#### `tests/unit/components/signin-subdomain.test.tsx`
Tests for the signin page subdomain handling:

- Sets active organization based on subdomain after login
- Does not set organization if no subdomain
- Handles organization not found gracefully
- Continues with redirect even if organization setting fails

**Coverage**: 4 test cases ensuring the signin flow correctly handles subdomains.

#### `tests/unit/components/tenant-switcher.test.tsx`
Tests for the TenantSwitcher component:

- Switches organization when subdomain matches different org
- Does not switch if organization already matches
- Sets organization if no active organization is set
- Does not do anything if no subdomain
- Does not do anything if session is pending
- Handles organization not found gracefully

**Coverage**: 6 test cases covering all TenantSwitcher scenarios.

## Running Tests

### Run all tests
```bash
pnpm test
```

### Run unit tests only
```bash
pnpm test:unit
```

### Run integration tests only
```bash
pnpm test:integration
```

### Run specific test file
```bash
pnpm test tests/unit/lib/tenant-resolver.test.ts
```

### Run tests in watch mode
```bash
pnpm test:watch
```

### Run tests with coverage
```bash
pnpm test:coverage
```

## Test Coverage

The test suite provides comprehensive coverage for:

1. **Subdomain parsing** - All variations of subdomain formats
2. **Organization resolution** - Finding organizations by slug
3. **Membership verification** - Checking user access to organizations
4. **Authentication flow** - Complete login and session management
5. **Middleware behavior** - Request handling with subdomains
6. **Component behavior** - Client-side organization switching
7. **Error handling** - Graceful handling of edge cases and errors

## Key Test Scenarios

### Happy Path
1. User logs in on `nrgschool.localhost:3000`
2. Subdomain is extracted: `nrgschool`
3. Organization is found by slug
4. User membership is verified
5. Active organization is set automatically
6. User is redirected to dashboard with correct organization context

### Error Scenarios
1. **Organization not found** - User sees appropriate error
2. **User not a member** - User is redirected to signin with error
3. **No subdomain** - Normal authentication flow continues
4. **Session expired** - Cache refresh mechanism handles gracefully
5. **Organization setting fails** - Login continues, TenantSwitcher handles it

## Maintenance

When modifying subdomain authentication:

1. Update relevant test files
2. Ensure all tests pass: `pnpm test`
3. Check coverage: `pnpm test:coverage`
4. Verify edge cases are covered
5. Update this document if adding new test scenarios

## Notes

- Tests use mocks for BetterAuth, database, and cookies
- Integration tests verify the full request/response cycle
- Component tests use React Testing Library for user interactions
- All tests are isolated and can run independently

