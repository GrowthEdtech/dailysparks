import Stripe from "stripe";

import {
  getPricingForPlan,
  getPricingIntervalForPlan,
  getPricingLookupKeyForPlan,
  getPricingProductNameForPlan,
} from "../src/lib/pricing-market";
import type { SubscriptionPlan } from "../src/lib/mvp-types";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
const MANAGED_BY = "daily-sparks";
const SUBSCRIPTION_PLANS: Exclude<SubscriptionPlan, null>[] = ["monthly", "yearly"];

if (!STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required.");
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

async function ensureProduct(subscriptionPlan: Exclude<SubscriptionPlan, null>) {
  const expectedName = getPricingProductNameForPlan(subscriptionPlan);
  const productList = await stripe.products.list({
    active: true,
    limit: 100,
  });
  const existingProduct =
    productList.data.find(
      (product) => product.metadata.dailySparksPlan === subscriptionPlan,
    ) ?? productList.data.find((product) => product.name === expectedName);

  if (existingProduct) {
    if (
      existingProduct.name !== expectedName ||
      existingProduct.metadata.dailySparksPlan !== subscriptionPlan ||
      existingProduct.metadata.managedBy !== MANAGED_BY
    ) {
      return stripe.products.update(existingProduct.id, {
        name: expectedName,
        metadata: {
          dailySparksPlan: subscriptionPlan,
          managedBy: MANAGED_BY,
        },
      });
    }

    return existingProduct;
  }

  return stripe.products.create({
    name: expectedName,
    metadata: {
      dailySparksPlan: subscriptionPlan,
      managedBy: MANAGED_BY,
    },
  });
}

async function getActivePriceByLookupKey(lookupKey: string) {
  const priceList = await stripe.prices.list({
    active: true,
    limit: 10,
    lookup_keys: [lookupKey],
    expand: ["data.currency_options"],
  });

  return priceList.data[0] ?? null;
}

function hasExpectedPriceShape(
  price: Stripe.Price,
  subscriptionPlan: Exclude<SubscriptionPlan, null>,
  productId: string,
) {
  const intlPricing = getPricingForPlan(subscriptionPlan, "intl");
  const hkPricing = getPricingForPlan(subscriptionPlan, "hk");

  if (!price.recurring) {
    return false;
  }

  const hkCurrencyOptions = price.currency_options?.hkd;

  return (
    typeof price.product === "string" &&
    price.product === productId &&
    price.lookup_key === getPricingLookupKeyForPlan(subscriptionPlan) &&
    price.currency === intlPricing.currency &&
    price.unit_amount === intlPricing.amount &&
    price.recurring.interval === getPricingIntervalForPlan(subscriptionPlan) &&
    hkCurrencyOptions?.unit_amount === hkPricing.amount
  );
}

async function ensurePrice(subscriptionPlan: Exclude<SubscriptionPlan, null>) {
  const product = await ensureProduct(subscriptionPlan);
  const lookupKey = getPricingLookupKeyForPlan(subscriptionPlan);
  const intlPricing = getPricingForPlan(subscriptionPlan, "intl");
  const hkPricing = getPricingForPlan(subscriptionPlan, "hk");
  const existingPrice = await getActivePriceByLookupKey(lookupKey);

  if (existingPrice && hasExpectedPriceShape(existingPrice, subscriptionPlan, product.id)) {
    return existingPrice;
  }

  const createdPrice = await stripe.prices.create({
    currency: intlPricing.currency,
    currency_options: {
      hkd: {
        unit_amount: hkPricing.amount,
      },
    },
    lookup_key: lookupKey,
    metadata: {
      dailySparksPlan: subscriptionPlan,
      managedBy: MANAGED_BY,
    },
    product: product.id,
    recurring: {
      interval: getPricingIntervalForPlan(subscriptionPlan),
    },
    transfer_lookup_key: true,
    unit_amount: intlPricing.amount,
  });

  if (existingPrice) {
    await stripe.prices.update(existingPrice.id, {
      active: false,
    });
  }

  return createdPrice;
}

async function main() {
  const results = await Promise.all(
    SUBSCRIPTION_PLANS.map(async (subscriptionPlan) => {
      const price = await ensurePrice(subscriptionPlan);

      return {
        subscriptionPlan,
        priceId: price.id,
        lookupKey: price.lookup_key,
        productId: typeof price.product === "string" ? price.product : price.product.id,
      };
    }),
  );

  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

void main();
