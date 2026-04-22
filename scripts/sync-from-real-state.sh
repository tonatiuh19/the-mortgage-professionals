#!/usr/bin/env bash
# ============================================================
# sync-from-real-state.sh
# Syncs changed files from /Users/felixgomez/Code/real-state
# into the-mortgage-professionals, applying branding fixes.
#
# Usage:
#   ./scripts/sync-from-real-state.sh           # dry-run (shows diffs)
#   ./scripts/sync-from-real-state.sh --apply   # actually copies files
# ============================================================

SRC="/Users/felixgomez/Code/real-state"
DST="/Users/felixgomez/Code/the-mortgage-professionals"
APPLY=false
[[ "$1" == "--apply" ]] && APPLY=true

# ── Branding substitutions applied after each copy ────────────────────────────
fix_branding() {
  local f="$1"
  sed -i '' \
    's|disruptinglabs\.com/data/encore/assets/|disruptinglabs.com/data/themortgageprofessionals/assets/|g' \
    "$f"
  sed -i '' \
    's|encore/assets/|themortgageprofessionals/assets/|g' \
    "$f"
  sed -i '' \
    's|encoremortgage\.org|themortgageprofessionals.net|g' \
    "$f"
  sed -i '' \
    's|main_folder", "encore"|main_folder", "themortgageprofessionals"|g' \
    "$f"
  sed -i '' \
    's|Encore Mortgage|The Mortgage Professionals|g' \
    "$f"
}

# ── Files to sync (relative to project root) ──────────────────────────────────
# Add or remove paths as the projects evolve.
FILES=(
  # API
  "api/index.ts"

  # Components
  "client/components/BrokerDetailPanel.tsx"
  "client/components/BrokerMetricsPanel.tsx"
  "client/components/GlobalVoiceManager.tsx"
  "client/components/LeadSourceClientsDrawer.tsx"
  "client/components/MetaHelmet.tsx"
  "client/components/SaveAsTemplateDialog.tsx"
  "client/components/TaskCompletionModal.tsx"
  "client/components/TaskWizard.tsx"
  "client/components/LoanOverlay.tsx"
  "client/components/NewLoanWizard.tsx"
  "client/components/NewConversationWizard.tsx"
  "client/components/BrokerWizard.tsx"
  "client/components/PreApprovalLetterModal.tsx"
  "client/components/PDFSigningViewer.tsx"
  "client/components/PDFSignatureZoneEditor.tsx"
  "client/components/layout/AdminLayout.tsx"
  "client/components/layout/AppLayout.tsx"
  "client/components/layout/ClientLayout.tsx"
  "client/components/layout/Navbar.tsx"
  "client/components/layout/Footer.tsx"

  "client/components/ui/calendar.tsx"

  # Pages – Admin
  "client/pages/admin/Calendar.tsx"
  "client/pages/admin/Dashboard.tsx"
  "client/pages/admin/Documents.tsx"
  "client/pages/admin/IncomeCalculator.tsx"
  "client/pages/admin/Pipeline.tsx"
  "client/pages/admin/Brokers.tsx"
  "client/pages/admin/Clients.tsx"
  "client/pages/admin/Tasks.tsx"
  "client/pages/admin/Settings.tsx"
  "client/pages/admin/Conversations.tsx"
  "client/pages/admin/CommunicationTemplates.tsx"
  "client/pages/admin/Reports.tsx"
  "client/pages/admin/Scheduler.tsx"
  "client/pages/admin/BrokerProfile.tsx"
  "client/pages/admin/ContactSubmissions.tsx"
  "client/pages/admin/ReminderFlows.tsx"

  # Pages – Client
  "client/pages/client/Dashboard.tsx"
  "client/pages/client/Loans.tsx"
  "client/pages/client/Tasks.tsx"
  "client/pages/client/Documents.tsx"
  "client/pages/client/Profile.tsx"
  "client/pages/client/Calculator.tsx"

  # Pages – Public
  "client/pages/BrokerLogin.tsx"
  "client/pages/ClientLogin.tsx"
  "client/pages/ApplicationWizard.tsx"
  "client/pages/About.tsx"
  "client/pages/Contact.tsx"
  "client/pages/FAQ.tsx"
  "client/pages/LoanOptions.tsx"
  "client/pages/NotFound.tsx"
  "client/pages/Scheduler.tsx"
  "client/pages/SchedulerReschedule.tsx"

  # Shared
  "shared/api.ts"

  # Store root + slices
  "client/store/index.ts"
  "client/store/slices/applicationWizardSlice.ts"
  "client/store/slices/brokerAuthSlice.ts"
  "client/store/slices/clientAuthSlice.ts"
  "client/store/slices/clientPortalSlice.ts"
  "client/store/slices/communicationTemplatesSlice.ts"
  "client/store/slices/contactSubmissionsSlice.ts"
  "client/store/slices/dashboardSlice.ts"
  "client/store/slices/documentsSlice.ts"
  "client/store/slices/settingsSlice.ts"

  # Hooks
  "client/hooks/use-bulk-deletion.ts"
  "client/hooks/use-deletion-modal.ts"

  # Lib
  "client/lib/cdn-upload.ts"
  "client/lib/env.ts"

  # Swagger (kept in sync with api/index.ts)
  "api/swagger.yaml"

  # Scripts
  "scripts/deploy-prod.ts"
)

