
---

# **views/README.md**

# Views Directory (EJS Templates)

This folder contains all UI templates rendered by Express.

## Subfolder: **partials/**
Reusable components:
- `header.ejs` — navigation bar + layout header
- `footer.ejs` — closing tags + footer layout

Included by:
```ejs
<%- include('partials/header', { user }) %>
