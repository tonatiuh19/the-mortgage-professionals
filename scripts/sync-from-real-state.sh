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
  "client/components/layout/ClientLayout.tsx"
  "client/components/layout/Navbar.tsx"
  "client/components/layout/Footer.tsx"

  # Pages – Admin
  "client/pages/admin/Dashboard.tsx"
  "client/pages/admin/Pipeline.tsx"
  "client/pages/admin/Brokers.tsx"
  "client/pages/admin/Clients.tsx"
  "client/pages/admin/Tasks.tsx"
  "client/pages/admin/Settings.tsx"
  "client/pages/admin/Conversations.tsx"
  "client/pages/admin/CommunicationTemplates.tsx"
  "client/pages/admin/Reports.tsx"
  "client/pages/admin/Profile.tsx"
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
  "client/pages/ApplicationWizard.tsx"
  "client/pages/About.tsx"
  "client/pages/Contact.tsx"
  "client/pages/FAQ.tsx"
  "client/pages/LoanOptions.tsx"

  # Store slices
  "client/store/slices/adminSlice.ts"
  "client/store/slices/brokerAuthSlice.ts"
  "client/store/slices/clientAuthSlice.ts"
  "client/store/slices/clientPortalSlice.ts"
  "client/store/slices/dashboardSlice.ts"
  "client/store/slices/settingsSlice.ts"
  "client/store/slices/communicationTemplatesSlice.ts"
  "client/store/slices/contactSubmissionsSlice.ts"
)

# ── DO NOT SYNC (intentionally different) ─────────────────────────────────────
SKIP=(
  "client/pages/Index.tsx"          # our landing page is intentionally different
  "database/schema.sql"             # managed via migrations only
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
  echo "Running tsc..."
  cd "$DST" && npx tsc --noEmit 2>&1
  echo ""
fi

if ! $APPLY && [[ $CHANGED -gt 0 ]]; then
  echo ""
  echo "Run with --apply to copy changed files:"
  echo "  ./scripts/sync-from-real-state.sh --apply"
fi