# ── DO NOT SYNC (intentionally different) ─────────────────────────────────────
# Files listed here are skipped even if they differ from real-state.
# Reason is noted inline.
SKIP=(
  "client/pages/Index.tsx"               # our landing page is intentionally different
  "client/global.css"                    # our brand colors (DM Sans, blue/amber) — NOT real-state's red theme
  "client/components/BrokerDetailPanel.tsx"  # our field names (conversation_id, recipient_email/phone) are correct; real-state is behind
  "client/components/layout/AdminLayout.tsx" # Conversations nav forceDisabled + route guard must stay
  "database/schema.sql"                  # managed via migrations only
)

echo ""
echo "=========================================="
echo "  Sync: real-state → the-mortgage-professionals"
echo "  Mode: $( $APPLY && echo 'APPLY' || echo 'DRY-RUN' )"
echo "=========================================="
echo ""

CHANGED=0
IDENTICAL=0
MISSING=0

for rel in "${FILES[@]}"; do
  src_file="$SRC/$rel"
  dst_file="$DST/$rel"

  # Skip files in the SKIP list
  skip=false
  for s in "${SKIP[@]}"; do
    [[ "$rel" == "$s" ]] && skip=true && break
  done
  $skip && echo "⏭  SKIP  $rel" && continue

  if [[ ! -f "$src_file" ]]; then
    echo "❓ MISSING in real-state: $rel"
    (( MISSING++ ))
    continue
  fi

  if diff -q "$src_file" "$dst_file" &>/dev/null; then
    echo "✅ SAME   $rel"
    (( IDENTICAL++ ))
  else
    echo "🔄 DIFF   $rel"
    (( CHANGED++ ))
    if $APPLY; then
      cp "$src_file" "$dst_file"
      fix_branding "$dst_file"
      echo "   → copied + branding fixed"
    fi
  fi
done

echo ""
echo "------------------------------------------"
echo "  Identical : $IDENTICAL"
echo "  Changed   : $CHANGED"
echo "  Missing   : $MISSING"
echo "------------------------------------------"

