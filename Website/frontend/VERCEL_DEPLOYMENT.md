# Frontend Deployment to Vercel

## Environment Variables Required

Add these to Vercel dashboard:

```
REACT_APP_API_URL=https://your-railway-backend-url.com/api
```

## How to Deploy

1. Push code to GitHub
2. Go to vercel.com
3. Click "Add New" → "Project"
4. Import your frontend repository
5. Set Framework to "React"
6. Add environment variable above
7. Click "Deploy"

Vercel will auto-detect React and run `npm run build`

## Local Testing

Before deploying, test locally with production backend:

```bash
REACT_APP_API_URL=https://your-railway-backend-url.com/api npm run build
npm start
```

## Build Output

Build files are generated in the `build/` directory, which Vercel automatically serves.
