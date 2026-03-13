# Claude Code Instructions for OmTeDoen

## Release Process

When creating a new release, follow these steps:

### 1. Merge Feature Branch
```bash
git checkout main
git merge origin/<feature-branch>
git push origin main
```

### 2. Update Version Numbers
Update the version in **`src-tauri/tauri.conf.json`**:
```json
"version": "X.Y.Z"
```

**Why:** The build workflow uses this version to create correctly-named artifacts (e.g., `OmTeDoen_X.Y.Z_aarch64.dmg`).

### 3. Commit Version Bump
```bash
git add src-tauri/tauri.conf.json
git commit -m "chore: bump version to X.Y.Z"
git push origin main
```

### 4. Create Git Tag
```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

**Why:** The Release workflow (`/.github/workflows/release.yml`) is triggered by tag pushes matching `v*`. The tag MUST point to the commit with the updated version number, otherwise artifacts will be labeled with the old version.

### 5. Wait for Workflow
- The `Release` workflow will automatically trigger
- Builds on macOS (takes ~4-5 minutes)
- Creates: `OmTeDoen_X.Y.Z_aarch64.dmg`, `OmTeDoen_aarch64.app.tar.gz`, `OmTeDoen_aarch64.app.tar.gz.sig`, `latest.json`
- Uploads to GitHub as a draft release

### 6. Publish Release
```bash
gh release view vX.Y.Z  # Verify assets are there
gh release edit vX.Y.Z --draft=false  # Publish
```

### 7. Add Release Notes (Optional but Recommended)
```bash
gh release edit vX.Y.Z --notes "## What's New

- Feature 1
- Feature 2
"
```

## Common Pitfalls

❌ **Don't:** Create a release/tag without updating version in `tauri.conf.json`
- Result: Artifacts will have wrong version number

❌ **Don't:** Tag before pushing the version bump commit
- Result: Tag points to wrong commit, workflow builds with old version

✅ **Do:** Version file → Commit → Push → Tag → Push tag

## Related Files

- **Workflow:** `.github/workflows/release.yml` — triggered by `v*` tags
- **Config:** `src-tauri/tauri.conf.json` — defines app version
- **Backlog:** `BACKLOG.md` — track completed features
