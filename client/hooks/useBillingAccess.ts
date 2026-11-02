import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchBillingAccess,
  fetchBillingTeamNotice,
} from "@/store/slices/billingSlice";

export type BillingActionGateReason = "loading" | "error" | "restricted" | null;

/** Loads tenant billing access ladder state for gating sends and banners. */
export function useBillingAccess() {
  const dispatch = useAppDispatch();
  const {
    access,
    isLoadingAccess,
    config,
    teamNotice,
    isLoadingTeamNotice,
    accessFetchFailed,
    teamNoticeFetchFailed,
  } = useAppSelector((s) => s.billing);
  const sessionToken = useAppSelector((s) => s.brokerAuth.sessionToken);
  const isPlatformOwner =
    useAppSelector((s) => s.brokerAuth.user?.role) === "admin";
  const accessRetryAttempted = useRef(false);

  useEffect(() => {
    if (!sessionToken) return;
    if (isPlatformOwner) {
      if (access == null && !isLoadingAccess && !accessFetchFailed) {
        dispatch(fetchBillingAccess());
      }
      return;
    }
    if (teamNotice == null && !isLoadingTeamNotice && !teamNoticeFetchFailed) {
      dispatch(fetchBillingTeamNotice());
    }
  }, [
    dispatch,
    sessionToken,
    isPlatformOwner,
    access,
    isLoadingAccess,
    accessFetchFailed,
    teamNotice,
    isLoadingTeamNotice,
    teamNoticeFetchFailed,
  ]);

  useEffect(() => {
    if (!sessionToken || !isPlatformOwner || !accessFetchFailed) return;
    if (accessRetryAttempted.current || isLoadingAccess) return;
    accessRetryAttempted.current = true;
    const timer = window.setTimeout(() => dispatch(fetchBillingAccess()), 2500);
    return () => window.clearTimeout(timer);
  }, [
    dispatch,
    sessionToken,
    isPlatformOwner,
    accessFetchFailed,
    isLoadingAccess,
  ]);

  const isCheckingBilling = isPlatformOwner
    ? isLoadingAccess
    : isLoadingTeamNotice;
  const billingFetchFailed = isPlatformOwner
    ? accessFetchFailed
    : teamNoticeFetchFailed;
  const billingStateReady = isPlatformOwner
    ? access !== null
    : teamNotice !== null;

  const blocksCostActions = isPlatformOwner
    ? (access?.blocksCostActions ?? false)
    : (teamNotice?.blocksOutbound ?? false);

  let actionGateReason: BillingActionGateReason = null;
  if (sessionToken) {
    if (isCheckingBilling || !billingStateReady) {
      actionGateReason = "loading";
    } else if (billingFetchFailed) {
      actionGateReason = "error";
    } else if (blocksCostActions) {
      actionGateReason = "restricted";
    }
  }

  const isActionGateLocked = actionGateReason !== null;

  return {
    access: isPlatformOwner ? access : null,
    teamNotice: isPlatformOwner ? null : teamNotice,
    config: isPlatformOwner ? config : null,
    isLoadingAccess: isPlatformOwner ? isLoadingAccess : isLoadingTeamNotice,
    isPlatformOwner,
    stripeEnabled: isPlatformOwner ? (config?.stripeEnabled ?? false) : false,
    blocksCostActions,
    isActionGateLocked,
    actionGateReason,
    showsFullWall: isPlatformOwner ? (access?.showsFullWall ?? false) : false,
    showWarnBanner: isPlatformOwner ? (access?.showWarnBanner ?? false) : false,
  };
}
