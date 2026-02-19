# Mobile-first responsive testing checklist

Use this checklist to verify the app is mobile-first and responsive. Run on a real device or browser DevTools device emulation (e.g. Chrome "Toggle device toolbar").

**Viewports to test:** 320px, 375px, 768px, 1024px width (portrait for mobile).

## Flows to verify

1. **Viewport and scaling**
   - Load the app and confirm the viewport meta tag is present (e.g. `width=device-width, initial-scale=1`).
   - Zoom in/out and confirm content scales; no horizontal overflow at body level on key pages.

2. **Header and sidebar**
   - On narrow width, header shows sidebar trigger and language selector without overflow.
   - Opening the sidebar shows the Sheet from the side; closing returns to main content.
   - Language selector is usable.

3. **Dialogs**
   - Open add/edit dialogs on teachers, sessions, private-sessions, groups.
   - On 320px and 375px, dialog width stays within the screen with visible margin; no horizontal scroll.
   - On 768px+, dialog can use full max-w-2xl.

4. **Auth and forms**
   - Sign-in, signup, and organization create pages have comfortable padding on 320px/375px.
   - Form is readable and submit button is tappable.

5. **Touch targets**
   - Primary CTAs (e.g. "Sign in", "Add student", "Save") are easy to tap on touch devices.

6. **Tables**
   - List pages (students, teachers, venues, groups, sessions, attendance): on mobile, fewer columns are visible and table scrolls horizontally without breaking layout. No horizontal overflow of the page.

7. **Safe area (if implemented)**
   - On a notched device or emulator with safe area, fixed header/sidebar do not sit under the notch.

---

**Last checked:** _[Date]_  
**Checked by:** _[Name or "CI"]_
