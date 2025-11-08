# Vercel Deployment Instructions

## Quick Fix for 404 Errors

### Option 1: Set Root Directory in Vercel Dashboard (Recommended - Easiest)

1. Go to your Vercel project dashboard
2. Click on **Settings** tab
3. Go to **General** section
4. Scroll down to **Root Directory**
5. Set it to: `website-new`
6. Click **Save**
7. Redeploy your project

This tells Vercel to treat `website-new` as the root directory, so all files will be served correctly.

### Option 2: Use vercel.json (Already Configured)

The `vercel.json` file is already configured with routing rules. After pushing to GitHub:

1. Vercel should automatically detect the changes and redeploy
2. The routing should work with the current configuration
3. Routes:
   - `/` → serves `website-new/index.html`
   - `/privacy-policy` → serves `website-new/privacy-policy.html`
   - `/terms-of-service` → serves `website-new/terms-of-service.html`

## Verification

After deployment, check these URLs:
- `https://your-domain.vercel.app/` - Should show the homepage
- `https://your-domain.vercel.app/privacy-policy` - Should show privacy policy
- `https://your-domain.vercel.app/terms-of-service` - Should show terms of service

## Troubleshooting

If you're still getting 404 errors:

1. **Check Vercel Build Logs**: 
   - Go to your Vercel project → Deployments
   - Click on the latest deployment
   - Check the build logs for errors

2. **Verify Files are Committed**:
   ```bash
   git ls-files website-new/
   ```
   All files should be listed

3. **Clear Cache and Redeploy**:
   - In Vercel dashboard, click on the latest deployment
   - Click the three dots menu
   - Select "Redeploy" and check "Use existing Build Cache" = OFF

4. **Check File Paths in HTML**:
   - Make sure all CSS and JS file paths are relative (e.g., `styles.css` not `/styles.css`)
   - Check that images and other assets use correct relative paths

## Alternative Solution: Move Files to Root

If the above solutions don't work, you can move the website files to the repository root:

```bash
# Backup first
cp -r website-new website-new-backup

# Move files to root
mv website-new/* .
rm -rf website-new

# Update vercel.json to remove website-new references
# Or delete vercel.json entirely
```

Then update all internal links in the HTML files if needed.
