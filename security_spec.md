# TrocShop Security Specification

## 1. Data Invariants
- **Products**: Must have a valid `sellerId` matching the authenticated user. Price must be positive. Status must be one of 'available', 'sold', 'reserved'.
- **Users**: Users can only modify their own profile. `uid` must match `request.auth.uid`.
- **Conversations**: Only participants can read or write messages in a conversation. `participantIds` must contain the current user's UID.
- **Messages**: `senderId` must match the authenticated user's UID.

## 2. The "Dirty Dozen" Payloads (Denial Expected)
1. **Identity Spoofing**: Creating a product with someone else's `sellerId`.
2. **Price Poisoning**: Setting a negative price.
3. **Admin Escalation**: Attempting to set an `isAdmin` field (not defined in schema but a common attack).
4. **Conversation Intrusion**: Reading a conversation where the user is not a participant.
5. **Message Forgery**: Sending a message as another user in a conversation.
6. **Ghost Updates**: Updating a product after it's marked as 'sold' (except by owner).
7. **Orphaned Message**: Creating a message in a non-existent conversation.
8. **Resource Exhaustion**: Sending a 1MB string in a product title.
9. **Illegal Status**: Setting status to 'deleted' (not in enum).
10. **Profile Hijacking**: Updating another user's bio.
11. **Timestamp Manipulation**: Providing a future `createdAt` date from the client.
12. **Bypassing Category**: Using a category not approved (if we implement a whitelist).

## 3. Test Runner (Draft)
- `it('should deny creating product for another user', ...)`
- `it('should deny negative prices', ...)`
- `it('should deny unauthorized chat access', ...)`
