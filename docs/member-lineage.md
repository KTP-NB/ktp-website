# Member lineage

Apply `20261102090000_hide_kshiraj_public_directory.sql` and then
`20261102100000_member_lineage.sql`, then
`20261102110000_transfer_student_lineage_roots.sql`, then
`20261102120000_transfer_lineage_by_class.sql`, then
`20261102130000_lineage_membership_rules.sql`, then
`20261102140000_allow_no_big_pending_lineage.sql` before releasing the updated website.
Application startup does not apply migrations.

Members select **Big** on their account profile and save it with the rest of
their profile. New members default to **No Big** and can save their profiles
before choosing a Big. Clearing a saved Big returns a non-Transfer member to
pending status rather than creating a family. The dropdown uses the site's
searchable menu in a viewport-constrained portal, above page content and the footer.
Unlinked profiles remain visible as members but stay out of the lineage until
they choose a Big who already belongs to a family. Existing
families are seeded from the previous lineage using unambiguous full-name matches;
subsequent relationships use profile IDs and survive name changes.

A member's **Transfer** pledge class determines transfer status and starts a new
family, retaining their Littles. Their class symbol is **→**. Their account shows
a class notice and disables Big selection. Transfer status cannot be independently
edited. The database derives it from the class for all writes, including class
corrections and direct API updates. Other members can choose a Transfer member as
their Big.

The Members page reads all columns from the curated public view so live profiles
remain visible before the lineage migrations are applied. In that case only the
family relationships use the legacy seed; the member list still comes from the
live directory.

The public directory resolves each member's nearest available ancestor. Inactive
or hidden Bigs are skipped, including consecutive unavailable ancestors. Alumni
remain eligible. When no ancestor remains, the Little becomes a family root.
Deactivation preserves the original link, so reactivation restores it. Permanent
account deletion reparents Littles before the profile is deleted. Original
founding families and roots inherited through promotion are preserved using
server-managed provenance; members cannot grant themselves that status.

Existing own-profile row policies restrict Big edits to the member's own account.
A database trigger rejects self-links, descendant links, missing Bigs, and new
selections of inactive or hidden profiles. The public view returns only the
effective public Big ID, without exposing hidden ancestors.

Run `npm run test:members` for tree and existing member-access checks, and
`supabase test db --local` for database promotion, validation, and visibility tests.
