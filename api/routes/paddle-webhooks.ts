import { Router, Response } from "express";
import asyncHandler from "express-async-handler";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../prisma/client";
import validatePaddleWebhook from "../utils/validatePaddleWebhook";
import convertPaddleSubscriptionStatus, {
  PaddleSubscriptionStatus,
} from "../utils/convertPaddleSubscriptionStatus";
import convertPaddleSubscriptionPlan, {
  PaddleSubscriptionPlanId,
} from "../utils/convertPaddleSubscriptionPlan";

type PaddleJsonObject = {
  marketing_consent: "1" | "0";
  email: string;
  subscription_plan_id: PaddleSubscriptionPlanId;
  user_id: string;
  checkout_id: string;
  status: PaddleSubscriptionStatus;
};

type DefaultSubscriptionData = {
  marketingConsent: boolean;
  email: string;
  subscriptionPlan: "PERSONAL_PRO" | "TEAM";
  paddleUserId: string;
  paddleCheckoutId: string;
  paddleSubscriptionStatus:
    | "ACTIVE"
    | "TRAILING"
    | "PAST_DUE"
    | "PAUSED"
    | "DELETED";
  paddleCancellationEffectiveDate: null;
  paddlePausedFrom: null;
};

function applyDefaultSubscriptionData(
  data: PaddleJsonObject
): DefaultSubscriptionData {
  return {
    marketingConsent: data.marketing_consent === "1",
    email: data.email,
    subscriptionPlan: convertPaddleSubscriptionPlan(data.subscription_plan_id),
    paddleUserId: data.user_id,
    paddleCheckoutId: data.checkout_id,
    paddleSubscriptionStatus: convertPaddleSubscriptionStatus(data.status),
    paddleCancellationEffectiveDate: null,
    paddlePausedFrom: null,
  };
}

function generateLicenseUpdateInstructions(
  billingAccount: {
    id: string;
    licenses: {
      id: string;
    }[];
  },
  purchasedLicensesQuantity: number
) {
  const licensesQuanity = billingAccount.licenses.length;
  let licensesInstructions = {};
  if (licensesQuanity > purchasedLicensesQuantity) {
    const diff = licensesQuanity - purchasedLicensesQuantity;
    const licenesIds = billingAccount.licenses
      .slice(Math.max(billingAccount.licenses.length - diff, 0))
      .map((license) => license.id);
    licensesInstructions = {
      licenses: {
        deleteMany: {
          id: { in: licenesIds },
        },
      },
    };
  } else if (licensesQuanity < purchasedLicensesQuantity) {
    const diff = purchasedLicensesQuantity - licensesQuanity;
    licensesInstructions = {
      licenses: {
        create: new Array(diff).fill(undefined).map(() => {
          return { token: uuidv4() };
        }),
      },
    };
  }
  return licensesInstructions;
}

// {
//     alert_id: '1359045059',
//     alert_name: 'subscription_created',
//     cancel_url: 'https://checkout.paddle.com/subscription/cancel?user=5&subscription=5&hash=533b5dd0fd196f0ac52bbcc4d41733f072cd75bf',
//     checkout_id: '8-8ec7b4d2b0eae9b-6c547b8ae7',
//     currency: 'EUR',
//     email: 'ada@example.com',
//     event_time: '2020-10-11 07:12:53',
//     linked_subscriptions: '8, 9, 3',
//     marketing_consent: '1',
//     next_bill_date: '2020-10-12',
//     passthrough: 'Example String',
//     quantity: '3',
//     source: 'Import',
//     status: 'trialing',
//     subscription_id: '8',
//     subscription_plan_id: '633265',
//     unit_price: 'unit_price',
//     update_url: 'https://checkout.paddle.com/subscription/update?user=8&subscription=4&hash=ed3ff951690ba27a832adccf0ac2b369ed602031',
//     user_id: '2',
//     p_signature: 'abc='
//   }
async function createSubscription(body: any, res: Response) {
  try {
    const purchasedLicensesQuantity = parseInt(body.quantity);
    await prisma.billingAccount.create({
      data: {
        ...applyDefaultSubscriptionData(body),
        purchasedLicensesQuantity,
        paddleSubscriptionId: body.subscription_id,
        paddleUpdateUrl: body.update_url,
        paddleCancelUrl: body.cancel_url,
        licenses: {
          create: new Array(purchasedLicensesQuantity)
            .fill(undefined)
            .map(() => {
              return { token: uuidv4() };
            }),
        },
      },
    });
    res.status(200).end();
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
    return;
  }
}