if $APPLY && [[ $CHANGED -gt 0 ]]; then
  echo ""
  echo "── Post-copy fixes ───────────────────────────────────────────────────────"

  # Fix req.params type casts in api/index.ts (string | string[] → string)
  perl -i -pe 's/parseInt\(req\.params\.(\w+),/parseInt(req.params.$1 as string,/g' "$DST/api/index.ts"
  perl -i -pe 's/parseFloat\(req\.params\.(\w+)\)/parseFloat(req.params.$1 as string)/g' "$DST/api/index.ts"
  echo "   → req.params casts applied to api/index.ts"

  # Ensure MORTGAGE_TENANT_ID is 2 (never 1)
  sed -i '' 's/MORTGAGE_TENANT_ID = 1/MORTGAGE_TENANT_ID = 2/g' "$DST/api/index.ts"
  echo "   → MORTGAGE_TENANT_ID = 2 enforced"

  # Restore intentional ClientLogin SMS/Call button state (disabled)
  # (manual check recommended — verify BrokerLogin + ClientLogin SMS/Call are disabled)
  echo "   ⚠️  Manual check: confirm SMS/Call buttons are disabled in ClientLogin.tsx + BrokerLogin.tsx"
  echo "   ⚠️  Manual check: confirm Conversations nav is forceDisabled in AdminLayout.tsx"
  echo "   ⚠️  Manual check: confirm BrokerDetailPanel uses conversation_id / recipient_email / recipient_phone field names"

  echo ""
  echo "Running tsc..."
  cd "$DST" && npx tsc --noEmit 2>&1
  echo ""
fi

if ! $APPLY && [[ $CHANGED -gt 0 ]]; then
  echo ""
  echo "Run with --apply to copy changed files:"
  echo "  ./scripts/sync-from-real-state.sh --apply"
fi

# ── Untracked file audit ───────────────────────────────────────────────────────
# Detect files that exist in real-state but are NOT in FILES or SKIP above.
# These are candidates for new features that may need to be added to this script.
echo ""
echo "=========================================="
echo "  Untracked file audit"
echo "  (files in real-state not listed above)"
echo "=========================================="

# Build a newline-delimited string of all tracked + skipped paths for grep -F matching
TRACKED_LIST=""
for f in "${FILES[@]}" "${SKIP[@]}"; do
  TRACKED_LIST="${TRACKED_LIST}${f}"$'\n'
done

UNTRACKED=0

while IFS= read -r line; do
  # diff -rq output: "Files X and Y differ" or "Only in X: file"
  if [[ "$line" == Files* ]]; then
    src_abs=$(echo "$line" | awk '{print $2}')
    rel="${src_abs#$SRC/}"
  elif [[ "$line" == "Only in ${SRC}"* ]]; then
    dir=$(echo "$line" | sed "s|Only in ||" | sed "s|: |/|")
    rel="${dir#$SRC/}"
  else
    continue
  fi

  # Skip if already tracked (exact match)
  echo "$TRACKED_LIST" | grep -qxF "$rel" && continue

  # Skip non-source noise
  [[ "$rel" == node_modules* ]] && continue
  [[ "$rel" == dist* ]] && continue
  [[ "$rel" == .git* ]] && continue
  [[ "$rel" == *.bak ]] && continue

  echo "  ⚠️  UNTRACKED  $rel"
  (( UNTRACKED++ ))
done < <(
  diff -rq \
    --exclude="*.map" --exclude="*.d.ts" --exclude=".DS_Store" \
    --exclude="node_modules" --exclude="dist" --exclude=".git" \
    "$SRC/client" "$DST/client" 2>/dev/null | sed "s|$SRC/client|$SRC/client|"
  diff -rq \
    --exclude="*.map" --exclude="*.d.ts" --exclude=".DS_Store" \
    "$SRC/shared" "$DST/shared" 2>/dev/null
  diff -rq \
    --exclude="*.map" --exclude="*.d.ts" --exclude=".DS_Store" \
    "$SRC/api" "$DST/api" 2>/dev/null
)

if [[ $UNTRACKED -eq 0 ]]; then
  echo "  ✅ No untracked differing files found"
else
  echo ""
  echo "  → Add these to FILES (or SKIP with a reason) in this script"
fi
echo "------------------------------------------"
