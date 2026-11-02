import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "@/store";
import type {
  BillingAccessState,
  BillingTeamNotice,
  BillingConfigPayload,
  BillingExpenditurePayload,
  BillingStripePack,
  BillingStripeChargePackResponse,
  BillingStripeChargeQuoteResponse,
  BillingStripeConfirmPaymentResponse,
  BillingSavedPaymentMethod,
  BillingStripeConfirmPaymentMethodResponse,
  BillingStripeConfirmSubscriptionResponse,
  BillingStripeResetSubscriptionTestResponse,
  BillingStripePaymentIntentResponse,
  BillingStripePaymentMethodSetupResponse,
  BillingStripePortalResponse,
  BillingStripeSubscriptionSetupResponse,
  BillingTopUpChannelOption,
  BillingActivePeriodSummary,
  BillingCapacityPurchase,
  GetBillingTopUpOptionsResponse,
  GetBillingPaymentMethodResponse,
  BillingUsageSnapshot,
  GetBillingAccessResponse,
  GetBillingTeamNoticeResponse,
  GetBillingConfigResponse,
  GetBillingQuotaResponse,
  GetBillingPurchasesResponse,
  GetBillingStripePacksResponse,
  GetBillingUsageResponse,
  UnifiedQuotaSummary,
  BillingOverdueInvoice,
  GetBillingOverdueResponse,
  BillingOverduePaymentCard,
  GetBillingOverduePaymentOptionsResponse,
  PayBillingOverdueRequest,
  PayBillingOverdueResponse,
} from "@shared/api";

interface PaymentIntentState {
  clientSecret: string;
  paymentIntentId: string;
  pack: BillingStripePack;
}

interface SubscriptionSetupState {
  clientSecret: string;
  subscriptionId: string;
  stripeStatus: string;
}

interface PaymentMethodSetupState {
  clientSecret: string;
  setupIntentId: string;
}

interface BillingState {
  config: BillingConfigPayload | null;
  access: BillingAccessState | null;
  teamNotice: BillingTeamNotice | null;
  usage: BillingUsageSnapshot | null;
  expenditure: BillingExpenditurePayload | null;
  quota: UnifiedQuotaSummary | null;
  activePeriod: BillingActivePeriodSummary | null;
  purchases: BillingCapacityPurchase[];
  stripePacks: BillingStripePack[];
  topUpOptions: BillingTopUpChannelOption[];
  paymentIntent: PaymentIntentState | null;
  subscriptionSetup: SubscriptionSetupState | null;
  savedPaymentMethod: BillingSavedPaymentMethod | null;
  paymentMethodSetup: PaymentMethodSetupState | null;
  refreshedAt: string | null;
  isLoadingConfig: boolean;
  isLoadingAccess: boolean;
  isLoadingTeamNotice: boolean;
  accessFetchFailed: boolean;
  teamNoticeFetchFailed: boolean;
  isLoadingUsage: boolean;
  isLoadingQuota: boolean;
  isLoadingPurchases: boolean;
  isLoadingStripePacks: boolean;
  isLoadingTopUpOptions: boolean;
  isPaymentIntentLoading: boolean;
  isConfirmingPayment: boolean;
  isSubscriptionSetupLoading: boolean;
  isConfirmingSubscription: boolean;
  isPaymentMethodLoading: boolean;
  isPaymentMethodSetupLoading: boolean;
  isConfirmingPaymentMethod: boolean;
  isPortalLoading: boolean;
  lastFulfillment: {
    packLabel: string;
    units: number;
    dimension: string;
    granted: boolean;
  } | null;
  error: string | null;
  /** Unpaid renewal from Stripe (platform owner only); null = nothing owed. */
  overdue: BillingOverdueInvoice | null;
  overdueLoaded: boolean;
  isCheckingOverdue: boolean;
  /** Cards on file for paying the overdue renewal in-app. */
  overdueCards: BillingOverduePaymentCard[];
  isLoadingOverdueCards: boolean;
  isPayingOverdue: boolean;
}

