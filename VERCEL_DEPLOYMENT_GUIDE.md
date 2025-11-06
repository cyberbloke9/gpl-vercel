# Vercel Deployment Guide - GPL Application

**Repository:** https://github.com/cyberbloke9/gpl-vercel
**Status:** ✅ All code pushed successfully
**Date:** November 5, 2025

---

## ✅ **What's Already Done:**

- ✅ All code pushed to `gpl-vercel` repository
- ✅ All 3 commits with fixes included:
  - RLS policy fixes
  - 9 critical bug fixes
  - TypeScript strict mode implementation
- ✅ All migrations ready to apply
- ✅ Build tested and working (0 TypeScript errors)

---

## 📋 **Step-by-Step Deployment to Vercel**

### **STEP 1: Apply Database Migrations to Supabase** ⚠️ **DO THIS FIRST!**

Before deploying to Vercel, you MUST apply these migrations to your Supabase database:

1. **Go to Supabase Dashboard:**
   - Open: https://app.supabase.com
   - Log in with your account
   - Select your Gayatri Power project

2. **Apply Migration 1: RLS Policy Fixes**
   - Click **SQL Editor** in left sidebar
   - Click **New Query**
   - Copy contents from: `supabase/migrations/20251105000000_fix_rls_policies.sql`
   - Paste into SQL editor
   - Click **Run** (or press Ctrl+Enter)
   - ✅ Should see "Success. No rows returned"

3. **Apply Migration 2: Equipment Seed Data**
   - Click **New Query** again
   - Copy contents from: `supabase/migrations/20251105000001_seed_equipment_data.sql`
   - Paste into SQL editor
   - Click **Run**
   - ✅ Should see success message with equipment and checklist data created

4. **Verify Migrations Applied:**
   - Click **Table Editor** in left sidebar
   - Check `equipment` table has 6 rows (6 categories)
   - Check `checklists` table has 6 rows (6 checklists)
   - Check `checklist_items` table has 30 rows (5 items per checklist)

**⚠️ Important:** Don't proceed to Vercel deployment until migrations are applied!

---

### **STEP 2: Get Your Supabase Credentials**

You'll need these for Vercel environment variables:

