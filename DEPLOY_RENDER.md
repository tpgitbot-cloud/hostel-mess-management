# Render Deployment Guide

## Setup Steps

1. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub/Google

2. **Connect Repository**
   - Dashboard → New → Web Service
   - Select your GitHub repository
   - Choose branch (main/deploy)

3. **Configure Service**
   - **Name:** hostel-mess-api
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

4. **Set Environment Variables**
   Click "Add Environment Variable" and add:
   ```
   MONGO_URI=[your_mongodb_atlas_uri]
   JWT_SECRET=[generate_strong_secret]
   JWT_EXPIRE=7d
   PORT=5000
   NODE_ENV=production
   CLOUDINARY_CLOUD_NAME=[your_cloudinary_name]
   CLOUDINARY_API_KEY=[your_api_key]
   CLOUDINARY_API_SECRET=[your_api_secret]
   FRONTEND_URL=https://[your-vercel-domain].vercel.app
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (2-5 minutes)
   - Your API URL: `https://[service-name].onrender.com`

6. **Update Frontend**
   - In Vercel, set `REACT_APP_API_URL=https://[your-render-url]/api`

## Monitoring Logs

- **Logs Tab:** View real-time logs
- **Metrics Tab:** Monitor performance
- **Events:** Track deployments

## Auto-Deploys

Enable auto-deploy:
- Settings → Auto-Deploy
- Choose "Yes" for "Auto-Deploy on Push"

## SSL Certificate

Render automatically provides SSL (HTTPS) - no additional setup needed.

## Scaling

For production:
- Upgrade Plan in Settings
- Enable Auto-scaling if needed
- Monitor resource usage

## Common Issues

### Build Fails
- Check Node version compatibility
- Verify npm packages install locally
- Check environment variables are set

### Service Crashes
- Check logs for errors
- Review MongoDB connection
- Verify API credentials

### Slow Response
- Check database indexes
- Monitor API response times
- Consider upgrading plan