const initialState: BillingState = {
  config: null,
  access: null,
  teamNotice: null,
  usage: null,
  expenditure: null,
  quota: null,
  activePeriod: null,
  purchases: [],
  stripePacks: [],
  topUpOptions: [],
  paymentIntent: null,
  subscriptionSetup: null,
  savedPaymentMethod: null,
  paymentMethodSetup: null,
  refreshedAt: null,
  isLoadingConfig: false,
  isLoadingAccess: false,
  isLoadingTeamNotice: false,
  accessFetchFailed: false,
  teamNoticeFetchFailed: false,
  isLoadingUsage: false,
  isLoadingQuota: false,
  isLoadingPurchases: false,
  isLoadingStripePacks: false,
  isLoadingTopUpOptions: false,
  isPaymentIntentLoading: false,
  isConfirmingPayment: false,
  isSubscriptionSetupLoading: false,
  isConfirmingSubscription: false,
  isPaymentMethodLoading: false,
  isPaymentMethodSetupLoading: false,
  isConfirmingPaymentMethod: false,
  isPortalLoading: false,
  lastFulfillment: null,
  error: null,
  overdue: null,
  overdueLoaded: false,
  isCheckingOverdue: false,
  overdueCards: [],
  isLoadingOverdueCards: false,
  isPayingOverdue: false,
};

function authHeaders(getState: () => unknown) {
  const { sessionToken } = (getState() as RootState).brokerAuth;
  return { Authorization: `Bearer ${sessionToken}` };
}

function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    return data?.message || data?.error || error.message || fallback;
  }
  return fallback;
}

export const fetchBillingConfig = createAsyncThunk(
  "billing/fetchConfig",
  async (_, { getState }) => {
    const { data } = await axios.get<GetBillingConfigResponse>("/api/billing/config", {
      headers: authHeaders(getState),
    });
    return data.config;
  },
);

export const fetchBillingAccess = createAsyncThunk(
  "billing/fetchAccess",
  async (_, { getState }) => {
    const { data } = await axios.get<GetBillingAccessResponse>("/api/billing/access", {
      headers: authHeaders(getState),
    });
    return data.access;
  },
);

export const fetchBillingTeamNotice = createAsyncThunk(
  "billing/fetchTeamNotice",
  async (_, { getState }) => {
    const { data } = await axios.get<GetBillingTeamNoticeResponse>(
      "/api/billing/team-notice",
      { headers: authHeaders(getState) },
    );
    return data.notice;
  },
);

export const fetchBillingUsage = createAsyncThunk(
  "billing/fetchUsage",
  async (_, { getState }) => {
    const { data } = await axios.get<GetBillingUsageResponse>("/api/billing/usage", {
      headers: authHeaders(getState),
    });
    return {
      usage: data.usage,
      expenditure: data.expenditure,
      refreshedAt: data.refreshedAt,
    };
  },
);

export const fetchBillingQuota = createAsyncThunk(
  "billing/fetchQuota",
  async (_, { getState }) => {
    const { data } = await axios.get<GetBillingQuotaResponse>("/api/billing/quota", {
      headers: authHeaders(getState),
    });
    return data.quota;
  },
);

export const fetchBillingPurchases = createAsyncThunk(
  "billing/fetchPurchases",
  async (_, { getState }) => {
    const { data } = await axios.get<GetBillingPurchasesResponse>(
      "/api/billing/purchases",
      { headers: authHeaders(getState) },
    );
    return {
      activePeriod: data.activePeriod,
      purchases: data.purchases,
    };
  },
);

export const fetchTopUpOptions = createAsyncThunk(
  "billing/fetchTopUpOptions",
  async (_, { getState }) => {
    const { data } = await axios.get<GetBillingTopUpOptionsResponse>(
      "/api/billing/stripe/top-up-options",
      { headers: authHeaders(getState) },
    );
    return data.channels;
  },
);

export const fetchStripePacks = createAsyncThunk(
  "billing/fetchStripePacks",
  async (_, { getState }) => {
    const { data } = await axios.get<GetBillingStripePacksResponse>(
      "/api/billing/stripe/packs",
      { headers: authHeaders(getState) },
    );
    return data.packs;
  },
);

export const createStripePaymentIntent = createAsyncThunk(
  "billing/createStripePaymentIntent",
  async (packId: string, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post<BillingStripePaymentIntentResponse>(
        "/api/billing/stripe/payment-intent",
        { pack_id: packId },
        { headers: authHeaders(getState) },
      );
      return {
        clientSecret: data.client_secret,
        paymentIntentId: data.payment_intent_id,
        pack: data.pack,
      };
    } catch (error) {
      return rejectWithValue(
        extractApiErrorMessage(error, "Failed to prepare payment"),
      );
    }
  },
);

