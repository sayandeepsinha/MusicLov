# GitHub Pages Setup - Using /docs Folder

This landing page is configured to be hosted on GitHub Pages using the `/docs` folder.

## Quick Setup

### 1. Commit and Push
```bash
git add docs/
git commit -m "Add landing page in docs folder for GitHub Pages"
git push origin main
```

### 2. Configure GitHub Pages
1. Go to your repository: `https://github.com/sayandeepsinha/MusicLov`
2. Click **Settings** tab
3. Click **Pages** in the left sidebar
4. Under **Source**:
   - Branch: `main`
   - Folder: `/docs` ← **Select this option**
5. Click **Save**

### 3. Access Your Site
After a few minutes, your landing page will be live at:
**https://sayandeepsinha.github.io/MusicLov/**

## File Structure
```
/
├── docs/
│   ├── index.html       # Landing page (auto-served by GitHub Pages)
│   └── styles.css       # Landing page styles
├── index.html           # Electron app entry (NOT affected)
├── src/
│   ├── landingpage/     # Source files (for development)
│   │   ├── index.html
│   │   └── styles.css
│   └── ...
└── public/
    └── icon.png         # Shared icon
```

## Benefits of /docs Folder
✅ Keeps your root `index.html` for Electron app  
✅ Clean separation between app and landing page  
✅ GitHub Pages automatically serves `docs/index.html` as homepage  
✅ No conflicts with your build process  

## Updating the Landing Page
When you make changes to `src/landingpage/`:
```bash
cp src/landingpage/index.html docs/index.html
cp src/landingpage/styles.css docs/styles.css
# Update paths if needed (icon paths use ../public/)
git add docs/
git commit -m "Update landing page"
git push
```

Changes will be live within a few minutes!