1. **In Supabase Dashboard:**
   - Click **Settings** (gear icon) in left sidebar
   - Click **API** section
   - You'll see:
     - **Project URL** (starts with https://...)
     - **anon public** key (long string starting with eyJ...)

2. **Copy These Values:**
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Keep these ready** - you'll need them in Step 4

---

### **STEP 3: Create Vercel Account & Import Repository**

1. **Go to Vercel:**
   - Open: https://vercel.com
   - Click **Sign Up** (if you don't have account)
   - Choose **Continue with GitHub**
   - Authorize Vercel to access your GitHub

2. **Import Repository:**
   - Click **Add New...** button (top right)
   - Click **Project**
   - You'll see your GitHub repositories
   - Find and click **cyberbloke9/gpl-vercel**
   - Click **Import**

3. **Configure Project:**
   - **Project Name:** `gpl-vercel` (or your preferred name)
   - **Framework Preset:** Should auto-detect as **Vite** ✅
   - **Root Directory:** `./` (leave as default)
   - **Build Command:** `npm run build` (should be auto-filled)
   - **Output Directory:** `dist` (should be auto-filled)
   - **Install Command:** `npm install` (should be auto-filled)

---

### **STEP 4: Add Environment Variables** ⚠️ **CRITICAL!**

This is the most important step!

1. **Scroll down to "Environment Variables" section**

2. **Add Variable 1:**
   - **Name:** `VITE_SUPABASE_URL`
   - **Value:** Paste your Supabase Project URL from Step 2
   - Click **Add**

3. **Add Variable 2:**
   - **Name:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** Paste your Supabase anon key from Step 2
   - Click **Add**

4. **Verify Both Variables Added:**
   You should see:
   ```
   ✓ VITE_SUPABASE_URL
   ✓ VITE_SUPABASE_ANON_KEY
   ```

---

### **STEP 5: Deploy!**

1. **Click the "Deploy" button**

2. **Wait for Build:**
   - Vercel will:
     - Clone the repository
     - Install dependencies (~20 seconds)
     - Build the application (~10 seconds)
     - Deploy to CDN (~5 seconds)
   - Total time: **~1-2 minutes**

3. **Watch Build Logs:**
   - You'll see real-time output
   - Should see: `✓ 2151 modules transformed`
   - Should see: `✓ built in ~7s`
   - No errors should appear

4. **Deployment Success!**
   - You'll see: **"Congratulations! Your project has been successfully deployed."**
   - You'll get a deployment URL like: `https://gpl-vercel.vercel.app`

---

### **STEP 6: Update Supabase Auth Settings**

Now you need to tell Supabase about your Vercel URL:

1. **Go back to Supabase Dashboard**
   - Click **Authentication** in left sidebar
   - Click **URL Configuration**

2. **Add Vercel URL to Site URL:**
   - **Site URL:** Add your Vercel URL: `https://gpl-vercel.vercel.app`

3. **Add to Redirect URLs:**
   - **Redirect URLs:** Add:
     ```
     https://gpl-vercel.vercel.app
     https://gpl-vercel.vercel.app/**
     ```
   - Click **Save**

4. **Why this is needed:**
   - Supabase needs to know which domains can authenticate
   - Without this, login/signup will fail with CORS errors

---

### **STEP 7: Test Your Deployment** 🧪

**Open your Vercel URL:** `https://gpl-vercel.vercel.app`

Test the following in order:

#### **Test 1: Application Loads**
- ✅ Page loads without errors
- ✅ Login page appears
- ✅ No console errors in browser DevTools (F12)

#### **Test 2: Authentication**
- ✅ Try signing up with test account
- ✅ Try logging in with existing account
- ✅ Should redirect to dashboard after login

#### **Test 3: Dashboard Loads**
- ✅ See 6 category cards (Turbine, Oil Pressure, Cooling, Generator, Electrical, Safety)
- ✅ Time slot indicator showing current session
- ✅ No loading errors

#### **Test 4: QR Code Scanning**
- ✅ Click "Scan QR Code" button
- ✅ Camera permission requested (allow it)
- ✅ Try scanning one of the QR codes (or use simulation if testing code available)

#### **Test 5: Checklist Functionality**
- ✅ Select a category/checklist
- ✅ Checklist items load
- ✅ Fill out a checklist (mark items as pass/fail/na)
- ✅ Submit checklist
- ✅ Should see success message

#### **Test 6: Database Operations**
- ✅ Check Supabase Dashboard → Table Editor → `completed_checklists`
- ✅ Should see your completed checklist
- ✅ Check `completed_items` table
- ✅ Should see your checklist items

#### **Test 7: Issues & Reports**
- ✅ Navigate to Issues tab
- ✅ If any items marked as fail, should see issues
- ✅ Navigate to Reports tab
- ✅ Try generating a report

---

### **STEP 8: Compare with Lovable Version** (Optional)

To ensure everything works identically:

1. **Open Lovable version:** `https://gpl-org.org` (in one browser tab)
2. **Open Vercel version:** `https://gpl-vercel.vercel.app` (in another tab)
3. **Compare:**
   - Visual appearance (should be identical)
   - Functionality (should work the same)
   - Data (connects to same Supabase)

---

## 🎉 **Success Criteria:**

Your deployment is successful if:
- ✅ Application loads on Vercel URL
- ✅ Login/signup works
- ✅ All 6 categories visible
- ✅ QR scanning works
- ✅ Checklists can be submitted
- ✅ Data appears in Supabase
- ✅ No console errors

---

## 🚀 **Next Steps After Successful Testing:**

Once you've confirmed everything works on the Vercel test URL:

### **Option A: Keep Testing for Now**
- Keep both versions running
- Test more extensively on Vercel version
- Fix any issues that come up
- Switch domain later when 100% confident

### **Option B: Switch Domain Immediately**
(Only if everything works perfectly)

1. **In Vercel:**
   - Go to Project Settings → Domains
   - Click **Add Domain**
   - Enter: `gpl-org.org`
   - Follow DNS configuration instructions

2. **Update DNS:**
   - Go to your domain registrar
   - Update DNS records to point to Vercel
   - Wait for DNS propagation (5-60 minutes)

3. **In Supabase:**
   - Update Site URL to: `https://gpl-org.org`
   - Update Redirect URLs to include: `https://gpl-org.org`

4. **Test on Main Domain:**
   - Visit `https://gpl-org.org`
   - Should now serve Vercel version
   - Test everything again

5. **Decommission Lovable:**
   - Remove domain from Lovable
   - Cancel subscription

---

## 🔄 **Automatic Deployment Going Forward:**

Once deployed, Vercel will automatically:
- Deploy on every `git push` to main branch
- Create preview deployments for pull requests
- Build and deploy in ~1-2 minutes
- Notify you of deployment status

**Workflow:**
```
You/Claude → Commit to GitHub → Vercel auto-detects → Builds → Deploys → Live!
```

No manual publishing needed! No credits needed! **100% FREE!**

---

## 🐛 **Troubleshooting Common Issues:**

### **Issue 1: Build Fails**
**Symptom:** Vercel shows build error
**Solution:**
- Check build logs for specific error
- Ensure environment variables are set correctly
- Verify both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present

### **Issue 2: Login Fails with CORS Error**
**Symptom:** "CORS policy" error in console when trying to log in
**Solution:**
- Go to Supabase → Authentication → URL Configuration
- Add Vercel URL to Redirect URLs
- Wait 1 minute for changes to propagate
- Try again

### **Issue 3: Database Connection Fails**
**Symptom:** Data doesn't load, API errors
**Solution:**
- Verify environment variables in Vercel are correct
- Check Supabase project is active
- Verify RLS policies are applied (migrations from Step 1)

### **Issue 4: "Failed to submit" Error**
**Symptom:** Can't submit checklists
**Solution:**
- Confirm migrations were applied (Step 1)
- Check Supabase logs for RLS policy errors
- Verify user is authenticated

### **Issue 5: White Screen / Nothing Loads**
**Symptom:** Blank page, no content
**Solution:**
- Open browser DevTools (F12) → Console tab
- Check for JavaScript errors
- Verify build completed successfully in Vercel
- Check environment variables are set

---

## 📊 **Deployment Checklist:**

Use this checklist to track your progress:

- [ ] **Pre-Deployment**
  - [ ] Apply migration 1 (RLS policies) to Supabase
  - [ ] Apply migration 2 (Equipment data) to Supabase
  - [ ] Verify 6 equipment rows exist
  - [ ] Copy Supabase URL and anon key

- [ ] **Vercel Setup**
  - [ ] Create Vercel account
  - [ ] Import gpl-vercel repository
  - [ ] Add VITE_SUPABASE_URL environment variable
  - [ ] Add VITE_SUPABASE_ANON_KEY environment variable
  - [ ] Click Deploy

- [ ] **Post-Deployment**
  - [ ] Update Supabase Site URL
  - [ ] Update Supabase Redirect URLs
  - [ ] Get Vercel deployment URL

- [ ] **Testing**
  - [ ] Application loads
  - [ ] Login works
  - [ ] Dashboard shows 6 categories
  - [ ] QR scanning works
  - [ ] Checklist submission works
  - [ ] Data appears in Supabase
  - [ ] No console errors

- [ ] **Optional: Domain Switch**
  - [ ] Add gpl-org.org to Vercel
  - [ ] Update DNS records
  - [ ] Test on main domain
  - [ ] Cancel Lovable subscription

---

## 📞 **Need Help?**

If you encounter any issues:

1. **Check Vercel Build Logs:**
   - Go to Deployments
   - Click on failed deployment
   - Read error messages

2. **Check Supabase Logs:**
   - Go to Logs section in Supabase
   - Look for API errors or RLS violations

3. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for JavaScript errors
   - Check Network tab for failed requests

4. **Let Claude know:**
   - Share error messages
   - Share screenshots if helpful
   - I can help debug!

---

## 🎯 **Summary:**

**Time to Deploy:** 15-30 minutes
**Cost:** $0 (100% FREE!)
**Difficulty:** Easy (just follow steps)
**Result:** Production-ready deployment with auto-deploy

**Your Vercel URL will be:**
- Test URL: `https://gpl-vercel.vercel.app`
- Production URL (after domain switch): `https://gpl-org.org`

---

**Ready to deploy?** Follow the steps above in order, and let me know if you hit any issues! 🚀
