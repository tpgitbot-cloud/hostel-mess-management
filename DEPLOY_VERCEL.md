# Vercel Deployment Guide

## Setup Steps

1. **Create Vercel Account**
   - Go to https://vercel.com
   - Sign up with GitHub/Google

2. **Import Project**
   - Dashboard → New Project
   - Select your GitHub repository
   - Choose "frontend" folder or root (if monorepo)

3. **Configure Build**
   - **Framework:** React
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. **Set Environment Variables**
   - Click "Environment Variables"
   - Add:
     ```
     REACT_APP_API_URL=https://[your-render-backend-url]/api
     ```

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment (1-3 minutes)
   - Your frontend URL: `https://[project-name].vercel.app`

6. **Update Backend**
   - In Render, set `FRONTEND_URL=https://[your-vercel-domain].vercel.app`

## Production Optimizations

### Environment Variables
Production variables should be different from development:
```
REACT_APP_API_URL=https://hostel-mess-api.onrender.com/api
```

### Performance
- ✅ Code splitting enabled by default
- ✅ Image optimization
- ✅ Automatic minification
- ✅ Edge network for fast delivery

### Monitoring
- **Analytics:** Dashboard → Analytics
- **Deployments:** View deployment history
- **Functions:** Monitor API routes if using them

## Custom Domain

1. Go to Project Settings → Domains
2. Add custom domain
3. Update DNS records (instructions provided)
4. SSL certificate auto-provisioned

## Auto-Deploys

Enabled by default:
- Deploys on every push to main branch
- Preview deployments for PRs

## Rollback

If deployment issues:
- Go to Deployments tab
- Click "Rollback" on previous version
- Takes ~30 seconds

## Common Issues

### CORS Errors
- Check `REACT_APP_API_URL` is correct
- Verify backend CORS settings
- Frontend and backend must have correct URLs

### API Calls Fail
- Check environment variables in Vercel
- Verify backend is running on Render
- Check network tab in browser dev tools

### Images Not Loading
- Verify Cloudinary URLs are accessible
- Check image permissions
- Test Cloudinary keys

## Performance Tips

1. Use Code Splitting
   ```javascript
   const Dashboard = React.lazy(() => import('./Dashboard'));
   ```

2. Optimize Bundle
   - Review Dependencies in `package.json`
   - Remove unused packages

3. Enable Caching
   - Vercel handles automatically
   - Long-term caching for static assets

## API Routes (Optional)

If you want serverless functions:
- Create `/api` folder in frontend root
- Vercel converts them to serverless functions
- Good for auth, webhooks, etc.
