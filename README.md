# स्टार न्यूज़ 11

News website — theme **suryoday**. No server, no monthly hosting bill.

## Publish (about 15 minutes)

1. **GitHub:** create a new repository named `star-news-11` (it can be private). Choose **uploading an existing file** and upload everything in this folder.
   - In Finder, press **Cmd + Shift + .** to show hidden files (`.github`, `.gitignore`, `.node-version`, `public/.well-known`).
   - GitHub accepts 100 files per upload, so drag the `src` folder first, then everything else. Alternatively, use GitHub Desktop, which has no limit.
2. **Cloudflare Pages:** go to Workers & Pages → Create → Pages → Connect to Git and pick the repository. Set **Build command** to `npm run build` and **Output directory** to `dist`.
3. **Domain:** in the Pages project → Custom domains → add `star-news-11.pages.dev`.
4. **Admin panel password:** the admin panel asks only for a **पासवर्ड**. That password is a GitHub access token for this one repository:
   GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token →
   Repository access: **Only select repositories** → `star-news-11` → Permissions: **Contents: Read and write** → Expiration: up to 1 year (set a reminder to renew it).
   Copy the token and give it to the client as their password. Open `https://star-news-11.pages.dev/admin/` and paste it.

Every story you publish from the admin panel appears on the site about a minute later.

## Old stories are deleted automatically

Stories and web stories older than **5 days** are deleted every night (the newest 20 always stay), so the site never fills up.
Change the number in the admin panel → Settings → "पुरानी खबरें अपने-आप हटाएं" (0 = never). This runs on GitHub (the `.github/workflows` folder — upload it too). Deleted stories remain in the GitHub history.
