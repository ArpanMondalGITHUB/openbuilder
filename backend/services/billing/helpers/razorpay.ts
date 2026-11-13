import Razorpay from "razorpay";
import { config } from "../config/billing.config";

// One shared client for the whole service. Import this; never call `new Razorpay` elsewhere.
const razorpay = new Razorpay({
  key_id: config.razorpayKeyId,
  key_secret: config.razorpayKeySecret,
});

export default razorpay;

// Then use it anywhere in billing like this:

// import razorpay from "../helpers/razorpay";

// const sub = await razorpay.subscriptions.create({
//   plan_id: config.razorpayPlanPro,
//   total_count: 12,
//   customer_notify: 1,
//   notes: { userId },
// });