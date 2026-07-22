# Deployment guide

## Required repository structure

The `app` folder must remain at the repository root:

```text
app/
  layout.tsx
  page.tsx
  globals.css
```

## Cloudflare Workers Builds

Recommended build command:

```text
npm run deploy
```

If Cloudflare provides separate Build and Deploy command fields:

- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx wrangler deploy`

After the deployment succeeds, add `compassbyvavy.ca` under the Worker’s Domains and Routes settings.