export const chargeTopUpQuote = createAsyncThunk(
  "billing/chargeTopUpQuote",
  async (
    payload: { dimension: string; tierIndex: number },
    { getState, rejectWithValue },
  ) => {
    try {
      const { data } = await axios.post<BillingStripeChargeQuoteResponse>(
        "/api/billing/stripe/charge-quote",
        { dimension: payload.dimension, tier_index: payload.tierIndex },
        { headers: authHeaders(getState) },
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        extractApiErrorMessage(error, "Failed to charge saved card"),
      );
    }
  },
);

export const chargeSavedCardPack = createAsyncThunk(
  "billing/chargeSavedCardPack",
  async (packId: string, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post<BillingStripeChargePackResponse>(
        "/api/billing/stripe/charge-pack",
        { pack_id: packId },
        { headers: authHeaders(getState) },
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        extractApiErrorMessage(error, "Failed to charge saved card"),
      );
    }
  },
);

export const confirmStripePayment = createAsyncThunk(
  "billing/confirmStripePayment",
  async (paymentIntentId: string, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post<BillingStripeConfirmPaymentResponse>(
        "/api/billing/stripe/confirm-payment",
        { payment_intent_id: paymentIntentId },
        { headers: authHeaders(getState) },
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        extractApiErrorMessage(error, "Failed to apply payment to quota"),
      );
    }
  },
);

/** Platform owner only. `refresh` bypasses the server's 2-minute cache. */
export const fetchBillingOverdue = createAsyncThunk(
  "billing/fetchBillingOverdue",
  async (refresh: boolean | void, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get<GetBillingOverdueResponse>(
        "/api/billing/overdue",
        {
          headers: authHeaders(getState),
          params: refresh ? { refresh: 1 } : undefined,
        },
      );
      if (!data.success) {
        return rejectWithValue(data.error ?? "Could not check payment status");
      }
      return data.overdue;
    } catch (error) {
      return rejectWithValue(
        extractApiErrorMessage(error, "Could not check payment status"),
      );
    }
  },
);

/** Overdue invoice + cards on file (platform owner). Always fresh from Stripe. */
export const fetchOverduePaymentOptions = createAsyncThunk(
  "billing/fetchOverduePaymentOptions",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get<GetBillingOverduePaymentOptionsResponse>(
        "/api/billing/overdue/payment-options",
        { headers: authHeaders(getState) },
      );
      if (!data.success) {
        return rejectWithValue(data.error ?? "Could not load payment options");
      }
      return { overdue: data.overdue, cards: data.cards };
    } catch (error) {
      return rejectWithValue(
        extractApiErrorMessage(error, "Could not load payment options"),
      );
    }
  },
);

/**
 * Pay the overdue renewal in-app. Resolves `{ paid: true }` or
 * `{ requiresAction, clientSecret }` (finish 3-D Secure with Stripe.js, then
 * dispatch again). Rejects with a user-facing message on decline.
 */
export const payOverdueInvoice = createAsyncThunk(
  "billing/payOverdueInvoice",
  async (payload: PayBillingOverdueRequest, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post<PayBillingOverdueResponse>(
        "/api/billing/overdue/pay",
        payload,
        { headers: authHeaders(getState) },
      );
      if (data.requires_action && data.client_secret) {
        return { paid: false as const, requiresAction: true as const, clientSecret: data.client_secret };
      }
      if (data.paid) return { paid: true as const };
      return rejectWithValue(data.error ?? "The payment didn't go through.");
    } catch (error) {
      return rejectWithValue(
        extractApiErrorMessage(error, "The payment didn't go through."),
      );
    }
  },
);

export const createStripeSubscriptionSetup = createAsyncThunk(
  "billing/createStripeSubscriptionSetup",
  async (forceNew: boolean | undefined, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post<BillingStripeSubscriptionSetupResponse>(
        "/api/billing/stripe/subscription-setup",
        forceNew ? { force_new: true } : {},
        { headers: authHeaders(getState) },
      );
      if (data.already_active) {
        return { alreadyActive: true as const };
      }
      if (!data.client_secret || !data.subscription_id) {
        return rejectWithValue(data.error ?? "Failed to prepare subscription");
      }
      return {
        alreadyActive: false as const,
        clientSecret: data.client_secret,
        subscriptionId: data.subscription_id,
        stripeStatus: data.stripe_status ?? "incomplete",
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const body = error.response.data as BillingStripeSubscriptionSetupResponse;
        if (body?.overdue) {
          return rejectWithValue({
            message: body.error ?? "Your last renewal is unpaid.",
            overdue: body.overdue,
          });
        }
      }
      return rejectWithValue(
        extractApiErrorMessage(error, "Failed to start subscription"),
      );
    }
  },
);

