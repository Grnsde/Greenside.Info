# Upload your updated Greenside.info website

1. Download and extract Greenside-info-logo-update.zip (right-click > Extract All).
2. Open your existing Greenside.Info GitHub repository and the branch/folder currently used by GitHub Pages.
3. Select Add file > Upload files. Drag in index.html, admin.html, config.js, CNAME, and the entire assets folder from the extracted ZIP. Upload the contents, not the ZIP or its enclosing folder. Keep the assets folder intact.
4. Commit the changes to your existing publishing branch. If GitHub requires a pull request, merge it into that branch to publish.
5. Under Settings > Pages, keep your current publishing source and custom domain greenside.info. For a branch-based site whose files are at the repository root, the source should be that branch and /(root). No DNS or Supabase changes are needed for this branding update.
6. Wait for the Pages deployment to finish (check the Actions tab), then open https://greenside.info and https://greenside.info/admin.html. Hard-refresh with Ctrl+F5 if the previous branding appears. Browser-tab icons may remain cached longer; try a private window.

Check after uploading
- The golf-flag logo appears in both headers and links to the public homepage.
- The public page loads your promotions; search and platform filters still work.
- Your existing admin account can sign in and see the promotion list.
- When you next make an intended promotion change, confirm it appears publicly; expired promotions should stay hidden.

What changed
- Header branding on index.html and admin.html.
- Added assets/branding.css, the header logo, and a golf-flag favicon.
- Included the original uploaded logo in assets/greenside-logo-original.jpeg.
- config.js, CNAME, and all existing JavaScript are unchanged. Authentication, admin authorization, promotion queries, editing, and deletion retain their original implementation.

Verification
The two pages' script blocks were compared with the originals and match exactly. Configuration and domain files were checked for identical hashes. Local asset references were checked. Live Supabase sign-in, database operations, and desktop/mobile browser rendering were not tested in this environment. This ZIP has not been uploaded or deployed.

GitHub documentation
https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site