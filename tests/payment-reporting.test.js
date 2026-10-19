import test from 'node:test';
import assert from 'node:assert/strict';
import {paymentOrderSummary,bookingActivitySummary} from '../src/lib/payment-reporting.js';
test('canceled test booking keeps verified activity without inventing live receipts or a refund',()=>{
  const summary=paymentOrderSummary([{product:'booking',status:'paid',mode:'test',amount_cents:15000,refund_status:'requested'}]);
  assert.equal(summary.liveReceipts,0);assert.equal(summary.testPaymentValue,150);assert.equal(summary.testRefundedValue,0);assert.equal(summary.testRefundsAwaitingConfirmation,0);
  const activity=bookingActivitySummary([{status:'cancelled',payment_mode:'test',payment_status:'test_paid',amount:150}]);
  assert.deepEqual(activity,{total:1,confirmed:0,completed:0,cancelled:1,testPayments:1,testPaymentValue:150,testRefunds:0});
});
test('receipts follow verified mode and refund settlement rather than booking acceptance or subscription activation',()=>{
 const summary=paymentOrderSummary([
  {product:'booking',status:'paid',mode:'live',amount_cents:15000,refund_status:'requested'},
  {product:'booking',status:'paid',mode:'live',amount_cents:20000,refund_status:'refunded'},
  {product:'student',status:'paid',mode:'live',amount_cents:2000},
  {product:'parent',status:'pending',mode:'live',amount_cents:3000},
  {product:'tutor_pro',status:'paid',mode:'test',amount_cents:5000,refund_status:'refunded'}]);
 assert.equal(summary.liveReceipts,170);assert.equal(summary.liveBookingReceipts,150);assert.equal(summary.liveSubscriptionReceipts,20);assert.equal(summary.testRefundedValue,50);
});