export const confirmStripeSubscription = createAsyncThunk(
  "billing/confirmStripeSubscription",
  async (subscriptionId: string, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post<BillingStripeConfirmSubscriptionResponse>(
        "/api/billing/stripe/confirm-subscription",
        { subscription_id: subscriptionId },
        { headers: authHeaders(getState) },
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        extractApiErrorMessage(error, "Failed to confirm subscription"),
      );
    }
  },
);

export const resetStripeSubscriptionForTest = createAsyncThunk(
  "billing/resetStripeSubscriptionForTest",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post<BillingStripeResetSubscriptionTestResponse>(
        "/api/billing/stripe/reset-subscription-test",
        {},
        { headers: authHeaders(getState) },
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        extractApiErrorMessage(error, "Failed to reset test subscription"),
      );
    }
  },
);

export const fetchSavedPaymentMethod = createAsyncThunk(
  "billing/fetchSavedPaymentMethod",
  async (_, { getState }) => {
    const { data } = await axios.get<GetBillingPaymentMethodResponse>(
      "/api/billing/stripe/payment-method",
      { headers: authHeaders(getState) },
    );
    return data.payment_method;
  },
);

export const createStripePaymentMethodSetup = createAsyncThunk(
  "billing/createStripePaymentMethodSetup",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post<BillingStripePaymentMethodSetupResponse>(
        "/api/billing/stripe/payment-method-setup",
        {},
        { headers: authHeaders(getState) },
      );
      return {
        clientSecret: data.client_secret,
        setupIntentId: data.setup_intent_id,
      };
    } catch (error) {
      return rejectWithValue(
        extractApiErrorMessage(error, "Failed to prepare card update"),
      );
    }
  },
);

export const confirmStripePaymentMethod = createAsyncThunk(
  "billing/confirmStripePaymentMethod",
  async (setupIntentId: string, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post<BillingStripeConfirmPaymentMethodResponse>(
        "/api/billing/stripe/confirm-payment-method",
        { setup_intent_id: setupIntentId },
        { headers: authHeaders(getState) },
      );
      return data.payment_method;
    } catch (error) {
      return rejectWithValue(
        extractApiErrorMessage(error, "Failed to save payment method"),
      );
    }
  },
);

export const openStripePortal = createAsyncThunk(
  "billing/openStripePortal",
  async (
    flow: "default" | "payment_method_update" | undefined = undefined,
    { getState, rejectWithValue },
  ) => {
    try {
      const body =
        flow === "payment_method_update" ? { flow: "payment_method_update" } : {};
      const { data } = await axios.post<BillingStripePortalResponse>(
        "/api/billing/stripe/portal",
        body,
        { headers: authHeaders(getState) },
      );
      if (data.url) window.location.href = data.url;
      return data;
    } catch (error) {
      return rejectWithValue(
        extractApiErrorMessage(error, "Failed to open billing portal"),
      );
    }
  },
);

