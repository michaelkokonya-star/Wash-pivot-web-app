# Security Specification - WASH Pivot

## Data Invariants
1. A **User Profile** can only be created by the owner and must have the 'user' role by default.
2. An **Admin** must have a verified email matching the known admin address.
3. **Products** can only be created/modified by admins.
4. **Projects** must be approved by an admin before becoming active.
5. **Orders** once paid cannot be modified by the user (except perhaps shipping status by admin).
6. **Settings** (pricing/delivery) are read-only for public and only writable by verified admins.
7. **Ratings** for products are immutable once created by the user, except for the comment/rating value by the owner.
8. **Document IDs** must be validated to prevent injection attacks.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing (Admin)**: User attempts to create a profile with `role: 'admin'`.
2. **Identity Spoofing (Owner)**: User attempts to update a project owner ID to someone else's UID.
3. **Privilege Escalation**: User attempts to update their own `isApproved` status to `true`.
4. **Resource Poisoning**: User attempts to create a product document with a document ID containing special characters or exceeding 1MB.
5. **Update-Gap (Price)**: User attempts to update a product price directly (even if they are not admin).
6. **Update-Gap (Funding)**: Project owner attempts to update `currentFunding` to meet target funding without actual transactions.
7. **Bypassing Terminal State**: User attempts to update a 'completed' order status back to 'pending'.
8. **Shadow Fields**: User attempts to add a `ghostField: true` to a project document.
9. **Relational Sync Bypass**: User attempts to create a review for a non-existent product ID.
10. **Temporal Integrity Breach**: User attempts to set `createdAt` to a future date instead of `serverTimestamp()`.
11. **PII Blanket Leak**: Non-admin user attempts to list the `/users/` collection to scrape emails.
12. **Settings Poisoning**: Authenticated user (non-admin) attempts to update `pricing_rules` to set all prices to 0.

## Test Matrix (firestore.rules.test.ts)
- [ ] User cannot set own role to admin
- [ ] Non-owner cannot read private fields of another user
- [ ] Non-admin cannot create/update products
- [ ] Owner cannot change `isApproved` of their project
- [ ] Non-admin cannot update settings
- [ ] Review must have valid userId matching auth
- [ ] Order must have valid userId matching auth
- [ ] Product ID must be alphanumeric
