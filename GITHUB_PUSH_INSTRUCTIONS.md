# Push ecommerce-platform to GitHub

The monorepo is initialized and the initial commit is done. To upload to GitHub:

## 1. Create the repository on GitHub

1. Go to [GitHub](https://github.com/new)
2. Name the repo `ecommerce-platform` (or your preferred name)
3. Choose **Public** or **Private**
4. Do **not** initialize with README, .gitignore, or license (content already exists)
5. Click **Create repository**

## 2. Add remote and push

```bash
cd /Users/hussainabbasi/Documents/GitHub/ecommerce-platform
git remote add origin https://github.com/hussu97/ecommerce-platform.git
git branch -M main
git push -u origin main
```

If using SSH instead:

```bash
git remote add origin git@github.com:hussu97/ecommerce-platform.git
git branch -M main
git push -u origin main
```

## 3. Optional: enable GitHub security

- **Settings > Security > Code security and analysis**
- Enable **Secret scanning**
- Enable **Dependabot alerts** (and optionally Dependabot updates)