const billingSlice = createSlice({
  name: "billing",
  initialState,
  reducers: {
    clearBillingError(state) {
      state.error = null;
    },
    clearLastFulfillment(state) {
      state.lastFulfillment = null;
    },
    clearSubscriptionSetup(state) {
      state.subscriptionSetup = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBillingConfig.pending, (state) => {
        state.isLoadingConfig = true;
        state.error = null;
      })
      .addCase(fetchBillingConfig.fulfilled, (state, action) => {
        state.isLoadingConfig = false;
        state.config = action.payload;
      })
      .addCase(fetchBillingConfig.rejected, (state, action) => {
        state.isLoadingConfig = false;
        state.error = extractApiErrorMessage(
          action.error,
          "Failed to load billing configuration",
        );
      })
      .addCase(fetchBillingAccess.pending, (state) => {
        state.isLoadingAccess = true;
        state.accessFetchFailed = false;
      })
      .addCase(fetchBillingAccess.fulfilled, (state, action) => {
        state.isLoadingAccess = false;
        state.accessFetchFailed = false;
        state.access = action.payload;
      })
      .addCase(fetchBillingAccess.rejected, (state) => {
        state.isLoadingAccess = false;
        state.accessFetchFailed = true;
      })
      .addCase(fetchBillingTeamNotice.pending, (state) => {
        state.isLoadingTeamNotice = true;
        state.teamNoticeFetchFailed = false;
      })
      .addCase(fetchBillingTeamNotice.fulfilled, (state, action) => {
        state.isLoadingTeamNotice = false;
        state.teamNoticeFetchFailed = false;
        state.teamNotice = action.payload;
      })
      .addCase(fetchBillingTeamNotice.rejected, (state) => {
        state.isLoadingTeamNotice = false;
        state.teamNoticeFetchFailed = true;
      })
      .addCase(fetchBillingUsage.pending, (state) => {
        state.isLoadingUsage = true;
        state.error = null;
      })
      .addCase(fetchBillingUsage.fulfilled, (state, action) => {
        state.isLoadingUsage = false;
        state.usage = action.payload.usage;
        state.expenditure = action.payload.expenditure;
        state.refreshedAt = action.payload.refreshedAt;
      })
      .addCase(fetchBillingUsage.rejected, (state, action) => {
        state.isLoadingUsage = false;
        state.error = extractApiErrorMessage(
          action.error,
          "Failed to load billing usage",
        );
      })
      .addCase(fetchBillingQuota.pending, (state) => {
        state.isLoadingQuota = true;
      })
      .addCase(fetchBillingQuota.fulfilled, (state, action) => {
        state.isLoadingQuota = false;
        state.quota = action.payload;
      })
      .addCase(fetchBillingQuota.rejected, (state, action) => {
        state.isLoadingQuota = false;
        state.error = extractApiErrorMessage(
          action.error,
          "Failed to load billing quota",
        );
      })
      .addCase(fetchBillingPurchases.pending, (state) => {
        state.isLoadingPurchases = true;
      })
      .addCase(fetchBillingPurchases.fulfilled, (state, action) => {
        state.isLoadingPurchases = false;
        state.activePeriod = action.payload.activePeriod;
        state.purchases = action.payload.purchases;
      })
      .addCase(fetchBillingPurchases.rejected, (state, action) => {
        state.isLoadingPurchases = false;
        state.error = extractApiErrorMessage(
          action.error,
          "Failed to load purchase history",
        );
      })
      .addCase(fetchTopUpOptions.pending, (state) => {
        state.isLoadingTopUpOptions = true;
      })
      .addCase(fetchTopUpOptions.fulfilled, (state, action) => {
        state.isLoadingTopUpOptions = false;
        state.topUpOptions = action.payload;
      })
      .addCase(fetchTopUpOptions.rejected, (state, action) => {
        state.isLoadingTopUpOptions = false;
        state.error = extractApiErrorMessage(
          action.error,
          "Failed to load top-up options",
        );
      })
      .addCase(fetchStripePacks.pending, (state) => {
        state.isLoadingStripePacks = true;
      })
      .addCase(fetchStripePacks.fulfilled, (state, action) => {
        state.isLoadingStripePacks = false;
        state.stripePacks = action.payload;
      })
      .addCase(fetchStripePacks.rejected, (state, action) => {
        state.isLoadingStripePacks = false;
        state.error = extractApiErrorMessage(
          action.error,
          "Failed to load top-up packs",
        );
      })
      .addCase(createStripePaymentIntent.pending, (state) => {
        state.isPaymentIntentLoading = true;
        state.error = null;
      })
      .addCase(createStripePaymentIntent.fulfilled, (state, action) => {
        state.isPaymentIntentLoading = false;
        state.paymentIntent = action.payload;
      })
      .addCase(createStripePaymentIntent.rejected, (state, action) => {
        state.isPaymentIntentLoading = false;
        state.paymentIntent = null;
        state.error = String(action.payload ?? "Payment setup failed");
      })
      .addCase(chargeTopUpQuote.pending, (state) => {
        state.isConfirmingPayment = true;
        state.error = null;
      })
      .addCase(chargeTopUpQuote.fulfilled, (state, action) => {
        state.isConfirmingPayment = false;
        if (action.payload.quota) state.quota = action.payload.quota;
        const quote = action.payload.quote;
        if (quote) {
          state.lastFulfillment = {
            packLabel: quote.label,
            units: quote.units,
            dimension: quote.dimension,
            granted: Boolean(action.payload.granted || action.payload.already_fulfilled),
          };
        }
      })
      .addCase(chargeTopUpQuote.rejected, (state, action) => {
        state.isConfirmingPayment = false;
        state.error = String(action.payload ?? "Failed to charge saved card");
      })
      .addCase(chargeSavedCardPack.pending, (state) => {
        state.isConfirmingPayment = true;
        state.error = null;
      })
      .addCase(chargeSavedCardPack.fulfilled, (state, action) => {
        state.isConfirmingPayment = false;
        if (action.payload.quota) state.quota = action.payload.quota;
        const pack = action.payload.pack;
        if (pack) {
          state.lastFulfillment = {
            packLabel: pack.label,
            units: pack.units,
            dimension: pack.dimension,
            granted: Boolean(action.payload.granted || action.payload.already_fulfilled),
          };
        }
      })
      .addCase(chargeSavedCardPack.rejected, (state, action) => {
        state.isConfirmingPayment = false;
        state.error = String(action.payload ?? "Failed to charge saved card");
      })
      .addCase(confirmStripePayment.pending, (state) => {
        state.isConfirmingPayment = true;
        state.error = null;
      })
      .addCase(confirmStripePayment.fulfilled, (state, action) => {
        state.isConfirmingPayment = false;
        state.quota = action.payload.quota;
        const pack = action.payload.pack;
        if (pack) {
          state.lastFulfillment = {
            packLabel: pack.label,
            units: pack.units,
            dimension: pack.dimension,
            granted: action.payload.granted || action.payload.already_fulfilled,
          };
        }
      })
      .addCase(confirmStripePayment.rejected, (state, action) => {
        state.isConfirmingPayment = false;
        state.error = String(action.payload ?? "Failed to apply payment");
      })
      .addCase(createStripeSubscriptionSetup.pending, (state) => {
        state.isSubscriptionSetupLoading = true;
        state.error = null;
      })
      .addCase(createStripeSubscriptionSetup.fulfilled, (state, action) => {
        state.isSubscriptionSetupLoading = false;
        if (action.payload.alreadyActive) {
          state.subscriptionSetup = null;
          if (state.config) {
            state.config.stripeSubscriptionActive = true;
            state.config.stripeSubscriptionLinked = true;
          }
          return;
        }
        state.subscriptionSetup = {
          clientSecret: action.payload.clientSecret,
          subscriptionId: action.payload.subscriptionId,
          stripeStatus: action.payload.stripeStatus,
        };
      })
      .addCase(createStripeSubscriptionSetup.rejected, (state, action) => {
        state.isSubscriptionSetupLoading = false;
        state.subscriptionSetup = null;
        const payload = action.payload as
          | string
          | { message: string; overdue: BillingOverdueInvoice }
          | undefined;
        if (payload && typeof payload === "object") {
          // Not an error to show: the overdue card takes over the page.
          state.overdue = payload.overdue;
          state.overdueLoaded = true;
          return;
        }
        state.error = String(payload ?? "Subscription setup failed");
      })
      .addCase(fetchBillingOverdue.pending, (state) => {
        state.isCheckingOverdue = true;
      })
      .addCase(fetchBillingOverdue.fulfilled, (state, action) => {
        state.isCheckingOverdue = false;
        state.overdueLoaded = true;
        state.overdue = action.payload;
      })
      .addCase(fetchOverduePaymentOptions.pending, (state) => {
        state.isLoadingOverdueCards = true;
      })
      .addCase(fetchOverduePaymentOptions.fulfilled, (state, action) => {
        state.isLoadingOverdueCards = false;
        state.overdue = action.payload.overdue;
        state.overdueLoaded = true;
        state.overdueCards = action.payload.cards;
      })
      .addCase(fetchOverduePaymentOptions.rejected, (state) => {
        state.isLoadingOverdueCards = false;
      })
      .addCase(payOverdueInvoice.pending, (state) => {
        state.isPayingOverdue = true;
      })
      .addCase(payOverdueInvoice.fulfilled, (state, action) => {
        state.isPayingOverdue = false;
        if (action.payload.paid) {
          state.overdue = null;
          state.overdueCards = [];
        }
      })
      .addCase(payOverdueInvoice.rejected, (state) => {
        state.isPayingOverdue = false;
      })
      .addCase(fetchBillingOverdue.rejected, (state) => {
        // Keep the last known value — a transient Stripe error must not
        // hide (or invent) an overdue balance.
        state.isCheckingOverdue = false;
      })
      .addCase(confirmStripeSubscription.pending, (state) => {
        state.isConfirmingSubscription = true;
        state.error = null;
      })
      .addCase(confirmStripeSubscription.fulfilled, (state, action) => {
        state.isConfirmingSubscription = false;
        state.subscriptionSetup = null;
        if (state.config) {
          if (action.payload.subscription) {
            state.config.subscription = action.payload.subscription;
          }
          state.config.stripeSubscriptionActive = true;
          state.config.stripeSubscriptionLinked = true;
          state.config.stripeSubscriptionStatus = action.payload.stripe_status;
          if (action.payload.payment_method) {
            state.savedPaymentMethod = action.payload.payment_method;
            state.config.hasPaymentMethod = true;
          }
        }
      })
      .addCase(confirmStripeSubscription.rejected, (state, action) => {
        state.isConfirmingSubscription = false;
        state.error = String(action.payload ?? "Failed to confirm subscription");
      })
      .addCase(resetStripeSubscriptionForTest.pending, (state) => {
        state.isSubscriptionSetupLoading = true;
        state.error = null;
      })
      .addCase(resetStripeSubscriptionForTest.fulfilled, (state) => {
        state.isSubscriptionSetupLoading = false;
        state.subscriptionSetup = null;
        state.lastFulfillment = null;
        state.purchases = [];
        state.activePeriod = null;
        if (state.config) {
          state.config.stripeSubscriptionActive = false;
          state.config.stripeSubscriptionLinked = false;
          state.config.stripeSubscriptionStatus = "inactive";
          state.config.hasPaymentMethod = false;
          if (state.config.subscription) {
            state.config.subscription = {
              ...state.config.subscription,
              status: "inactive",
              periodEnd: null,
            };
          }
        }
        state.savedPaymentMethod = null;
      })
      .addCase(resetStripeSubscriptionForTest.rejected, (state, action) => {
        state.isSubscriptionSetupLoading = false;
        state.error = String(action.payload ?? "Failed to reset test subscription");
      })
      .addCase(fetchSavedPaymentMethod.pending, (state) => {
        state.isPaymentMethodLoading = true;
      })
      .addCase(fetchSavedPaymentMethod.fulfilled, (state, action) => {
        state.isPaymentMethodLoading = false;
        state.savedPaymentMethod = action.payload;
        if (state.config) {
          state.config.hasPaymentMethod = Boolean(action.payload);
        }
      })
      .addCase(fetchSavedPaymentMethod.rejected, (state) => {
        state.isPaymentMethodLoading = false;
      })
      .addCase(createStripePaymentMethodSetup.pending, (state) => {
        state.isPaymentMethodSetupLoading = true;
        state.error = null;
      })
      .addCase(createStripePaymentMethodSetup.fulfilled, (state, action) => {
        state.isPaymentMethodSetupLoading = false;
        state.paymentMethodSetup = action.payload;
      })
      .addCase(createStripePaymentMethodSetup.rejected, (state, action) => {
        state.isPaymentMethodSetupLoading = false;
        state.paymentMethodSetup = null;
        state.error = String(action.payload ?? "Card update setup failed");
      })
      .addCase(confirmStripePaymentMethod.pending, (state) => {
        state.isConfirmingPaymentMethod = true;
      })
      .addCase(confirmStripePaymentMethod.fulfilled, (state, action) => {
        state.isConfirmingPaymentMethod = false;
        state.savedPaymentMethod = action.payload;
        state.paymentMethodSetup = null;
        if (state.config) {
          state.config.hasPaymentMethod = Boolean(action.payload);
        }
      })
      .addCase(confirmStripePaymentMethod.rejected, (state, action) => {
        state.isConfirmingPaymentMethod = false;
        state.error = String(action.payload ?? "Failed to save card");
      })
      .addCase(openStripePortal.pending, (state) => {
        state.isPortalLoading = true;
        state.error = null;
      })
      .addCase(openStripePortal.fulfilled, (state) => {
        state.isPortalLoading = false;
      })
      .addCase(openStripePortal.rejected, (state, action) => {
        state.isPortalLoading = false;
        state.error = String(action.payload ?? "Portal failed");
      });
  },
});

export const { clearBillingError, clearLastFulfillment, clearSubscriptionSetup } =
  billingSlice.actions;
export default billingSlice.reducer;