// {
//   alert_id: '327911839',
//   alert_name: 'subscription_updated',
//   cancel_url: 'https://checkout.paddle.com/subscription/cancel?user=2&subscription=7&hash=2f227ae713b6becfa7d7f94edbb9ecc67981a693',
//   checkout_id: '6-065a93eb0a3fea8-efa58562b4',
//   currency: 'GBP',
//   email: 'littel.leora@example.org',
//   event_time: '2020-10-12 18:27:57',
//   linked_subscriptions: '8, 7, 2',
//   marketing_consent: '1',
//   new_price: 'new_price',
//   new_quantity: 'new_quantity',
//   new_unit_price: 'new_unit_price',
//   next_bill_date: '2020-10-17',
//   old_next_bill_date: 'old_next_bill_date',
//   old_price: 'old_price',
//   old_quantity: 'old_quantity',
//   old_status: 'old_status',
//   old_subscription_plan_id: 'old_subscription_plan_id',
//   old_unit_price: 'old_unit_price',
//   passthrough: 'Example String',
//   status: 'trialing',
//   subscription_id: '8',
//   subscription_plan_id: '633265',
//   update_url: 'https://checkout.paddle.com/subscription/update?user=6&subscription=5&hash=52c0c463586fd4eb7300ec87ce18dcd27a62cf52',
//   user_id: '9',
//   p_signature: 'abc='
// }
async function updateSubscription(body: any, res: Response) {
  const billingAccount = await prisma.billingAccount.findFirst({
    where: { paddleSubscriptionId: body.subscription_id },
    select: { id: true, licenses: { select: { id: true } } },
  });
  if (!billingAccount) {
    res.sendStatus(404);
    return;
  }
  const paddlePausedFrom = body.paused_from ? new Date(body.paused_from) : null;
  const purchasedLicensesQuantity = parseInt(body.new_quantity);
  const licensesInstructions = generateLicenseUpdateInstructions(
    billingAccount,
    purchasedLicensesQuantity
  );

  await prisma.billingAccount.update({
    where: { id: billingAccount.id },
    data: {
      ...applyDefaultSubscriptionData(body),
      ...licensesInstructions,
      paddleUpdateUrl: body.update_url,
      paddleCancelUrl: body.cancel_url,
      purchasedLicensesQuantity,
      paddlePausedFrom,
    },
  });

  res.status(200).end();
}

// {
//   alert_id: '441139168',
//   alert_name: 'subscription_cancelled',
//   cancellation_effective_date: '2020-10-17 15:53:03',
//   checkout_id: '3-4352df745357c14-729f2d69d1',
//   currency: 'EUR',
//   email: 'lavern48@example.com',
//   event_time: '2020-10-11 20:16:47',
//   linked_subscriptions: '8, 2, 9',
//   marketing_consent: '1',
//   passthrough: 'Example String',
//   quantity: '70',
//   status: 'deleted',
//   subscription_id: '8',
//   subscription_plan_id: '633265',
//   unit_price: 'unit_price',
//   user_id: '3',
//   p_signature: 'abc='
// }
async function cancelSubscription(body: any, res: Response) {
  const billingAccount = await prisma.billingAccount.findFirst({
    where: { paddleSubscriptionId: body.subscription_id },
    select: { id: true, licenses: { select: { id: true } } },
  });
  if (!billingAccount) {
    res.sendStatus(404);
    return;
  }
  const purchasedLicensesQuantity = parseInt(body.quantity);
  const licensesInstructions = generateLicenseUpdateInstructions(
    billingAccount,
    purchasedLicensesQuantity
  );
  await prisma.billingAccount.update({
    where: { id: billingAccount.id },
    data: {
      ...applyDefaultSubscriptionData(body),
      ...licensesInstructions,
      purchasedLicensesQuantity,
      paddleCancellationEffectiveDate: new Date(
        body.cancellation_effective_date
      ),
    },
  });

  res.status(200).end();
}

const router = Router();

router.post(
  "/paddle",
  asyncHandler(async (req, res) => {
    if (validatePaddleWebhook(req.body)) {
      if (req.body.alert_name === "subscription_created") {
        // TODO cover the case when the same email signs up again
        await createSubscription(req.body, res);
      } else if (req.body.alert_name === "subscription_cancelled") {
        await cancelSubscription(req.body, res);
      } else if (req.body.alert_name === "subscription_updated") {
        await updateSubscription(req.body, res);
      }
    } else {
      res.sendStatus(403);
      console.error("Paddle Webhook could not be verified.");
    }
  })
);

export default router;
