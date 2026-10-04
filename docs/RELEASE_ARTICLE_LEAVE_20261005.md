# Article leave confirmation — October 5

This release integrates the current chat with production baseline `bef933f`.
Trash-only permanent deletion and category filtering without automatic scrolling
are already present upstream and remain unchanged. The incremental runtime change
is the in-app unsaved-article dialog and its asynchronous navigation contract.

Back, menu/history navigation, import and the existing Logout confirmation wait
for the article decision. Stay, X and Escape preserve pending edits and return
focus. Explicit discard removes the unload listener before an intentional logout.
Autosave pauses while the warning is open, resumes on cancellation and stays
cancelled when discarding. Saved drafts and published content are not reverted.
Browser refresh/tab-close retain the platform-controlled unload warning.

The integrated candidate passed the focused leave journey on desktop, 390px and
320px, dialog accessibility, account/logout checks, editor browser regression,
validation/publication/Autosave checks, generated bundle parity, unchanged
performance budgets and CI policy tests. New leave coverage is part of the
Articles CI suite. Local fixture reports are under `uat-results/article-leave/`,
`admin-account/`, `article-editor/` and `article-validation/`.

Release uses the Git-triggered preview, hosted synthetic UAT and exact-commit
full CI before production promotion. No production article/CMS publication,
data deletion, Rules or configuration change is requested. Record the final
run, deployment and read-only production evidence separately; a local pass or
ready preview alone does not establish production success. Recovery is a new
reviewed revert on current main, preserving subsequent work and stored drafts.
